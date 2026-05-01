/**
 * Phase C.4: Image Processor Lambda
 * Handles image classification, optimization, and storage
 */

import { S3, DynamoDB } from '@aws-sdk/client-s3';
import { marshall } from '@aws-sdk/util-dynamodb';

interface ImageProcessorEvent {
  userId: string;
  householdId: string;
  itemId: string;
  imageUrl: string;
  imageBase64?: string;
}

interface ProcessedImage {
  originalUrl: string;
  optimizedUrl: string;
  thumbnailUrl: string;
  classification: string;
  confidence: number;
  processingTime: number;
}

export class ImageProcessor {
  private s3Client: S3;
  private dynamodbClient: DynamoDB;
  private processingMetrics = {
    totalProcessed: 0,
    avgCompressionRatio: 0,
    totalDataSaved: 0,
  };

  constructor(s3Client: S3, dynamodbClient: DynamoDB) {
    this.s3Client = s3Client;
    this.dynamodbClient = dynamodbClient;
  }

  async processImage(event: ImageProcessorEvent): Promise<ProcessedImage> {
    const startTime = Date.now();

    try {
      // Step 1: Classify food using mock AI
      const classification = await this.classifyFood(event.imageBase64 || event.imageUrl);

      // Step 2: Compress image
      const { compressed, compressionRatio } = await this.compressImage(
        event.imageBase64 || event.imageUrl
      );

      // Step 3: Store optimized versions
      const originalUrl = await this.storeImage(
        event.userId,
        event.itemId,
        'original',
        event.imageBase64 || event.imageUrl
      );

      const optimizedUrl = await this.storeImage(
        event.userId,
        event.itemId,
        'optimized',
        compressed
      );

      const thumbnailUrl = await this.storeImage(
        event.userId,
        event.itemId,
        'thumbnail',
        await this.createThumbnail(compressed)
      );

      const processingTime = Date.now() - startTime;

      // Update metrics
      this.updateMetrics(compressionRatio);

      // Store metadata in DynamoDB
      await this.storeImageMetadata({
        userId: event.userId,
        itemId: event.itemId,
        householdId: event.householdId,
        originalUrl,
        optimizedUrl,
        thumbnailUrl,
        classification: classification.label,
        confidence: classification.confidence,
        processingTime,
        compressionRatio,
      });

      console.log(`✅ Image processed: ${event.itemId} (${processingTime}ms)`);

      return {
        originalUrl,
        optimizedUrl,
        thumbnailUrl,
        classification: classification.label,
        confidence: classification.confidence,
        processingTime,
      };
    } catch (error) {
      console.error(`❌ Image processing failed: ${event.itemId}`, error);
      throw error;
    }
  }

  private async classifyFood(
    imageUrl: string
  ): Promise<{ label: string; confidence: number }> {
    // Mock AI classification - in production, would call AWS Rekognition or Claude Vision
    const foodCategories = [
      'vegetables',
      'fruits',
      'meat',
      'dairy',
      'grains',
      'prepared_food',
    ];

    const randomIndex = Math.floor(Math.random() * foodCategories.length);
    return {
      label: foodCategories[randomIndex],
      confidence: Math.random() * 0.3 + 0.7, // 70-100% confidence
    };
  }

  private async compressImage(
    imageUrl: string
  ): Promise<{ compressed: string; compressionRatio: number }> {
    // Mock compression - in production, would use ImageMagick or Sharp
    const originalSize = imageUrl.length;
    const compressionRatio = Math.random() * 0.3 + 0.5; // 50-80% compression
    const compressedSize = Math.floor(originalSize * compressionRatio);

    // Simulate compression by creating a smaller string
    const compressed = imageUrl.substring(0, compressedSize);

    return {
      compressed,
      compressionRatio,
    };
  }

  private async createThumbnail(imageData: string): Promise<string> {
    // Mock thumbnail creation
    return imageData.substring(0, Math.floor(imageData.length * 0.1));
  }

  private async storeImage(
    userId: string,
    itemId: string,
    variant: 'original' | 'optimized' | 'thumbnail',
    imageData: string
  ): Promise<string> {
    // In production, would store in S3
    // For local, generate a mock URL
    const url = `s3://wfl-images/${userId}/${itemId}/${variant}.jpg`;
    console.log(`  📸 Stored ${variant}: ${url}`);
    return url;
  }

  private async storeImageMetadata(metadata: any): Promise<void> {
    // Store in DynamoDB for image metadata tracking
    try {
      const result = await this.dynamodbClient.getItem({
        TableName: 'wfl-main-dev',
        Key: marshall({
          PK: `ITEM#${metadata.itemId}`,
          SK: 'METADATA',
        }),
      });

      // Update item with image metadata
      // In production, would use updateItem
    } catch (error) {
      console.warn('Failed to store image metadata:', error);
    }
  }

  private updateMetrics(compressionRatio: number): void {
    this.processingMetrics.totalProcessed++;
    const dataSaved = (1 - compressionRatio) * 100; // KB saved (mock)
    this.processingMetrics.totalDataSaved += dataSaved;
    this.processingMetrics.avgCompressionRatio =
      (this.processingMetrics.avgCompressionRatio * (this.processingMetrics.totalProcessed - 1) +
        compressionRatio) /
      this.processingMetrics.totalProcessed;
  }

  getMetrics() {
    return this.processingMetrics;
  }
}

/**
 * Lambda Handler for local testing
 */
export async function handler(event: any): Promise<any> {
  console.log('🖼️  Image Processor Lambda invoked');
  console.log('Event:', JSON.stringify(event, null, 2));

  // Mock S3 and DynamoDB clients
  const s3Client = {} as S3;
  const dynamodbClient = {} as DynamoDB;

  const processor = new ImageProcessor(s3Client, dynamodbClient);

  try {
    const result = await processor.processImage({
      userId: event.userId || 'user-123',
      householdId: event.householdId || 'household-123',
      itemId: event.itemId || 'item-123',
      imageUrl: event.imageUrl || 'http://example.com/image.jpg',
      imageBase64: event.imageBase64,
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        result,
        metrics: processor.getMetrics(),
      }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: String(error),
      }),
    };
  }
}
