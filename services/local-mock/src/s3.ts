import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  CreateBucketCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Internal endpoint (what the server uses to talk to S3)
const internalEndpoint = process.env.S3_ENDPOINT ?? 'http://localstack:4566';
// External endpoint (what clients use - localhost for local dev)
const externalEndpoint = process.env.S3_EXTERNAL_ENDPOINT ?? 'http://localhost:4566';

const bucket = process.env.S3_BUCKET ?? 'wfl-photos-local';
const region = process.env.AWS_DEFAULT_REGION ?? 'us-east-1';

const s3Client = new S3Client({
  endpoint: internalEndpoint,
  region,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? 'test',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? 'test',
  },
  forcePathStyle: true, // Required for LocalStack
});

// Initialize bucket on startup
async function initializeBucket() {
  try {
    await s3Client.send(new CreateBucketCommand({ Bucket: bucket }));
    console.log(`[S3] Created bucket: ${bucket} at ${internalEndpoint}`);
  } catch (err: any) {
    // Bucket may already exist, that's fine
    if (err.Code !== 'BucketAlreadyOwnedByYou' && err.Code !== 'BucketAlreadyExists') {
      console.error(`[S3] Failed to create bucket: ${err.message}`);
    }
  }
}

initializeBucket();

export async function getPresignedUploadUrl(key: string, contentType: string): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
  });

  // Generate presigned URL valid for 1 hour
  let url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

  // Replace internal endpoint with external endpoint for client access
  url = url.replace(internalEndpoint, externalEndpoint);
  return url;
}

export async function getPresignedDownloadUrl(key: string): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  });

  // Generate presigned URL valid for 7 days
  let url = await getSignedUrl(s3Client, command, { expiresIn: 7 * 24 * 60 * 60 });

  // Replace internal endpoint with external endpoint for client access
  url = url.replace(internalEndpoint, externalEndpoint);
  return url;
}

export function getS3Url(key: string): string {
  return `${externalEndpoint}/${bucket}/${key}`;
}
