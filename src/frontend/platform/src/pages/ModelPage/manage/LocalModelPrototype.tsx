import { Badge } from "@/components/bs-ui/badge";
import { Button } from "@/components/bs-ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/bs-ui/dialog";
import { useToast } from "@/components/bs-ui/toast/use-toast";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

interface LocalModel {
  id: string;
  name: string;
  source: "builtin" | "upload" | "finetuned";
  parameters: string;
  precision: string;
  deployed: boolean;
  deployTime?: string;
  parentId?: string;
  dataset?: string;
  hyperparams?: Record<string, string | number>;
  metrics?: Record<string, string | number>;
}

const INITIAL_MODELS: LocalModel[] = [
  { id: "qwen", name: "Qwen2.5-7B-Instruct", source: "builtin", parameters: "7B", precision: "BF16", deployed: false },
  { id: "ds", name: "DeepSeek-R1-Distill-Qwen-7B", source: "builtin", parameters: "7B", precision: "BF16", deployed: true, deployTime: "2026-09-12 10:20" },
  { id: "llama", name: "Llama-3-8B-Instruct", source: "upload", parameters: "8B", precision: "FP16", deployed: false },
  { id: "qwen-legal", name: "Qwen2.5-7B-Legal-SFT", source: "finetuned", parameters: "7B", precision: "BF16", deployed: true, deployTime: "2026-09-12 14:30", parentId: "qwen", dataset: "legal-qa-v2", hyperparams: { epochs: 3, lr: "5e-5", batch_size: 4 }, metrics: { eval_loss: 1.02, bleu: 68.4 } },
];

function sourceLabel(t: (key: string) => string, source: LocalModel["source"]) {
  if (source === "builtin") return t("builtIn");
  if (source === "finetuned") return t("fineTuned");
  return t("uploadModel");
}

