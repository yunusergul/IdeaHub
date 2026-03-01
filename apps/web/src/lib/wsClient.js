const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3001/ws';
const REQUEST_TIMEOUT = 15_000;
const MAX_RECONNECT_ATTEMPTS = 10;
const MAX_BACKOFF = 30_000;

class WsClient {
  constructor() {
    this.ws = null;
    this.accessToken = null;
    this._tokenGetter = null; // function that returns current token
    this._tokenRefresher = null; // function that triggers a token refresh
    this.pendingRequests = new Map();
    this._inflightDedup = new Map(); // key: action+payload → promise (deduplication)
    this.eventListeners = new Map();
    this.stateListeners = new Set();
    this.state = 'disconnected'; // disconnected | connected | reconnecting | failed
    this.reconnectAttempts = 0;
    this.reconnectTimer = null;
    this.authResolve = null;
    this.authReject = null;
  }

  setTokenGetter(getter) {
    this._tokenGetter = getter;
  }

  setTokenRefresher(refresher) {
    this._tokenRefresher = refresher;
  }

  _getCurrentToken() {
    if (this._tokenGetter) {
      return this._tokenGetter() || this.accessToken;
    }
    return this.accessToken;
  }

  connect(accessToken) {
    this.accessToken = accessToken;
    this.reconnectAttempts = 0;
    return this._connect();
  }

  _connect() {
    return new Promise((resolve, reject) => {
      if (this.ws) {
        this.ws.onclose = null;
        this.ws.close();
      }

      this.ws = new WebSocket(WS_URL);
      this.authResolve = resolve;
      this.authReject = reject;

      this.ws.onopen = () => {
        // Send auth message with the freshest token available
        const token = this._getCurrentToken();
        this.ws.send(JSON.stringify({ type: 'auth', token }));
      };

      this.ws.onmessage = (e) => {
        this._handleMessage(JSON.parse(e.data));
      };

      this.ws.onclose = () => {
        if (this.state === 'connected') {
          this._setState('reconnecting');
          this._scheduleReconnect();
        }
      };

      this.ws.onerror = () => {
        // onclose will fire after this
      };
    });
  }

  _handleMessage(msg) {
    switch (msg.type) {
      case 'auth:ok': {
        this.reconnectAttempts = 0;
        this._setState('connected');
        // Emit auth:ok event so listeners can sync locale etc.
        const authListeners = this.eventListeners.get('auth:ok');
        if (authListeners) {
          authListeners.forEach(cb => cb(msg.user));
        }
        if (this.authResolve) {
          this.authResolve(msg.user);
          this.authResolve = null;
          this.authReject = null;
        }
        break;
      }
      case 'result': {
        const pending = this.pendingRequests.get(msg.id);
        if (pending) {
          clearTimeout(pending.timer);
          pending.resolve(msg.data);
          this.pendingRequests.delete(msg.id);
        }
        break;
      }
      case 'event': {
        const listeners = this.eventListeners.get(msg.event);
        if (listeners) {
          listeners.forEach(cb => cb(msg.data));
        }
        break;
      }
      case 'error': {
        if (msg.id) {
          const pending = this.pendingRequests.get(msg.id);
          if (pending) {
            clearTimeout(pending.timer);
            const err = new Error(msg.error.message);
            err.code = msg.error.code;
            pending.reject(err);
            this.pendingRequests.delete(msg.id);
          }
        }
        // Auth error during connection
        if (msg.error.code === 'INVALID_TOKEN') {
          if (this.authReject) {
            this.authReject(new Error(msg.error.message));
            this.authResolve = null;
            this.authReject = null;
          }
          // During reconnect, trigger a token refresh before next attempt
          if (this.state === 'reconnecting' && this._tokenRefresher) {
            this._tokenRefresher().then(newToken => {
              if (newToken) this.accessToken = newToken;
            }).catch(() => {});
          }
        }
        break;
      }
    }
  }

  send(action, payload = {}) {
    // Deduplicate identical concurrent requests (same action + payload)
    const dedupKey = action + ':' + JSON.stringify(payload);
    const inflight = this._inflightDedup.get(dedupKey);
    if (inflight) return inflight;

    const promise = this._sendRaw(action, payload).finally(() => {
      this._inflightDedup.delete(dedupKey);
    });
    this._inflightDedup.set(dedupKey, promise);
    return promise;
  }

  _sendRaw(action, payload = {}) {
    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        reject(new Error('No WebSocket connection'));
        return;
      }

      const id = crypto.randomUUID();
      const timer = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`Request timed out: ${action}`));
      }, REQUEST_TIMEOUT);

      this.pendingRequests.set(id, { resolve, reject, timer });
      this.ws.send(JSON.stringify({ type: 'action', id, action, payload }));
    });
  }

  on(event, callback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event).add(callback);
    return () => {
      const listeners = this.eventListeners.get(event);
      if (listeners) {
        listeners.delete(callback);
        if (listeners.size === 0) this.eventListeners.delete(event);
      }
    };
  }

  onStateChange(callback) {
    this.stateListeners.add(callback);
    return () => this.stateListeners.delete(callback);
  }

  updateToken(newToken) {
    this.accessToken = newToken;
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'auth', token: newToken }));
    }
  }

  subscribe(channels) {
    if (!Array.isArray(channels) || channels.length === 0) return Promise.resolve();
    return this.send('subscribe', { channels });
  }

  unsubscribe(channels) {
    if (!Array.isArray(channels) || channels.length === 0) return Promise.resolve();
    return this.send('unsubscribe', { channels });
  }

  disconnect() {
    clearTimeout(this.reconnectTimer);
    this.reconnectAttempts = MAX_RECONNECT_ATTEMPTS; // prevent reconnect
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.close();
      this.ws = null;
    }
    this._setState('disconnected');
    // Reject all pending requests
    for (const [id, pending] of this.pendingRequests) {
      clearTimeout(pending.timer);
      pending.reject(new Error('Connection closed'));
    }
    this.pendingRequests.clear();
  }

  _setState(newState) {
    if (this.state === newState) return;
    this.state = newState;
    this.stateListeners.forEach(cb => cb(newState));
  }

  _scheduleReconnect() {
    if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      this._setState('failed');
      return;
    }
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), MAX_BACKOFF);
    this.reconnectAttempts++;
    this.reconnectTimer = setTimeout(() => {
      this._connect().catch(() => {
        // onclose handler will trigger next reconnect
      });
    }, delay);
  }
}

export const wsClient = new WsClient();
