import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import sharp from 'sharp';

const s3Client = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
const IMAGE_BUCKET = process.env.IMAGE_BUCKET || '';
const CACHE_TTL = parseInt(process.env.CACHE_TTL || '31536000');

interface ResizeRequest {
  key: string;
  width?: number;
  height?: number;
  format?: 'webp' | 'avif' | 'jpeg' | 'png';
  quality?: number;
  fit?: 'contain' | 'cover' | 'fill' | 'inside' | 'outside';
}

interface ResizeResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
  isBase64Encoded?: boolean;
}

export async function handler(event: any): Promise<ResizeResponse> {
  try {
    // Parse request
    const { key, width, height, format = 'webp', quality = 80, fit = 'cover' } = parseRequest(event);

    if (!key) {
      return errorResponse(400, 'Missing image key');
    }

    // Validate dimensions
    if ((width && width > 2000) || (height && height > 2000)) {
      return errorResponse(400, 'Dimensions too large (max 2000px)');
    }

    // Generate cache key
    const cacheKey = generateCacheKey(key, width, height, format, quality);

    // Try to get from cache
    try {
      const cached = await s3Client.send(
        new GetObjectCommand({
          Bucket: IMAGE_BUCKET,
          Key: cacheKey,
        }),
      );

      const buffer = await streamToBuffer(cached.Body);
      return {
        statusCode: 200,
        headers: {
          'Content-Type': `image/${format}`,
          'Cache-Control': `public, max-age=${CACHE_TTL}`,
          'X-Cache': 'HIT',
        },
        body: buffer.toString('base64'),
        isBase64Encoded: true,
      };
    } catch (error: any) {
      if (error.name !== 'NoSuchKey') {
        throw error;
      }
      // Not in cache, proceed to resize
    }

    // Get original image
    const originalResponse = await s3Client.send(
      new GetObjectCommand({
        Bucket: IMAGE_BUCKET,
        Key: key,
      }),
    );

    const originalBuffer = await streamToBuffer(originalResponse.Body);

    // Resize and format
    let resizedBuffer = await resizeImage(originalBuffer, {
      width,
      height,
      format,
      quality,
      fit: fit as 'contain' | 'cover' | 'fill' | 'inside' | 'outside',
    });

    // Cache the resized image
    await s3Client.send(
      new PutObjectCommand({
        Bucket: IMAGE_BUCKET,
        Key: cacheKey,
        Body: resizedBuffer,
        ContentType: `image/${format}`,
        CacheControl: `public, max-age=${CACHE_TTL}`,
        ServerSideEncryption: 'AES256',
      }),
    );

    return {
      statusCode: 200,
      headers: {
        'Content-Type': `image/${format}`,
        'Cache-Control': `public, max-age=${CACHE_TTL}`,
        'X-Cache': 'MISS',
      },
      body: resizedBuffer.toString('base64'),
      isBase64Encoded: true,
    };
  } catch (error: any) {
    console.error('Image resize error:', error);
    return errorResponse(500, 'Image processing failed');
  }
}

function parseRequest(event: any): ResizeRequest {
  // Support both CloudFront and direct Lambda invocation
  if (event.queryStringParameters) {
    return {
      key: event.queryStringParameters.key || '',
      width: event.queryStringParameters.width ? parseInt(event.queryStringParameters.width) : undefined,
      height: event.queryStringParameters.height ? parseInt(event.queryStringParameters.height) : undefined,
      format: event.queryStringParameters.format || 'webp',
      quality: event.queryStringParameters.quality ? parseInt(event.queryStringParameters.quality) : 80,
      fit: event.queryStringParameters.fit || 'cover',
    };
  }

  return {
    key: event.key || '',
    width: event.width,
    height: event.height,
    format: event.format || 'webp',
    quality: event.quality || 80,
    fit: event.fit || 'cover',
  };
}

function generateCacheKey(
  key: string,
  width?: number,
  height?: number,
  format?: string,
  quality?: number,
): string {
  const parts = [key];
  if (width) parts.push(`w${width}`);
  if (height) parts.push(`h${height}`);
  parts.push(`f${format}`);
  if (quality) parts.push(`q${quality}`);

  return `resized/${parts.join('_')}`;
}

async function resizeImage(
  buffer: Buffer,
  options: {
    width?: number;
    height?: number;
    format: string;
    quality: number;
    fit: 'contain' | 'cover' | 'fill' | 'inside' | 'outside';
  },
): Promise<Buffer> {
  let pipeline = sharp(buffer);

  // Resize if dimensions provided
  if (options.width || options.height) {
    pipeline = pipeline.resize(options.width, options.height, {
      fit: options.fit,
      withoutEnlargement: true,
    });
  }

  // Format conversion
  switch (options.format) {
    case 'webp':
      return pipeline.webp({ quality: options.quality }).toBuffer();
    case 'avif':
      return pipeline.avif({ quality: options.quality }).toBuffer();
    case 'jpeg':
      return pipeline.jpeg({ quality: options.quality }).toBuffer();
    case 'png':
      return pipeline.png({ compressionLevel: 9 }).toBuffer();
    default:
      return pipeline.webp({ quality: options.quality }).toBuffer();
  }
}

async function streamToBuffer(stream: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: any[] = [];
    stream.on('data', (chunk: any) => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}

function errorResponse(statusCode: number, message: string): ResizeResponse {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ error: message }),
  };
}
