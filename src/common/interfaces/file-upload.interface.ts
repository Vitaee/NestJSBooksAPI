export interface FileUploadResult {
  fileName: string;
  originalName: string;
  url: string;
  etag: string;
  size: number;
  bucket: string;
}

export interface FileUploadOptions {
  bucket?: string;
  fileName?: string;
  contentType?: string;
  metadata?: Record<string, number | string>;
}

export interface PresignedUrlOptions {
  bucket?: string;
  fileName?: string;
  expiry?: number;
}

export interface IFileStorageService {
  uploadFile(
    file: Buffer,
    fileName: string,
    options?: FileUploadOptions,
  ): Promise<FileUploadResult>;
  downloadFile(fileName: string, bucket?: string): Promise<Buffer>;
  deleteFile(fileName: string, bucket?: string): Promise<void>;
  getPresignedUrl(
    fileName: string,
    options?: PresignedUrlOptions,
  ): Promise<string>;
  fileExists(fileName: string, bucket?: string): Promise<boolean>;
  listFiles(bucket?: string, prefix?: string): Promise<string[]>;
}
