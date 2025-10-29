import { MessageRole } from '@prisma/client';

import { prisma } from '../../../lib/prisma.js';
import { LLMService } from '../../../lib/llm/LLMService.js';
import { PromptEngine } from '../../../lib/llm/PromptEngine.js';

const llmService = new LLMService();
const promptEngine = new PromptEngine();
const encoder = new TextEncoder();

interface ChatRequestBody {
  conversationId?: string;
  message?: string;
  stream?: boolean;
}

export async function POST(request: Request): Promise<Response> {
  try {
    const body = (await safeParseJson(request)) as ChatRequestBody | null;
    if (!body || typeof body !== 'object') {
      return jsonError(400, '请求体格式错误。');
    }

    const { conversationId, message, stream } = body;

    if (!conversationId || typeof conversationId !== 'string') {
      return jsonError(400, '缺少会话标识 conversationId。');
    }

    const trimmedMessage = typeof message === 'string' ? message.trim() : '';
    if (!trimmedMessage) {
      return jsonError(400, '请提供有效的咨询内容。');
    }

    const sessionToken = extractSessionToken(request);
    if (!sessionToken) {
      return jsonError(401, '需要有效的登录会话。');
    }

    const session = await prisma.session.findUnique({
      where: { token: sessionToken },
      include: { user: true },
    });

    if (!session || session.expiresAt.getTime() <= Date.now()) {
      return jsonError(401, '会话已过期，请重新登录。');
    }

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!conversation || conversation.userId !== session.userId) {
      return jsonError(404, '未找到会话或没有访问权限。');
    }

    const conversationPromptConfig = (
      conversation as unknown as { promptConfig?: unknown }
    ).promptConfig;

    await prisma.message.create({
      data: {
        conversationId,
        userId: session.userId,
        role: MessageRole.USER,
        content: trimmedMessage,
        metadata: {
          source: 'api.chat',
        },
      },
    });

    const history = conversation.messages.map((item) => ({
      role: item.role,
      content: item.content,
    }));

    const promptMessages = promptEngine.buildMessages({
      conversation: {
        title: conversation.title,
        summary: conversation.summary,
        promptConfig: conversationPromptConfig,
      },
      history,
      latestUserMessage: trimmedMessage,
      userName: session.user.name,
    });

    const shouldStream = Boolean(stream);

    if (shouldStream) {
      return streamResponse({
        promptMessages,
        conversationId,
      });
    }

    const completion = await llmService.generateChatCompletion(promptMessages);
    const assistantContent = completion.content.trim();

    await prisma.message.create({
      data: {
        conversationId,
        role: MessageRole.ASSISTANT,
        content: assistantContent,
        metadata: {
          model: completion.model,
          finishReason: completion.finishReason,
          temperature: llmService.temperature,
        },
      },
    });

    return jsonResponse({
      reply: assistantContent,
      model: completion.model,
      finishReason: completion.finishReason,
    });
  } catch (error) {
    console.error('Failed to handle /api/chat request', error);
    return jsonError(500, '无法生成教练回复，请稍后重试。');
  }
}

async function safeParseJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch (error) {
    return null;
  }
}

function extractSessionToken(request: Request): string | null {
  const authorization = request.headers.get('authorization');
  if (authorization && authorization.startsWith('Bearer ')) {
    const token = authorization.slice('Bearer '.length).trim();
    if (token) {
      return token;
    }
  }

  const headerToken = request.headers.get('x-session-token');
  if (headerToken && headerToken.trim()) {
    return headerToken.trim();
  }

  const cookieHeader = request.headers.get('cookie');
  if (cookieHeader) {
    const cookies = cookieHeader.split(';').map((value) => value.trim());
    for (const cookie of cookies) {
      if (!cookie) continue;
      const [key, ...rest] = cookie.split('=');
      if (key === 'session_token') {
        const token = rest.join('=').trim();
        if (token) {
          return token;
        }
      }
    }
  }

  return null;
}

function jsonResponse(payload: unknown, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json; charset=utf-8');

  return new Response(JSON.stringify(payload), {
    ...init,
    headers,
  });
}

function jsonError(status: number, message: string): Response {
  return jsonResponse({ error: message }, { status });
}

function streamResponse(params: {
  promptMessages: Parameters<LLMService['generateChatCompletion']>[0];
  conversationId: string;
}): Response {
  const stream = new ReadableStream<Uint8Array>({
    start: async (controller) => {
      let aggregated = '';
      try {
        const result = await llmService.generateChatCompletion(
          params.promptMessages,
          {
            stream: true,
            onToken: (token) => {
              aggregated += token;
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ token })}\n\n`,
                ),
              );
            },
          },
        );

        const content = (aggregated || result.content).trim();

        await prisma.message.create({
          data: {
            conversationId: params.conversationId,
            role: MessageRole.ASSISTANT,
            content,
            metadata: {
              model: result.model,
              finishReason: result.finishReason,
              temperature: llmService.temperature,
            },
          },
        });

        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ done: true, content })}\n\n`,
          ),
        );
        controller.close();
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : '生成回复时发生未知错误。';
        controller.enqueue(
          encoder.encode(
            `event: error\ndata: ${JSON.stringify({ message })}\n\n`,
          ),
        );
        controller.close();
      }
    },
    cancel: () => {
      // No-op: upstream abort handled via AbortController if needed.
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
