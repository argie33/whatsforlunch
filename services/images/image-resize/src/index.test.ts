import { describe, it, expect, beforeEach, vi } from 'vitest';
import { handler } from './index';
import { S3Event } from 'aws-lambda';
import sharp from 'sharp';

vi.mock('@aws-sdk/client-s3');

describe('image-resize handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should resize and compress a valid JPEG image', async () => {
    // Create a minimal valid JPEG (magic bytes + dummy data)
    const jpegMagic = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
    const testImage = Buffer.concat([jpegMagic, Buffer.alloc(10000, 0x42)]);

    const mockSharpInstance = {
      withMetadata: vi.fn().mockReturnThis(),
      resize: vi.fn().mockReturnThis(),
      jpeg: vi.fn().mockReturnThis(),
      toBuffer: vi.fn().mockResolvedValue(Buffer.alloc(3000, 0x42)),
    };

    vi.mocked(sharp).mockReturnValue(mockSharpInstance as any);

    const event: S3Event = {
      Records: [
        {
          s3: {
            bucket: { name: 'test-bucket' },
            object: { key: 'photos/test.jpg' },
          },
          eventName: 'ObjectCreated:Put',
          eventSource: 'aws:s3',
          eventTime: '2026-04-26T12:00:00Z',
          eventVersion: '2.1',
          requestParameters: { sourceIPAddress: '127.0.0.1' },
          responseElements: {
            'x-amz-request-id': 'test-id',
            'x-amz-id-2': 'test-id-2',
          },
          awsRegion: 'us-east-1',
        } as any,
      ],
    };

    await handler(event);

    expect(mockSharpInstance.withMetadata).toHaveBeenCalledWith(false);
    expect(mockSharpInstance.resize).toHaveBeenCalledWith(1024, 1024, expect.objectContaining({
      fit: 'inside',
      withoutEnlargement: true,
    }));
    expect(mockSharpInstance.jpeg).toHaveBeenCalledWith({ quality: 70, progressive: true });
  });

  it('should handle PNG images', async () => {
    const pngMagic = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
    const testImage = Buffer.concat([pngMagic, Buffer.alloc(8000, 0x42)]);

    const mockSharpInstance = {
      withMetadata: vi.fn().mockReturnThis(),
      resize: vi.fn().mockReturnThis(),
      jpeg: vi.fn().mockReturnThis(),
      toBuffer: vi.fn().mockResolvedValue(Buffer.alloc(2500, 0x42)),
    };

    vi.mocked(sharp).mockReturnValue(mockSharpInstance as any);

    const event: S3Event = {
      Records: [
        {
          s3: {
            bucket: { name: 'test-bucket' },
            object: { key: 'photos/test.png' },
          },
          eventName: 'ObjectCreated:Put',
          eventSource: 'aws:s3',
          eventTime: '2026-04-26T12:00:00Z',
          eventVersion: '2.1',
          requestParameters: { sourceIPAddress: '127.0.0.1' },
          responseElements: {
            'x-amz-request-id': 'test-id',
            'x-amz-id-2': 'test-id-2',
          },
          awsRegion: 'us-east-1',
        } as any,
      ],
    };

    await handler(event);

    expect(mockSharpInstance.jpeg).toHaveBeenCalled();
  });

  it('should reject invalid image formats', async () => {
    const invalidMagic = Buffer.from([0x00, 0x00, 0x00, 0x00]);
    const testImage = Buffer.concat([invalidMagic, Buffer.alloc(5000, 0x42)]);

    const event: S3Event = {
      Records: [
        {
          s3: {
            bucket: { name: 'test-bucket' },
            object: { key: 'photos/invalid.bin' },
          },
          eventName: 'ObjectCreated:Put',
          eventSource: 'aws:s3',
          eventTime: '2026-04-26T12:00:00Z',
          eventVersion: '2.1',
          requestParameters: { sourceIPAddress: '127.0.0.1' },
          responseElements: {
            'x-amz-request-id': 'test-id',
            'x-amz-id-2': 'test-id-2',
          },
          awsRegion: 'us-east-1',
        } as any,
      ],
    };

    // Should skip invalid image (not throw)
    await handler(event);

    expect(sharp).not.toHaveBeenCalled();
  });

  it('should handle multiple records in one event', async () => {
    const jpegMagic = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
    const testImage = Buffer.concat([jpegMagic, Buffer.alloc(10000, 0x42)]);

    const mockSharpInstance = {
      withMetadata: vi.fn().mockReturnThis(),
      resize: vi.fn().mockReturnThis(),
      jpeg: vi.fn().mockReturnThis(),
      toBuffer: vi.fn().mockResolvedValue(Buffer.alloc(3000, 0x42)),
    };

    vi.mocked(sharp).mockReturnValue(mockSharpInstance as any);

    const event: S3Event = {
      Records: [
        {
          s3: {
            bucket: { name: 'test-bucket' },
            object: { key: 'photos/test1.jpg' },
          },
          eventName: 'ObjectCreated:Put',
          eventSource: 'aws:s3',
          eventTime: '2026-04-26T12:00:00Z',
          eventVersion: '2.1',
          requestParameters: { sourceIPAddress: '127.0.0.1' },
          responseElements: {
            'x-amz-request-id': 'test-id',
            'x-amz-id-2': 'test-id-2',
          },
          awsRegion: 'us-east-1',
        } as any,
        {
          s3: {
            bucket: { name: 'test-bucket' },
            object: { key: 'photos/test2.jpg' },
          },
          eventName: 'ObjectCreated:Put',
          eventSource: 'aws:s3',
          eventTime: '2026-04-26T12:00:00Z',
          eventVersion: '2.1',
          requestParameters: { sourceIPAddress: '127.0.0.1' },
          responseElements: {
            'x-amz-request-id': 'test-id',
            'x-amz-id-2': 'test-id-2',
          },
          awsRegion: 'us-east-1',
        } as any,
      ],
    };

    await handler(event);

    expect(mockSharpInstance.toBuffer).toHaveBeenCalledTimes(2);
  });

  it('should preserve aspect ratio during resize', async () => {
    const jpegMagic = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
    const testImage = Buffer.concat([jpegMagic, Buffer.alloc(10000, 0x42)]);

    const mockSharpInstance = {
      withMetadata: vi.fn().mockReturnThis(),
      resize: vi.fn().mockReturnThis(),
      jpeg: vi.fn().mockReturnThis(),
      toBuffer: vi.fn().mockResolvedValue(Buffer.alloc(3000, 0x42)),
    };

    vi.mocked(sharp).mockReturnValue(mockSharpInstance as any);

    const event: S3Event = {
      Records: [
        {
          s3: {
            bucket: { name: 'test-bucket' },
            object: { key: 'photos/tall.jpg' },
          },
          eventName: 'ObjectCreated:Put',
          eventSource: 'aws:s3',
          eventTime: '2026-04-26T12:00:00Z',
          eventVersion: '2.1',
          requestParameters: { sourceIPAddress: '127.0.0.1' },
          responseElements: {
            'x-amz-request-id': 'test-id',
            'x-amz-id-2': 'test-id-2',
          },
          awsRegion: 'us-east-1',
        } as any,
      ],
    };

    await handler(event);

    const resizeCall = vi.mocked(mockSharpInstance.resize).mock.calls[0];
    expect(resizeCall[0]).toBe(1024);
    expect(resizeCall[1]).toBe(1024);
    expect(resizeCall[2]).toEqual(
      expect.objectContaining({
        fit: 'inside',
        withoutEnlargement: true,
      })
    );
  });
});
