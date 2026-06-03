import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';

export type BucketType = 'main' | 'temp' | 'certificates' | 'avatars' | 'exam-media';

const BUCKET_NAMES: Record<BucketType, string> = {
  main: 'azmoonyar',
  temp: 'azmoonyar-temp',
  certificates: 'azmoonyar-certificates',
  avatars: 'azmoonyar-avatars',
  'exam-media': 'azmoonyar-exam-media',
};

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private client: Minio.Client;
  private defaultBucket: string;

  constructor(private config: ConfigService) {
    this.defaultBucket = config.get('MINIO_BUCKET', 'azmoonyar');
    this.client = new Minio.Client({
      endPoint: config.get('MINIO_ENDPOINT', 'localhost'),
      port: parseInt(config.get('MINIO_PORT', '9000'), 10),
      useSSL: config.get('MINIO_USE_SSL', 'false') === 'true',
      accessKey: config.get('MINIO_ACCESS_KEY', 'minioadmin'),
      secretKey: config.get('MINIO_SECRET_KEY', 'minioadmin'),
    });
  }

  // ─── آپلود فایل (backward compatible) ───────────────────
  async upload(
    buffer: Buffer,
    originalName: string,
    mimeType: string,
    folder = 'uploads',
  ): Promise<string> {
    return this.uploadToFolder(buffer, originalName, mimeType, 'main', folder);
  }

  // ─── آپلود به bucket مشخص ────────────────────────────────
  async uploadToFolder(
    buffer: Buffer,
    originalName: string,
    mimeType: string,
    bucketType: BucketType = 'main',
    folder = 'uploads',
  ): Promise<string> {
    const bucket = this.getBucketName(bucketType);
    const ext = path.extname(originalName);
    const filename = `${folder}/${uuidv4()}${ext}`;

    try {
      await this.client.putObject(bucket, filename, buffer, buffer.length, {
        'Content-Type': mimeType,
      });

      return this.getPublicUrl(filename, bucketType);
    } catch (err) {
      this.logger.error(`Upload failed to ${bucket}/${filename}: ${err.message}`);
      throw new Error('خطا در آپلود فایل');
    }
  }

  // ─── آپلود آواتار ────────────────────────────────────────
  async uploadAvatar(buffer: Buffer, userId: string, mimeType: string): Promise<string> {
    const ext = mimeType === 'image/png' ? '.png' : '.jpg';
    const filename = `${userId}${ext}`;
    const bucket = BUCKET_NAMES.avatars;

    try {
      await this.client.putObject(bucket, filename, buffer, buffer.length, {
        'Content-Type': mimeType,
      });
      return this.getPublicUrl(filename, 'avatars');
    } catch (err) {
      this.logger.error(`Avatar upload failed: ${err.message}`);
      throw new Error('خطا در آپلود آواتار');
    }
  }

  // ─── آپلود گواهینامه (خصوصی) ────────────────────────────
  async uploadCertificate(buffer: Buffer, certificateId: string): Promise<string> {
    const filename = `${certificateId}.pdf`;
    const bucket = BUCKET_NAMES.certificates;

    try {
      await this.client.putObject(bucket, filename, buffer, buffer.length, {
        'Content-Type': 'application/pdf',
      });
      return filename; // برگشت نام فایل، نه URL عمومی
    } catch (err) {
      this.logger.error(`Certificate upload failed: ${err.message}`);
      throw new Error('خطا در ذخیره گواهینامه');
    }
  }

  // ─── حذف فایل ───────────────────────────────────────────
  async delete(fileUrl: string, bucketType: BucketType = 'main'): Promise<void> {
    try {
      const bucket = this.getBucketName(bucketType);
      const objectName = this.extractObjectName(fileUrl, bucket);
      await this.client.removeObject(bucket, objectName);
    } catch (err) {
      this.logger.warn(`Delete failed: ${err.message}`);
    }
  }

  // ─── URL موقت (presigned) برای فایل‌های خصوصی ──────────
  async getPresignedUrl(
    objectName: string,
    bucketType: BucketType = 'certificates',
    expirySeconds = 3600,
  ): Promise<string> {
    const bucket = this.getBucketName(bucketType);
    return this.client.presignedGetObject(bucket, objectName, expirySeconds);
  }

  // ─── URL عمومی ──────────────────────────────────────────
  getPublicUrl(objectName: string, bucketType: BucketType = 'main'): string {
    const endpoint = this.config.get('MINIO_ENDPOINT', 'localhost');
    const port = this.config.get('MINIO_PORT', '9000');
    const useSSL = this.config.get('MINIO_USE_SSL', 'false') === 'true';
    const protocol = useSSL ? 'https' : 'http';
    const bucket = this.getBucketName(bucketType);
    return `${protocol}://${endpoint}:${port}/${bucket}/${objectName}`;
  }

  // ─── نام bucket بر اساس نوع ─────────────────────────────
  getBucketName(type: BucketType): string {
    return BUCKET_NAMES[type] || this.defaultBucket;
  }

  // ─── استخراج نام فایل از URL ────────────────────────────
  private extractObjectName(url: string, bucket: string): string {
    const parts = url.split(`/${bucket}/`);
    return parts[1] || url;
  }
}
