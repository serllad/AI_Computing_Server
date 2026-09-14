// Add-to-repository dialogs for the local model repository page:
//   * UploadModelDialog     - pick a model from the candidate list, review the
//                             metadata and "upload" it into the repository.
//   * DirectoryImportDialog - register a weight directory that already lives
//                             on the server (path + metadata form).
// Both are mock flows: onConfirm hands the fully populated record back to the
// page, which owns the list state and shows the success toast.

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
import { Label } from "@/components/bs-ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/bs-ui/select";
import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { useTranslation } from "react-i18next";
import {
  PRECISION_OPTIONS,
  archFromName,
  nameFromPath,
  nowLabel,
  type LocalModelRecord,
} from "./localModelData";

export interface UploadModelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called when the mock upload finishes. The model is NOT added to the list yet. */
  onUploaded: () => void;
}

export function UploadModelDialog({ open, onOpenChange, onUploaded }: UploadModelDialogProps) {
  const { t } = useTranslation("model");
  const [name, setName] = useState("");
  const [path, setPath] = useState("");
  const [params, setParams] = useState("");
  const [precision, setPrecision] = useState("BF16");
  const directoryInputRef = useRef<HTMLInputElement | null>(null);

  // Start from a clean form every time the dialog opens.
  useEffect(() => {
    if (open) {
      setName("");
      setPath("");
      setParams("");
      setPrecision("BF16");
      if (directoryInputRef.current) directoryInputRef.current.value = "";
    }
  }, [open]);

  const handleSelectDirectory = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const relativePath = (file as File & { webkitRelativePath?: string }).webkitRelativePath;
    setPath(relativePath || file.name);
  };

  const handleConfirm = () => {
    if (!path.trim()) return;
    onUploaded();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{t("model.localRepoPage.uploadTitle")}</DialogTitle>
          <DialogDescription>{t("model.localRepoPage.uploadHint")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="upload-name">{t("model.localRepoPage.fieldName")}</Label>
            <Input
              id="upload-name"
              value={name}
              placeholder={nameFromPath(path) || ""}
              onChange={(event) => setName(event.target.value)}
            />
            <p className="text-xs text-muted-foreground">{t("model.localRepoPage.nameAutoHint")}</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="upload-path">{t("model.localRepoPage.fieldPath")}</Label>
            <div className="flex gap-2">
              <Input
                id="upload-path"
                value={path}
                placeholder={t("model.localRepoPage.pathPlaceholder")}
                onChange={(event) => setPath(event.target.value)}
              />
              <Button type="button" variant="outline" onClick={() => directoryInputRef.current?.click()}>
                {t("model.localRepoPage.chooseDirectory")}
              </Button>
            </div>
            <input
              ref={directoryInputRef}
              type="file"
              className="hidden"
              multiple={false}
              onChange={handleSelectDirectory}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="upload-params">{t("model.localRepoPage.fieldParams")}</Label>
              <Input
                id="upload-params"
                value={params}
                placeholder="7B"
                onChange={(event) => setParams(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="upload-precision">{t("model.localRepoPage.fieldPrecision")}</Label>
              <Select value={precision} onValueChange={setPrecision}>
                <SelectTrigger id="upload-precision">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRECISION_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("model.localRepoPage.cancel")}
          </Button>
          <Button onClick={handleConfirm} disabled={!path.trim()}>
            {t("model.localRepoPage.confirmUpload")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export interface DirectoryImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called with the fully populated record when the user confirms. */
  onConfirm: (record: LocalModelRecord) => void;
}

export function DirectoryImportDialog({
  open,
  onOpenChange,
  onConfirm,
}: DirectoryImportDialogProps) {
  const { t } = useTranslation("model");
  const [path, setPath] = useState("");
  const [name, setName] = useState("");
  const [params, setParams] = useState("7B");
  const [precision, setPrecision] = useState("BF16");

  // Start from a clean form every time the dialog opens.
  useEffect(() => {
    if (open) {
      setPath("");
      setName("");
      setParams("7B");
      setPrecision("BF16");
    }
  }, [open]);

  // The name falls back to the last path segment unless typed in manually.
  const derivedName = name.trim() || nameFromPath(path);

  const handleConfirm = () => {
    if (!path.trim() || !derivedName) return;
    const record: LocalModelRecord = {
      id: `directory-${Date.now()}`,
      name: derivedName,
      arch: archFromName(derivedName),
      version: "v1.0.0",
      source: "directory",
      params: params.trim() || "7B",
      precision,
      status: "offline",
      updateTime: nowLabel(),
      operator: "admin",
    };
    onConfirm(record);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{t("model.localRepoPage.importTitle")}</DialogTitle>
          <DialogDescription>{t("model.localRepoPage.importHint")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="import-path">{t("model.localRepoPage.fieldPath")}</Label>
            <Input
              id="import-path"
              value={path}
              placeholder={t("model.localRepoPage.pathPlaceholder")}
              onChange={(event) => setPath(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="import-name">{t("model.localRepoPage.fieldName")}</Label>
            <Input
              id="import-name"
              value={name}
              placeholder={derivedName || "Qwen2.5-7B-Instruct"}
              onChange={(event) => setName(event.target.value)}
            />
            <p className="text-xs text-muted-foreground">{t("model.localRepoPage.nameAutoHint")}</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="import-params">{t("model.localRepoPage.fieldParams")}</Label>
              <Input
                id="import-params"
                value={params}
                onChange={(event) => setParams(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="import-precision">{t("model.localRepoPage.fieldPrecision")}</Label>
              <Select value={precision} onValueChange={setPrecision}>
                <SelectTrigger id="import-precision">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRECISION_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("model.localRepoPage.cancel")}
          </Button>
          <Button onClick={handleConfirm} disabled={!path.trim() || !derivedName}>
            {t("model.localRepoPage.confirmImport")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
