// Types, mock data and pure helpers for the local model repository prototype.
// Every user-visible string is resolved through i18n (namespace "model", block
// "model.localRepoPage") inside the consuming components, so this module stays
// locale-free.

/** Where a local model came from. */
export type LocalModelSource = "builtin" | "directory" | "finetuned";

/** Deployment lifecycle state. */
export type LocalModelStatus = "deployed" | "offline";

export interface LocalModelMetrics {
  /** Lower is better. */
  evalLoss: number;
  /** Higher is better. */
  bleu: number;
}

export interface LocalModelRecord {
  id: string;
  name: string;
  /** Model family / architecture tag, e.g. "Qwen2.5". */
  arch: string;
  version: string;
  source: LocalModelSource;
  /** Human-readable parameter count, e.g. "7B". */
  params: string;
  /** Weight precision / quantization, e.g. "BF16". */
  precision: string;
  status: LocalModelStatus;
  /** Present only while the model is deployed. */
  deployTime?: string;
  updateTime: string;
  operator: string;
  /** Fine-tuned models only: id of the base model they were trained from. */
  parentId?: string;
  /** Fine-tuned models only: training dataset name. */
  dataset?: string;
  /** Fine-tuned models only: training hyperparameters. */
  hyperparams?: Record<string, string>;
  /** Evaluation metrics, when available. */
  metrics?: LocalModelMetrics;
}

/** Entries offered by the upload dialog; picking one auto-fills the form. */
export interface UploadCandidate {
  id: string;
  name: string;
  arch: string;
  params: string;
  precision: string;
}

export const PRECISION_OPTIONS = ["BF16", "FP16", "INT8", "GPTQ-INT4", "AWQ-INT4"] as const;

export const INITIAL_LOCAL_MODELS: LocalModelRecord[] = [
  {
    id: "qwen25-7b-instruct",
    name: "Qwen2.5-7B-Instruct",
    arch: "Qwen2.5",
    version: "v1.0.0",
    source: "builtin",
    params: "7B",
    precision: "BF16",
    status: "deployed",
    deployTime: "2026-09-10 09:12",
    updateTime: "2026-09-10 09:12",
    operator: "system",
    metrics: { evalLoss: 1.35, bleu: 61.8 },
  },
  {
    id: "ds-r1-distill-qwen-7b",
    name: "DeepSeek-R1-Distill-Qwen-7B",
    arch: "DeepSeek",
    version: "v1.0.0",
    source: "builtin",
    params: "7B",
    precision: "BF16",
    status: "deployed",
    deployTime: "2026-09-11 14:30",
    updateTime: "2026-09-11 14:30",
    operator: "system",
    metrics: { evalLoss: 1.28, bleu: 63.4 },
  },
  {
    id: "baichuan2-13b-chat",
    name: "Baichuan2-13B-Chat",
    arch: "Baichuan",
    version: "v1.0.0",
    source: "builtin",
    params: "13B",
    precision: "BF16",
    status: "offline",
    updateTime: "2026-09-08 16:45",
    operator: "system",
  },
  {
    id: "qwen25-7b-legal-sft",
    name: "Qwen2.5-7B-Legal-SFT",
    arch: "Qwen2.5",
    version: "v0.9.2",
    source: "finetuned",
    params: "7B",
    precision: "BF16",
    status: "deployed",
    deployTime: "2026-09-12 10:20",
    updateTime: "2026-09-12 10:20",
    operator: "zhang.wei",
    parentId: "qwen25-7b-instruct",
    dataset: "legal-qa-v2",
    hyperparams: { epochs: "3", lr: "5e-5", batch_size: "4", lora_rank: "16" },
    metrics: { evalLoss: 1.02, bleu: 68.4 },
  },
  {
    id: "qwen25-7b-legal-dpo",
    name: "Qwen2.5-7B-Legal-DPO",
    arch: "Qwen2.5",
    version: "v0.9.5",
    source: "finetuned",
    params: "7B",
    precision: "BF16",
    status: "offline",
    updateTime: "2026-09-13 09:05",
    operator: "zhang.wei",
    parentId: "qwen25-7b-legal-sft",
    dataset: "legal-preference-v3",
    hyperparams: { epochs: "2", lr: "1e-5", batch_size: "4", beta: "0.15" },
    metrics: { evalLoss: 0.94, bleu: 71.2 },
  },
  {
    id: "glm-4-9b-chat",
    name: "GLM-4-9B-Chat",
    arch: "GLM",
    version: "v1.0.0",
    source: "directory",
    params: "9B",
    precision: "INT8",
    status: "offline",
    updateTime: "2026-09-09 11:05",
    operator: "li.na",
  },
  {
    id: "llama-3-8b-instruct",
    name: "Llama-3-8B-Instruct",
    arch: "Llama",
    version: "v1.0.0",
    source: "directory",
    params: "8B",
    precision: "FP16",
    status: "offline",
    updateTime: "2026-09-07 18:22",
    operator: "admin",
  },
  {
    id: "qwen25-coder-7b",
    name: "Qwen2.5-Coder-7B-Instruct",
    arch: "Qwen2.5",
    version: "v1.0.0",
    source: "directory",
    params: "7B",
    precision: "GPTQ-INT4",
    status: "offline",
    updateTime: "2026-09-06 13:40",
    operator: "admin",
  },
  {
    id: "ds-r1-legal-dpo",
    name: "DeepSeek-R1-Legal-DPO",
    arch: "DeepSeek",
    version: "v0.3.1",
    source: "finetuned",
    params: "7B",
    precision: "BF16",
    status: "offline",
    updateTime: "2026-09-12 15:35",
    operator: "wang.fang",
    parentId: "ds-r1-distill-qwen-7b",
    dataset: "legal-preference-v1",
    hyperparams: { epochs: "2", lr: "1e-5", batch_size: "8", beta: "0.1" },
    metrics: { evalLoss: 1.11, bleu: 66.9 },
  },
  {
    id: "ds-r1-legal-dpo-v2",
    name: "DeepSeek-R1-Legal-DPO-v2",
    arch: "DeepSeek",
    version: "v0.4.0",
    source: "finetuned",
    params: "7B",
    precision: "BF16",
    status: "offline",
    updateTime: "2026-09-13 10:18",
    operator: "wang.fang",
    parentId: "ds-r1-legal-dpo",
    dataset: "legal-preference-v2",
    hyperparams: { epochs: "1", lr: "8e-6", batch_size: "8", beta: "0.12" },
    metrics: { evalLoss: 1.03, bleu: 70.5 },
  },
];

