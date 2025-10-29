import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  DEFAULT_LAYER_MIX,
  PromptEngine,
} from '../PromptEngine.js';

describe('PromptEngine', () => {
  it('builds a default persona-aligned system prompt', () => {
    const engine = new PromptEngine();
    const messages = engine.buildMessages({
      conversation: {
        title: '教练会话测试',
        summary: '帮助学员识别执行瓶颈。',
      },
      history: [],
      latestUserMessage: '我想提升团队的执行效率。',
      userName: '李雷',
    });

    const systemMessage = messages[0];
    assert.equal(systemMessage.role, 'system');
    assert.match(systemMessage.content, /角色定位：Cto-1 中文高阶领导力教练/);
    const mixText = `现象${DEFAULT_LAYER_MIX.phenomenon}%｜原因${DEFAULT_LAYER_MIX.reason}%｜本质${DEFAULT_LAYER_MIX.essence}%｜原理${DEFAULT_LAYER_MIX.principle}%｜趋势${DEFAULT_LAYER_MIX.trend}%`;
    assert.ok(
      systemMessage.content.includes(mixText),
      '系统提示应包含默认的层级配比',
    );
    assert.match(systemMessage.content, /会话摘要：帮助学员识别执行瓶颈。/);
    assert.match(systemMessage.content, /学员姓名：李雷/);

    const lastMessage = messages[messages.length - 1];
    assert.equal(lastMessage.role, 'user');
    assert.equal(lastMessage.content, '我想提升团队的执行效率。');
  });

  it('merges conversation prompt overrides before assembling the prompt', () => {
    const engine = new PromptEngine();
    const messages = engine.buildMessages({
      conversation: {
        title: '战略复盘',
        summary: null,
        promptConfig: {
          tone: '沉稳而坚定',
          coachType: '韧性重塑教练',
          layerMix: {
            phenomenon: 20,
            reason: 30,
            essence: 25,
            principle: 15,
            trend: 10,
          },
          goals: ['加强跨部门协作', '巩固决策节奏'],
          customInstructions: '偏向提出双选项方案，由学员选择。',
        },
      },
      history: [
        { role: 'ASSISTANT', content: '你好，我是你的教练。' },
        { role: 'USER', content: '我们团队执行力下降。' },
      ],
      latestUserMessage: '接下来我应该怎么做？',
      userName: '王敏',
    });

    const systemMessage = messages[0];
    assert.equal(messages[1].role, 'assistant');
    assert.ok(systemMessage.content.includes('沉稳而坚定'));
    assert.ok(systemMessage.content.includes('韧性重塑教练'));
    assert.ok(
      systemMessage.content.includes(
        '现象20%｜原因30%｜本质25%｜原理15%｜趋势10%',
      ),
    );
    assert.match(systemMessage.content, /加强跨部门协作/);
    assert.match(systemMessage.content, /偏向提出双选项方案/);
    const lastMessage = messages[messages.length - 1];
    assert.equal(lastMessage.role, 'user');
    assert.equal(lastMessage.content, '接下来我应该怎么做？');
  });
});
