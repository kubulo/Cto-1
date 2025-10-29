import type { ChatMessage, LLMRole } from './LLMService.js';

export interface PersonaLayerMix {
  phenomenon: number;
  reason: number;
  essence: number;
  principle: number;
  trend: number;
}

export interface PromptPersona {
  role: string;
  coachType: string;
  tone: string;
  thinkingFramework: string;
  layerMix: PersonaLayerMix;
  styleGuidance: string;
  goals: string[];
  customInstructions?: string;
}

export interface PromptOverrides
  extends Partial<Omit<PromptPersona, 'layerMix'>> {
  layerMix?: Partial<PersonaLayerMix>;
}

export interface PromptConversationContext {
  title: string;
  summary?: string | null;
  promptConfig?: unknown;
}

export interface PromptHistoryMessage {
  role: 'USER' | 'ASSISTANT' | 'SYSTEM';
  content: string;
}

export interface BuildMessagesParams {
  conversation: PromptConversationContext;
  history: PromptHistoryMessage[];
  latestUserMessage: string;
  userName?: string | null;
  overrides?: PromptOverrides;
}

export const DEFAULT_LAYER_MIX: PersonaLayerMix = {
  phenomenon: 30,
  reason: 25,
  essence: 20,
  principle: 15,
  trend: 10,
};

export const DEFAULT_PERSONA: PromptPersona = {
  role: 'Cto-1 中文高阶领导力教练',
  coachType: '战略洞察型教练',
  tone: '温暖、尊重且富有洞察力',
  thinkingFramework:
    '坚持“现象→原因→本质→原理→趋势”的层级链路，帮助学员从复杂现象中抽离关键洞察并转化为行动。',
  layerMix: DEFAULT_LAYER_MIX,
  styleGuidance:
    '使用高质量中文表达，兼具专业判断与共情回应，避免空泛口号，确保输出可执行。',
  goals: ['帮助学员快速看清问题结构', '引导学员落实高杠杆行动'],
  customInstructions:
    '如对话中出现情绪波动，需要先共情再给出下一步建议。',
};

export class PromptEngine {
  private readonly defaults: PromptPersona;

  constructor(defaults: Partial<PromptPersona> = {}) {
    this.defaults = {
      ...DEFAULT_PERSONA,
      ...defaults,
      layerMix: this.mergeLayerMix(
        DEFAULT_PERSONA.layerMix,
        defaults.layerMix,
      ),
      goals: defaults.goals ?? DEFAULT_PERSONA.goals,
      customInstructions:
        defaults.customInstructions ?? DEFAULT_PERSONA.customInstructions,
    };
  }

  buildMessages(params: BuildMessagesParams): ChatMessage[] {
    const conversationOverrides = this.extractOverridesFromConversation(
      params.conversation.promptConfig,
    );

    const persona = this.composePersona(
      conversationOverrides,
      params.overrides,
    );

    const systemPrompt = this.renderSystemPrompt({
      persona,
      conversationTitle: params.conversation.title,
      conversationSummary: params.conversation.summary ?? undefined,
      userName: params.userName ?? undefined,
      goals:
        persona.goals ??
        conversationOverrides.goals ??
        params.overrides?.goals ??
        this.defaults.goals,
      customInstructions:
        persona.customInstructions ??
        conversationOverrides.customInstructions ??
        params.overrides?.customInstructions ??
        undefined,
    });

    const latestUserMessage = params.latestUserMessage.trim();
    const historyMessages = this.transformHistory(params.history);

    return [
      { role: 'system', content: systemPrompt },
      ...historyMessages,
      {
        role: 'user',
        content: latestUserMessage,
      },
    ];
  }

  private transformHistory(history: PromptHistoryMessage[]): ChatMessage[] {
    return history
      .filter((message) => message.content.trim().length > 0)
      .map((message) => ({
        role: this.normalizeRole(message.role),
        content: message.content,
      }));
  }

  private normalizeRole(role: PromptHistoryMessage['role']): LLMRole {
    switch (role) {
      case 'ASSISTANT':
        return 'assistant';
      case 'SYSTEM':
        return 'system';
      default:
        return 'user';
    }
  }

  private composePersona(
    conversationOverrides: PromptOverrides,
    runtimeOverrides?: PromptOverrides,
  ): PromptPersona {
    const layerMix = this.mergeLayerMix(
      this.defaults.layerMix,
      conversationOverrides.layerMix,
      runtimeOverrides?.layerMix,
    );

    return {
      role:
        runtimeOverrides?.role ??
        conversationOverrides.role ??
        this.defaults.role,
      coachType:
        runtimeOverrides?.coachType ??
        conversationOverrides.coachType ??
        this.defaults.coachType,
      tone:
        runtimeOverrides?.tone ??
        conversationOverrides.tone ??
        this.defaults.tone,
      thinkingFramework:
        runtimeOverrides?.thinkingFramework ??
        conversationOverrides.thinkingFramework ??
        this.defaults.thinkingFramework,
      layerMix,
      styleGuidance:
        runtimeOverrides?.styleGuidance ??
        conversationOverrides.styleGuidance ??
        this.defaults.styleGuidance,
      goals:
        runtimeOverrides?.goals ??
        conversationOverrides.goals ??
        this.defaults.goals,
      customInstructions:
        runtimeOverrides?.customInstructions ??
        conversationOverrides.customInstructions ??
        this.defaults.customInstructions,
    };
  }

