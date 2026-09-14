// Shared badge chips for the local model repository: source badge and
// deployment status badge. Both resolve their label through i18n so callers
// never hardcode copy.

import { Badge } from "@/components/bs-ui/badge";
import { useTranslation } from "react-i18next";
import {
  sourceLabel,
  statusLabel,
  type LocalModelSource,
  type LocalModelStatus,
} from "./localModelData";

export interface SourceBadgeProps {
  source: LocalModelSource;
}

/** Colored chip describing where a model came from. */
export function SourceBadge({ source }: SourceBadgeProps) {
  const { t } = useTranslation("model");
  if (source === "finetuned") {
    return (
      <Badge
        variant="outline"
        className="border-transparent bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300"
      >
        {sourceLabel(t, source)}
      </Badge>
    );
  }
  // builtin -> primary, directory -> secondary.
  const variant = source === "builtin" ? "default" : "secondary";
  return <Badge variant={variant}>{sourceLabel(t, source)}</Badge>;
}

export interface StatusBadgeProps {
  status: LocalModelStatus;
}

/** Colored chip describing the deployment state. */
export function StatusBadge({ status }: StatusBadgeProps) {
  const { t } = useTranslation("model");
  if (status === "deployed") {
    return (
      <Badge
        variant="outline"
        className="border-transparent bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
      >
        {statusLabel(t, status)}
      </Badge>
    );
  }
  return <Badge variant="gray">{statusLabel(t, status)}</Badge>;
}
