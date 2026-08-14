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

    if (accessKeyId && secretAccessKey && accountId) {
      const endpoint = process.env.R2_ENDPOINT || `https://${accountId}.r2.cloudflarestorage.com`;
      this.s3Client = new S3Client({
        region: 'auto',
        endpoint,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      });
    } else {
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
    if (this.isLocalStorage || !this.s3Client) {
      const localFilePath = path.join(this.localStorageDir, key.replace(/\//g, '_'));
      return fs.promises.readFile(localFilePath);
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
      // Local fallback file URL path
      return `/uploads/${key.replace(/\//g, '_')}`;
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
