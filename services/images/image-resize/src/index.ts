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

// Allowed image MIME types and their magic bytes
const ALLOWED_TYPES = {
  'image/jpeg': [0xff, 0xd8, 0xff],
  'image/png': [0x89, 0x50, 0x4e, 0x47],
  'image/webp': [0x52, 0x49, 0x46, 0x46],
};

function validateImageMagic(buffer: Uint8Array): boolean {
  for (const magicBytes of Object.values(ALLOWED_TYPES)) {
    if (buffer.length >= magicBytes.length) {
      const matches = magicBytes.every((byte, idx) => buffer[idx] === byte);
      if (matches) return true;
    }
  }
  return false;
}

function getResizedKey(originalKey: string): string {
  const lastDot = originalKey.lastIndexOf('.');
  if (lastDot === -1) return `${originalKey}-resized.jpg`;
  const base = originalKey.substring(0, lastDot);
  return `${base}-resized.jpg`;
}

export const handler = async (event: S3Event): Promise<void> => {
  logger.info('image-resize triggered', { recordCount: event.Records.length });

  const s3Client = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });

  for (const record of event.Records) {
    try {
      const validated = S3EventRecordSchema.parse(record);
      const { bucket, object } = validated.s3;
      const originalKey = object.key;

      logger.info('Processing image', { bucket: bucket.name, key: originalKey });

      // 1. Download original image from S3
      const getCommand = new GetObjectCommand({
        Bucket: bucket.name,
        Key: originalKey,
      });
      const getResponse = await s3Client.send(getCommand);
      const imageBuffer = await getResponse.Body?.transformToByteArray();

      if (!imageBuffer || imageBuffer.length === 0) {
        logger.error('Empty image buffer', { key: originalKey });
        continue;
      }

      // 2. Validate image format (magic bytes)
      if (!validateImageMagic(imageBuffer)) {
        logger.warn('Invalid image format', { key: originalKey, size: imageBuffer.length });
        continue;
      }

      // 3. Strip EXIF + 4. Resize to 1024px max + 5. Compress to JPEG q70
      const resizedBuffer = await sharp(imageBuffer)
        .withMetadata(false) // Strip all EXIF/metadata
        .resize(1024, 1024, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .jpeg({ quality: 70, progressive: true })
        .toBuffer();

      // 6. Upload resized version with -resized suffix
      const resizedKey = getResizedKey(originalKey);
      const putCommand = new PutObjectCommand({
        Bucket: bucket.name,
        Key: resizedKey,
        Body: resizedBuffer,
        ContentType: 'image/jpeg',
        Metadata: {
          'original-key': originalKey,
          'resized-at': new Date().toISOString(),
        },
      });

      await s3Client.send(putCommand);

      logger.info('Image resized successfully', {
        originalKey,
        resizedKey,
        originalSize: imageBuffer.length,
        resizedSize: resizedBuffer.length,
        compressionRatio: ((1 - resizedBuffer.length / imageBuffer.length) * 100).toFixed(1),
      });
    } catch (error) {
      logger.error('Failed to process image record', { error, record });
      throw error;
    }
  }
};