export const UPLOAD_CANDIDATES: UploadCandidate[] = [
  { id: "cand-qwen25-14b", name: "Qwen2.5-14B-Instruct", arch: "Qwen2.5", params: "14B", precision: "BF16" },
  { id: "cand-llama31-8b", name: "Llama-3.1-8B-Instruct", arch: "Llama", params: "8B", precision: "BF16" },
  { id: "cand-mistral-7b", name: "Mistral-7B-Instruct-v0.3", arch: "Mistral", params: "7B", precision: "FP16" },
  { id: "cand-yi15-9b", name: "Yi-1.5-9B-Chat-32K", arch: "Yi", params: "9B", precision: "BF16" },
];

export interface LocalModelFilter {
  /** Matches model name or arch, case-insensitive. */
  keyword: string;
  source: LocalModelSource | "all";
  status: LocalModelStatus | "all";
}

export function filterLocalModels(
  models: LocalModelRecord[],
  filter: LocalModelFilter,
): LocalModelRecord[] {
  const keyword = filter.keyword.trim().toLowerCase();
  return models.filter((model) => {
    if (filter.source !== "all" && model.source !== filter.source) return false;
    if (filter.status !== "all" && model.status !== filter.status) return false;
    if (keyword) {
      const haystack = `${model.name} ${model.arch}`.toLowerCase();
      if (!haystack.includes(keyword)) return false;
    }
    return true;
  });
}

/** True when any fine-tuned model lists `id` as its parent (blocks deletion). */
export function isReferencedAsParent(models: LocalModelRecord[], id: string): boolean {
  return models.some((model) => model.parentId === id);
}

/** "YYYY-MM-DD HH:mm" timestamp used by mock lifecycle events. */
export function nowLabel(): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

/** Derive a display name from a model directory path (last non-empty segment). */
export function nameFromPath(path: string): string {
  const trimmed = path.trim().replace(/[\\/]+$/, "");
  return trimmed.split(/[\\/]/).pop() ?? "";
}

/** Derive an architecture tag from a model name (leading segment, e.g. "GLM"). */
export function archFromName(name: string): string {
  return name.split("-")[0] ?? "";
}

type ModelTranslator = (key: string) => string;

/** i18n label for a model source (keys live under model.localRepoPage). */
export function sourceLabel(t: ModelTranslator, source: LocalModelSource): string {
  switch (source) {
    case "builtin":
      return t("model.localRepoPage.sourceBuiltin");
    case "directory":
      return t("model.localRepoPage.sourceDirectory");
    case "finetuned":
      return t("model.localRepoPage.sourceFinetuned");
  }
}

/** i18n label for a deployment status (keys live under model.localRepoPage). */
export function statusLabel(t: ModelTranslator, status: LocalModelStatus): string {
  return status === "deployed"
    ? t("model.localRepoPage.statusDeployed")
    : t("model.localRepoPage.statusNotDeployed");
}
