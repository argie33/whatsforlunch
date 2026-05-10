import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';

const s3Client = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const IMAGE_BUCKET = process.env.IMAGE_BUCKET || 'whatsfresh-images';
const PRESIGNED_URL_EXPIRATION = 3600; // 1 hour

async function checkHouseholdMembership(userId, householdId) {
  try {
    const result = await docClient.send(
      new GetCommand({
        TableName: process.env.HOUSEHOLDS_TABLE || 'wfl-main-prod',
        Key: {
          PK: `HOUSEHOLD#${householdId}`,
          SK: `MEMBER#${userId}`,
        },
      }),
    );
    return !!result.Item;
  } catch (err) {
    console.error('[Auth] Membership check failed:', err.message);
    return false;
  }
}

export async function handler(event) {
  const { householdId, filename, contentType, size } = event.arguments;
  const userId = event.identity?.claims?.sub;

  if (!householdId || !filename || !contentType || !userId) {
    throw new Error('householdId, filename, contentType, and authentication are required');
  }

  // Validate file size (max 10MB for photos)
  if (size > 10 * 1024 * 1024) {
    throw new Error('File size exceeds 10MB limit');
  }

  // Validate content type
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(contentType)) {
    throw new Error('Only JPEG, PNG, and WebP images are supported');
  }

  try {
    // Authorization: verify user is member of household
    const isMember = await checkHouseholdMembership(userId, householdId);
    if (!isMember) {
      throw new Error('User is not a member of this household');
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

    const uploadUrl = await getSignedUrl(s3Client, putCommand, {
      expiresIn: PRESIGNED_URL_EXPIRATION,
    });

    console.log(`[Mutation.uploadImage] Generated signed URL for ${key}`);

    return {
      uploadUrl,
      imageKey: key,
      expiresIn: PRESIGNED_URL_EXPIRATION,
    };
  } catch (error) {
    console.error('[Mutation.uploadImage] Error:', error.message);
    throw error;
  }
}
