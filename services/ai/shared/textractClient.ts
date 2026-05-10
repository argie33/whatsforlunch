/**
 * Textract Client Wrapper
 * Handles OCR for documents, receipts, and printed text
 * Used by ocr-expiry-date Lambda (fallback if Bedrock vision doesn't work)
 */

import {
  TextractClient,
  DetectDocumentTextCommand,
  AnalyzeDocumentCommand,
} from '@aws-sdk/client-textract';

interface TextractResponse {
  text: string;
  confidence: number;
  blocks: any[];
}

export class TextractClientWrapper {
  private client: TextractClient;

  constructor(region: string = 'us-east-1') {
    this.client = new TextractClient({ region });
  }

  /**
   * Extract text from image (S3 or bytes)
   */
  async extractText(s3Bucket: string, s3Key: string): Promise<TextractResponse> {
    try {
      const command = new DetectDocumentTextCommand({
        Document: {
          S3Object: {
            Bucket: s3Bucket,
            Name: s3Key,
          },
        },
      });

      const response = await this.client.send(command);

      // Extract text blocks
      const textBlocks = response.Blocks?.filter((block) => block.BlockType === 'LINE') || [];
      const fullText = textBlocks.map((block) => block.Text).join('\n');

      // Calculate average confidence
      const confidences = textBlocks
        .map((block) => block.Confidence || 0)
        .filter((c) => c > 0);
      const avgConfidence =
        confidences.length > 0
          ? confidences.reduce((a, b) => a + b, 0) / confidences.length / 100
          : 0;

      return {
        text: fullText,
        confidence: avgConfidence,
        blocks: textBlocks,
      };
    } catch (error) {
      console.error('Textract text extraction error:', error);
      throw new Error(`Failed to extract text with Textract: ${error}`);
    }
  }

  /**
   * Extract dates from document (OCR-specific)
   * Looks for date patterns in detected text
   */
  async extractDates(
    s3Bucket: string,
    s3Key: string
  ): Promise<{
    dates: string[];
    mostLikelyExpiry: string | null;
    confidence: number;
  }> {
    const textResult = await this.extractText(s3Bucket, s3Key);

    // Date pattern: MM/DD/YYYY, MM-DD-YY, Month DD YYYY, etc.
    const datePatterns = [
      /(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/g,
      /([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})/g,
      /(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/g,
    ];

    const foundDates: string[] = [];
    for (const pattern of datePatterns) {
      const matches = textResult.text.matchAll(pattern);
      for (const match of matches) {
        foundDates.push(match[0]);
      }
    }

    // Pick the most likely expiry (usually the last date or formatted "Exp: ...")
    let mostLikelyExpiry = null;
    if (foundDates.length > 0) {
      // Check for explicit "Exp" or "Best By" markers
      const expMarker = textResult.text.match(
        /(?:Exp|Expir|Best\s+By|Use\s+By)[:\s]+([A-Za-z0-9\s/\-]+)/i
      );
      if (expMarker) {
        mostLikelyExpiry = expMarker[1].trim();
      } else {
        // Use the last date found (often expiry is listed last)
        mostLikelyExpiry = foundDates[foundDates.length - 1];
      }
    }

    return {
      dates: foundDates,
      mostLikelyExpiry,
      confidence: textResult.confidence,
    };
  }

  /**
   * Analyze form/receipt (returns key-value pairs)
   * Useful for extracting structured data
   */
  async analyzeDocument(s3Bucket: string, s3Key: string): Promise<{
    keyValues: Record<string, string>;
    confidence: number;
  }> {
    try {
      const command = new AnalyzeDocumentCommand({
        Document: {
          S3Object: {
            Bucket: s3Bucket,
            Name: s3Key,
          },
        },
        FeatureTypes: ['FORMS', 'TABLES'],
      });

      const response = await this.client.send(command);

      // Extract key-value pairs
      const keyValues: Record<string, string> = {};
      const keyBlockIds = new Map<string, string>();

      // Find key blocks
      response.Blocks?.forEach((block) => {
        if (block.BlockType === 'KEY' && block.Text) {
          keyBlockIds.set(block.Id || '', block.Text);
        }
      });

      // Find values associated with keys
      response.Blocks?.forEach((block) => {
        if (block.BlockType === 'VALUE' && block.Text && block.Relationships) {
          for (const rel of block.Relationships) {
            if (rel.Type === 'VALUE_OF') {
              const keyId = rel.Ids?.[0];
              if (keyId) {
                const keyText = keyBlockIds.get(keyId);
                if (keyText) {
                  keyValues[keyText] = block.Text;
                }
              }
            }
          }
        }
      });

      // Calculate average confidence
      const confidences = response.Blocks?.map((block) => block.Confidence || 0).filter(
        (c) => c > 0
      ) || [0];
      const avgConfidence = (confidences.reduce((a, b) => a + b, 0) / confidences.length) / 100;

      return {
        keyValues,
        confidence: avgConfidence,
      };
    } catch (error) {
      console.error('Textract document analysis error:', error);
      throw new Error(`Failed to analyze document with Textract: ${error}`);
    }
  }
}

export default TextractClientWrapper;
