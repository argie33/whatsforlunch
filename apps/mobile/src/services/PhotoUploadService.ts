import { generateClient } from '@/lib/aws-amplify-api-shim';
import * as FileSystem from 'expo-file-system';
import { executeGraphQL } from '@/lib/graphql-client';

const client = generateClient();

// Detect if we're in local mode
const _isLocalApi = () => process.env.EXPO_PUBLIC_AUTH_MODE === 'local';

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

      let result;
      if (_isLocalApi()) {
        // Use local API client for local dev
        result = await executeGraphQL(GET_SIGNED_UPLOAD_URL, {
          householdId,
          filename,
          contentType: 'image/jpeg',
          size: fileSize,
        });
      } else {
        // Use Amplify client for AWS
        result = await (client.graphql as Function)({
          query: GET_SIGNED_UPLOAD_URL,
          variables: {
            householdId,
            filename,
            contentType: 'image/jpeg',
            size: fileSize,
          },
        });
      }

      const { uploadUrl, imageKey } = result.data.uploadImage;

      // Read file as base64 and convert to Blob for S3 upload
      const photoBase64 = await FileSystem.readAsStringAsync(photoPath, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Convert base64 to binary data
      const binary = atob(photoBase64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: 'image/jpeg' });

      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'image/jpeg' },
        body: blob,
      });

      if (!uploadResponse.ok) throw new Error(`Upload failed: ${uploadResponse.status}`);

      // For local dev with LocalStack, construct S3 URL directly
      // For production, use CloudFront CDN URL
      let photoUrl: string;
      if (_isLocalApi()) {
        const s3Endpoint = process.env.EXPO_PUBLIC_S3_ENDPOINT || 'http://localhost:4566';
        const bucket = 'wfl-photos-local';
        photoUrl = `${s3Endpoint}/${bucket}/${imageKey}`;
      } else {
        const cdnDomain = process.env.EXPO_PUBLIC_CDN_DOMAIN || 'images.local';
        photoUrl = `https://${cdnDomain}/resize/${imageKey}`;
      }

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
      let result;
      if (_isLocalApi()) {
        // Use local API client for local dev
        result = await executeGraphQL(CLASSIFY_FOOD, {
          householdId,
          photoUrl,
        });
      } else {
        // Use Amplify client for AWS
        result = await (client.graphql as Function)({
          query: CLASSIFY_FOOD,
          variables: { householdId, photoUrl },
        });
      }

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
