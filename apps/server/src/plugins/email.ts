import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';
import { createTransport, type Transporter } from 'nodemailer';
import { env } from '../env.js';

declare module 'fastify' {
  interface FastifyInstance {
    mailer: Transporter;
  }
}

export default fp(async (fastify: FastifyInstance) => {
  const transporter = createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    ...(env.SMTP_USER && env.SMTP_PASS
      ? { auth: { user: env.SMTP_USER, pass: env.SMTP_PASS } }
      : {}),
  });

  fastify.decorate('mailer', transporter);

  fastify.log.info({ host: env.SMTP_HOST, port: env.SMTP_PORT }, 'Email transporter configured');
});
