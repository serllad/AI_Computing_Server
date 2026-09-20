// Local model repository page (route: model/local-repo).
// Connected to backend API: /api/v1/local-model

import {
  Boxes,
  Database,
  FolderInput,
  GitBranch,
  Rocket,
  Trash2,
  Upload,
} from "lucide-react";
import { Button } from "@/components/bs-ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/bs-ui/dialog";
import { Input } from "@/components/bs-ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/bs-ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/bs-ui/table";
import { useToast } from "@/components/bs-ui/toast/use-toast";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { SourceBadge, StatusBadge } from "./LocalModelBadges";
import { DirectoryImportDialog } from "./LocalModelDialogs";
import { LocalModelDetails } from "./LocalModelDetails";
import {
  filterLocalModels,
  isReferencedAsParent,
  type LocalModelFilter,
} from "./localModelData";
import {
  getLocalModelsApi,
  deployLocalModelApi,
  undeployLocalModelApi,
  deleteLocalModelApi,
  type LocalModelRecord,
} from "@/controllers/API/localModel";
import { captureAndAlertRequestErrorHoc } from "@/controllers/request";

export function LocalModelPrototype() {
  const { t, i18n } = useTranslation("model");
  const { toast } = useToast();
  const [models, setModels] = useState<LocalModelRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<LocalModelFilter>({
    keyword: "",
    source: "all",
    status: "all",
  });
  const [importOpen, setImportOpen] = useState(false);
  const [detailsId, setDetailsId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    i18n.loadNamespaces("model");
  }, [i18n]);

  // Fetch models from backend
  const fetchModels = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getLocalModelsApi();
      setModels(data || []);
    } catch (err) {
      console.error("Failed to fetch local models:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchModels();
  }, [fetchModels]);

  // Convert API record to display format (snake_case -> camelCase for existing components)
  const displayModels = useMemo(
    () =>
      models.map((m) => ({
        id: m.id,
        name: m.name,
        arch: m.arch,
        version: m.version,
        source: m.source,
        params: m.params,
        precision: m.precision,
        status: m.status,
        deployTime: m.deploy_time,
        updateTime: m.update_time || m.create_time,
        operator: m.operator,
        parentId: m.parent_id,
        dataset: m.dataset,
        hyperparams: m.hyperparams,
        metrics:
          m.eval_loss != null || m.bleu_4 != null || m.rouge_1 != null
            ? { evalLoss: m.eval_loss, bleu_4: m.bleu_4, rouge_1: m.rouge_1, rouge_2: m.rouge_2, rouge_l: m.rouge_l }
            : undefined,
      })),
    [models],
  );

  const visibleModels = useMemo(
    () => filterLocalModels(displayModels, filter),
    [displayModels, filter],
  );

  const modelById = useMemo(
    () => new Map(displayModels.map((model) => [model.id, model])),
    [displayModels],
  );
  const detailsModel = detailsId ? modelById.get(detailsId) ?? null : null;
  const deleteModel = deleteId ? modelById.get(deleteId) ?? null : null;

  const stats = useMemo(
    () => ({
      total: displayModels.length,
      deployed: displayModels.filter((m) => m.status === "deployed").length,
      finetuned: displayModels.filter((m) => m.source === "finetuned").length,
      base: displayModels.filter((m) => m.source !== "finetuned").length,
    }),
    [displayModels],
  );

  const statCards = [
    { label: t("model.localRepoPage.statTotal"), value: stats.total, icon: Boxes },
    { label: t("model.localRepoPage.statDeployed"), value: stats.deployed, icon: Rocket },
    { label: t("model.localRepoPage.statFinetuned"), value: stats.finetuned, icon: GitBranch },
    { label: t("model.localRepoPage.statBase"), value: stats.base, icon: Database },
  ];

  const notify = (variant: "success" | "warning", key: string) => {
    toast({ variant, title: t(key), description: t(key) });
  };

  const handleDeploy = async (id: string) => {
    const res = await captureAndAlertRequestErrorHoc(deployLocalModelApi(id));
    if (res) {
      notify("success", "model.localRepoPage.deploySuccess");
      fetchModels();
    }
  };

  const handleUndeploy = async (id: string) => {
    const res = await captureAndAlertRequestErrorHoc(undeployLocalModelApi(id));
    if (res) {
      notify("success", "model.localRepoPage.undeploySuccess");
      fetchModels();
    }
  };

  const handleRollback = async (id: string) => {
    // Rollback = undeploy (simplified for now)
    const res = await captureAndAlertRequestErrorHoc(undeployLocalModelApi(id));
    if (res) {
      notify("success", "model.localRepoPage.rollbackSuccess");
      fetchModels();
    }
  };

  const handleRequestDelete = (model: any) => {
    if (model.status === "deployed") {
      notify("warning", "model.localRepoPage.deleteDeployed");
      return;
    }
    if (isReferencedAsParent(displayModels, model.id)) {
      notify("warning", "model.localRepoPage.deleteReferenced");
      return;
    }
    setDeleteId(model.id);
  };

  const handleConfirmDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const res = await captureAndAlertRequestErrorHoc(deleteLocalModelApi(deleteId));
      if (res) {
        setDeleteId(null);
        notify("success", "model.localRepoPage.deleteSuccess");
        fetchModels();
      }
    } finally {
      setDeleting(false);
    }
  };

  const handleImportSuccess = () => {
    fetchModels();  // 上传成功后刷新列表
  };

  return (
    <div className="flex h-full flex-col gap-4 px-4 py-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">{t("model.localRepoPage.title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("model.localRepoPage.subtitle")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setImportOpen(true)}>
            <FolderInput className="mr-1 h-4 w-4" />
            {t("model.localRepoPage.importByDirectory")}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="flex items-center justify-between rounded-lg border p-4"
            >
              <div>
                <div className="text-xs text-muted-foreground">{card.label}</div>
                <div className="mt-1 text-2xl font-semibold">{card.value}</div>
              </div>
              <Icon className="h-5 w-5 text-muted-foreground" />
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Input
          className="w-64"
          placeholder={t("model.localRepoPage.searchPlaceholder")}
          value={filter.keyword}
          onChange={(event) => setFilter((prev) => ({ ...prev, keyword: event.target.value }))}
        />
        <Select
          value={filter.source}
          onValueChange={(value) =>
            setFilter((prev) => ({ ...prev, source: value as LocalModelFilter["source"] }))
          }
        >
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("model.localRepoPage.sourceAll")}</SelectItem>
            <SelectItem value="builtin">{t("model.localRepoPage.sourceBuiltin")}</SelectItem>
            <SelectItem value="directory">{t("model.localRepoPage.sourceDirectory")}</SelectItem>
            <SelectItem value="finetuned">{t("model.localRepoPage.sourceFinetuned")}</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={filter.status}
          onValueChange={(value) =>
            setFilter((prev) => ({ ...prev, status: value as LocalModelFilter["status"] }))
          }
        >
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("model.localRepoPage.statusAll")}</SelectItem>
            <SelectItem value="deployed">{t("model.localRepoPage.statusDeployed")}</SelectItem>
            <SelectItem value="offline">{t("model.localRepoPage.statusNotDeployed")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="min-h-0 flex-1 overflow-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-4">{t("model.localRepoPage.colName")}</TableHead>
              <TableHead>{t("model.localRepoPage.colVersion")}</TableHead>
              <TableHead>{t("model.localRepoPage.colSource")}</TableHead>
              <TableHead>{t("model.localRepoPage.colParams")}</TableHead>
              <TableHead>{t("model.localRepoPage.colStatus")}</TableHead>
              <TableHead>{t("model.localRepoPage.colUpdateTime")}</TableHead>
              <TableHead>{t("model.localRepoPage.colOperator")}</TableHead>
              <TableHead className="text-right">{t("model.localRepoPage.colActions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                  加载中...
                </TableCell>
              </TableRow>
            ) : visibleModels.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                  {t("model.localRepoPage.emptyList")}
                </TableCell>
              </TableRow>
            ) : (
              visibleModels.map((model) => (
                <TableRow key={model.id}>
                  <TableCell className="pl-4">
                    <div className="font-medium">{model.name}</div>
                    <div className="text-xs text-muted-foreground">{model.arch}</div>
                  </TableCell>
                  <TableCell>{model.version}</TableCell>
                  <TableCell>
                    <SourceBadge source={model.source} />
                  </TableCell>
                  <TableCell>
                    {model.params} · {model.precision}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={model.status} />
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {model.updateTime}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{model.operator}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => setDetailsId(model.id)}>
                        {t("model.localRepoPage.actionDetails")}
                      </Button>
                      {model.status === "deployed" ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleUndeploy(model.id)}
                        >
                          {t("model.localRepoPage.actionUndeploy")}
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-primary hover:text-primary"
                          onClick={() => handleDeploy(model.id)}
                        >
                          {t("model.localRepoPage.actionDeploy")}
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950"
                        onClick={() => handleRequestDelete(model)}
                      >
                        <Trash2 className="mr-1 h-3.5 w-3.5" />
                        {t("model.localRepoPage.actionDelete")}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <LocalModelDetails
        open={Boolean(detailsModel)}
        onOpenChange={(open) => !open && setDetailsId(null)}
        model={detailsModel}
        models={displayModels}
        onRollback={handleRollback}
      />

      <DirectoryImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onUploaded={handleImportSuccess}
      />

      <Dialog open={Boolean(deleteModel)} onOpenChange={(open) => !open && !deleting && setDeleteId(null)}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>{t("model.localRepoPage.deleteTitle")}</DialogTitle>
            <DialogDescription>
              {t("model.localRepoPage.deleteConfirmText", { name: deleteModel?.name ?? "" })}
            </DialogDescription>
          </DialogHeader>
          {deleteModel?.source === "finetuned" && (
            <p className="text-sm text-amber-600 bg-amber-50 rounded-md px-3 py-2">
              删除微调模型时将同步取消微调任务的发布状态。模型权重文件较大，删除可能需要较长时间，请耐心等待。
            </p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)} disabled={deleting}>
              {t("model.localRepoPage.cancel")}
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete} disabled={deleting}>
              {deleting ? (
                <span className="flex items-center gap-2">
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                  删除中...
                </span>
              ) : t("model.localRepoPage.confirmDelete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
