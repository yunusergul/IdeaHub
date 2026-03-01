import fp from 'fastify-plugin';
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { verifyAccessToken, type JwtPayload } from '../lib/jwt.js';

declare module 'fastify' {
  interface FastifyRequest {
    user?: JwtPayload;
  }
}

export default fp(async (fastify: FastifyInstance) => {
  fastify.decorateRequest('user', undefined);

  fastify.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      reply.code(401).send({ error: { code: 'UNAUTHORIZED', message: 'Token required' } });
      return;
    }

    try {
      const token = authHeader.slice(7);
      request.user = verifyAccessToken(token);
    } catch {
      reply.code(401).send({ error: { code: 'TOKEN_EXPIRED', message: 'Invalid or expired token' } });
    }
  });
});

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}
