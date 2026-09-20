// Add-to-repository dialogs for the local model repository page:
//   * DirectoryImportDialog - two-step flow: upload → review detected info → confirm import.

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
import { useToast } from "@/components/bs-ui/toast/use-toast";
import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { useTranslation } from "react-i18next";
import { uploadLocalModelApi, confirmUploadApi, type UploadProgress } from "@/controllers/API/localModel";
import { captureAndAlertRequestErrorHoc } from "@/controllers/request";

const PRECISION_OPTIONS = ["BF16", "FP16", "INT8", "GPTQ-INT4", "AWQ-INT4"] as const;

// 格式化文件大小
function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + " " + sizes[i];
}

// 格式化速度
function formatSpeed(bytesPerSecond: number): string {
  return formatBytes(bytesPerSecond) + "/s";
}

// 格式化剩余时间
function formatEta(remainingBytes: number, speed: number): string {
  if (speed <= 0) return "计算中...";
  const seconds = Math.ceil(remainingBytes / speed);
  if (seconds < 60) return `${seconds}秒`;
  if (seconds < 3600) return `${Math.ceil(seconds / 60)}分钟`;
  return `${Math.floor(seconds / 3600)}小时${Math.ceil((seconds % 3600) / 60)}分钟`;
}

export interface DirectoryImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploaded: () => void;
}

