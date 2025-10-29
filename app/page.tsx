import Link from "next/link";

const sections = [
  {
    href: "/chat",
    title: "聊天中心",
    description: "与团队的 AI 助手实时协作，快速获取答案。",
  },
  {
    href: "/dashboard",
    title: "数据看板",
    description: "一目了然掌握核心指标，支持自定义数据源。",
  },
  {
    href: "/reports",
    title: "智能报表",
    description: "自动生成报表模板，随时导出分享。",
  },
  {
    href: "/settings",
    title: "系统设置",
    description: "集中管理环境变量、模型参数与团队成员权限。",
  },
];

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center bg-gradient-to-b from-white to-slate-100 px-6 py-16">
      <section className="w-full max-w-5xl rounded-3xl bg-white/90 p-10 shadow-xl backdrop-blur-sm">
        <header className="mb-12 text-center">
          <span className="inline-flex items-center rounded-full bg-blue-50 px-4 py-1 text-sm font-medium text-blue-600">
            Next.js 全栈脚手架
          </span>
          <h1 className="mt-4 text-4xl font-semibold text-slate-900 sm:text-5xl">
            构建你的智能工作流
          </h1>
          <p className="mt-4 text-lg text-slate-600">
            通过预置的页面、API 目录与消息队列任务，快速搭建面向华语团队的 AI 产品原型。
          </p>
        </header>
        <div className="grid gap-6 md:grid-cols-2">
          {sections.map((section) => (
            <Link
              key={section.href}
              href={section.href}
              className="group relative flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-6 transition hover:-translate-y-1 hover:border-blue-200 hover:shadow-lg"
            >
              <h2 className="text-2xl font-semibold text-slate-900">
                {section.title}
              </h2>
              <p className="text-slate-600">{section.description}</p>
              <span className="mt-4 text-sm font-medium text-blue-600 transition group-hover:text-blue-500">
                立即进入 →
              </span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
