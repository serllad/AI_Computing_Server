export type VendorKey = "ascend";
export type TaskState = "running" | "finished" | "queued";
export type Severity = "crit" | "warn" | "info";
export type LogLevel = "INFO" | "WARN" | "ERROR" | "TASK";

export interface VendorDef {
  key: VendorKey;
  color: string;
  modelKey: string;
}

export interface Host {
  id: string;
  ip: string;
  vendor: VendorKey;
  cards: number;
  roleKey: string;
  baseU: number;
  baseV: number;
  baseC: number;
  baseM: number;
  baseNet: number;
  baseT: number;
  baseP: number;
  cardUtil: number[];
}

export interface TaskItem {
  id: string;
  nameKey: string;
  hostId: string | null;
  cards: number;
  state: TaskState;
}

export interface AlertItem {
  id: number;
  sev: Severity;
  textKey: string;
  time: string;
}

export interface LogItem {
  time: string;
  level: LogLevel;
  message: string;
}

export interface KpiDef {
  key: string;
  labelKey: string;
  unitKey: string;
  color: string;
  value: number;
  delta: number;
}

export const VENDORS: VendorDef[] = [
  { key: "ascend", color: "#2563eb", modelKey: "monitor.vendorModels.ascend" },
];

export const VENDOR_MAP = VENDORS.reduce(
  (map, vendor) => {
    map[vendor.key] = vendor;
    return map;
  },
  {} as Record<VendorKey, VendorDef>,
);

export const HOSTS: Host[] = [
  {
    id: "n01",
    ip: "10.20.1.11",
    vendor: "ascend",
    cards: 8,
    roleKey: "monitor.roles.train",
    baseU: 0.72,
    baseV: 0.66,
    baseC: 0.48,
    baseM: 0.55,
    baseNet: 3.4,
    baseT: 61,
    baseP: 4.1,
    cardUtil: [0.74, 0.71, 0.76, 0.69, 0.73, 0.7, 0.77, 0.68],
  },
  {
    id: "n02",
    ip: "10.20.1.12",
    vendor: "ascend",
    cards: 8,
    roleKey: "monitor.roles.inference",
    baseU: 0.46,
    baseV: 0.52,
    baseC: 0.39,
    baseM: 0.48,
    baseNet: 2.1,
    baseT: 57,
    baseP: 3.7,
    cardUtil: [0.44, 0.48, 0.42, 0.47, 0.45, 0.49, 0.43, 0.46],
  },
];

export const TOTAL_CARDS = HOSTS.reduce((sum, host) => sum + host.cards, 0);

export const TASKS: TaskItem[] = [
  { id: "T-2409-101", nameKey: "monitor.tasks.t1", hostId: "n01", cards: 4, state: "running" },
  { id: "T-2409-102", nameKey: "monitor.tasks.t2", hostId: "n01", cards: 2, state: "running" },
  { id: "T-2409-103", nameKey: "monitor.tasks.t3", hostId: "n02", cards: 4, state: "running" },
  { id: "T-2409-104", nameKey: "monitor.tasks.t4", hostId: "n02", cards: 2, state: "running" },
  { id: "T-2409-105", nameKey: "monitor.tasks.t5", hostId: "n01", cards: 4, state: "finished" },
  { id: "T-2409-106", nameKey: "monitor.tasks.t6", hostId: "n02", cards: 2, state: "finished" },
  { id: "T-2409-201", nameKey: "monitor.tasks.t9", hostId: null, cards: 8, state: "queued" },
  { id: "T-2409-202", nameKey: "monitor.tasks.t10", hostId: null, cards: 4, state: "queued" },
];

export const ALERTS: AlertItem[] = [
  { id: 1, sev: "warn", textKey: "monitor.alerts.a1", time: "09:41:02" },
  { id: 2, sev: "info", textKey: "monitor.alerts.a2", time: "09:39:55" },
  { id: 3, sev: "info", textKey: "monitor.alerts.a3", time: "09:38:40" },
];

export const LOGS: LogItem[] = [
  { time: "09:41:10", level: "INFO", message: "scheduler: fair-share policy applied to cluster ZC-01" },
  { time: "09:41:08", level: "INFO", message: "node 10.20.1.11: accelerator metrics pushed (8 cards, 72.4%)" },
  { time: "09:41:06", level: "TASK", message: "T-2409-103 preempted slot on 10.20.1.12" },
  { time: "09:41:04", level: "INFO", message: "vendor ascend: heartbeat ok · 8 accelerators online" },
  { time: "09:41:02", level: "WARN", message: "node 10.20.1.11 average temperature approaching 70°C" },
  { time: "09:40:58", level: "INFO", message: "node 10.20.1.12: registration completed" },
  { time: "09:40:55", level: "ERROR", message: "alert rule temperature > 70°C armed" },
];

export const KPI_DEF: KpiDef[] = [
  { key: "util", labelKey: "monitor.kpi.util", unitKey: "monitor.units.percent", color: "#2563eb", value: 58.4, delta: 2.1 },
  { key: "vmem", labelKey: "monitor.kpi.vmem", unitKey: "monitor.units.percent", color: "#7c3aed", value: 61.7, delta: 1.2 },
  { key: "cpu", labelKey: "monitor.kpi.cpu", unitKey: "monitor.units.percent", color: "#0891b2", value: 47.2, delta: -0.8 },
  { key: "mem", labelKey: "monitor.kpi.mem", unitKey: "monitor.units.percent", color: "#059669", value: 52.3, delta: 0.4 },
  { key: "net", labelKey: "monitor.kpi.net", unitKey: "monitor.units.gbps", color: "#d97706", value: 3.8, delta: 1.1 },
  { key: "power", labelKey: "monitor.kpi.power", unitKey: "monitor.units.kw", color: "#e11d48", value: 21.6, delta: 0.6 },
  { key: "temp", labelKey: "monitor.kpi.temp", unitKey: "monitor.units.celsius", color: "#db2777", value: 57.9, delta: -0.3 },
];

function buildSeries(base: number, amplitude: number, points: number): number[] {
  return Array.from({ length: points }, (_, index) => {
    const wave = Math.sin(index / 3.1) * amplitude;
    const noise = ((index * 37) % 7 - 3) * 0.4;
    return Math.round((base + wave + noise) * 10) / 10;
  });
}

export const TREND_SERIES = {
  util: buildSeries(56, 9, 40),
  vmem: buildSeries(60, 8, 40),
};

export function heatColor(utilization: number): string {
  const clamped = Math.max(0, Math.min(1, utilization));
  const hue = Math.round(140 * (1 - clamped));
  return `hsl(${hue}, 82%, 52%)`;
}
