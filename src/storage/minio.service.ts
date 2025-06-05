import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';
import { v4 as uuidv4 } from 'uuid';
import {
  IFileStorageService,
  FileUploadResult,
  FileUploadOptions,
  PresignedUrlOptions,
} from '../common/interfaces/file-upload.interface';
import { AppLoggerService } from '../utils/nestjs-logger.service';

@Injectable()
export class MinioService implements IFileStorageService, OnModuleInit {
  private minioClient: Minio.Client;
  private readonly defaultBucket: string;
  private readonly publicEndpoint: string;
  private readonly internalEndpoint: string;
  private readonly usePublicAccess: boolean;
  private readonly logger: AppLoggerService;
  constructor(private readonly configService: ConfigService) {
    const minioConfig = this.configService.get('minio');
    this.defaultBucket = minioConfig.bucket;
    this.publicEndpoint = minioConfig.publicEndpoint;
    this.internalEndpoint = minioConfig.endpoint;
    this.usePublicAccess = minioConfig.usePublicAccess !== false; // Default to true

    // Parse internal endpoint for MinIO client
    const [host, port] = minioConfig.endpoint.split(':');
    this.logger = new AppLoggerService(this.configService);

    this.minioClient = new Minio.Client({
      endPoint: host,
      port: parseInt(port || '9000'),
      useSSL: minioConfig.useSSL,
      accessKey: minioConfig.accessKey,
      secretKey: minioConfig.secretKey,
    });

    this.logger.logServiceOperation(
      `MinIO configured - Internal: ${this.internalEndpoint}, Public: ${this.publicEndpoint}, Public Access: ${this.usePublicAccess}`,
      'MinIOService',
    );
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.ensureBucketExists(this.defaultBucket);

      // Set bucket policy for public read access if enabled
      if (this.usePublicAccess) {
        await this.setBucketPublicReadPolicy(this.defaultBucket);
      }

      this.logger.logServiceOperation(
        `MinIO service initialized successfully with bucket: ${this.defaultBucket}`,
        'MinIOService',
      );
    } catch (error) {
      this.logger.logServiceOperation(
        'Failed to initialize MinIO service',
        error,
      );
      throw error;
    }
  }

  async uploadFile(
    file: Buffer,
    originalFileName: string,
    options?: FileUploadOptions,
  ): Promise<FileUploadResult> {
    try {
      const bucket = options?.bucket || this.defaultBucket;

      // Sanitize filename to avoid encoding issues
      const sanitizedOriginalName = this.sanitizeFileName(originalFileName);
      const fileName =
        options?.fileName || this.generateFileName(sanitizedOriginalName);
      const contentType =
        options?.contentType || this.getContentType(sanitizedOriginalName);

      await this.ensureBucketExists(bucket);

      const uploadOptions: any = {
        'Content-Type': contentType,
        ...options?.metadata,
      };

      this.logger.logServiceOperation(
        `Uploading file: ${fileName} to bucket: ${bucket}`,
        'MinIOService',
      );
      const result = await this.minioClient.putObject(
        bucket,
        fileName,
        file,
        uploadOptions,
      );

      // Generate URL based on public access setting
      const url = this.usePublicAccess
        ? this.getPublicUrl(bucket, fileName)
        : await this.getPublicPresignedUrl(fileName, {
            bucket,
            expiry: 24 * 60 * 60, // 24 hours default
          });

      return {
        fileName,
        originalName: sanitizedOriginalName,
        url,
        etag: result.etag,
        size: file.length,
        bucket,
      };
    } catch (error) {
      this.logger.logServiceOperation(
        `Failed to upload file: ${originalFileName}`,
        error,
      );
      throw new Error(`Upload failed: ${error.message}`);
    }
  }

  async downloadFile(fileName: string, bucket?: string): Promise<Buffer> {
    try {
      const targetBucket = bucket || this.defaultBucket;
      const dataStream = await this.minioClient.getObject(
        targetBucket,
        fileName,
      );

      const chunks: Buffer[] = [];
      return new Promise((resolve, reject) => {
        dataStream.on('data', (chunk) => chunks.push(chunk));
        dataStream.on('end', () => resolve(Buffer.concat(chunks)));
        dataStream.on('error', reject);
      });
    } catch (error) {
      this.logger.logServiceOperation(
        `Failed to download file: ${fileName}`,
        error,
      );
      throw new Error(`Download failed: ${error.message}`);
    }
  }

  async deleteFile(fileName: string, bucket?: string): Promise<void> {
    try {
      const targetBucket = bucket || this.defaultBucket;
      await this.minioClient.removeObject(targetBucket, fileName);
      this.logger.logServiceOperation(
        `File deleted successfully: ${fileName} from bucket: ${targetBucket}`,
        'MinIOService',
      );
    } catch (error) {
      this.logger.error(`Failed to delete file: ${fileName}`, error);
      throw new Error(`Delete failed: ${error.message}`);
    }
  }

  async getPresignedUrl(
    fileName: string,
    options?: PresignedUrlOptions,
  ): Promise<string> {
    try {
      const bucket = options?.bucket || this.defaultBucket;
      const expiry = options?.expiry || 60 * 60; // 1 hour default

      return await this.minioClient.presignedGetObject(
        bucket,
        fileName,
        expiry,
      );
    } catch (error) {
      this.logger.logServiceOperation(
        `Failed to generate presigned URL for: ${fileName}`,
        error,
      );
      throw new Error(`Presigned URL generation failed: ${error.message}`);
    }
  }

  /**
   * Generate public-accessible presigned URL
   */
  async getPublicPresignedUrl(
    fileName: string,
    options?: PresignedUrlOptions,
  ): Promise<string> {
    try {
      const bucket = options?.bucket || this.defaultBucket;
      const expiry = options?.expiry || 60 * 60; // 1 hour default

      // Get presigned URL using internal endpoint
      const presignedUrl = await this.minioClient.presignedGetObject(
        bucket,
        fileName,
        expiry,
      );

      // Replace internal endpoint with public endpoint
      const publicUrl = this.convertToPublicUrl(presignedUrl);

      this.logger.logServiceOperation(
        `Generated public presigned URL: ${publicUrl}`,
        'MinIOService',
      );
      return publicUrl;
    } catch (error) {
      this.logger.logServiceOperation(
        `Failed to generate public presigned URL for: ${fileName}`,
        error,
      );
      throw new Error(
        `Public presigned URL generation failed: ${error.message}`,
      );
    }
  }

  /**
   * Generate simple public URL without signature (for public buckets)
   */
  getPublicUrl(bucket: string, fileName: string): string {
    try {
      // Ensure public endpoint has protocol
      const endpoint = this.publicEndpoint.startsWith('http')
        ? this.publicEndpoint
        : `http://${this.publicEndpoint}`;

      // Remove trailing slash from endpoint
      const cleanEndpoint = endpoint.replace(/\/$/, '');

      // Construct simple public URL
      const publicUrl = `${cleanEndpoint}/${bucket}/${fileName}`;

      this.logger.logServiceOperation(
        `Generated public URL: ${publicUrl}`,
        'MinIOService',
      );
      return publicUrl;
    } catch (error) {
      this.logger.logServiceOperation(
        `Failed to generate public URL for: ${fileName}`,
        error,
      );
      throw new Error(`Public URL generation failed: ${error.message}`);
    }
  }

  async fileExists(fileName: string, bucket?: string): Promise<boolean> {
    try {
      const targetBucket = bucket || this.defaultBucket;
      await this.minioClient.statObject(targetBucket, fileName);
      return true;
    } catch (error) {
      if (error.code === 'NotFound') {
        return false;
      }
      this.logger.logServiceOperation(
        `Failed to check file existence: ${fileName}`,
        error,
      );
      throw new Error(`File existence check failed: ${error.message}`);
    }
  }

  async listFiles(bucket?: string, prefix?: string): Promise<string[]> {
    try {
      const targetBucket = bucket || this.defaultBucket;
      const objectsStream = this.minioClient.listObjects(
        targetBucket,
        prefix,
        true,
      );

      const files: string[] = [];
      return new Promise((resolve, reject) => {
        objectsStream.on('data', (obj) => files.push(obj.name || ''));
        objectsStream.on('end', () => resolve(files));
        objectsStream.on('error', reject);
      });
    } catch (error) {
      this.logger.logServiceOperation(
        `Failed to list files in bucket: ${bucket || this.defaultBucket}`,
        error,
      );
      throw new Error(`List files failed: ${error.message}`);
    }
  }

  private async ensureBucketExists(bucket: string): Promise<void> {
    try {
      const exists = await this.minioClient.bucketExists(bucket);
      if (!exists) {
        await this.minioClient.makeBucket(bucket);
        this.logger.logServiceOperation(
          `Bucket created: ${bucket}`,
          'MinIOService',
        );
      }
    } catch (error) {
      this.logger.logServiceOperation(
        `Failed to ensure bucket exists: ${bucket}`,
        'MinIOService',
      );
      throw error;
    }
  }

  /**
   * Set bucket policy to allow public read access
   */
  private async setBucketPublicReadPolicy(bucket: string): Promise<void> {
    try {
      const policy = {
        Version: '2012-10-17',
        Statement: [
          {
            Sid: 'PublicReadGetObject',
            Effect: 'Allow',
            Principal: '*',
            Action: ['s3:GetObject'],
            Resource: [`arn:aws:s3:::${bucket}/*`],
          },
        ],
      };

      await this.minioClient.setBucketPolicy(bucket, JSON.stringify(policy));
      this.logger.logServiceOperation(
        `Bucket ${bucket} set to public read access`,
        'MinIOService',
      );
    } catch (error) {
      this.logger.logServiceOperation(
        `Failed to set public policy for bucket ${bucket}:`,
        error.message,
      );
      // Don't throw error as this might not be critical
    }
  }

  private generateFileName(originalFileName: string): string {
    const extension = originalFileName.split('.').pop() || '';
    const timestamp = Date.now();
    const uuid = uuidv4().substring(0, 8); // Shorter UUID for cleaner filenames
    const baseName = originalFileName.split('.').slice(0, -1).join('.');

    // Create a clean, URL-safe filename
    const cleanBaseName = this.sanitizeFileName(baseName).substring(0, 50); // Limit length
    return `${timestamp}-${uuid}-${cleanBaseName}.${extension}`;
  }

  private sanitizeFileName(fileName: string): string {
    // Replace Turkish and special characters with ASCII equivalents
    const replacements: Record<string, string> = {
      ç: 'c',
      Ç: 'C',
      ğ: 'g',
      Ğ: 'G',
      ı: 'i',
      İ: 'I',
      ö: 'o',
      Ö: 'O',
      ş: 's',
      Ş: 'S',
      ü: 'u',
      Ü: 'U',
      ' ': '_',
      à: 'a',
      á: 'a',
      â: 'a',
      ã: 'a',
      ä: 'a',
      å: 'a',
      è: 'e',
      é: 'e',
      ê: 'e',
      ë: 'e',
      ì: 'i',
      í: 'i',
      î: 'i',
      ï: 'i',
      ò: 'o',
      ó: 'o',
      ô: 'o',
      õ: 'o',
      ù: 'u',
      ú: 'u',
      û: 'u',
      ñ: 'n',
      ý: 'y',
      ÿ: 'y',
    };

    let sanitized = fileName;
    for (const [char, replacement] of Object.entries(replacements)) {
      sanitized = sanitized.replace(new RegExp(char, 'g'), replacement);
    }

    // Remove any remaining non-ASCII characters and special characters except dots, hyphens, and underscores
    sanitized = sanitized.replace(/[^a-zA-Z0-9._-]/g, '_');

    // Remove multiple consecutive underscores
    sanitized = sanitized.replace(/_+/g, '_');

    // Remove leading/trailing underscores
    sanitized = sanitized.replace(/^_+|_+$/g, '');

    return sanitized;
  }

  private convertToPublicUrl(internalUrl: string): string {
    try {
      const url = new URL(internalUrl);

      // Parse internal endpoint
      const [internalHost, internalPort] = this.internalEndpoint.split(':');

      // Parse public endpoint
      const publicUrl = new URL(this.publicEndpoint);

      // Replace the hostname and port if it matches internal endpoint
      if (
        url.hostname === internalHost &&
        url.port === (internalPort || '9000')
      ) {
        url.hostname = publicUrl.hostname;
        url.port =
          publicUrl.port || (publicUrl.protocol === 'https:' ? '443' : '80');
        url.protocol = publicUrl.protocol;
      }

      return url.toString();
    } catch (error) {
      this.logger.error(
        `Failed to convert internal URL to public URL: ${internalUrl}`,
        error,
      );
      // Fallback: simple string replacement
      return internalUrl.replace(
        this.internalEndpoint,
        this.publicEndpoint.replace(/^https?:\/\//, ''),
      );
    }
  }

  private getContentType(fileName: string): string {
    const extension = fileName.split('.').pop()?.toLowerCase();
    if (!extension) return 'application/octet-stream';

    const contentTypes: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      txt: 'text/plain',
    };
    return contentTypes[extension] || 'application/octet-stream';
  }
}
