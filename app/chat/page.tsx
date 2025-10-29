import { PageShell } from "@/components/page-shell";

const quickPrompts = [
  "总结最新的需求变更并生成行动项",
  "将聊天记录转成团队周报",
  "根据客户反馈生成下一步跟进计划",
  "将销售提案润色为正式邮件"
];

export default function ChatPage() {
  return (
    <PageShell
      title="聊天中心"
      description="随时与内置的多模态助理对话，支持语音、图片与结构化数据解析。"
    >
      <p>
        聊天中心用于连接企业内部知识库与 OpenAI、智谱等大模型服务，帮助团队在一个界面内处理咨询、生成内容与自动化协作。
      </p>
      <div>
        <h2 className="text-lg font-semibold text-slate-800">常用提示词</h2>
        <ul className="mt-3 grid gap-3 sm:grid-cols-2">
          {quickPrompts.map((prompt) => (
            <li
              key={prompt}
              className="rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3 text-sm text-slate-700"
            >
              {prompt}
            </li>
          ))}
        </ul>
      </div>
    </PageShell>
  );
}
