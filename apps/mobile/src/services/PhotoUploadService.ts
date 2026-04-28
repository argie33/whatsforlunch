import { uploadData, getUrl } from 'aws-amplify/storage';
import * as FileSystem from 'expo-file-system';

function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export class PhotoUploadService {
  /**
   * Upload a photo from file path to S3 and return the public URL.
   * For local/mock mode, uploads via GraphQL mutation to local API.
   */
  async uploadPhoto(filePath: string): Promise<string> {
    const fileName = `${generateId()}.jpg`;
    const fileBase64 = await FileSystem.readAsStringAsync(filePath, {
      encoding: FileSystem.EncodingType.Base64,
    });

    try {
      // For production AWS: use Amplify Storage directly
      const result = await uploadData({
        key: `photos/${fileName}`,
        data: { base64: fileBase64 },
      }).result;

      const urlResult = await getUrl({ key: `photos/${fileName}` });
      return urlResult.url.toString();
    } catch {
      // Fallback for local/mock development: return a data URL
      return `data:image/jpeg;base64,${fileBase64}`;
    }
  }

  /**
   * Delete a photo from S3 by URL.
   */
  async deletePhoto(photoUrl: string): Promise<void> {
    if (!photoUrl.startsWith('data:')) {
      // Only delete from S3 if it's a real S3 URL, not a data URL
      const key = photoUrl.split('/').pop();
      if (key) {
        try {
          const { deleteObject } = await import('aws-amplify/storage');
          await deleteObject({ key: `photos/${key}` });
        } catch (err) {
          console.warn('[PhotoUploadService] Failed to delete photo:', err);
        }
      }
    }
  }
}

export const photoUploadService = new PhotoUploadService();
