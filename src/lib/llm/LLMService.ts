import { setTimeout as delay } from 'node:timers/promises';

export type LLMRole = 'system' | 'user' | 'assistant';

export interface ChatMessage {
  role: LLMRole;
  content: string;
}

export interface ChatCompletionOptions {
  model?: string;
  temperature?: number;
  maxRetries?: number;
  stream?: boolean;
  onToken?: (token: string) => void;
  signal?: AbortSignal;
}

export interface ChatCompletionResult {
  content: string;
  model: string;
  finishReason?: string;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
  raw?: unknown;
}

interface LLMServiceConfiguration {
  model: string;
  temperature: number;
  apiKey?: string;
  apiBaseUrl: string;
  maxRetries: number;
  mock: boolean;
  fetchImpl: typeof fetch;
  retryDelayMs: number;
}

interface StreamInvocationOptions {
  model: string;
  temperature: number;
  signal?: AbortSignal;
  onToken?: (token: string) => void;
}

const DEFAULT_MODEL =
  process.env.LLM_MODEL ?? process.env.OPENAI_MODEL ?? 'gpt-4o-mini';

function resolveNumber(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

const DEFAULT_TEMPERATURE = resolveNumber(process.env.LLM_TEMPERATURE, 0.6);
const DEFAULT_MAX_RETRIES = Math.max(
  0,
  Math.floor(resolveNumber(process.env.LLM_MAX_RETRIES, 2)),
);
const DEFAULT_RETRY_DELAY_MS = Math.max(
  0,
  Math.floor(resolveNumber(process.env.LLM_RETRY_DELAY_MS, 500)),
);
const DEFAULT_API_BASE_URL =
  process.env.OPENAI_BASE_URL ?? 'https://api.openai.com/v1';
const DEFAULT_API_KEY = process.env.OPENAI_API_KEY;
const SHOULD_USE_MOCK =
  process.env.MOCK_LLM === 'true' || !process.env.OPENAI_API_KEY;

const STOP_MESSAGE = '[DONE]';

export class LLMService {
  private readonly config: LLMServiceConfiguration;

  constructor(config: Partial<LLMServiceConfiguration> = {}) {
    const fetchImpl = config.fetchImpl ?? ((input, init) => fetch(input, init));

    this.config = {
      model: config.model ?? DEFAULT_MODEL,
      temperature: config.temperature ?? DEFAULT_TEMPERATURE,
      apiKey: config.apiKey ?? DEFAULT_API_KEY,
      apiBaseUrl: config.apiBaseUrl ?? DEFAULT_API_BASE_URL,
      maxRetries: config.maxRetries ?? DEFAULT_MAX_RETRIES,
      mock: config.mock ?? SHOULD_USE_MOCK,
      fetchImpl,
      retryDelayMs: config.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS,
    };
  }

  get model(): string {
    return this.config.model;
  }

  get temperature(): number {
    return this.config.temperature;
  }

  get usesMockProvider(): boolean {
    return this.config.mock;
  }

  async generateChatCompletion(
    messages: ChatMessage[],
    options: ChatCompletionOptions = {},
  ): Promise<ChatCompletionResult> {
    if (!messages || messages.length === 0) {
      throw new Error('生成回复需要至少一条消息。');
    }

    const targetModel = options.model ?? this.config.model;
    const targetTemperature =
      options.temperature ?? this.config.temperature;
    const maxRetries = options.maxRetries ?? this.config.maxRetries;
    const shouldStream = Boolean(options.stream);

    return this.withRetry(async () => {
      if (this.config.mock) {
        return this.mockCompletion(messages, options.onToken);
      }

      if (!this.config.apiKey) {
        throw new Error('未配置 OPENAI_API_KEY。');
      }

      const payload = {
        model: targetModel,
        temperature: targetTemperature,
        stream: shouldStream,
        messages: messages.map((message) => ({
          role: message.role,
          content: message.content,
        })),
      };

      const response = await this.config.fetchImpl(
        `${this.config.apiBaseUrl}/chat/completions`,
        {
          method: 'POST',
          signal: options.signal,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.config.apiKey}`,
          },
          body: JSON.stringify(payload),
        },
      );

      if (!response.ok) {
        const errorText = await this.extractErrorMessage(response);
        throw new Error(errorText);
      }

      if (shouldStream) {
        return this.consumeStream(response, {
          model: targetModel,
          temperature: targetTemperature,
          signal: options.signal,
          onToken: options.onToken,
        });
      }

      const data = (await response.json()) as {
        choices?: Array<{
          message?: { content?: string };
          finish_reason?: string;
        }>;
        usage?: ChatCompletionResult['usage'];
      };
      const choice = data.choices?.[0];
      const content = choice?.message?.content ?? '';

      return {
        content,
        model: targetModel,
        finishReason: choice?.finish_reason,
        usage: data.usage,
        raw: data,
      };
    }, maxRetries);
  }

  private async consumeStream(
    response: Response,
    options: StreamInvocationOptions,
  ): Promise<ChatCompletionResult> {
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('大语言模型未返回可读的流。');
    }

    const decoder = new TextDecoder();
    let buffer = '';
    let content = '';
    let finishReason: string | undefined;

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      buffer += decoder.decode(value, { stream: true });

      let separatorIndex = buffer.indexOf('\n\n');
      while (separatorIndex !== -1) {
        const chunk = buffer.slice(0, separatorIndex).trim();
        buffer = buffer.slice(separatorIndex + 2);
        separatorIndex = buffer.indexOf('\n\n');

        if (!chunk.startsWith('data:')) {
          continue;
        }

        const data = chunk.slice(5).trim();
        if (!data || data === STOP_MESSAGE) {
          finishReason = finishReason ?? 'stop';
          continue;
        }

        try {
          const parsed = JSON.parse(data) as {
            choices?: Array<{
              delta?: { content?: string };
              finish_reason?: string | null;
            }>;
            usage?: ChatCompletionResult['usage'];
          };

          const delta = parsed.choices?.[0]?.delta?.content ?? '';
          if (delta) {
            content += delta;
            options.onToken?.(delta);
          }

          const currentFinish = parsed.choices?.[0]?.finish_reason;
          if (currentFinish) {
            finishReason = currentFinish;
          }
        } catch (error) {
          // Ignore JSON parsing errors for malformed chunks.
          continue;
        }
      }
    }

    if (buffer.length > 0) {
      // Process any trailing chunk without double line breaks.
      const trimmed = buffer.trim();
      if (trimmed.startsWith('data:')) {
        const data = trimmed.slice(5).trim();
        if (data && data !== STOP_MESSAGE) {
          try {
            const parsed = JSON.parse(data) as {
              choices?: Array<{
                delta?: { content?: string };
                finish_reason?: string | null;
              }>;
            };
            const delta = parsed.choices?.[0]?.delta?.content ?? '';
            if (delta) {
              content += delta;
              options.onToken?.(delta);
            }
            const currentFinish = parsed.choices?.[0]?.finish_reason;
            if (currentFinish) {
              finishReason = currentFinish;
            }
          } catch (error) {
            // ignore
          }
        }
      }
    }

    return {
      content,
      model: options.model,
      finishReason,
    };
  }

  private async mockCompletion(
    messages: ChatMessage[],
    onToken?: (token: string) => void,
  ): Promise<ChatCompletionResult> {
    const lastUserMessage = [...messages]
      .reverse()
      .find((message) => message.role === 'user')?.content;

    const segments = [
      '（模拟教练）我已经收到你的问题。',
      '让我们沿着“现象→原因→本质→原理→趋势”的链路来梳理思路。',
    ];

    if (lastUserMessage) {
      segments.push(`你提到：“${lastUserMessage}”。`);
    }

    segments.push(
      '以下是建议：现象层先承认情境，原因层探究触发因素，本质层厘清核心矛盾，原理层总结可复用的方法，趋势层提示下一步方向。',
    );

    const content = segments.join('');
    if (onToken) {
      for (const segment of segments) {
        onToken(segment);
      }
    }

    return {
      content,
      model: 'mock-coach',
      finishReason: 'stop',
      raw: { provider: 'mock' },
    };
  }

  private async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number,
  ): Promise<T> {
    let attempt = 0;
    let lastError: unknown;

    while (attempt <= maxRetries) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        attempt += 1;
        if (attempt > maxRetries) {
          break;
        }
        const backoff = this.config.retryDelayMs * attempt;
        await delay(backoff);
      }
    }

    throw lastError instanceof Error
      ? lastError
      : new Error('调用大语言模型失败。');
  }

  private async extractErrorMessage(response: Response): Promise<string> {
    try {
      const data = (await response.json()) as {
        error?: { message?: string };
      };
      if (data?.error?.message) {
        return data.error.message;
      }
    } catch (error) {
      // fall through to text
    }

    const text = await response.text();
    if (text) {
      return text;
    }

    return `大语言模型返回了状态码 ${response.status}`;
  }
}
