import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import Joi from 'joi';

const s3Client = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
const IMAGE_BUCKET = process.env.IMAGE_BUCKET || 'whatsforlunch-images';
const PRESIGNED_URL_EXPIRATION = 3600; // 1 hour

// Validation schema
const uploadSchema = Joi.object({
  userId: Joi.string().required(),
  householdId: Joi.string().required(),
  filename: Joi.string().required(),
  contentType: Joi.string().valid('image/jpeg', 'image/png', 'image/webp').required(),
  size: Joi.number().max(10 * 1024 * 1024).required(), // Max 10MB
});

export async function handler(event) {
  const { userId, householdId, filename, contentType, size } = event.arguments;

  try {
    // Validate input
    const { error, value } = uploadSchema.validate({
      userId,
      householdId,
      filename,
      contentType,
      size,
    });

    if (error) {
      return {
        success: false,
        error: 'VALIDATION_ERROR',
        message: error.message,
      };
    }

    // Check authorization
    const authenticatedUserId = event.identity?.claims?.sub;
    if (authenticatedUserId !== userId) {
      return {
        success: false,
        error: 'UNAUTHORIZED',
        message: 'You can only upload on your behalf',
      };
    }

    // Generate unique key
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 9);
    const key = `items/${householdId}/${userId}/${timestamp}-${random}/${filename}`;

    // Create signed URL for upload
    const putCommand = new PutObjectCommand({
      Bucket: IMAGE_BUCKET,
      Key: key,
      ContentType: contentType,
      Metadata: {
        userId,
        householdId,
        uploadedAt: new Date().toISOString(),
      },
      ServerSideEncryption: 'AES256',
    });

    const presignedUrl = await getSignedUrl(s3Client, putCommand, {
      expiresIn: PRESIGNED_URL_EXPIRATION,
    });

    return {
      success: true,
      uploadUrl: presignedUrl,
      imageKey: key,
      expiresIn: PRESIGNED_URL_EXPIRATION,
      message: 'Upload URL generated successfully',
    };
  } catch (error) {
    console.error('[Mutation.uploadImage] Error:', error.message);
    return {
      success: false,
      error: 'INTERNAL_ERROR',
      message: error.message,
    };
  }
}
