// Local model repository page (route: model/local-repo).
// Pure front-end prototype: stats cards, keyword/source/status filtering and
// lifecycle actions (deploy / undeploy / rollback / delete) all operate on
// local mock state. Every label comes from the i18n block
// "model.localRepoPage".

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
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { SourceBadge, StatusBadge } from "./LocalModelBadges";
import { DirectoryImportDialog, UploadModelDialog } from "./LocalModelDialogs";
import { LocalModelDetails } from "./LocalModelDetails";
import {
  INITIAL_LOCAL_MODELS,
  filterLocalModels,
  isReferencedAsParent,
  nowLabel,
  type LocalModelFilter,
  type LocalModelRecord,
} from "./localModelData";

export function LocalModelPrototype() {
  const { t, i18n } = useTranslation("model");
  const { toast } = useToast();
  const [models, setModels] = useState<LocalModelRecord[]>(INITIAL_LOCAL_MODELS);
  const [filter, setFilter] = useState<LocalModelFilter>({
    keyword: "",
    source: "all",
    status: "all",
  });
  const [uploadOpen, setUploadOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [detailsId, setDetailsId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // The route lazy-loads this page; make sure the namespace is ready.
  useEffect(() => {
    i18n.loadNamespaces("model");
  }, [i18n]);

  const visibleModels = useMemo(() => filterLocalModels(models, filter), [models, filter]);
  const modelById = useMemo(
    () => new Map(models.map((model) => [model.id, model])),
    [models],
  );
  const detailsModel = detailsId ? modelById.get(detailsId) ?? null : null;
  const deleteModel = deleteId ? modelById.get(deleteId) ?? null : null;

  const stats = useMemo(
    () => ({
      total: models.length,
      deployed: models.filter((model) => model.status === "deployed").length,
      finetuned: models.filter((model) => model.source === "finetuned").length,
      base: models.filter((model) => model.source !== "finetuned").length,
    }),
    [models],
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

  const handleDeploy = (id: string) => {
    const time = nowLabel();
    setModels((prev) =>
      prev.map((model) =>
        model.id === id
          ? { ...model, status: "deployed" as const, deployTime: time, updateTime: time }
          : model,
      ),
    );
    notify("success", "model.localRepoPage.deploySuccess");
  };

  const handleUndeploy = (id: string) => {
    const time = nowLabel();
    setModels((prev) =>
      prev.map((model) =>
        model.id === id
          ? { ...model, status: "offline" as const, deployTime: undefined, updateTime: time }
          : model,
      ),
    );
    notify("success", "model.localRepoPage.undeploySuccess");
  };

  const handleRollback = (id: string) => {
    const time = nowLabel();
    setModels((prev) =>
      prev.map((model) => {
        if (model.id !== id) return model;
        const parent = model.parentId
          ? prev.find((item) => item.id === model.parentId)
          : undefined;
        // Rolling back restores the parent's version and takes the model offline.
        return {
          ...model,
          status: "offline" as const,
          deployTime: undefined,
          version: parent?.version ?? model.version,
          updateTime: time,
        };
      }),
    );
    notify("success", "model.localRepoPage.rollbackSuccess");
  };

  const handleRequestDelete = (model: LocalModelRecord) => {
    // Deployed models and parent-of-finetune models must not be removed.
    if (model.status === "deployed") {
      notify("warning", "model.localRepoPage.deleteDeployed");
      return;
    }
    if (isReferencedAsParent(models, model.id)) {
      notify("warning", "model.localRepoPage.deleteReferenced");
      return;
    }
    setDeleteId(model.id);
  };

  const handleConfirmDelete = () => {
    if (!deleteId) return;
    setModels((prev) => prev.filter((model) => model.id !== deleteId));
    setDeleteId(null);
    notify("success", "model.localRepoPage.deleteSuccess");
  };

  const handleUploaded = () => {
    notify("success", "model.localRepoPage.uploadSuccess");
  };

  const handleImportConfirm = (record: LocalModelRecord) => {
    setModels((prev) => [record, ...prev]);
    notify("success", "model.localRepoPage.importSuccess");
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
          <Button onClick={() => setUploadOpen(true)}>
            <Upload className="mr-1 h-4 w-4" />
            {t("model.localRepoPage.uploadModel")}
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
            {visibleModels.length === 0 ? (
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
        models={models}
        onRollback={handleRollback}
      />

      <UploadModelDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        onUploaded={handleUploaded}
      />

      <DirectoryImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onConfirm={handleImportConfirm}
      />

      <Dialog open={Boolean(deleteModel)} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>{t("model.localRepoPage.deleteTitle")}</DialogTitle>
            <DialogDescription>
              {t("model.localRepoPage.deleteConfirmText", { name: deleteModel?.name ?? "" })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              {t("model.localRepoPage.cancel")}
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete}>
              {t("model.localRepoPage.confirmDelete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
