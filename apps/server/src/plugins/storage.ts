import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';
import type { StorageProvider } from '../lib/storage/index.js';
import { LocalStorageProvider } from '../lib/storage/local.js';
import { S3StorageProvider } from '../lib/storage/s3.js';
import { env } from '../env.js';

declare module 'fastify' {
  interface FastifyInstance {
    storage: StorageProvider;
  }
}

export default fp(async (fastify: FastifyInstance) => {
  let provider: StorageProvider;

  if (env.STORAGE_PROVIDER === 's3') {
    if (!env.S3_ENDPOINT || !env.S3_ACCESS_KEY || !env.S3_SECRET_KEY) {
      throw new Error('S3 storage requires S3_ENDPOINT, S3_ACCESS_KEY, and S3_SECRET_KEY');
    }
    provider = new S3StorageProvider({
      endpoint: env.S3_ENDPOINT,
      region: env.S3_REGION,
      bucket: env.S3_BUCKET,
      accessKeyId: env.S3_ACCESS_KEY,
      secretAccessKey: env.S3_SECRET_KEY,
      forcePathStyle: env.S3_FORCE_PATH_STYLE,
    });
    fastify.log.info({ endpoint: env.S3_ENDPOINT, bucket: env.S3_BUCKET }, 'Using S3 storage');
  } else {
    provider = new LocalStorageProvider();
    fastify.log.info('Using local file storage');
  }

  fastify.decorate('storage', provider);
});
