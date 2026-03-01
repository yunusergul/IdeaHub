import type { FastifyInstance } from 'fastify';
import { connectionManager } from '../connection-manager.js';
import { verifyAccessToken, signAccessToken, verifyRefreshToken } from '../../lib/jwt.js';
import { randomUUID } from 'crypto';

const userSelect = { id: true, email: true, name: true, role: true, department: true, initials: true, locale: true };

export async function handleAuth(
  fastify: FastifyInstance,
  connId: string,
  token: string,
): Promise<void> {
  try {
    const payload = verifyAccessToken(token);
    const user = await fastify.prisma.user.findUnique({
      where: { id: payload.sub },
      select: userSelect,
    });

    if (!user) {
      connectionManager.send(connId, {
        type: 'error',
        error: { code: 'USER_NOT_FOUND', message: 'User not found' },
      });
      return;
    }

    const authenticated = connectionManager.authenticate(connId, user.id, user.role);
    if (!authenticated) {
      connectionManager.send(connId, {
        type: 'error',
        error: { code: 'TOO_MANY_CONNECTIONS', message: 'Too many connections for this user' },
      });
      return;
    }
    connectionManager.send(connId, {
      type: 'auth:ok',
      user,
    });

    fastify.log.info({ connId, userId: user.id }, 'WebSocket client authenticated');
  } catch {
    connectionManager.send(connId, {
      type: 'error',
      error: { code: 'INVALID_TOKEN', message: 'Invalid or expired token' },
    });
  }
}

export async function handleAuthRefresh(
  fastify: FastifyInstance,
  connId: string,
  refreshToken: string,
): Promise<void> {
  try {
    verifyRefreshToken(refreshToken);

    const result = await fastify.prisma.$transaction(async (tx) => {
      const stored = await tx.refreshToken.findUnique({
        where: { token: refreshToken },
        include: { user: { select: userSelect } },
      });

      if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
        return null;
      }

      // Revoke old token
      await tx.refreshToken.update({
        where: { id: stored.id },
        data: { revokedAt: new Date() },
      });

      // Issue new tokens
      const newAccessToken = signAccessToken({
        sub: stored.user.id,
        email: stored.user.email,
        role: stored.user.role,
      });

      const newRefreshTokenValue = randomUUID();
      await tx.refreshToken.create({
        data: {
          userId: stored.user.id,
          token: newRefreshTokenValue,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });

      return { user: stored.user, accessToken: newAccessToken };
    });

    if (!result) {
      connectionManager.send(connId, {
        type: 'error',
        error: { code: 'INVALID_REFRESH_TOKEN', message: 'Invalid refresh token' },
      });
      return;
    }

    const authenticated = connectionManager.authenticate(connId, result.user.id, result.user.role);
    if (!authenticated) {
      connectionManager.send(connId, {
        type: 'error',
        error: { code: 'TOO_MANY_CONNECTIONS', message: 'Too many connections for this user' },
      });
      return;
    }
    connectionManager.send(connId, {
      type: 'auth:ok',
      user: result.user,
      accessToken: result.accessToken,
    });
  } catch {
    connectionManager.send(connId, {
      type: 'error',
      error: { code: 'INVALID_REFRESH_TOKEN', message: 'Invalid refresh token' },
    });
  }
}
