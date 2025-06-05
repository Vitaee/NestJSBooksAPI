import { registerAs } from '@nestjs/config';

export default registerAs('minio', () => ({
  endpoint:
    process.env.MINIO_INTERNAL_ENDPOINT ||
    process.env.MINIO_ENDPOINT ||
    'localhost:9000',

  publicEndpoint:
    process.env.MINIO_PUBLIC_ENDPOINT ||
    process.env.MINIO_ENDPOINT ||
    'http://localhost:9000',

  accessKey:
    process.env.MINIO_ROOT_USER || process.env.MINIO_ROOT_USER || 'root',
  secretKey:
    process.env.MINIO_ROOT_PASSWORD ||
    process.env.MINIO_ROOT_PASSWORD ||
    'rootpassword',

  bucket: process.env.MINIO_BUCKET || 'cantest',
  useSSL: process.env.MINIO_USE_SSL === 'true' || false,
  port: parseInt(process.env.MINIO_PORT || '9000', 10),

  usePublicAccess: process.env.MINIO_USE_PUBLIC_ACCESS !== 'false', // Default to true
}));
