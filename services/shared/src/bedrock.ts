import {
  BedrockRuntimeClient,
  InvokeModelCommand,
  InvokeModelCommandInput,
} from '@aws-sdk/client-bedrock-runtime';
import { BedrockError } from './errors.js';

const HAIKU_MODEL = 'anthropic.claude-haiku-4-5-20251001-v1:0';
const SONNET_MODEL = 'anthropic.claude-sonnet-4-6-20251101-v1:0';

export type ModelId = 'haiku' | 'sonnet';

interface ContentBlockParam {
  type: 'text' | 'image';
  text?: string;
  source?: {
    type: 'base64' | 'url';
    mediaType?: string;
    data?: string;
    url?: string;
  };
}

interface ToolUseBlockParam {
  type: 'tool_use';
  id: string;
  name: string;
  input: Record<string, unknown>;
}

interface CacheControlParam {
  type: 'ephemeral';
}

interface MessageParam {
  role: 'user' | 'assistant';
  content: (ContentBlockParam | ToolUseBlockParam | CacheControlParam)[];
}

interface ToolDefinition {
  name: string;
  description: string;
  input_schema: {
    type: string;
    properties: Record<string, unknown>;
    required: string[];
  };
}

export interface BedrockInvokeOptions {
  model: ModelId;
  messages: MessageParam[];
  systemPrompt?: string;
  systemPromptCacheControl?: boolean;
  tools?: ToolDefinition[];
  toolChoice?: { type: 'auto' | 'tool'; name?: string };
  maxTokens?: number;
  temperature?: number;
  retryCount?: number;
  retryDelayMs?: number;
}

interface BedrockResponse {
  content: Array<{ type: string; text?: string; id?: string; name?: string; input?: Record<string, unknown> }>;
  usage: {
    inputTokens: number;
    outputTokens: number;
    cacheCreationInputTokens?: number;
    cacheReadInputTokens?: number;
  };
  stopReason: string;
}

export class BedrockClient {
  private client: BedrockRuntimeClient;

  constructor(region: string = process.env.AWS_REGION || 'us-east-1') {
    this.client = new BedrockRuntimeClient({ region });
  }

  async invoke(options: BedrockInvokeOptions): Promise<BedrockResponse> {
    const { model, messages, systemPrompt, systemPromptCacheControl, tools, toolChoice, maxTokens = 1024, temperature = 0.7, retryCount = 2, retryDelayMs = 100 } = options;

    const modelId = model === 'haiku' ? HAIKU_MODEL : SONNET_MODEL;

    const systemContent: Array<ContentBlockParam | CacheControlParam> = [];
    if (systemPrompt) {
      systemContent.push({
        type: 'text',
        text: systemPrompt,
      });
      if (systemPromptCacheControl) {
        systemContent.push({
          type: 'ephemeral',
        } as CacheControlParam);
      }
    }

    const params: InvokeModelCommandInput = {
      modelId,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify({
        anthropic_version: 'bedrock-2023-06-01',
        max_tokens: maxTokens,
        temperature,
        system: systemContent.length > 0 ? systemContent : undefined,
        messages,
        tools: tools && tools.length > 0 ? tools : undefined,
        tool_choice: toolChoice,
      }),
    };

    let lastError: Error = new Error('Unknown error');

    for (let attempt = 0; attempt <= retryCount; attempt++) {
      try {
        const command = new InvokeModelCommand(params);
        const response = await this.client.send(command);

        const responseBody = JSON.parse(new TextDecoder().decode(response.body));
        return {
          content: responseBody.content || [],
          usage: {
            inputTokens: responseBody.usage?.input_tokens || 0,
            outputTokens: responseBody.usage?.output_tokens || 0,
            cacheCreationInputTokens: responseBody.usage?.cache_creation_input_tokens,
            cacheReadInputTokens: responseBody.usage?.cache_read_input_tokens,
          },
          stopReason: responseBody.stop_reason || 'end_turn',
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < retryCount) {
          const delay = retryDelayMs * Math.pow(2, attempt);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw new BedrockError(lastError.message, 'BEDROCK_INVOKE_FAILED', true);
  }
}

export { HAIKU_MODEL, SONNET_MODEL };
