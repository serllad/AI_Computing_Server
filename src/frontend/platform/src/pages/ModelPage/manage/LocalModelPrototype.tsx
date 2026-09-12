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

export function LocalModelPrototype() {
  const { t } = useTranslation("model");
  const { toast } = useToast();
  const [models, setModels] = useState<LocalModel[]>(INITIAL_MODELS);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [compareParentId, setCompareParentId] = useState<string | null>(null);

  const modelById = useMemo(() => new Map(models.map((model) => [model.id, model])), [models]);

  const handleDeploy = (id: string) => {
    setModels((prev) => prev.map((model) => model.id === id ? { ...model, deployed: !model.deployed, deployTime: model.deployed ? undefined : "2026-09-12 15:00" } : model));
    toast({ variant: "success", title: t("deploy"), description: t("deploy") });
  };

  const handleRollback = (id: string) => {
    setModels((prev) => prev.map((model) => model.id === id ? { ...model, deployed: false, deployTime: undefined } : model));
    toast({ variant: "success", title: t("rollback"), description: t("rollback") });
  };

  const handleDelete = (id: string) => {
    setModels((prev) => prev.filter((model) => model.id !== id));
    toast({ variant: "success", title: t("deleteModel"), description: t("deleteModel") });
  };

  const selected = selectedId ? modelById.get(selectedId) : null;

  return (
    <div className="flex h-full flex-col gap-3 px-2 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-base font-semibold">{t("localRepo")}</h1>
          <Button type="button" size="sm" onClick={() => toast({ variant: "success", title: t("uploadModel"), description: t("uploadModel") })}>{t("uploadModel")}</Button>
        </div>
        <Badge variant="secondary">{t("localModelList")}</Badge>
      </div>

      <div className="min-h-0 flex-1 overflow-auto rounded-md border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs text-muted-foreground">
              <th className="px-3 py-2">{t("name")}</th>
              <th className="px-3 py-2">{t("source")}</th>
              <th className="px-3 py-2">{t("parameters")}</th>
              <th className="px-3 py-2">{t("precision")}</th>
              <th className="px-3 py-2">{t("status")}</th>
              <th className="px-3 py-2 text-right">{t("actions")}</th>
            </tr>
          </thead>
          <tbody>
            {models.map((model) => (
              <tr key={model.id} className="border-b">
                <td className="px-3 py-2 font-medium">{model.name}</td>
                <td className="px-3 py-2">{t(model.source === "builtin" ? "builtIn" : model.source === "finetuned" ? "fineTuned" : "uploadModel")}</td>
                <td className="px-3 py-2">{model.parameters}</td>
                <td className="px-3 py-2">{model.precision}</td>
                <td className="px-3 py-2">
                  <span className={model.deployed ? "text-green-600" : "text-muted-foreground"}>{model.deployed ? t("statusDeployed") : t("statusNotDeployed")}</span>
                </td>
                <td className="px-3 py-2 text-right">
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
        <DialogContent className="sm:max-w-[720px]">
          <DialogHeader>
            <DialogTitle>{t("viewDetails")}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">{t("name")}: </span>{selected.name}</div>
                <div><span className="text-muted-foreground">{t("parameters")}: </span>{selected.parameters}</div>
                <div><span className="text-muted-foreground">{t("precision")}: </span>{selected.precision}</div>
                <div><span className="text-muted-foreground">{t("deployTime")}: </span>{selected.deployTime || "--"}</div>
              </div>

              {selected.source === "finetuned" && (
                <div className="space-y-3 rounded-md border p-3">
                  <div className="text-sm font-medium">{t("trainingDataset")}</div>
                  <div>{selected.dataset}</div>
                  <div className="text-sm font-medium">{t("hyperparameters")}</div>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(selected.hyperparams ?? {}).map(([key, value]) => (
                      <div key={key}>{key}: {value}</div>
                    ))}
                  </div>
                  <div className="text-sm font-medium">{t("evaluationMetrics")}</div>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(selected.metrics ?? {}).map(([key, value]) => (
                      <div key={key}>{key}: {value}</div>
                    ))}
                  </div>
                  <div className="text-sm font-medium">{t("lineage")}</div>
                  <div className="flex items-center gap-2">
                    {selected.parentId && (
                      <button type="button" className="rounded border px-3 py-1 text-xs" onClick={() => setCompareParentId(selected.parentId ?? null)}>
                        {modelById.get(selected.parentId)?.name ?? selected.parentId}
                      </button>
                    )}
                    <span>→</span>
                    <span className="rounded border px-3 py-1 text-xs">{selected.name}</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(compareParentId)} onOpenChange={(open) => !open && setCompareParentId(null)}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>{t("compareMetrics")}</DialogTitle>
          </DialogHeader>
          {compareParentId && selected && (
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-md border p-3">
                <div className="font-medium">{modelById.get(compareParentId)?.name ?? compareParentId}</div>
                <div className="mt-2 text-muted-foreground">eval_loss: --</div>
                <div className="text-muted-foreground">bleu: --</div>
              </div>
              <div className="rounded-md border p-3">
                <div className="font-medium">{selected.name}</div>
                <div className="mt-2 text-muted-foreground">eval_loss: {selected.metrics?.eval_loss ?? "--"}</div>
                <div className="text-muted-foreground">bleu: {selected.metrics?.bleu ?? "--"}</div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}