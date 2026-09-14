// Details dialog for a single local model: basic info card, fine-tune metadata
// (dataset / hyperparameters / evaluation metrics) and a multi-generation
// lineage chain. Right-clicking an ancestor opens an inline menu; every action
// (metric comparison / rollback) is triggered from that menu.

import { Badge } from "@/components/bs-ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/bs-ui/dialog";
import { useEffect, useMemo, useState, type MouseEvent as ReactMouseEvent } from "react";
import { useTranslation } from "react-i18next";
import { SourceBadge, StatusBadge } from "./LocalModelBadges";
import type { LocalModelRecord } from "./localModelData";

interface InfoRowProps {
  label: string;
  value: string;
}

function InfoRow({ label, value }: InfoRowProps) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium">{value}</dd>
    </div>
  );
}

function formatMetric(value: number | undefined): string {
  return value === undefined ? "--" : value.toFixed(2);
}

export interface LocalModelDetailsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  model: LocalModelRecord | null;
  /** Full local model list, used to resolve every lineage ancestor. */
  models: LocalModelRecord[];
  /** Roll the currently viewed fine-tuned model back to its immediate parent. */
  onRollback: (modelId: string) => void;
}

export function LocalModelDetails({
  open,
  onOpenChange,
  model,
  models,
  onRollback,
}: LocalModelDetailsProps) {
  const { t } = useTranslation("model");
  const [compareWithId, setCompareWithId] = useState<string | null>(null);
  const [menuId, setMenuId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setCompareWithId(null);
      setMenuId(null);
    }
  }, [open]);

  const lineage = useMemo(() => {
    if (!model) return [];
    const byId = new Map(models.map((item) => [item.id, item]));
    const chain: LocalModelRecord[] = [];
    let cursor: LocalModelRecord | undefined = model;
    while (cursor) {
      chain.unshift(cursor);
      cursor = cursor.parentId ? byId.get(cursor.parentId) : undefined;
    }
    return chain;
  }, [model, models]);

  const compareTarget = compareWithId ? models.find((item) => item.id === compareWithId) : null;

  if (!model) return null;

  const openMenu = (event: ReactMouseEvent, id: string) => {
    event.preventDefault();
    setMenuId((prev) => (prev === id ? null : id));
  };

  const currentIndex = lineage.length - 1;
  const canRollbackTo = (id: string) => id === model.parentId && model.source === "finetuned";

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-[760px]">
          <DialogHeader>
            <DialogTitle>{t("model.localRepoPage.detailsTitle")}</DialogTitle>
            <DialogDescription className="sr-only">{model.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-lg font-semibold">{model.name}</span>
              <Badge variant="outline">{model.version}</Badge>
              <SourceBadge source={model.source} />
              <StatusBadge status={model.status} />
            </div>

            <div className="rounded-lg border p-4">
              <div className="text-sm font-medium">{t("model.localRepoPage.basicInfo")}</div>
              <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
                <InfoRow label={t("model.localRepoPage.arch")} value={model.arch} />
                <InfoRow label={t("model.localRepoPage.colVersion")} value={model.version} />
                <InfoRow
                  label={t("model.localRepoPage.colParams")}
                  value={`${model.params} · ${model.precision}`}
                />
                <InfoRow label={t("model.localRepoPage.colOperator")} value={model.operator} />
                <InfoRow
                  label={t("model.localRepoPage.deployTime")}
                  value={model.deployTime ?? "--"}
                />
                <InfoRow label={t("model.localRepoPage.updateTime")} value={model.updateTime} />
                {model.source === "finetuned" && (
                  <InfoRow
                    label={t("model.localRepoPage.trainingDataset")}
                    value={model.dataset ?? "--"}
                  />
                )}
              </dl>
            </div>

            {model.source === "finetuned" && (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-lg border p-4">
                  <div className="text-sm font-medium">
                    {t("model.localRepoPage.trainingDataset")}
                  </div>
                  <div className="mt-2 text-sm text-muted-foreground">{model.dataset ?? "--"}</div>
                  <div className="mt-4 text-sm font-medium">
                    {t("model.localRepoPage.hyperparameters")}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {Object.entries(model.hyperparams ?? {}).map(([key, value]) => (
                      <span key={key} className="rounded bg-muted px-2 py-1 text-xs">
                        {key}: {value}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="rounded-lg border p-4">
                  <div className="text-sm font-medium">
                    {t("model.localRepoPage.evaluationMetrics")}
                  </div>
                  <div className="mt-3 space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">
                        {t("model.localRepoPage.evalLoss")}
                      </span>
                      <span className="font-medium">{formatMetric(model.metrics?.evalLoss)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">{t("model.localRepoPage.bleu")}</span>
                      <span className="font-medium">{formatMetric(model.metrics?.bleu)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="rounded-lg border p-4">
              <div className="mb-3 text-sm font-medium">{t("model.localRepoPage.lineage")}</div>
              <div className="flex items-start gap-2 overflow-x-auto pb-2">
                {lineage.map((item, index) => {
                  const isCurrent = index === currentIndex;
                  return (
                    <div key={item.id} className="flex items-start gap-2">
                      {index > 0 && <div className="mt-5 h-px w-8 shrink-0 bg-gradient-to-r from-primary/40 to-primary/10" />}
                      <div className="relative">
                        <button
                          type="button"
                          onContextMenu={(event) => !isCurrent && openMenu(event, item.id)}
                          className={`min-w-[200px] rounded-xl border p-3 text-left transition-colors ${
                            isCurrent
                              ? "border-emerald-500/40 bg-emerald-500/5"
                              : "border-primary/20 bg-primary/5 hover:border-primary/50 hover:bg-primary/10"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">
                              {isCurrent
                                ? t("model.localRepoPage.currentModel")
                                : t("model.localRepoPage.lineageStep", { step: index + 1 })}
                            </span>
                            {!isCurrent && <span className="text-[10px] text-muted-foreground">⋮</span>}
                          </div>
                          <div className="mt-1 text-sm font-medium">{item.name}</div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            {item.version} · {item.params} · {item.precision}
                          </div>
                        </button>

                        {!isCurrent && menuId === item.id && (
                          <div className="mt-1 w-[200px] rounded-md border bg-popover p-1 text-sm shadow-md">
                            <button
                              type="button"
                              className="flex w-full items-center rounded px-2 py-1.5 text-left hover:bg-muted"
                              onClick={() => {
                                setCompareWithId(item.id);
                                setMenuId(null);
                              }}
                            >
                              {t("model.localRepoPage.compareMetrics")}
                            </button>
                            {canRollbackTo(item.id) && (
                              <button
                                type="button"
                                className="flex w-full items-center rounded px-2 py-1.5 text-left hover:bg-muted"
                                onClick={() => {
                                  onRollback(model.id);
                                  setMenuId(null);
                                }}
                              >
                                {t("model.localRepoPage.rollbackToParent")}
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(compareTarget)} onOpenChange={(value) => !value && setCompareWithId(null)}>
        <DialogContent className="sm:max-w-[620px]">
          <DialogHeader>
            <DialogTitle>{t("model.localRepoPage.compareMetrics")}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg border p-4">
              <div className="text-xs text-muted-foreground">
                {t("model.localRepoPage.parentModel")}
              </div>
              <div className="mt-1 text-sm font-medium">{compareTarget?.name ?? "--"}</div>
              <div className="mt-3 space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t("model.localRepoPage.evalLoss")}</span>
                  <span>{formatMetric(compareTarget?.metrics?.evalLoss)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t("model.localRepoPage.bleu")}</span>
                  <span>{formatMetric(compareTarget?.metrics?.bleu)}</span>
                </div>
              </div>
            </div>
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
              <div className="text-xs text-muted-foreground">
                {t("model.localRepoPage.currentModel")}
              </div>
              <div className="mt-1 text-sm font-medium">{model.name}</div>
              <div className="mt-3 space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t("model.localRepoPage.evalLoss")}</span>
                  <span>{formatMetric(model.metrics?.evalLoss)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t("model.localRepoPage.bleu")}</span>
                  <span>{formatMetric(model.metrics?.bleu)}</span>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}