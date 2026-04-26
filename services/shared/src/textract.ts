import { TextractClient, DetectDocumentTextCommand, AnalyzeExpenseCommand } from '@aws-sdk/client-textract';
import { TextractError } from './errors.js';

export interface TextractDocument {
  bytes?: Uint8Array;
  s3Object?: {
    bucket: string;
    name: string;
  };
}

export interface DetectedText {
  text: string;
  confidence: number;
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface TextractResponse {
  blocks: DetectedText[];
  rawText: string;
}

export interface ExpenseLineItem {
  description: string;
  quantity?: number;
  price?: number;
  unitPrice?: number;
}

export interface AnalyzeExpenseResponse {
  lineItems: ExpenseLineItem[];
  totalAmount?: number;
  invoiceReceiptDate?: string;
}

export class TextractClient {
  private client: TextractClient;

  constructor(region: string = process.env.AWS_REGION || 'us-east-1') {
    this.client = new TextractClient({ region });
  }

  async detectDocumentText(document: TextractDocument): Promise<TextractResponse> {
    try {
      const command = new DetectDocumentTextCommand({
        Document: {
          Bytes: document.bytes,
          S3Object: document.s3Object,
        },
      });

      const response = await this.client.send(command);

      const blocks: DetectedText[] = [];
      let rawText = '';

      if (response.Blocks) {
        for (const block of response.Blocks) {
          if (block.BlockType === 'LINE' && block.Text) {
            blocks.push({
              text: block.Text,
              confidence: block.Confidence ? block.Confidence / 100 : 1.0,
              boundingBox: block.Geometry?.BoundingBox
                ? {
                    x: block.Geometry.BoundingBox.Left || 0,
                    y: block.Geometry.BoundingBox.Top || 0,
                    width: block.Geometry.BoundingBox.Width || 0,
                    height: block.Geometry.BoundingBox.Height || 0,
                  }
                : undefined,
            });
            rawText += block.Text + '\n';
          }
        }
      }

      return { blocks, rawText: rawText.trim() };
    } catch (error) {
      throw new TextractError(
        error instanceof Error ? error.message : 'Unknown Textract error',
        'TEXTRACT_DETECT_FAILED',
        true,
      );
    }
  }

  async analyzeExpense(document: TextractDocument): Promise<AnalyzeExpenseResponse> {
    try {
      const command = new AnalyzeExpenseCommand({
        Document: {
          Bytes: document.bytes,
          S3Object: document.s3Object,
        },
      });

      const response = await this.client.send(command);

      const lineItems: ExpenseLineItem[] = [];
      let totalAmount: number | undefined;
      let invoiceReceiptDate: string | undefined;

      if (response.ExpenseDocuments && response.ExpenseDocuments.length > 0) {
        const doc = response.ExpenseDocuments[0];

        if (doc.SummaryFields) {
          for (const field of doc.SummaryFields) {
            if (field.Type?.Text === 'TOTAL' && field.ValueDetection?.Text) {
              totalAmount = parseFloat(field.ValueDetection.Text.replace(/[^0-9.]/g, ''));
            }
            if (field.Type?.Text === 'INVOICE_RECEIPT_DATE' && field.ValueDetection?.Text) {
              invoiceReceiptDate = field.ValueDetection.Text;
            }
          }
        }

        if (doc.LineItemGroups) {
          for (const group of doc.LineItemGroups) {
            if (group.LineItems) {
              for (const lineItem of group.LineItems) {
                const item: ExpenseLineItem = { description: '' };

                for (const field of lineItem.LineItemValues || []) {
                  if (field.Type?.Text === 'ITEM') {
                    item.description = field.ValueDetection?.Text || '';
                  }
                  if (field.Type?.Text === 'QUANTITY') {
                    item.quantity = parseFloat(field.ValueDetection?.Text || '0');
                  }
                  if (field.Type?.Text === 'PRICE') {
                    item.price = parseFloat(field.ValueDetection?.Text?.replace(/[^0-9.]/g, '') || '0');
                  }
                  if (field.Type?.Text === 'UNIT_PRICE') {
                    item.unitPrice = parseFloat(field.ValueDetection?.Text?.replace(/[^0-9.]/g, '') || '0');
                  }
                }

                if (item.description) {
                  lineItems.push(item);
                }
              }
            }
          }
        }
      }

      return { lineItems, totalAmount, invoiceReceiptDate };
    } catch (error) {
      throw new TextractError(
        error instanceof Error ? error.message : 'Unknown Textract error',
        'TEXTRACT_ANALYZE_FAILED',
        true,
      );
    }
  }
}
