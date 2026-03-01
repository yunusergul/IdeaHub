import { mkdir, writeFile, unlink } from 'fs/promises';
import { createWriteStream } from 'fs';
import { join } from 'path';
import { pipeline } from 'stream/promises';
import type { Readable } from 'stream';
import type { StorageProvider } from './index.js';

const UPLOAD_DIR = join(process.cwd(), 'uploads');

export class LocalStorageProvider implements StorageProvider {
  constructor() {
    // Ensure directory exists on construction
    void mkdir(UPLOAD_DIR, { recursive: true });
  }

  async upload(key: string, data: Buffer | Readable, _mimeType: string): Promise<string> {
    await mkdir(UPLOAD_DIR, { recursive: true });
    const filePath = join(UPLOAD_DIR, key);

    if (Buffer.isBuffer(data)) {
      await writeFile(filePath, data);
    } else {
      await pipeline(data, createWriteStream(filePath));
    }

    return `/uploads/${key}`;
  }

  async delete(key: string): Promise<void> {
    try {
      await unlink(join(UPLOAD_DIR, key));
    } catch {
      // File may not exist, ignore
    }
  }

  getUrl(key: string): string {
    return `/uploads/${key}`;
  }
}
