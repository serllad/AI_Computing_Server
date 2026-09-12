import { Button } from "@/components/bs-ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/bs-ui/dialog";
import { useToast } from "@/components/bs-ui/toast/use-toast";
import {
  cleanDatasetApi,
  getDatasetRecordsApi,
  updateDatasetRecordsApi,
} from "@/controllers/API/finetune";
import type { DatasetRecord } from "@/controllers/API/finetune";
import { captureAndAlertRequestErrorHoc } from "@/controllers/request";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

interface DataSetDetailProps {
  fileId: string;
  onClose: () => void;
}

export function DataSetDetail({ fileId, onClose }: DataSetDetailProps) {
  const { t } = useTranslation();
  const { toast, message } = useToast();
  const [records, setRecords] = useState<DatasetRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [options, setOptions] = useState({
    format_validation: true,
    typo_correction: false,
    qa_optimization: false,
    use_llm: false,
  });

  useEffect(() => {
    if (!fileId) return;
    setLoading(true);
    getDatasetRecordsApi(fileId)
      .then(setRecords)
      .finally(() => setLoading(false));
  }, [fileId]);

  const updateField = (index: number, field: string, value: string) => {
    setRecords((prev) =>
      prev.map((record, recordIndex) =>
        recordIndex === index ? { ...record, [field]: value } : record,
      ),
    );
  };

  const handleSave = () => {
    if (!fileId) return;
    setSaving(true);
    captureAndAlertRequestErrorHoc(updateDatasetRecordsApi(fileId, records))
      .then((res) => {
        if (res) {
          setRecords(res);
          message({ variant: "success", description: t("dataset.saveChanges") });
        }
      })
      .finally(() => setSaving(false));
  };

  const handleClean = () => {
    if (!fileId) return;
    setCleaning(true);
    captureAndAlertRequestErrorHoc(cleanDatasetApi(fileId, options))
      .then((res) => {
        if (!res) return;
        setRecords(res.records);
        toast({
          variant: "success",
          title: t("dataset.cleanSuccess"),
          description: t("dataset.cleanedCount", { count: res.cleaned_count }),
        });
        if (!res.llm_used && options.use_llm) {
          message({ variant: "warning", description: t("dataset.llmUnavailable") });
        }
      })
      .finally(() => setCleaning(false));
  };

  const toggleOption = (key: keyof typeof options) => {
    setOptions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <Dialog open={Boolean(fileId)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[900px]">
        <DialogHeader>
          <DialogTitle>{t("dataset.viewDetails")}</DialogTitle>
        </DialogHeader>
        <div className="flex h-[70vh] flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {t("dataset.recordCount", { count: records.length })}
            </span>
            <Button type="button" onClick={handleSave} disabled={loading || saving}>
              {t("dataset.saveChanges")}
            </Button>
          </div>
          <div className="grid shrink-0 grid-cols-2 gap-2 rounded-md border bg-muted/20 p-3">
            {(
              [
                ["format_validation", "formatValidation"],
                ["typo_correction", "typoCorrection"],
                ["qa_optimization", "qaOptimization"],
                ["use_llm", "useLlm"],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={options[key]}
                  onChange={() => toggleOption(key)}
                />
                {t(`dataset.${label}`)}
              </label>
            ))}
            <Button type="button" className="col-span-2" onClick={handleClean} disabled={cleaning}>
              {t("dataset.runClean")}
            </Button>
          </div>
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
            {loading ? (
              <div className="py-12 text-center text-muted-foreground">Loading...</div>
            ) : records.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">{t("dataset.noRecords")}</div>
            ) : (
              records.map((record, index) => (
                <div key={index} className="space-y-2 rounded-md border p-3">
                  <label className="block">
                    <span className="mb-1 block text-xs text-muted-foreground">{t("dataset.instruction")}</span>
                    <textarea
                      className="h-20 w-full rounded-md border bg-background p-2 text-sm"
                      value={record.instruction}
                      onChange={(e) => updateField(index, "instruction", e.target.value)}
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs text-muted-foreground">{t("dataset.input")}</span>
                    <textarea
                      className="h-16 w-full rounded-md border bg-background p-2 text-sm"
                      value={record.input ?? ""}
                      onChange={(e) => updateField(index, "input", e.target.value)}
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs text-muted-foreground">{t("dataset.output")}</span>
                    <textarea
                      className="h-24 w-full rounded-md border bg-background p-2 text-sm"
                      value={record.output}
                      onChange={(e) => updateField(index, "output", e.target.value)}
                    />
                  </label>
                </div>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}