export function LocalModelPrototype() {
  const { t } = useTranslation("model");
  const { toast } = useToast();
  const [models, setModels] = useState<LocalModel[]>(INITIAL_MODELS);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [compareParentId, setCompareParentId] = useState<string | null>(null);

  const modelById = useMemo(() => new Map(models.map((model) => [model.id, model])), [models]);

  const notify = (key: string) => toast({ variant: "success", title: t(key), description: t(key) });

  const handleDeploy = (id: string) => {
    setModels((prev) => prev.map((model) => model.id === id ? { ...model, deployed: !model.deployed, deployTime: model.deployed ? undefined : "2026-09-12 15:00" } : model));
    notify("deploy");
  };

  const handleRollback = (id: string) => {
    setModels((prev) => prev.map((model) => model.id === id ? { ...model, deployed: false, deployTime: undefined } : model));
    notify("rollback");
  };

  const handleDelete = (id: string) => {
    setModels((prev) => prev.filter((model) => model.id !== id));
    notify("deleteModel");
  };

  const selected = selectedId ? modelById.get(selectedId) : null;

  return (
    <div className="flex h-full flex-col gap-4 px-4 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">{t("localRepo")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("localModelList")}</p>
        </div>
        <Button type="button" onClick={() => notify("uploadModel")}>{t("uploadModel")}</Button>
      </div>

      <div className="min-h-0 flex-1 overflow-auto rounded-xl border bg-muted/10">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-muted/80">
            <tr className="border-b text-left text-xs text-muted-foreground">
              <th className="px-4 py-3">{t("name")}</th>
              <th className="px-4 py-3">{t("source")}</th>
              <th className="px-4 py-3">{t("parameters")}</th>
              <th className="px-4 py-3">{t("precision")}</th>
              <th className="px-4 py-3">{t("status")}</th>
              <th className="px-4 py-3 text-right">{t("actions")}</th>
            </tr>
          </thead>
          <tbody>
            {models.map((model) => (
              <tr key={model.id} className="border-b transition-colors hover:bg-muted/40">
                <td className="px-4 py-3 font-medium">{model.name}</td>
                <td className="px-4 py-3">
                  <Badge variant="outline">{sourceLabel(t, model.source)}</Badge>
                </td>
                <td className="px-4 py-3">{model.parameters}</td>
                <td className="px-4 py-3">{model.precision}</td>
                <td className="px-4 py-3">
                  <span className={model.deployed ? "text-green-600" : "text-muted-foreground"}>{model.deployed ? t("statusDeployed") : t("statusNotDeployed")}</span>
                </td>
                <td className="px-4 py-3 text-right">
                  <Button type="button" size="sm" variant="link" onClick={() => handleDeploy(model.id)}>{model.deployed ? t("undeploy") : t("deploy")}</Button>
                  <Button type="button" size="sm" variant="link" onClick={() => setSelectedId(model.id)}>{t("viewDetails")}</Button>
                  {model.deployed && model.parentId && (
                    <Button type="button" size="sm" variant="link" onClick={() => handleRollback(model.id)}>{t("rollback")}</Button>
                  )}
                  <Button type="button" size="sm" variant="link" className="text-red-500" onClick={() => handleDelete(model.id)}>{t("deleteModel")}</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelectedId(null)}>
        <DialogContent className="sm:max-w-[760px]">
          <DialogHeader>
            <DialogTitle>{t("viewDetails")}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 rounded-xl border bg-muted/20 p-4 text-sm">
                <div><span className="text-muted-foreground">{t("name")}：</span>{selected.name}</div>
                <div><span className="text-muted-foreground">{t("parameters")}：</span>{selected.parameters}</div>
                <div><span className="text-muted-foreground">{t("precision")}：</span>{selected.precision}</div>
                <div><span className="text-muted-foreground">{t("deployTime")}：</span>{selected.deployTime || "--"}</div>
              </div>

              {selected.source === "finetuned" && (
                <div className="space-y-4">
                  <div className="rounded-xl border p-4">
                    <div className="text-sm font-medium">{t("trainingDataset")}</div>
                    <div className="mt-1 text-muted-foreground">{selected.dataset}</div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl border p-4">
                      <div className="text-sm font-medium">{t("hyperparameters")}</div>
                      <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                        {Object.entries(selected.hyperparams ?? {}).map(([key, value]) => (
                          <div key={key}>{key}: {value}</div>
                        ))}
                      </div>
                    </div>
                    <div className="rounded-xl border p-4">
                      <div className="text-sm font-medium">{t("evaluationMetrics")}</div>
                      <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                        <div>{t("evalLoss")}: {selected.metrics?.eval_loss ?? "--"}</div>
                        <div>{t("bleu")}: {selected.metrics?.bleu ?? "--"}</div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border p-4">
                    <div className="text-sm font-medium">{t("lineage")}</div>
                    <div className="mt-3 flex items-center gap-4">
                      {selected.parentId && (
                        <>
                          <button
                            type="button"
                            className="min-w-[180px] rounded-xl border border-primary/20 bg-primary/5 p-3 text-left transition hover:bg-primary/10"
                            onClick={() => setCompareParentId(selected.parentId ?? null)}
                          >
                            <div className="text-xs text-muted-foreground">{t("parentModel")}</div>
                            <div className="mt-1 font-medium">{modelById.get(selected.parentId)?.name ?? selected.parentId}</div>
                          </button>
                          <div className="h-px flex-1 bg-gradient-to-r from-primary/40 to-primary/10" />
                        </>
                      )}
                      <div className="min-w-[180px] rounded-xl border border-green-500/30 bg-green-500/5 p-3">
                        <div className="text-xs text-muted-foreground">{t("name")}</div>
                        <div className="mt-1 font-medium">{selected.name}</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(compareParentId)} onOpenChange={(open) => !open && setCompareParentId(null)}>
        <DialogContent className="sm:max-w-[620px]">
          <DialogHeader>
            <DialogTitle>{t("compareMetrics")}</DialogTitle>
          </DialogHeader>
          {compareParentId && selected && (
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border p-4">
                <div className="font-medium">{modelById.get(compareParentId)?.name ?? compareParentId}</div>
                <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                  <div>{t("evalLoss")}: --</div>
                  <div>{t("bleu")}: --</div>
                </div>
              </div>
              <div className="rounded-xl border border-primary/20 p-4">
                <div className="font-medium">{selected.name}</div>
                <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                  <div>{t("evalLoss")}: {selected.metrics?.eval_loss ?? "--"}</div>
                  <div>{t("bleu")}: {selected.metrics?.bleu ?? "--"}</div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}