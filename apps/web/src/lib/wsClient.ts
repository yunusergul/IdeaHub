import type { WsConnectionState } from '../types';

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3001/ws';
const REQUEST_TIMEOUT = 15_000;
const MAX_RECONNECT_ATTEMPTS = 10;
const MAX_BACKOFF = 30_000;

type EventCallback = (data: unknown) => void;
type StateCallback = (state: WsConnectionState) => void;

interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (reason: unknown) => void;
  timer: ReturnType<typeof setTimeout>;
}

class WsClient {
  ws: WebSocket | null = null;
  accessToken: string | null = null;
  private _tokenGetter: (() => string | null) | null = null;
  private _tokenRefresher: (() => Promise<string | null>) | null = null;
  pendingRequests = new Map<string, PendingRequest>();
  private _inflightDedup = new Map<string, Promise<unknown>>();
  eventListeners = new Map<string, Set<EventCallback>>();
  stateListeners = new Set<StateCallback>();
  state: WsConnectionState = 'disconnected';
  reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private authResolve: ((value: unknown) => void) | null = null;
  private authReject: ((reason: unknown) => void) | null = null;

  setTokenGetter(getter: () => string | null): void {
    this._tokenGetter = getter;
  }

  setTokenRefresher(refresher: () => Promise<string | null>): void {
    this._tokenRefresher = refresher;
  }

  private _getCurrentToken(): string | null {
    if (this._tokenGetter) {
      return this._tokenGetter() || this.accessToken;
    }
    return this.accessToken;
  }

  connect(accessToken: string): Promise<unknown> {
    this.accessToken = accessToken;
    this.reconnectAttempts = 0;
    return this._connect();
  }

  private _connect(): Promise<unknown> {
    return new Promise((resolve, reject) => {
      if (this.ws) {
        this.ws.onclose = null;
        this.ws.close();
      }

      this.ws = new WebSocket(WS_URL);
      this.authResolve = resolve;
      this.authReject = reject;

      this.ws.onopen = () => {
        const token = this._getCurrentToken();
        this.ws!.send(JSON.stringify({ type: 'auth', token }));
      };

      this.ws.onmessage = (e: MessageEvent) => {
        this._handleMessage(JSON.parse(e.data as string));
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

  private _handleMessage(msg: Record<string, unknown>): void {
    switch (msg.type) {
      case 'auth:ok': {
        this.reconnectAttempts = 0;
        this._setState('connected');
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
        const pending = this.pendingRequests.get(msg.id as string);
        if (pending) {
          clearTimeout(pending.timer);
          pending.resolve(msg.data);
          this.pendingRequests.delete(msg.id as string);
        }
        break;
      }
      case 'event': {
        const listeners = this.eventListeners.get(msg.event as string);
        if (listeners) {
          listeners.forEach(cb => cb(msg.data));
        }
        break;
      }
      case 'error': {
        const error = msg.error as Record<string, unknown>;
        if (msg.id) {
          const pending = this.pendingRequests.get(msg.id as string);
          if (pending) {
            clearTimeout(pending.timer);
            const err = new Error(error.message as string);
            (err as unknown as Record<string, unknown>).code = error.code;
            pending.reject(err);
            this.pendingRequests.delete(msg.id as string);
          }
        }
        if (error.code === 'INVALID_TOKEN') {
          if (this.authReject) {
            this.authReject(new Error(error.message as string));
            this.authResolve = null;
            this.authReject = null;
          }
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

  send(action: string, payload: Record<string, unknown> = {}): Promise<unknown> {
    const dedupKey = action + ':' + JSON.stringify(payload);
    const inflight = this._inflightDedup.get(dedupKey);
    if (inflight) return inflight;

    const promise = this._sendRaw(action, payload).finally(() => {
      this._inflightDedup.delete(dedupKey);
    });
    this._inflightDedup.set(dedupKey, promise);
    return promise;
  }

  private _sendRaw(action: string, payload: Record<string, unknown> = {}): Promise<unknown> {
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

  on(event: string, callback: EventCallback): () => void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(callback);
    return () => {
      const listeners = this.eventListeners.get(event);
      if (listeners) {
        listeners.delete(callback);
        if (listeners.size === 0) this.eventListeners.delete(event);
      }
    };
  }

  onStateChange(callback: StateCallback): () => void {
    this.stateListeners.add(callback);
    return () => this.stateListeners.delete(callback);
  }

  updateToken(newToken: string): void {
    this.accessToken = newToken;
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'auth', token: newToken }));
    }
  }

  subscribe(channels: string[]): Promise<unknown> {
    if (!Array.isArray(channels) || channels.length === 0) return Promise.resolve();
    return this.send('subscribe', { channels });
  }

  unsubscribe(channels: string[]): Promise<unknown> {
    if (!Array.isArray(channels) || channels.length === 0) return Promise.resolve();
    return this.send('unsubscribe', { channels });
  }

  disconnect(): void {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectAttempts = MAX_RECONNECT_ATTEMPTS;
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.close();
      this.ws = null;
    }
    this._setState('disconnected');
    for (const [, pending] of this.pendingRequests) {
      clearTimeout(pending.timer);
      pending.reject(new Error('Connection closed'));
    }
    this.pendingRequests.clear();
  }

  private _setState(newState: WsConnectionState): void {
    if (this.state === newState) return;
    this.state = newState;
    this.stateListeners.forEach(cb => cb(newState));
  }

  private _scheduleReconnect(): void {
    if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      this._setState('failed');
      return;
    }
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), MAX_BACKOFF);
    this.reconnectAttempts++;
    this.reconnectTimer = setTimeout(() => {
      this._connect().catch(() => {});
    }, delay);
  }
}

export const wsClient = new WsClient();
