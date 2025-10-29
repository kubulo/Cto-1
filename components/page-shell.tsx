import type { ReactNode } from "react";

interface PageShellProps {
  title: string;
  description: string;
  children?: ReactNode;
  actions?: ReactNode;
}

export function PageShell({ title, description, children, actions }: PageShellProps) {
  return (
    <main className="flex min-h-screen flex-col items-center bg-gradient-to-b from-white to-slate-100 px-6 py-16">
      <section className="w-full max-w-5xl rounded-3xl bg-white/90 p-10 shadow-xl backdrop-blur-sm">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-slate-900 sm:text-4xl">{title}</h1>
            <p className="mt-3 text-base text-slate-600">{description}</p>
          </div>
          {actions ? <div className="flex shrink-0 items-center gap-3">{actions}</div> : null}
        </header>
        {children ? <div className="mt-8 space-y-6 text-slate-600">{children}</div> : null}
      </section>
    </main>
  );
}
