/**
 * Mock Textract client for local testing.
 * Returns realistic OCR responses without calling AWS.
 */

import {
  TextractDocument,
  TextractResponse,
  AnalyzeExpenseResponse,
  ExpenseLineItem,
} from './textract.js';

export class TextractMockClient {
  private callCount = 0;

  async detectDocumentText(document: TextractDocument): Promise<TextractResponse> {
    this.callCount++;

    // Simulate realistic date detections
    const dateExamples = [
      ['USE BY 05/15/2026', 'BEST BEFORE: May 15, 2026', 'Expires 5/15/26'],
      ['SELL BY 12/25/2025', 'BEST BY Dec 25', 'SBY 12/25/25'],
      ['CONSUME BY 2026-05-20', 'Best before 05/20/2026', '05/20/26'],
    ];

    const examples = dateExamples[Math.floor(Math.random() * dateExamples.length)];
    const selectedText = examples[Math.floor(Math.random() * examples.length)];

    const blocks = [
      {
        text: selectedText,
        confidence: 0.85 + Math.random() * 0.14, // 0.85-0.99
        boundingBox: {
          x: Math.random() * 0.5,
          y: Math.random() * 0.2,
          width: 0.4,
          height: 0.08,
        },
      },
      {
        text: 'ACME DAIRY PRODUCTS',
        confidence: 0.92,
        boundingBox: {
          x: 0.1,
          y: 0.05,
          width: 0.8,
          height: 0.1,
        },
      },
    ];

    return {
      blocks,
      rawText: blocks.map((b) => b.text).join('\n'),
    };
  }

  async analyzeExpense(document: TextractDocument): Promise<AnalyzeExpenseResponse> {
    this.callCount++;

    const lineItems: ExpenseLineItem[] = [
      { description: 'Organic Whole Milk, 1 Gallon', quantity: 2, price: 7.98, unitPrice: 3.99 },
      { description: 'Granny Smith Apples, 5 lb', quantity: 1, price: 4.99, unitPrice: 4.99 },
      { description: 'Greek Yogurt, Plain, 32 oz', quantity: 3, price: 11.97, unitPrice: 3.99 },
      {
        description: 'Chicken Breast, Boneless Skinless',
        quantity: 1,
        price: 8.49,
        unitPrice: 8.49,
      },
      { description: 'Spinach, Organic, 5 oz', quantity: 2, price: 7.98, unitPrice: 3.99 },
    ];

    return {
      lineItems,
      totalAmount: lineItems.reduce((sum, item) => sum + (item.price || 0), 0),
      invoiceReceiptDate: new Date().toISOString().split('T')[0],
    };
  }

  getStats() {
    return {
      totalCalls: this.callCount,
    };
  }
}
