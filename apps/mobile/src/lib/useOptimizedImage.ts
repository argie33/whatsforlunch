import { useState, useEffect } from 'react';
import { useWindowDimensions } from 'react-native';

export interface OptimizedImageOptions {
  width?: number;
  height?: number;
  format?: 'webp' | 'avif' | 'jpeg' | 'png';
  quality?: number;
  fit?: 'contain' | 'cover' | 'fill' | 'inside' | 'outside';
  priority?: boolean;
}

export interface OptimizedImageUrl {
  uri: string;
  webp: string;
  avif: string;
  jpeg: string;
  width: number;
  height: number;
}

const CDN_DOMAIN = process.env.EXPO_PUBLIC_CDN_DOMAIN || 'images.whatsfresh.app';

export function useOptimizedImage(
  imageKey: string | undefined,
  options: OptimizedImageOptions = {},
): OptimizedImageUrl | null {
  const [optimized, setOptimized] = useState<OptimizedImageUrl | null>(null);
  const { width: screenWidth } = useWindowDimensions();

  useEffect(() => {
    if (!imageKey) {
      setOptimized(null);
      return;
    }

    // Determine optimal width based on screen size and DPI
    let targetWidth = options.width;
    if (!targetWidth) {
      // Use 2x screen width for high DPI devices
      targetWidth = Math.min(screenWidth * 2, 2000);
    }

    const height = options.height;
    const quality = options.quality || 80;
    const fit = options.fit || 'cover';

    // Build base URL
    const baseUrl = `https://${CDN_DOMAIN}`;

    // Build URLs for different formats
    const urls = {
      uri: buildImageUrl(baseUrl, imageKey, targetWidth, height, 'webp', quality, fit),
      webp: buildImageUrl(baseUrl, imageKey, targetWidth, height, 'webp', quality, fit),
      avif: buildImageUrl(baseUrl, imageKey, targetWidth, height, 'avif', quality, fit),
      jpeg: buildImageUrl(baseUrl, imageKey, targetWidth, height, 'jpeg', quality, fit),
      width: targetWidth,
      height: height || targetWidth, // Default to square if height not specified
    };

    setOptimized(urls);
  }, [imageKey, screenWidth, options]);

  return optimized;
}

function buildImageUrl(
  baseUrl: string,
  imageKey: string,
  width?: number,
  height?: number,
  format?: string,
  quality?: number,
  fit?: string,
): string {
  const params = new URLSearchParams();

  if (width) params.append('width', width.toString());
  if (height) params.append('height', height.toString());
  if (format) params.append('format', format);
  if (quality) params.append('quality', quality.toString());
  if (fit) params.append('fit', fit);

  const queryString = params.toString();
  return `${baseUrl}/resize/${encodeURIComponent(imageKey)}${queryString ? '?' + queryString : ''}`;
}

export function getImageUrl(imageKey: string, options: OptimizedImageOptions = {}): string {
  const width = options.width || 800;
  const height = options.height || width;
  const format = options.format || 'webp';
  const quality = options.quality || 80;
  const fit = options.fit || 'cover';

  const baseUrl = `https://${CDN_DOMAIN}`;
  return buildImageUrl(baseUrl, imageKey, width, height, format, quality, fit);
}

export function getResponsiveImageUrl(imageKey: string, devicePixelRatio: number = 2): string {
  // Generate 1x and 2x variants
  const baseWidth = 400;
  const targetWidth = baseWidth * devicePixelRatio;

  const baseUrl = `https://${CDN_DOMAIN}`;
  return buildImageUrl(baseUrl, imageKey, Math.min(targetWidth, 2000), undefined, 'webp', 80, 'cover');
}

// Helper to generate srcSet for web use
export function generateSrcSet(imageKey: string): string {
  const baseUrl = `https://${CDN_DOMAIN}`;

  const widths = [320, 640, 960, 1280, 1920];
  const srcSetEntries = widths
    .map((w) => {
      const dpi = w === 320 ? 1 : 2;
      const url = buildImageUrl(baseUrl, imageKey, w, undefined, 'webp', 80, 'cover');
      return `${url} ${w}w`;
    })
    .join(', ');

  return srcSetEntries;
}

export function getImageStats(imageKey: string): { url: string; formats: string[] } {
  const baseUrl = `https://${CDN_DOMAIN}`;

  return {
    url: imageKey,
    formats: ['webp', 'avif', 'jpeg', 'png'].map((fmt) => buildImageUrl(baseUrl, imageKey, 800, 800, fmt, 80, 'cover')),
  };
}
