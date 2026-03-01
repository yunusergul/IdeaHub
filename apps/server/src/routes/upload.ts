import type { FastifyInstance } from 'fastify';
import { randomUUID } from 'crypto';
import { Transform } from 'stream';
import type { TransformCallback } from 'stream';

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'application/pdf',
  'text/plain',
  'text/markdown',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]);

const ALLOWED_EXTENSIONS = new Set([
  'jpg', 'jpeg', 'png', 'gif', 'webp', 'svg',
  'pdf', 'txt', 'md', 'doc', 'docx', 'xls', 'xlsx',
]);

export async function uploadRoutes(fastify: FastifyInstance) {
  fastify.post('/api/upload', {
    preHandler: fastify.authenticate,
  }, async (request, reply) => {
    const file = await request.file();
    if (!file) {
      return reply.code(400).send({ error: { code: 'NO_FILE', message: 'No file provided' } });
    }

    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      return reply.code(400).send({ error: { code: 'INVALID_FILE_TYPE', message: 'Invalid file type' } });
    }

    const ext = (file.filename.split('.').pop() ?? '').toLowerCase();
    if (!ext || !ALLOWED_EXTENSIONS.has(ext)) {
      return reply.code(400).send({ error: { code: 'INVALID_FILE_TYPE', message: 'Invalid file extension' } });
    }

    const id = randomUUID();
    const key = `${id}.${ext}`;

    // Stream file through a byte-counting transform
    let size = 0;
    const counter = new Transform({
      transform(chunk: Buffer, _encoding: string, callback: TransformCallback) {
        size += chunk.length;
        callback(null, chunk);
      },
    });

    const fileStream = file.file.pipe(counter);
    const url = await fastify.storage.upload(key, fileStream, file.mimetype);

    const attachment = await fastify.prisma.attachment.create({
      data: {
        id,
        filename: file.filename,
        url,
        mimeType: file.mimetype,
        size,
        uploadedById: request.user?.sub,
      },
    });

    return attachment;
  });
}
