import { generateClient } from 'aws-amplify/api';
import * as FileSystem from 'expo-file-system';

const client = generateClient();

// GraphQL for getting signed upload URL
const GET_SIGNED_UPLOAD_URL = /* GraphQL */ `
  mutation GetSignedUploadUrl(
    $householdId: UUID!
    $filename: String!
    $contentType: String!
    $size: Int!
  ) {
    uploadImage(
      householdId: $householdId
      filename: $filename
      contentType: $contentType
      size: $size
    ) {
      uploadUrl
      imageKey
      expiresIn
    }
  }
`;

// GraphQL for AI classification
const CLASSIFY_FOOD = /* GraphQL */ `
  mutation ClassifyFood($householdId: UUID!, $photoUrl: AWSURL!) {
    classifyFood(householdId: $householdId, photoUrl: $photoUrl) {
      id
      foodName
      foodType
      category
      storageLocation
      expiryAt
      expirySource
      expiryConfidence
      photoUrl
    }
  }
`;

export interface PhotoUploadResult {
  imageKey: string;
  photoUrl: string;
}

export interface FoodClassification {
  foodName: string;
  foodType: string;
  category: string;
  expiryConfidence?: number;
}

export class PhotoUploadService {
  /**
   * Upload photo to S3 and return image key
   */
  async uploadPhoto(photoPath: string, householdId: string): Promise<PhotoUploadResult> {
    try {
      const info = await FileSystem.getInfoAsync(photoPath);
      if (!info.exists) throw new Error('Photo file not found');

      const fileSize = info.size || 0;
      const filename = photoPath.split('/').pop() || 'photo.jpg';

      const result = await (client.graphql as Function)({
        query: GET_SIGNED_UPLOAD_URL,
        variables: {
          householdId,
          filename,
          contentType: 'image/jpeg',
          size: fileSize,
        },
      });

      const { uploadUrl, imageKey } = result.data.uploadImage;

      const photoBase64 = await FileSystem.readAsStringAsync(photoPath, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'image/jpeg' },
        body: Buffer.from(photoBase64, 'base64'),
      });

      if (!uploadResponse.ok) throw new Error(`Upload failed: ${uploadResponse.status}`);

      const cdnDomain = process.env.EXPO_PUBLIC_CDN_DOMAIN || 'images.local';
      const photoUrl = `https://${cdnDomain}/resize/${imageKey}`;

      return { imageKey, photoUrl };
    } catch (error) {
      console.error('[PhotoUploadService] Upload failed:', error);
      throw error;
    }
  }

  /**
   * Classify food using AI Lambda
   */
  async classifyFood(photoUrl: string, householdId: string): Promise<FoodClassification> {
    try {
      const result = await (client.graphql as Function)({
        query: CLASSIFY_FOOD,
        variables: { householdId, photoUrl },
      });

      const classified = result.data.classifyFood;

      return {
        foodName: classified.foodName,
        foodType: classified.foodType,
        category: classified.category,
        expiryConfidence: classified.expiryConfidence,
      };
    } catch (error) {
      console.error('[PhotoUploadService] Classification failed:', error);
      return { foodName: '', foodType: '', category: '' };
    }
  }

  /**
   * Upload and classify in one flow
   */
  async uploadAndClassify(
    photoPath: string,
    householdId: string,
  ): Promise<{
    imageKey: string;
    photoUrl: string;
    classification: FoodClassification;
  }> {
    const { imageKey, photoUrl } = await this.uploadPhoto(photoPath, householdId);
    const classification = await this.classifyFood(photoUrl, householdId);
    return { imageKey, photoUrl, classification };
  }
}

export const photoUploadService = new PhotoUploadService();
