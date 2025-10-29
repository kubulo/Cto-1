import { PageShell } from "@/components/page-shell";

const settingGroups = [
  {
    title: "基础参数",
    items: ["站点域名", "OpenAI / WeChat 等外部服务 API Key", "系统通知邮箱"]
  },
  {
    title: "数据源",
    items: ["PostgreSQL 连接串", "Redis 缓存设置", "向量数据库开关"]
  },
  {
    title: "权限与团队",
    items: ["角色分级管理", "成员邀请与审核", "登录方式配置"]
  }
];

export default function SettingsPage() {
  return (
    <PageShell
      title="系统设置"
      description="统一管理项目的环境变量、服务参数与团队权限，支持多环境切换。"
    >
      <p>
        通过此页面可以扩展环境变量编辑器、模型配置、消息通知策略等功能，为后续的 DevOps 流程做好准备。
      </p>
      <div className="space-y-5">
        {settingGroups.map((group) => (
          <section key={group.title} className="rounded-2xl border border-slate-200 bg-slate-50 px-6 py-5">
            <h2 className="text-lg font-semibold text-slate-900">{group.title}</h2>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-700">
              {group.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </PageShell>
  );
}
