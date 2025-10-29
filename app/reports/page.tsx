import { PageShell } from "@/components/page-shell";

const reportTypes = [
  {
    title: "周度运营简报",
    detail: "自动汇总客服数据、营销转化与用户反馈，支持导出 PDF 与 Markdown。"
  },
  {
    title: "渠道效果分析",
    detail: "对比多渠道投放的曝光、互动与转化指标，并给出优化建议。"
  },
  {
    title: "客户情感洞察",
    detail: "基于聊天与工单数据的情感判定，识别重点关注客户。"
  }
];

export default function ReportsPage() {
  return (
    <PageShell
      title="智能报表"
      description="为业务团队生成高质量的可视化报告，支持模板化与自动调度。"
    >
      <p>
        报表模块将结合 PostgreSQL 中的结构化数据与 Redis 中的实时缓存，帮助团队快速生成可分享的分析成果。
      </p>
      <ul className="space-y-4">
        {reportTypes.map((report) => (
          <li key={report.title} className="rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">{report.title}</h2>
            <p className="mt-2 text-slate-600">{report.detail}</p>
          </li>
        ))}
      </ul>
    </PageShell>
  );
}
