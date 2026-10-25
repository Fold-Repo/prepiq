import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const writeFileAsync = promisify(fs.writeFile);
const unlinkAsync = promisify(fs.unlink);

export class StorageService {
  private s3Client: S3Client | null = null;
  private bucketName: string;
  private isLocalStorage: boolean = false;
  private localStorageDir: string;

  constructor() {
    this.bucketName = process.env.R2_BUCKET_NAME || 'exam-ai-documents';
    this.localStorageDir = path.join(process.cwd(), 'uploads');

    const accountId = process.env.R2_ACCOUNT_ID;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
    const endpoint = process.env.R2_ENDPOINT;

    console.log(`[StorageService] R2_ACCOUNT_ID: ${accountId ? '✓ set' : '✗ MISSING'}`);
    console.log(`[StorageService] R2_ACCESS_KEY_ID: ${accessKeyId ? '✓ set' : '✗ MISSING'}`);
    console.log(`[StorageService] R2_SECRET_ACCESS_KEY: ${secretAccessKey ? '✓ set' : '✗ MISSING'}`);
    console.log(`[StorageService] R2_ENDPOINT: ${endpoint || '(default)'}`);
    console.log(`[StorageService] R2_BUCKET_NAME: ${this.bucketName}`);

    if (accessKeyId && secretAccessKey && accountId) {
      const resolvedEndpoint = endpoint || `https://${accountId}.r2.cloudflarestorage.com`;
      console.log(`[StorageService] Mode: R2/S3 → ${resolvedEndpoint}`);
      this.s3Client = new S3Client({
        region: 'auto',
        endpoint: resolvedEndpoint,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      });
    } else {
      console.log(`[StorageService] Mode: LOCAL (${this.localStorageDir})`);
      this.isLocalStorage = true;
      if (!fs.existsSync(this.localStorageDir)) {
        fs.mkdirSync(this.localStorageDir, { recursive: true });
      }
    }
  }


  async uploadFile(key: string, buffer: Buffer, mimeType: string): Promise<string> {
    if (this.isLocalStorage || !this.s3Client) {
      const localFilePath = path.join(this.localStorageDir, key.replace(/\//g, '_'));
      await writeFileAsync(localFilePath, buffer);
      return key;
    }

    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
      })
    );

    return key;
  }

  async downloadFile(key: string): Promise<Buffer> {
    // Always check local storage first — handles files uploaded before R2 was configured
    const localFilePath = path.join(this.localStorageDir, key.replace(/\//g, '_'));
    if (fs.existsSync(localFilePath)) {
      console.log(`[StorageService] Found file locally: ${localFilePath}`);
      return fs.promises.readFile(localFilePath);
    }

    if (this.isLocalStorage || !this.s3Client) {
      throw new Error(`File not found locally for key: ${key}`);
    }

    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });
    const response = await this.s3Client.send(command);
    if (!response.Body) {
      throw new Error('No body returned from S3');
    }
    const byteArray = await response.Body.transformToByteArray();
    return Buffer.from(byteArray);
  }


  async getSignedDownloadUrl(key: string, expiresInSeconds: number = 900): Promise<string> {
    if (this.isLocalStorage || !this.s3Client) {
      const origin = (process.env.API_PUBLIC_ORIGIN || 'http://localhost:4000').replace(/\/$/, '');
      return `${origin}/uploads/${key.replace(/\//g, '_')}`;
    }

    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    return getSignedUrl(this.s3Client, command, { expiresIn: expiresInSeconds });
  }

  async deleteFile(key: string): Promise<void> {
    if (this.isLocalStorage || !this.s3Client) {
      const localFilePath = path.join(this.localStorageDir, key.replace(/\//g, '_'));
      if (fs.existsSync(localFilePath)) {
        await unlinkAsync(localFilePath);
      }
      return;
    }

    await this.s3Client.send(
      new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      })
    );
  }
}
