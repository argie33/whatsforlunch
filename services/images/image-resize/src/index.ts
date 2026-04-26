import { Logger } from '@aws-lambda-powertools/logger';
import { S3Event } from 'aws-lambda';
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import sharp from 'sharp';
import { z } from 'zod';

const logger = new Logger({ serviceName: 'image-resize' });

const S3EventRecordSchema = z.object({
  s3: z.object({
    bucket: z.object({
      name: z.string(),
    }),
    object: z.object({
      key: z.string(),
    }),
  }),
});

export const handler = async (event: S3Event): Promise<void> => {
  logger.info('image-resize triggered', { event });

  const s3Client = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });

  for (const record of event.Records) {
    try {
      const validated = S3EventRecordSchema.parse(record);
      const { bucket, object } = validated.s3;
      const originalKey = object.key;

      logger.info('Processing image', { bucket: bucket.name, key: originalKey });

      // TODO: Phase B implementation
      // 1. Download original image from S3
      // 2. Validate image format (magic bytes)
      // 3. Strip EXIF data
      // 4. Resize to 1024px max dimension (preserving aspect ratio)
      // 5. Compress to JPEG q70
      // 6. Upload resized version to same bucket with -resized suffix
      // 7. Update item metadata to point to resized path

      logger.info('Image processing stub (Phase B will implement)', { originalKey });

      // Stub: acknowledge the event
      return;
    } catch (error) {
      logger.error('Failed to process image record', { error, record });
      throw error;
    }
  }
};
