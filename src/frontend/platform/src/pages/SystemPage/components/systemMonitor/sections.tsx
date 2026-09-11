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
  crit: "bg-[rgba(255,92,106,0.18)] text-[#ff8d98] border-[rgba(255,92,106,0.4)]",
  warn: "bg-[rgba(255,194,77,0.15)] text-[#ffd98a] border-[rgba(255,194,77,0.4)]",
  info: "bg-[rgba(46,230,168,0.14)] text-[#7df0c8] border-[rgba(46,230,168,0.4)]",
};

const TASK_STATE_CLASS: Record<TaskState, string> = {
  running: "bg-[rgba(46,230,168,0.14)] text-[#7df0c8] border-[rgba(46,230,168,0.35)]",
  migrating: "bg-[rgba(255,194,77,0.16)] text-[#ffd98a] border-[rgba(255,194,77,0.45)]",
  queued: "bg-[rgba(140,160,200,0.12)] text-[#a9c6e6] border-[rgba(140,160,200,0.3)]",
};

const LOG_LEVEL_CLASS: Record<LogLevel, string> = {
  INFO: "text-[#58d9b0]",
  WARN: "text-[#ffc24d]",
  ERROR: "text-[#ff6d7a]",
  TASK: "text-[#6fb6ff]",
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
      className="min-h-0 flex-[1.05]"
      title={t("monitor.overviewTitle")}
      sub={t("monitor.overviewSub")}
      extra={t("monitor.sample", { time: "09:41:10" })}
    >
      <div className="flex h-full flex-col justify-between px-3 pb-2">
        {rows.map((row, index) => (
          <div
            key={row.label}
            className={`flex items-center justify-between py-1.5 ${index ? "border-t border-white/5" : ""}`}
          >
            <div className="flex items-center gap-2 text-xs text-[#86b4de]">
              <span className="text-[#00d9ff]">{row.icon}</span>
              {row.label}
            </div>
            <div className="text-sm text-[#f0fbff]">
              <span className="font-bold">{row.value}</span>
              {row.unit ? <span className="ml-1 text-xs text-[#86b4de]">{row.unit}</span> : null}
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
      className="min-h-0 flex-[1.25]"
      title={t("monitor.vendorMixTitle")}
      sub={t("monitor.vendorMixSub")}
      extra={t("monitor.totalCards")}
    >
      <div className="flex h-full items-center gap-3 px-2.5 pb-2">
        <div className="relative h-32 w-32 shrink-0">
          <DonutChart total={TOTAL_CARDS} slices={slices} />
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <div className="font-mono text-2xl font-bold text-[#f0fbff]">{TOTAL_CARDS}</div>
            <div className="mt-0.5 text-[10px] text-[#86b4de]">{t("monitor.totalCards")}</div>
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
                <span className="h-2 w-2 rounded-full" style={{ background: vendor.color }} />
                <span className="text-[#c9ecff]">{t(`monitor.vendors.${vendor.key}`)}</span>
                <span className="text-[#4f7fae]">{t(vendor.modelKey)}</span>
                <span className="ml-auto text-[#eaf9ff]">
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

export function ModelList() {
  const { t } = useTranslation();

  return (
    <Panel
      className="min-h-0 flex-[1.1]"
      title={t("monitor.modelTitle")}
      sub={t("monitor.modelSub")}
    >
      <div className="flex h-full flex-col justify-between gap-1.5 px-2.5 pb-2">
        {VENDORS.map((vendor) => {
          const hosts = HOSTS.filter((host) => host.vendor === vendor.key);
          const cards = hosts.reduce((sum, host) => sum + host.cards, 0);
          const utilization = cards
            ? hosts.reduce((sum, host) => sum + host.baseU * host.cards, 0) / cards
            : 0;
          return (
            <div key={vendor.key} className="flex items-center gap-2 text-xs">
              <span className="h-2 w-2 rounded-full" style={{ background: vendor.color }} />
              <span className="w-16 text-[#c9ecff]">{t(`monitor.vendors.${vendor.key}`)}</span>
              <span className="w-16 text-[#4f7fae]">{t(vendor.modelKey)}</span>
              <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-[rgba(120,180,240,0.12)]">
                <span
                  className="block h-full rounded-full"
                  style={{
                    width: `${Math.round(utilization * 100)}%`,
                    background: `linear-gradient(90deg, ${vendor.color}, #6fd8ff)`,
                  }}
                />
              </span>
              <span className="w-10 text-right text-[#eaf9ff]">{Math.round(utilization * 100)}%</span>
              <span className="w-12 text-right text-[#00d9ff]">
                {cards} {t("monitor.units.cardUnit")}
              </span>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

function NodeCard({ host }: { host: Host }) {
  const { t } = useTranslation();
  const vendor = VENDOR_MAP[host.vendor];
  const average = host.cardUtil.reduce((sum, value) => sum + value, 0) / host.cardUtil.length;

  return (
    <div className="flex flex-col gap-1.5 border border-[rgba(0,190,255,0.14)] bg-[rgba(0,20,50,0.4)] p-2">
      <div className="flex items-center gap-1.5 text-[11px]">
        <span className="h-1.5 w-1.5 rounded-full bg-[#2ee6a8] shadow-[0_0_6px_#2ee6a8]" />
        <span className="font-mono text-[#dff3ff]">{host.ip}</span>
        <span className="ml-auto rounded border border-[rgba(0,190,255,0.35)] px-1 text-[9px] text-[#c9ecff]">
          {t(host.roleKey)}
        </span>
      </div>
      <div className="flex items-baseline justify-between text-[11px]">
        <span className="truncate text-[#bcdcf6]">
          {t(`monitor.vendors.${host.vendor}`)} · {t(vendor.modelKey)}
        </span>
        <span className="font-mono text-[#00d9ff]">×{host.cards}</span>
      </div>
      <div className="grid grid-cols-4 content-center gap-1">
        {host.cardUtil.map((utilization, index) => (
          <span
            key={index}
            className="h-5 w-full"
            style={{ background: heatColor(utilization) }}
            title={`${host.ip} · ${t("monitor.columns.cards")} ${index + 1}`}
          />
        ))}
      </div>
      <div className="flex items-center justify-between text-[10px] text-[#4f7fae]">
        <span>{t("monitor.nodeMemory", { count: host.cards })}</span>
        <span className="font-mono text-[#eaf9ff]">{Math.round(average * 100)}%</span>
      </div>
    </div>
  );
}

export function Topology() {
  const { t } = useTranslation();

  return (
    <Panel
      className="min-h-0"
      title={t("monitor.topologyTitle")}
      sub={t("monitor.topologySub")}
      extra={
        <span className="flex items-center gap-1.5">
          <span className="text-[#2ee6a8]">{t("monitor.realtime")}</span>
          <span>{t("monitor.topologyHint")}</span>
        </span>
      }
    >
      <div className="grid h-full grid-cols-6 gap-2 p-2">
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
      className="min-h-0"
      title={t("monitor.trendTitle")}
      sub={t("monitor.trendSub")}
      extra={
        <span className="flex items-center gap-3 text-[10px] text-[#86b4de]">
          <span className="flex items-center gap-1">
            <i className="h-1 w-2.5 bg-[#00d9ff]" />
            {t("monitor.trendLegend.util")}
            <b className="font-mono text-[#eaf9ff]">{lastUtil.toFixed(1)}%</b>
          </span>
          <span className="flex items-center gap-1">
            <i className="h-1 w-2.5 bg-[#9a6bff]" />
            {t("monitor.trendLegend.vmem")}
            <b className="font-mono text-[#eaf9ff]">{lastVmem.toFixed(1)}%</b>
          </span>
          <span>{t("monitor.trendRange")}</span>
        </span>
      }
    >
      <div className="h-full p-1.5 pb-2">
        <TrendChart util={util} vmem={vmem} />
      </div>
    </Panel>
  );
}

function AlertRow({ alert }: { alert: AlertItem }) {
  const { t } = useTranslation();

  return (
    <div className="flex items-start gap-2 border-b border-white/5 py-1.5">
      <span className={`rounded border px-1.5 py-0.5 text-[9px] ${SEVERITY_CLASS[alert.sev]}`}>
        {t(`monitor.severity.${alert.sev}`)}
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-xs leading-relaxed text-[#d6ebfc]">{t(alert.textKey)}</div>
        <div className="mt-0.5 font-mono text-[10px] text-[#4f7fae]">{alert.time}</div>
      </div>
      <button
        type="button"
        className="h-[18px] w-[18px] border border-[rgba(120,180,240,0.2)] text-[11px] leading-[16px] text-[#4f7fae]"
      >
        ✓
      </button>
    </div>
  );
}

export function Alerts() {
  const { t } = useTranslation();
  const severityKeys = ["all", "crit", "warn", "info"] as const;
  const counts: Record<(typeof severityKeys)[number], number> = {
    all: ALERTS.length,
    crit: ALERTS.filter((alert) => alert.sev === "crit").length,
    warn: ALERTS.filter((alert) => alert.sev === "warn").length,
    info: ALERTS.filter((alert) => alert.sev === "info").length,
  };

  return (
    <Panel
      className="min-h-0 flex-[1.5]"
      title={t("monitor.alertsTitle")}
      sub={t("monitor.alertsSub")}
      extra={
        <span className="flex gap-1.5">
          {severityKeys.map((severity) => (
            <span
              key={severity}
              className={`rounded border px-1.5 py-0.5 text-[10px] ${
                severity === "all"
                  ? "border-[#00d9ff] bg-[#00d9ff] text-[#0a2230]"
                  : "border-[rgba(0,190,255,0.14)] text-[#86b4de]"
              }`}
            >
              {t(`monitor.severity.${severity}`)} <span className="font-mono">{counts[severity]}</span>
            </span>
          ))}
        </span>
      }
    >
      <div className="h-full overflow-y-auto px-1.5 pb-1.5">
        {ALERTS.map((alert) => (
          <AlertRow key={alert.id} alert={alert} />
        ))}
      </div>
    </Panel>
  );
}

export function Tasks() {
  const { t } = useTranslation();
  const order: Record<TaskState, number> = { running: 0, migrating: 1, queued: 2 };
  const sorted = [...TASKS].sort((a, b) => order[a.state] - order[b.state]);

  return (
    <Panel
      className="min-h-0 flex-[1.25]"
      title={t("monitor.tasksTitle")}
      sub={t("monitor.tasksSub")}
      extra={<span className="text-[#ffd98a]">{t("monitor.fairShare")}</span>}
    >
      <div className="h-full overflow-y-auto px-1.5 pb-1.5">
        {sorted.map((task) => {
          const host = task.hostId ? HOSTS.find((item) => item.id === task.hostId) : undefined;
          const vendor = host ? VENDOR_MAP[host.vendor] : undefined;
          const ip = host ? host.ip : t("monitor.pendingAssign");
          return (
            <div key={task.id} className="flex items-center gap-2 border-b border-white/5 py-1.5">
              <span
                className="flex h-6 w-6 items-center justify-center rounded text-[11px] font-bold text-[#0a2230]"
                style={{ background: vendor?.color ?? "#5a7296" }}
              >
                {vendor ? t(`monitor.vendorShort.${vendor.key}`).charAt(0) : "Q"}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs text-[#d6ebfc]">{t(task.nameKey)}</div>
                <div className="mt-0.5 font-mono text-[10px] text-[#4f7fae]">
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
      className="min-h-0 flex-[1]"
      title={t("monitor.logsTitle")}
      sub={t("monitor.logsSub")}
      extra={t("monitor.realtime")}
    >
      <div className="h-full overflow-y-auto px-2 pb-1.5 font-mono text-[11px] leading-relaxed text-[#9ec7ea]">
        {LOGS.map((log, index) => (
          <div key={index} className="whitespace-nowrap">
            <span className="text-[#3f6d96]">{log.time}</span>{" "}
            <span className={LOG_LEVEL_CLASS[log.level]}>{log.level}</span> {log.message}
          </div>
        ))}
      </div>
    </Panel>
  );
}

function HostRow({ host }: { host: Host }) {
  const { t } = useTranslation();
  const vendor = VENDOR_MAP[host.vendor];
  const util = Math.round(host.baseU * 1000) / 10;
  const vmem = Math.round(host.baseV * 1000) / 10;
  const mem = Math.round(host.baseM * 1000) / 10;

  return (
    <tr className="border-b border-white/5 hover:bg-[rgba(0,190,255,0.07)]">
      <td className="px-2 py-1.5">
        <div className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-sm" style={{ background: vendor.color }} />
          <span className="font-mono text-[#dff3ff]">{host.ip}</span>
          <span className="text-[#4f7fae]">{t(`monitor.nodes.${host.id}`)}</span>
        </div>
      </td>
      <td className="px-2 py-1.5 text-[#bcdcf6]">
        {t(`monitor.vendors.${host.vendor}`)} / {t(vendor.modelKey)}
      </td>
      <td className="px-2 py-1.5 font-mono text-[#00d9ff]">{host.cards}</td>
      <td className="px-2 py-1.5">
        <div className="flex items-center gap-1.5">
          <span className="h-1.5 w-[86px] overflow-hidden rounded bg-[rgba(120,180,240,0.12)]">
            <span
              className="block h-full rounded"
              style={{ width: `${util}%`, background: heatColor(host.baseU) }}
            />
          </span>
          <span className="font-mono text-[11px] text-[#9ec7ea]">{util}%</span>
        </div>
      </td>
      <td className="px-2 py-1.5">
        <div className="flex items-center gap-1.5">
          <span className="h-1.5 w-[86px] overflow-hidden rounded bg-[rgba(120,180,240,0.12)]">
            <span
              className="block h-full rounded"
              style={{ width: `${vmem}%`, background: heatColor(host.baseV) }}
            />
          </span>
          <span className="font-mono text-[11px] text-[#9ec7ea]">{vmem}%</span>
        </div>
      </td>
      <td className="px-2 py-1.5">
        <div className="flex items-center gap-1.5">
          <span className="h-1.5 w-[86px] overflow-hidden rounded bg-[rgba(120,180,240,0.12)]">
            <span className="block h-full rounded" style={{ width: `${mem}%`, background: "#3d8bff" }} />
          </span>
          <span className="font-mono text-[11px] text-[#9ec7ea]">{mem}%</span>
        </div>
      </td>
      <td className="px-2 py-1.5 font-mono text-[#9ec7ea]">
        ↓{(host.baseNet * 0.72).toFixed(1)}G ↑{(host.baseNet * 0.28).toFixed(1)}G
      </td>
      <td className="px-2 py-1.5 font-mono text-[#9ec7ea]">
        {host.baseT.toFixed(1)}
        {t("monitor.units.celsius")}
      </td>
      <td className="px-2 py-1.5 font-mono text-[#9ec7ea]">
        {host.baseP.toFixed(1)}
        {t("monitor.units.kw")}
      </td>
      <td className="px-2 py-1.5">
        <span className="rounded border border-[rgba(46,230,168,0.4)] bg-[rgba(46,230,168,0.08)] px-1.5 py-0.5 text-[10px] text-[#58e6b8]">
          {t("monitor.status.on")}
        </span>
      </td>
      <td className="px-2 py-1.5 whitespace-nowrap">
        <button
          type="button"
          className="rounded border border-[rgba(0,190,255,0.35)] bg-[rgba(0,190,255,0.06)] px-2 py-0.5 text-[10px] text-[#8fd9ff]"
        >
          {t("monitor.actions.detail")}
        </button>
        <button
          type="button"
          className="ml-1 rounded border border-[rgba(255,92,106,0.5)] bg-[rgba(255,92,106,0.07)] px-2 py-0.5 text-[10px] text-[#ff9aa5]"
        >
          {t("monitor.actions.drill")}
        </button>
      </td>
    </tr>
  );
}

export function HostTable() {
  const { t } = useTranslation();
  const columns = ["device", "vendor", "cards", "util", "vmem", "mem", "net", "temp", "power", "status", "actions"] as const;

  return (
    <section
      className="flex h-[232px] shrink-0 flex-col overflow-hidden border border-[rgba(0,190,255,0.14)] bg-gradient-to-br from-[rgba(17,41,84,0.62)] to-[rgba(6,15,34,0.55)]"
      style={{ boxShadow: "inset 0 0 26px rgba(0,140,255,0.05)" }}
    >
      <div className="flex shrink-0 items-center gap-2 px-3 pb-1 pt-2">
        <span className="h-1.5 w-1.5 bg-[#00d9ff] shadow-[0_0_6px_rgba(0,217,255,0.8)]" />
        <span className="text-sm font-medium text-[#e3f4ff]">{t("monitor.tableTitle")}</span>
        <span className="text-[10px] tracking-wider text-[#4f7fae]">{t("monitor.tableSub")}</span>
        <span className="ml-auto text-[11px] text-[#4f7fae]">{t("monitor.tableHint")}</span>
      </div>
      <div className="min-h-0 flex-1 overflow-auto px-2 pb-2">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr>
              {columns.map((column) => (
                <th
                  key={column}
                  className="sticky top-0 z-10 whitespace-nowrap border-b border-[rgba(0,190,255,0.2)] bg-[#0a1a36] px-2 py-1.5 text-left text-[11px] font-normal tracking-wider text-[#86b4de]"
                >
                  {t(`monitor.columns.${column}`)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {HOSTS.map((host) => (
              <HostRow key={host.id} host={host} />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}