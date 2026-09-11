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
      className={`flex flex-col overflow-hidden border border-[rgba(0,190,255,0.14)] bg-gradient-to-br from-[rgba(17,41,84,0.62)] to-[rgba(6,15,34,0.55)] ${className ?? ""}`}
      style={{ boxShadow: "inset 0 0 26px rgba(0,140,255,0.05)" }}
    >
      <div className="flex min-w-0 shrink-0 flex-wrap items-center gap-x-2 gap-y-1 px-3 pb-1 pt-2">
        <span className="h-1.5 w-1.5 shrink-0 bg-[#00d9ff] shadow-[0_0_6px_rgba(0,217,255,0.8)]" />
        <span className="min-w-0 truncate text-sm font-medium text-[#e3f4ff]">{title}</span>
        {sub ? (
          <span className="min-w-0 truncate text-[10px] tracking-wider text-[#4f7fae]">{sub}</span>
        ) : null}
        {extra ? (
          <span className="ml-auto flex min-w-0 flex-wrap items-center justify-end gap-1 text-[11px] text-[#4f7fae]">
            {extra}
          </span>
        ) : null}
      </div>
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  );
}