  private mergeLayerMix(
    base: PersonaLayerMix,
    ...overrides: Array<Partial<PersonaLayerMix> | undefined>
  ): PersonaLayerMix {
    return overrides.reduce<PersonaLayerMix>((accumulator, current) => {
      if (!current) {
        return accumulator;
      }
      return {
        phenomenon:
          typeof current.phenomenon === 'number'
            ? current.phenomenon
            : accumulator.phenomenon,
        reason:
          typeof current.reason === 'number'
            ? current.reason
            : accumulator.reason,
        essence:
          typeof current.essence === 'number'
            ? current.essence
            : accumulator.essence,
        principle:
          typeof current.principle === 'number'
            ? current.principle
            : accumulator.principle,
        trend:
          typeof current.trend === 'number'
            ? current.trend
            : accumulator.trend,
      };
    }, { ...base });
  }

  private extractOverridesFromConversation(
    promptConfig: unknown,
  ): PromptOverrides {
    if (!promptConfig || typeof promptConfig !== 'object') {
      return {};
    }

    const config = promptConfig as Record<string, unknown>;
    const overrides: PromptOverrides = {};

    if (typeof config.role === 'string') {
      overrides.role = config.role;
    }
    if (typeof config.coachType === 'string') {
      overrides.coachType = config.coachType;
    }
    if (typeof config.tone === 'string') {
      overrides.tone = config.tone;
    }
    if (typeof config.thinkingFramework === 'string') {
      overrides.thinkingFramework = config.thinkingFramework;
    }
    if (typeof config.styleGuidance === 'string') {
      overrides.styleGuidance = config.styleGuidance;
    }
    if (typeof config.customInstructions === 'string') {
      overrides.customInstructions = config.customInstructions;
    }
    if (Array.isArray(config.goals)) {
      overrides.goals = config.goals.filter(
        (item): item is string => typeof item === 'string',
      );
    }
    if (config.layerMix && typeof config.layerMix === 'object') {
      const layerMix = config.layerMix as Record<string, unknown>;
      overrides.layerMix = {};
      if (typeof layerMix.phenomenon === 'number') {
        overrides.layerMix.phenomenon = layerMix.phenomenon;
      }
      if (typeof layerMix.reason === 'number') {
        overrides.layerMix.reason = layerMix.reason;
      }
      if (typeof layerMix.essence === 'number') {
        overrides.layerMix.essence = layerMix.essence;
      }
      if (typeof layerMix.principle === 'number') {
        overrides.layerMix.principle = layerMix.principle;
      }
      if (typeof layerMix.trend === 'number') {
        overrides.layerMix.trend = layerMix.trend;
      }
    }

    return overrides;
  }

  private renderSystemPrompt(params: {
    persona: PromptPersona;
    conversationTitle: string;
    conversationSummary?: string;
    userName?: string;
    goals: string[];
    customInstructions?: string;
  }): string {
    const { persona, conversationTitle, conversationSummary, userName } = params;
    const layerMix = persona.layerMix;
    const layerMixDisplay = `现象${layerMix.phenomenon}%｜原因${layerMix.reason}%｜本质${layerMix.essence}%｜原理${layerMix.principle}%｜趋势${layerMix.trend}%`;

    const goalLines = (params.goals.length > 0
      ? params.goals
      : this.defaults.goals
    ).map((goal) => `- ${goal}`);

    const backgroundLines = [
      `会话标题：${conversationTitle}`,
      conversationSummary ? `会话摘要：${conversationSummary}` : undefined,
      userName ? `学员姓名：${userName}` : undefined,
    ].filter((value): value is string => Boolean(value));

    const instructionLines = [
      '全程使用地道的中文，与学员保持温暖而专业的互动。',
      `请严格按照“现象→原因→本质→原理→趋势”的顺序组织内容，并结合层级配比 ${layerMixDisplay}。`,
      `每个层级单独成段，可使用编号或小标题，确保条理清晰。`,
      `在结尾补充“下一步行动建议”，聚焦一项可落地的行动。`,
      persona.styleGuidance,
    ].filter((line): line is string => Boolean(line && line.trim().length > 0));

    if (params.customInstructions) {
      instructionLines.push(params.customInstructions);
    }

    return [
      `角色定位：${persona.role}`,
      `教练类型：${persona.coachType}`,
      `语气设定：${persona.tone}`,
      `思维框架：${persona.thinkingFramework}`,
      `层级配比（现象→原因→本质→原理→趋势）：${layerMixDisplay}`,
      `角色目标：\n${goalLines.join('\n')}`,
      `对话背景：\n${
        backgroundLines.length > 0
          ? backgroundLines.join('\n')
          : '暂无额外背景信息'
      }`,
      `表达要求：\n${instructionLines.join('\n')}`,
    ].join('\n\n');
  }
}
