/**
 * Fallback to Bedrock Haiku for low-confidence OCR results.
 * When Textract confidence < 0.7, use Claude to parse the raw text.
 */

import { BedrockClient } from '@wfl/services-shared/bedrock';
import { z } from 'zod';

const HaikuDateParseResponseSchema = z.object({
  date: z.string().datetime(),
  confidence: z.number().min(0).max(1),
  reasoning: z.string().max(100),
});

type HaikuDateParseResponse = z.infer<typeof HaikuDateParseResponseSchema>;

export async function parseWithBedrock(ocrText: string, confidence: number): Promise<HaikuDateParseResponse | null> {
  // Only use Bedrock fallback if Textract confidence is low
  if (confidence >= 0.7) {
    return null;
  }

  const bedrockClient = new BedrockClient();

  const systemPrompt = `You are a date parser. Extract the expiry/best-by date from OCR text.

Return a JSON object with:
- date: ISO 8601 datetime (end of day: 23:59:59Z)
- confidence: 0-1 (how sure you are)
- reasoning: brief explanation

If no date found, return null for date and confidence 0.`;

  const userPrompt = `Parse this OCR text for a date: "${ocrText}"`;

  try {
    const response = await bedrockClient.invoke({
      model: 'haiku',
      messages: [
        {
          role: 'user',
          content: [{ type: 'text', text: userPrompt }],
        },
      ],
      systemPrompt,
      maxTokens: 200,
      temperature: 0.2,
    });

    const textContent = response.content.find((c) => c.type === 'text');
    if (!textContent || !textContent.text) {
      return null;
    }

    // Try to parse JSON from response
    const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return null;
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return HaikuDateParseResponseSchema.parse({
      date: parsed.date,
      confidence: parsed.confidence,
      reasoning: parsed.reasoning,
    });
  } catch (error) {
    // If Bedrock fallback fails, return null and let caller handle
    return null;
  }
}
