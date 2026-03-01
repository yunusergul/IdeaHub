import type { WebSocket } from '@fastify/websocket';
import { randomUUID } from 'crypto';
import type { WsServerMessage } from '@ideahub/shared';

const MAX_TOTAL_CONNECTIONS = 1000;
const MAX_CONNECTIONS_PER_USER = 5;
const RATE_LIMIT_WINDOW_MS = 10_000;
const RATE_LIMIT_MAX_MESSAGES = 30;

interface Connection {
  socket: WebSocket;
  userId?: string;
  role?: string;
  messageTimestamps: number[];
}

class ConnectionManager {
  private connections = new Map<string, Connection>();

  get totalConnections(): number {
    return this.connections.size;
  }

  add(socket: WebSocket): string | null {
    if (this.connections.size >= MAX_TOTAL_CONNECTIONS) {
      return null;
    }
    const id = randomUUID();
    this.connections.set(id, { socket, messageTimestamps: [] });
    return id;
  }

  remove(connId: string): void {
    this.connections.delete(connId);
  }

  authenticate(connId: string, userId: string, role: string): boolean {
    const conn = this.connections.get(connId);
    if (!conn) return false;

    // Check per-user connection limit
    let userConnCount = 0;
    for (const [, c] of this.connections) {
      if (c.userId === userId) userConnCount++;
    }
    if (userConnCount >= MAX_CONNECTIONS_PER_USER) {
      return false;
    }

    conn.userId = userId;
    conn.role = role;
    return true;
  }

  isAuthenticated(connId: string): boolean {
    const conn = this.connections.get(connId);
    return !!conn?.userId;
  }

  getUserId(connId: string): string | undefined {
    return this.connections.get(connId)?.userId;
  }

  getRole(connId: string): string | undefined {
    return this.connections.get(connId)?.role;
  }

  /**
   * Check rate limit for a connection. Returns true if within limits.
   */
  checkRateLimit(connId: string): boolean {
    const conn = this.connections.get(connId);
    if (!conn) return false;

    const now = Date.now();
    const cutoff = now - RATE_LIMIT_WINDOW_MS;

    // Remove timestamps outside the window (ring buffer cleanup)
    while (conn.messageTimestamps.length > 0 && conn.messageTimestamps[0]! < cutoff) {
      conn.messageTimestamps.shift();
    }

    if (conn.messageTimestamps.length >= RATE_LIMIT_MAX_MESSAGES) {
      return false;
    }

    conn.messageTimestamps.push(now);
    return true;
  }

  send(connId: string, message: WsServerMessage): void {
    const conn = this.connections.get(connId);
    if (conn?.socket.readyState === 1) {
      conn.socket.send(JSON.stringify(message));
    }
  }

  broadcastAll(message: WsServerMessage): void {
    const str = JSON.stringify(message);
    for (const [, conn] of this.connections) {
      if (conn.userId && conn.socket.readyState === 1) {
        conn.socket.send(str);
      }
    }
  }

  broadcastToUser(userId: string, message: WsServerMessage): void {
    const str = JSON.stringify(message);
    for (const [, conn] of this.connections) {
      if (conn.userId === userId && conn.socket.readyState === 1) {
        conn.socket.send(str);
      }
    }
  }

  getConnectedUserIds(): string[] {
    const userIds = new Set<string>();
    for (const [, conn] of this.connections) {
      if (conn.userId) userIds.add(conn.userId);
    }
    return [...userIds];
  }
}

export const connectionManager = new ConnectionManager();
