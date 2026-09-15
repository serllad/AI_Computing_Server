import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { DonutChart, TrendChart } from "./charts";
import {
  ALERTS,
  HOSTS,
  LOGS,
  TASKS,
  TOTAL_CARDS,
  TREND_SERIES,
  VENDOR_MAP,
  VENDORS,
  heatColor,
} from "./mock";
import type { AlertItem, Host, LogLevel, Severity, TaskState } from "./mock";
import { Panel } from "./Panel";

const SEVERITY_CLASS: Record<Severity, string> = {
  crit: "bg-red-50 text-red-600 border-red-200",
  warn: "bg-amber-50 text-amber-600 border-amber-200",
  info: "bg-emerald-50 text-emerald-600 border-emerald-200",
};

const TASK_STATE_CLASS: Record<TaskState, string> = {
  running: "bg-blue-50 text-blue-600 border-blue-200",
  finished: "bg-emerald-50 text-emerald-600 border-emerald-200",
  queued: "bg-gray-100 text-gray-500 border-gray-200",
};

const LOG_LEVEL_CLASS: Record<LogLevel, string> = {
  INFO: "text-emerald-600",
  WARN: "text-amber-500",
  ERROR: "text-red-500",
  TASK: "text-blue-600",
};

export function Overview() {
  const { t } = useTranslation();
  const running = TASKS.filter((task) => task.state === "running").length;
  const queued = TASKS.filter((task) => task.state === "queued").length;
  const rows = [
    { icon: "▦", label: t("monitor.overview.node"), value: `${HOSTS.length} / ${HOSTS.length}`, unit: t("monitor.units.node") },
    { icon: "◈", label: t("monitor.overview.card"), value: `${TOTAL_CARDS} / ${TOTAL_CARDS}`, unit: t("monitor.units.card") },
    { icon: "⚡", label: t("monitor.overview.flops"), value: (TOTAL_CARDS * 0.09).toFixed(1), unit: t("monitor.units.pflops") },
    { icon: "▤", label: t("monitor.overview.mem"), value: ((TOTAL_CARDS * 64) / 1024).toFixed(1), unit: t("monitor.units.tb") },
    { icon: "☰", label: t("monitor.overview.run"), value: String(running), unit: "" },
    { icon: "◔", label: t("monitor.overview.queue"), value: String(queued), unit: "" },
  ];

  return (
    <Panel
      className="min-h-0 flex-1"
      title={t("monitor.overviewTitle")}
      sub={t("monitor.overviewSub")}
      extra={t("monitor.sample", { time: "09:41:10" })}
    >
      <div className="flex h-full flex-col justify-between px-3 pb-2">
        {rows.map((row, index) => (
          <div
            key={row.label}
            className={`flex items-center justify-between py-1.5 ${index ? "border-t border-gray-100" : ""}`}
          >
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span className="text-blue-600">{row.icon}</span>
              {row.label}
            </div>
            <div className="text-sm text-gray-800">
              <span className="font-semibold">{row.value}</span>
              {row.unit ? <span className="ml-1 text-xs text-gray-400">{row.unit}</span> : null}
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

export function VendorMix() {
  const { t } = useTranslation();
  const slices = VENDORS.map((vendor) => ({
    count: HOSTS.filter((host) => host.vendor === vendor.key).reduce((sum, host) => sum + host.cards, 0),
    color: vendor.color,
  }));

  return (
    <Panel
      className="min-h-0 flex-1"
      title={t("monitor.vendorMixTitle")}
      sub={t("monitor.vendorMixSub")}
      extra={t("monitor.totalCards")}
    >
      <div className="flex h-full items-center gap-3 px-2.5 pb-2">
        <div className="relative h-32 w-32 shrink-0">
          <DonutChart total={TOTAL_CARDS} slices={slices} />
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <div className="font-mono text-2xl font-bold text-gray-800">{TOTAL_CARDS}</div>
            <div className="mt-0.5 text-[10px] text-gray-400">{t("monitor.totalCards")}</div>
          </div>
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          {VENDORS.map((vendor) => {
            const count = HOSTS.filter((host) => host.vendor === vendor.key).reduce(
              (sum, host) => sum + host.cards,
              0,
            );
            return (
              <div key={vendor.key} className="flex items-center gap-2 text-xs">
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: vendor.color }} />
                <span className="min-w-0 shrink-0 text-gray-700">{t(`monitor.vendors.${vendor.key}`)}</span>
                <span className="min-w-0 truncate text-gray-400">{t(vendor.modelKey)}</span>
                <span className="ml-auto shrink-0 text-gray-800">
                  {count} {t("monitor.units.cardUnit")}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </Panel>
  );
}

function NodeCard({ host }: { host: Host }) {
  const { t } = useTranslation();
  const vendor = VENDOR_MAP[host.vendor];
  const [vmem, setVmem] = useState<number[]>(() => [...host.cardUtil]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setVmem(
        host.cardUtil.map((value) =>
          Math.max(0.05, Math.min(0.95, value + (Math.random() - 0.5) * 0.22)),
        ),
      );
    }, 1500);
    return () => window.clearInterval(timer);
  }, [host]);

  const average = vmem.reduce((sum, value) => sum + value, 0) / vmem.length;

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-gray-200 bg-gray-50/60 p-3">
      <div className="flex items-center gap-1.5 text-xs">
        <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
        <span className="min-w-0 truncate font-mono text-gray-800">{host.ip}</span>
        <span className="ml-auto shrink-0 whitespace-nowrap rounded border border-gray-200 bg-white px-1 text-[10px] text-gray-500">
          {t(host.roleKey)}
        </span>
      </div>
      <div className="flex items-baseline justify-between gap-1.5 text-xs">
        <span className="min-w-0 truncate text-gray-600">
          {t(`monitor.vendors.${host.vendor}`)} · {t(vendor.modelKey)}
        </span>
        <span className="shrink-0 font-mono text-gray-800">×{host.cards}</span>
      </div>
      <div
        className="grid gap-1"
        style={{ gridTemplateColumns: `repeat(${vmem.length}, minmax(0, 1fr))` }}
      >
        {vmem.map((utilization, index) => (
          <span
            key={index}
            className="h-6 w-full rounded-sm transition-colors"
            style={{ background: heatColor(utilization) }}
            title={`${host.ip} · ${t("monitor.columns.cards")} ${index + 1} · ${Math.round(utilization * 100)}%`}
          />
        ))}
      </div>
      <div className="flex items-center justify-between gap-1.5 text-[10px] text-gray-400">
        <span className="shrink-0">{t("monitor.topologyHint")}</span>
        <span className="shrink-0 font-mono text-gray-700">{Math.round(average * 100)}%</span>
      </div>
    </div>
  );
}

export function Topology() {
  const { t } = useTranslation();

  return (
    <Panel
      className="min-h-0 flex-1"
      title={t("monitor.topologyTitle")}
      sub={t("monitor.topologySub")}
      extra={
        <span className="flex items-center gap-1.5">
          <span className="text-emerald-600">{t("monitor.realtime")}</span>
          <span>{t("monitor.topologyHint")}</span>
        </span>
      }
    >
      <div className="grid h-full auto-rows-[minmax(120px,1fr)] grid-cols-1 gap-3 overflow-y-auto p-3">
        {HOSTS.map((host) => (
          <NodeCard key={host.id} host={host} />
        ))}
      </div>
    </Panel>
  );
}

export function Trend() {
  const { t } = useTranslation();
  const util = TREND_SERIES.util;
  const vmem = TREND_SERIES.vmem;
  const lastUtil = util[util.length - 1];
  const lastVmem = vmem[vmem.length - 1];

  return (
    <Panel
      className="min-h-0 flex-[1.3]"
      title={t("monitor.trendTitle")}
      sub={t("monitor.trendSub")}
      extra={t("monitor.trendRange")}
    >
      <div className="flex h-full min-h-0 flex-col p-1.5 pb-2">
        <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1 px-1 pb-1 text-[10px] text-gray-400">
          <span className="flex items-center gap-1">
            <i className="h-1 w-2.5 bg-blue-600" />
            {t("monitor.trendLegend.util")}
            <b className="font-mono text-gray-800">{lastUtil.toFixed(1)}%</b>
          </span>
          <span className="flex items-center gap-1">
            <i className="h-1 w-2.5 bg-violet-600" />
            {t("monitor.trendLegend.vmem")}
            <b className="font-mono text-gray-800">{lastVmem.toFixed(1)}%</b>
          </span>
        </div>
        <div className="min-h-0 flex-1">
          <TrendChart util={util} vmem={vmem} />
        </div>
      </div>
    </Panel>
  );
}

function AlertRow({ alert }: { alert: AlertItem }) {
  const { t } = useTranslation();

  return (
    <div className="flex items-start gap-2 border-b border-gray-100 py-1.5">
      <span className={`rounded border px-1.5 py-0.5 text-[10px] ${SEVERITY_CLASS[alert.sev]}`}>
        {t(`monitor.severity.${alert.sev}`)}
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-xs leading-relaxed text-gray-700">{t(alert.textKey)}</div>
        <div className="mt-0.5 font-mono text-[10px] text-gray-400">{alert.time}</div>
      </div>
    </div>
  );
}

export function Alerts() {
  const { t } = useTranslation();
  const [filter, setFilter] = useState<"all" | Severity>("all");
  const severityKeys = ["all", "crit", "warn", "info"] as const;
  const counts: Record<(typeof severityKeys)[number], number> = {
    all: ALERTS.length,
    crit: ALERTS.filter((alert) => alert.sev === "crit").length,
    warn: ALERTS.filter((alert) => alert.sev === "warn").length,
    info: ALERTS.filter((alert) => alert.sev === "info").length,
  };
  const visible = filter === "all" ? ALERTS : ALERTS.filter((alert) => alert.sev === filter);

  return (
    <Panel
      className="min-h-0 flex-1"
      title={t("monitor.alertsTitle")}
      sub={t("monitor.alertsSub")}
      extra={
        <span className="flex flex-wrap justify-end gap-1.5">
          {severityKeys.map((severity) => (
            <button
              key={severity}
              type="button"
              onClick={() => setFilter(severity)}
              className={`rounded border px-1.5 py-0.5 text-[10px] ${
                filter === severity
                  ? "border-blue-600 bg-blue-600 text-white"
                  : "border-gray-200 bg-white text-gray-500 hover:border-blue-300"
              }`}
            >
              {t(`monitor.severity.${severity}`)} <span className="font-mono">{counts[severity]}</span>
            </button>
          ))}
        </span>
      }
    >
      <div className="h-full overflow-y-auto px-1.5 pb-1.5">
        {visible.length ? (
          visible.map((alert) => <AlertRow key={alert.id} alert={alert} />)
        ) : (
          <div className="py-4 text-center text-xs text-gray-400">{t("monitor.alertsEmptyFilter")}</div>
        )}
      </div>
    </Panel>
  );
}

export function Tasks() {
  const { t } = useTranslation();
  const order: Record<TaskState, number> = { running: 0, queued: 1, finished: 2 };
  const sorted = [...TASKS].sort((a, b) => order[a.state] - order[b.state]);

  return (
    <Panel
      className="min-h-0 flex-1"
      title={t("monitor.tasksTitle")}
      sub={t("monitor.tasksSub")}
      extra={<span className="text-amber-600">{t("monitor.fairShare")}</span>}
    >
      <div className="h-full overflow-y-auto px-1.5 pb-1.5">
        {sorted.map((task) => {
          const host = task.hostId ? HOSTS.find((item) => item.id === task.hostId) : undefined;
          const ip = host ? host.ip : t("monitor.pendingAssign");
          return (
            <div key={task.id} className="flex items-center gap-2 border-b border-gray-100 py-1.5">
              <span className="flex h-6 w-6 items-center justify-center rounded bg-blue-600 text-[11px] font-bold text-white">
                {t("monitor.vendorShort.ascend").charAt(0)}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs text-gray-700">{t(task.nameKey)}</div>
                <div className="mt-0.5 font-mono text-[10px] text-gray-400">
                  {t("monitor.taskMeta", { id: task.id, ip, cards: task.cards })}
                </div>
              </div>
              <span className={`rounded border px-1.5 py-0.5 text-[10px] ${TASK_STATE_CLASS[task.state]}`}>
                {t(`monitor.taskState.${task.state}`)}
              </span>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

export function Logs() {
  const { t } = useTranslation();

  return (
    <Panel
      className="min-h-0 flex-1"
      title={t("monitor.logsTitle")}
      sub={t("monitor.logsSub")}
      extra={t("monitor.realtime")}
    >
      <div className="h-full overflow-auto px-2 pb-1.5 font-mono text-[11px] leading-relaxed text-gray-600">
        {LOGS.map((log, index) => (
          <div key={index} className="whitespace-nowrap">
            <span className="text-gray-400">{log.time}</span>{" "}
            <span className={LOG_LEVEL_CLASS[log.level]}>{log.level}</span> {log.message}
          </div>
        ))}
      </div>
    </Panel>
  );
}