export function DirectoryImportDialog({
  open,
  onOpenChange,
  onUploaded,
}: DirectoryImportDialogProps) {
  const { t } = useTranslation("model");
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Step 1 state
  const [folderName, setFolderName] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [totalSize, setTotalSize] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [serverProcessing, setServerProcessing] = useState(false);

  // Step 2 state (review detected info)
  const [step, setStep] = useState<1 | 2>(1);
  const [detectedName, setDetectedName] = useState("");
  const [detectedArch, setDetectedArch] = useState("");
  const [detectedParams, setDetectedParams] = useState("");
  const [detectedPrecision, setDetectedPrecision] = useState("BF16");
  const [confirming, setConfirming] = useState(false);
  const [uploadedFolder, setUploadedFolder] = useState("");

  // 每次打开对话框时重置
  useEffect(() => {
    if (open) {
      setFolderName("");
      setSelectedFiles([]);
      setTotalSize(0);
      setProgress(null);
      setServerProcessing(false);
      setStep(1);
      setDetectedArch("");
      setDetectedParams("");
      setDetectedPrecision("BF16");
      setConfirming(false);
      setUploadedFolder("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, [open]);

  // 处理文件夹选择
  const handleSelectFolder = (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const fileList = Array.from(files);
    setSelectedFiles(fileList);

    const size = fileList.reduce((sum, f) => sum + f.size, 0);
    setTotalSize(size);

    const firstFile = fileList[0] as any;
    const relativePath = firstFile.webkitRelativePath || "";
    const folder = relativePath.split("/")[0] || fileList[0].name.split("/")[0];

    if (!folderName) {
      setFolderName(folder);
    }
  };

  // Step 1: 上传文件，获取检测结果
  const handleUpload = async () => {
    if (selectedFiles.length === 0 || !folderName.trim()) return;

    setUploading(true);
    setServerProcessing(false);
    setProgress({ loaded: 0, total: totalSize, percentage: 0, speed: 0 });

    try {
      const result = await uploadLocalModelApi(
        selectedFiles,
        folderName.trim(),
        (p) => {
          setProgress(p);
          if (p.percentage >= 100 && !serverProcessing) {
            setServerProcessing(true);
          }
        }
      );
      if (result) {
        setUploadedFolder(result.folder_name);
        setDetectedName(result.folder_name);
        setDetectedArch(result.detected?.arch || "");
        setDetectedParams(result.detected?.params || "");
        setStep(2);
      }
    } catch (err) {
      console.error("Upload failed:", err);
    } finally {
      setUploading(false);
      setServerProcessing(false);
    }
  };

  // Step 2: 确认入库
  const handleConfirm = async () => {
    if (!uploadedFolder) return;
    setConfirming(true);
    try {
      const res = await captureAndAlertRequestErrorHoc(
        confirmUploadApi({
          folder_name: uploadedFolder,
          name: detectedName || uploadedFolder,
          arch: detectedArch,
          params: detectedParams,
          precision: detectedPrecision,
        })
      );
      if (res) {
        toast({
          variant: "success",
          title: t("model.localRepoPage.importSuccess"),
          description: `模型 ${detectedName || uploadedFolder} 已入库`,
        });
        onUploaded();
        onOpenChange(false);
      }
    } finally {
      setConfirming(false);
    }
  };

  const canClose = !uploading && !confirming;

  return (
    <Dialog open={open} onOpenChange={canClose ? onOpenChange : undefined}>
      <DialogContent className="sm:max-w-[520px]" onPointerDownOutside={(e) => { if (!canClose) e.preventDefault(); }}>
        <DialogHeader>
          <DialogTitle>{t("model.localRepoPage.importTitle")}</DialogTitle>
          <DialogDescription>
            {step === 1 ? t("model.localRepoPage.importHint") : "以下信息由系统自动识别，请确认或修订后入库"}
          </DialogDescription>
        </DialogHeader>

        {step === 1 ? (
          /* ========== Step 1: 选择文件并上传 ========== */
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t("model.localRepoPage.fieldPath")}</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  disabled={uploading}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {selectedFiles.length > 0
                    ? `已选择 ${selectedFiles.length} 个文件 (${formatBytes(totalSize)})`
                    : t("model.localRepoPage.chooseDirectory")}
                </Button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                // @ts-ignore - webkitdirectory is non-standard but widely supported
                webkitdirectory=""
                directory=""
                multiple
                className="hidden"
                onChange={handleSelectFolder}
              />
              {selectedFiles.length > 0 && !uploading && (
                <p className="text-xs text-muted-foreground">
                  包含文件: {selectedFiles.slice(0, 5).map(f => f.name).join(", ")}
                  {selectedFiles.length > 5 ? ` ...等${selectedFiles.length}个` : ""}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="import-name">{t("model.localRepoPage.fieldName")}</Label>
              <Input
                id="import-name"
                value={folderName}
                placeholder="Qwen2.5-7B-Instruct"
                disabled={uploading}
                onChange={(event) => setFolderName(event.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                {t("model.localRepoPage.nameAutoHint")}
              </p>
            </div>

            {/* 上传进度条 */}
            {uploading && progress && (
              <div className="space-y-2 rounded-lg border p-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">上传进度</span>
                  <span className="font-medium">{progress.percentage}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-300 ease-out"
                    style={{ width: `${progress.percentage}%` }}
                  />
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                  <div>
                    <div className="text-foreground font-medium">{formatBytes(progress.loaded)}</div>
                    <div>已上传 / {formatBytes(progress.total)}</div>
                  </div>
                  <div>
                    <div className="text-foreground font-medium">{formatSpeed(progress.speed)}</div>
                    <div>上传速度</div>
                  </div>
                  <div>
                    <div className="text-foreground font-medium">
                      {formatEta(progress.total - progress.loaded, progress.speed)}
                    </div>
                    <div>剩余时间</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* ========== Step 2: 确认/修订检测结果 ========== */
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              已上传 {selectedFiles.length} 个文件至 <span className="font-medium text-foreground">{uploadedFolder}</span>
            </p>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>模型名称</Label>
                <Input
                  value={detectedName}
                  onChange={(e) => setDetectedName(e.target.value)}
                  disabled={confirming}
                />
              </div>
              <div className="space-y-2">
                <Label>精度</Label>
                <Select value={detectedPrecision} onValueChange={setDetectedPrecision} disabled={confirming}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRECISION_OPTIONS.map((p) => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>
                  模型架构
                  {detectedArch && <span className="ml-1 text-xs text-emerald-600">已识别</span>}
                </Label>
                <Input
                  value={detectedArch}
                  placeholder="如 Qwen3.5, Llama3"
                  onChange={(e) => setDetectedArch(e.target.value)}
                  disabled={confirming}
                />
              </div>
              <div className="space-y-2">
                <Label>
                  参数量
                  {detectedParams && <span className="ml-1 text-xs text-emerald-600">已识别</span>}
                </Label>
                <Input
                  value={detectedParams}
                  placeholder="如 8B, 7B"
                  onChange={(e) => setDetectedParams(e.target.value)}
                  disabled={confirming}
                />
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          {step === 1 ? (
            <>
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={!canClose}
              >
                {t("model.localRepoPage.cancel")}
              </Button>
              <Button
                onClick={handleUpload}
                disabled={selectedFiles.length === 0 || !folderName.trim() || uploading}
              >
                {serverProcessing ? (
                  <span className="flex items-center gap-2">
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                    </svg>
                    服务器处理中...
                  </span>
                ) : uploading ? `上传中 ${progress?.percentage || 0}%` : "上传并检测"}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setStep(1)} disabled={confirming}>
                返回
              </Button>
              <Button onClick={handleConfirm} disabled={confirming}>
                {confirming ? (
                  <span className="flex items-center gap-2">
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                    </svg>
                    入库中...
                  </span>
                ) : "确认入库"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
