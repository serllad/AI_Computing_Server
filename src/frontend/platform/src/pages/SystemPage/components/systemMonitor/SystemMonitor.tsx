import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { KPI_DEF } from "./mock";
import type { KpiDef } from "./mock";
import { Alerts, Logs, Overview, Tasks, Topology, Trend, VendorMix } from "./sections";

function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  return now;
}

function formatTime(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function formatDate(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(date.getDate())}`;
}

function Header() {
  const { t } = useTranslation();
  const now = useNow();

  return (
    <header className="flex h-[58px] shrink-0 items-center gap-4 overflow-hidden">
      <div className="flex shrink-0 items-center gap-3">
        <svg viewBox="0 0 40 40" className="h-[38px] w-[38px]" fill="none">
          <path d="M20 3l15 8.5v17L20 37 5 28.5v-17L20 3z" stroke="#2563eb" strokeWidth="1.4" />
          <path
            d="M20 3v17m0 0L5 11.5m15 8.5l15-8.5M20 20v17m0 0l15-8.5M20 37L5 28.5V11.5"
            stroke="#7c3aed"
            strokeWidth="0.9"
            opacity="0.7"
          />
          <circle cx="20" cy="20" r="3.4" fill="#60a5fa" />
        </svg>
        <div>
          <h1 className="text-[22px] font-bold leading-none tracking-[4px] text-gray-800">
            {t("monitor.headerTitle")}
          </h1>
          <div className="mt-1 whitespace-nowrap text-[10px] tracking-[3px] text-gray-400">
            {t("monitor.headerSub")}
          </div>
        </div>
      </div>
      <div className="flex min-w-0 items-center gap-2 border border-gray-200 bg-gray-50 px-4 py-1.5 text-xs text-gray-600">
        <span className="shrink-0 text-gray-400">{t("monitor.currentCluster")}</span>
        <b className="min-w-0 truncate font-semibold text-gray-800">{t("monitor.clusterName")}</b>
        <span className="shrink-0 whitespace-nowrap border-l border-gray-200 pl-2 text-[11px] text-gray-400">
          {t("monitor.singleCluster")}
        </span>
      </div>
      <div className="min-w-0 flex-1 truncate text-center text-xs tracking-[2px] text-gray-400">
        {t("monitor.centerHint")}
      </div>
      <div className="flex shrink-0 items-center gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1.5 text-emerald-600">
          <i className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          {t("monitor.live")}
        </span>
        <div className="text-right">
          <div className="font-mono text-[22px] leading-none text-gray-800">{formatTime(now)}</div>
          <div className="mt-0.5 text-[11px] text-gray-400">{formatDate(now)}</div>
        </div>
      </div>
    </header>
  );
}

function KpiCard({ kpi }: { kpi: KpiDef }) {
  const { t } = useTranslation();
  const up = kpi.delta >= 0;

  return (
    <div className="relative min-w-0 overflow-hidden rounded-lg border border-gray-200 bg-white px-3.5 py-2 shadow-sm">
      <span
        className="absolute bottom-0 left-0 top-0 w-[3px]"
        style={{ background: kpi.color }}
      />
      <div className="flex items-center justify-between gap-2">
        <span className="min-w-0 truncate text-xs text-gray-500">{t(kpi.labelKey)}</span>
        <span className={`shrink-0 text-[11px] ${up ? "text-emerald-600" : "text-red-500"}`}>
          {up ? "▲" : "▼"} {Math.abs(kpi.delta).toFixed(1)}%
        </span>
      </div>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="text-[28px] font-bold leading-none text-gray-800">
          {kpi.value.toFixed(1)}
        </span>
        <span className="text-xs text-gray-400">{t(kpi.unitKey)}</span>
      </div>
    </div>
  );
}

function KpiRow() {
  return (
    <section className="grid shrink-0 grid-cols-7 gap-3">
      {KPI_DEF.map((kpi) => (
        <KpiCard key={kpi.key} kpi={kpi} />
      ))}
    </section>
  );
}

function LeftColumn() {
  return (
    <div className="flex flex-col gap-3">
      <Overview />
      <VendorMix />
    </div>
  );
}

function CenterColumn() {
  return (
    <div className="flex flex-col gap-3">
      <Topology />
      <Trend />
    </div>
  );
}

function RightColumn() {
  return (
    <div className="flex flex-col gap-3">
      <Alerts />
      <Tasks />
      <Logs />
    </div>
  );
}

export function SystemMonitor() {
  return (
    <div className="h-full w-full overflow-auto bg-[#f5f6f8] text-gray-800">
      <div className="flex min-h-full min-w-[1160px] flex-col gap-3 p-4">
        <Header />
        <KpiRow />
        <div className="grid flex-1 grid-cols-[1.05fr_1.25fr_1fr] gap-3">
          <LeftColumn />
          <CenterColumn />
          <RightColumn />
        </div>
      </div>
    </div>
  );
}
