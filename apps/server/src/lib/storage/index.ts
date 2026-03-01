import type { Readable } from 'stream';

export interface StorageProvider {
  upload(key: string, data: Buffer | Readable, mimeType: string): Promise<string>;
  delete(key: string): Promise<void>;
  getUrl(key: string): string;
}

export { LocalStorageProvider } from './local.js';
export { S3StorageProvider } from './s3.js';
