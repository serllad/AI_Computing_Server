import { useTranslation } from "react-i18next";
import { Sparkline } from "./charts";
import { KPI_DEF } from "./mock";
import type { KpiDef } from "./mock";
import { Alerts, HostTable, Logs, ModelList, Overview, Tasks, Topology, Trend, VendorMix } from "./sections";

function Header() {
  const { t } = useTranslation();

  return (
    <header className="flex h-[58px] shrink-0 items-center gap-4 overflow-hidden">
      <div className="flex shrink-0 items-center gap-3">
        <svg viewBox="0 0 40 40" className="h-[38px] w-[38px]" fill="none">
          <path d="M20 3l15 8.5v17L20 37 5 28.5v-17L20 3z" stroke="#00d9ff" strokeWidth="1.4" />
          <path
            d="M20 3v17m0 0L5 11.5m15 8.5l15-8.5M20 20v17m0 0l15-8.5M20 37L5 28.5V11.5"
            stroke="#3d8bff"
            strokeWidth="0.9"
            opacity="0.7"
          />
          <circle cx="20" cy="20" r="3.4" fill="#7ef0ff" />
        </svg>
        <div>
          <h1
            className="bg-gradient-to-b from-[#eafaff] to-[#2aa7e8] bg-clip-text text-[24px] font-bold leading-none tracking-[6px] text-transparent"
            style={{ textShadow: "0 0 22px rgba(0,190,255,0.25)" }}
          >
            {t("monitor.headerTitle")}
          </h1>
          <div className="mt-1 whitespace-nowrap text-[10px] tracking-[4px] text-[#4f7fae]">
            {t("monitor.headerSub")}
          </div>
        </div>
      </div>
      <div
        className="flex min-w-0 items-center gap-2 border border-[rgba(0,190,255,0.35)] bg-gradient-to-r from-[rgba(0,190,255,0.14)] to-[rgba(0,190,255,0.03)] px-4 py-1.5 text-xs text-[#c9ecff]"
        style={{ clipPath: "polygon(10px 0, 100% 0, calc(100% - 10px) 100%, 0 100%)" }}
      >
        <span className="shrink-0 text-[#4f7fae]">{t("monitor.currentCluster")}</span>
        <b className="min-w-0 truncate font-semibold text-[#00d9ff]">{t("monitor.clusterName")}</b>
        <span className="shrink-0 whitespace-nowrap border-l border-white/10 pl-2 text-[11px] text-[#4f7fae]">
          {t("monitor.singleCluster")}
        </span>
      </div>
      <div className="min-w-0 flex-1 truncate text-center text-xs tracking-[2px] text-[#4f7fae]">
        {t("monitor.centerHint")}
      </div>
      <div className="flex shrink-0 items-center gap-4 text-xs text-[#86b4de]">
        <span className="flex items-center gap-1.5 text-[#2ee6a8]">
          <i className="h-1.5 w-1.5 rounded-full bg-[#2ee6a8]" />
          {t("monitor.live")}
        </span>
        <div className="text-right">
          <div className="font-mono text-[22px] leading-none text-[#eaf9ff]">09:41:10</div>
          <div className="mt-0.5 text-[11px] text-[#4f7fae]">2026/09/12</div>
        </div>
        <button
          type="button"
          title={t("monitor.alertsTitle")}
          className="relative flex h-[34px] w-[34px] items-center justify-center border border-[rgba(0,190,255,0.14)] bg-[rgba(0,20,50,0.4)] text-[#9fd7ff]"
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M6 9a6 6 0 1112 0c0 4 2 5.5 2 5.5H4S6 13 6 9zM10.5 20a2 2 0 003 0" />
          </svg>
        </button>
      </div>
    </header>
  );
}

function KpiCard({ kpi }: { kpi: KpiDef }) {
  const { t } = useTranslation();
  const up = kpi.delta >= 0;

  return (
    <div
      className="relative min-w-0 overflow-hidden border border-[rgba(0,190,255,0.14)] bg-gradient-to-br from-[rgba(17,41,84,0.62)] to-[rgba(6,15,34,0.55)] px-3.5 py-2"
      style={{ boxShadow: "inset 0 0 26px rgba(0,140,255,0.05)" }}
    >
      <span
        className="absolute bottom-0 left-0 top-0 w-[3px]"
        style={{ background: kpi.color, boxShadow: `0 0 12px ${kpi.color}` }}
      />
      <div className="flex items-center justify-between gap-2">
        <span className="min-w-0 truncate text-xs text-[#86b4de]">{t(kpi.labelKey)}</span>
        <span className={`shrink-0 text-[11px] ${up ? "text-[#2ee6a8]" : "text-[#ff5c6a]"}`}>
          {up ? "▲" : "▼"} {Math.abs(kpi.delta).toFixed(1)}%
        </span>
      </div>
      <div className="mt-0.5 flex items-baseline gap-1">
        <span
          className="text-[28px] font-bold leading-none text-[#f0fbff]"
          style={{ textShadow: "0 0 14px rgba(120,220,255,0.35)" }}
        >
          {kpi.value.toFixed(1)}
        </span>
        <span className="text-xs text-[#86b4de]">{t(kpi.unitKey)}</span>
      </div>
      <div className="pointer-events-none absolute bottom-1.5 right-2 opacity-90">
        <Sparkline values={kpi.series} color={kpi.color} />
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
      <ModelList />
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
    <div className="h-full w-full overflow-auto bg-[#030711] text-[#e3f4ff]">
      <div className="flex min-h-full min-w-[1160px] flex-col gap-3 p-4">
        <Header />
        <KpiRow />
        <div className="grid flex-1 grid-cols-[1.05fr_1.25fr_1fr] gap-3">
          <LeftColumn />
          <CenterColumn />
          <RightColumn />
        </div>
        <HostTable />
      </div>
    </div>
  );
}