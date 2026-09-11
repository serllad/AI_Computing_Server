export type VendorKey = "hygon" | "ascend" | "muxi" | "iluvatar";
export type TaskState = "running" | "migrating" | "queued";
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
  series: number[];
}

export const VENDORS: VendorDef[] = [
  { key: "hygon", color: "#00d9ff", modelKey: "monitor.vendorModels.hygon" },
  { key: "ascend", color: "#9a6bff", modelKey: "monitor.vendorModels.ascend" },
  { key: "muxi", color: "#2ee6a8", modelKey: "monitor.vendorModels.muxi" },
  { key: "iluvatar", color: "#ffc24d", modelKey: "monitor.vendorModels.iluvatar" },
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
    vendor: "hygon",
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
    vendor: "hygon",
    cards: 8,
    roleKey: "monitor.roles.train",
    baseU: 0.46,
    baseV: 0.52,
    baseC: 0.39,
    baseM: 0.48,
    baseNet: 2.1,
    baseT: 57,
    baseP: 3.7,
    cardUtil: [0.44, 0.48, 0.42, 0.47, 0.45, 0.49, 0.43, 0.46],
  },
  {
    id: "n03",
    ip: "10.20.1.21",
    vendor: "ascend",
    cards: 8,
    roleKey: "monitor.roles.train",
    baseU: 0.64,
    baseV: 0.71,
    baseC: 0.44,
    baseM: 0.61,
    baseNet: 2.8,
    baseT: 66,
    baseP: 4.3,
    cardUtil: [0.62, 0.66, 0.61, 0.68, 0.63, 0.65, 0.6, 0.67],
  },
  {
    id: "n04",
    ip: "10.20.1.22",
    vendor: "ascend",
    cards: 8,
    roleKey: "monitor.roles.inference",
    baseU: 0.36,
    baseV: 0.44,
    baseC: 0.33,
    baseM: 0.45,
    baseNet: 1.7,
    baseT: 54,
    baseP: 3.3,
    cardUtil: [0.34, 0.38, 0.33, 0.37, 0.35, 0.39, 0.32, 0.36],
  },
  {
    id: "n05",
    ip: "10.20.1.31",
    vendor: "muxi",
    cards: 4,
    roleKey: "monitor.roles.inference",
    baseU: 0.78,
    baseV: 0.82,
    baseC: 0.36,
    baseM: 0.52,
    baseNet: 1.2,
    baseT: 58,
    baseP: 1.9,
    cardUtil: [0.76, 0.79, 0.82, 0.75],
  },
  {
    id: "n06",
    ip: "10.20.1.41",
    vendor: "iluvatar",
    cards: 4,
    roleKey: "monitor.roles.inference",
    baseU: 0.52,
    baseV: 0.58,
    baseC: 0.29,
    baseM: 0.44,
    baseNet: 0.9,
    baseT: 50,
    baseP: 1.7,
    cardUtil: [0.5, 0.54, 0.51, 0.53],
  },
];

export const TOTAL_CARDS = HOSTS.reduce((sum, host) => sum + host.cards, 0);

export const TASKS: TaskItem[] = [
  { id: "T-2409-101", nameKey: "monitor.tasks.t1", hostId: "n01", cards: 4, state: "running" },
  { id: "T-2409-102", nameKey: "monitor.tasks.t2", hostId: "n01", cards: 2, state: "running" },
  { id: "T-2409-103", nameKey: "monitor.tasks.t3", hostId: "n02", cards: 4, state: "running" },
  { id: "T-2409-104", nameKey: "monitor.tasks.t4", hostId: "n03", cards: 4, state: "running" },
  { id: "T-2409-105", nameKey: "monitor.tasks.t5", hostId: "n03", cards: 2, state: "running" },
  { id: "T-2409-106", nameKey: "monitor.tasks.t6", hostId: "n04", cards: 2, state: "running" },
  { id: "T-2409-107", nameKey: "monitor.tasks.t7", hostId: "n05", cards: 2, state: "running" },
  { id: "T-2409-108", nameKey: "monitor.tasks.t8", hostId: "n06", cards: 1, state: "running" },
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
  { time: "09:41:06", level: "TASK", message: "T-2409-103 preempted slot on 10.20.1.22" },
  { time: "09:41:04", level: "INFO", message: "vendor muxi: heartbeat ok · 4 accelerators online" },
  { time: "09:41:02", level: "WARN", message: "node 10.20.1.21 average temperature approaching 70°C" },
  { time: "09:40:58", level: "INFO", message: "node 10.20.1.41: registration completed" },
  { time: "09:40:55", level: "ERROR", message: "alert rule temperature > 70°C armed" },
];

function buildSeries(base: number, amplitude: number, points: number): number[] {
  return Array.from({ length: points }, (_, index) => {
    const wave = Math.sin(index / 3.1) * amplitude;
    const noise = ((index * 37) % 7 - 3) * 0.4;
    return Math.round((base + wave + noise) * 10) / 10;
  });
}

export const KPI_DEF: KpiDef[] = [
  { key: "util", labelKey: "monitor.kpi.util", unitKey: "monitor.units.percent", color: "#00d9ff", value: 58.4, delta: 2.1, series: buildSeries(58, 7, 24) },
  { key: "vmem", labelKey: "monitor.kpi.vmem", unitKey: "monitor.units.percent", color: "#9a6bff", value: 61.7, delta: 1.2, series: buildSeries(61, 6, 24) },
  { key: "cpu", labelKey: "monitor.kpi.cpu", unitKey: "monitor.units.percent", color: "#3d8bff", value: 47.2, delta: -0.8, series: buildSeries(47, 5, 24) },
  { key: "mem", labelKey: "monitor.kpi.mem", unitKey: "monitor.units.percent", color: "#2ee6a8", value: 52.3, delta: 0.4, series: buildSeries(52, 5, 24) },
  { key: "net", labelKey: "monitor.kpi.net", unitKey: "monitor.units.gbps", color: "#ffc24d", value: 3.8, delta: 1.1, series: buildSeries(3.8, 0.5, 24) },
  { key: "power", labelKey: "monitor.kpi.power", unitKey: "monitor.units.kw", color: "#ff7a5c", value: 21.6, delta: 0.6, series: buildSeries(21.6, 1.2, 24) },
  { key: "temp", labelKey: "monitor.kpi.temp", unitKey: "monitor.units.celsius", color: "#ff5c9e", value: 57.9, delta: -0.3, series: buildSeries(57.9, 1.5, 24) },
];

export const TREND_SERIES = {
  util: buildSeries(56, 9, 40),
  vmem: buildSeries(60, 8, 40),
};

export function heatColor(utilization: number): string {
  const clamped = Math.max(0, Math.min(1, utilization));
  const hue = Math.round(140 * (1 - clamped));
  return `hsl(${hue}, 88%, 52%)`;
}