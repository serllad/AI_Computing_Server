import type { ReactNode } from "react";

interface PanelProps {
  title: string;
  sub?: string;
  extra?: ReactNode;
  className?: string;
  children: ReactNode;
}

export function Panel({ title, sub, extra, className, children }: PanelProps) {
  return (
    <div
      className={`flex flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm ${className ?? ""}`}
    >
      <div className="flex min-w-0 shrink-0 flex-wrap items-center gap-x-2 gap-y-1 px-3 pb-1 pt-2">
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-blue-600" />
        <span className="min-w-0 truncate text-sm font-medium text-gray-700">{title}</span>
        {sub ? (
          <span className="min-w-0 truncate text-[10px] tracking-wider text-gray-400">{sub}</span>
        ) : null}
        {extra ? (
          <span className="ml-auto flex min-w-0 flex-wrap items-center justify-end gap-1 text-[11px] text-gray-400">
            {extra}
          </span>
        ) : null}
      </div>
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  );
}
