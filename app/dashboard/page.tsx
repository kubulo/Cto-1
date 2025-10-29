import { PageShell } from "@/components/page-shell";

const metrics = [
  { name: "今日新增用户", value: "1,238" },
  { name: "AI 调用成功率", value: "99.2%" },
  { name: "处理消息数", value: "8,465" },
  { name: "待跟进线索", value: "37" }
];

export default function DashboardPage() {
  return (
    <PageShell
      title="数据看板"
      description="通过实时指标与趋势洞察业务表现，支持自定义维度与时间范围。"
    >
      <p>
        该模块示例展示了如何在 Next.js App Router 中封装数据获取逻辑，并为未来的图表、实时推送与多租户管理预留空间。
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        {metrics.map((metric) => (
          <div
            key={metric.name}
            className="rounded-2xl border border-slate-200 bg-slate-50/70 px-6 py-5 shadow-sm"
          >
            <div className="text-sm text-slate-500">{metric.name}</div>
            <div className="mt-2 text-2xl font-semibold text-slate-900">{metric.value}</div>
          </div>
        ))}
      </div>
    </PageShell>
  );
}
