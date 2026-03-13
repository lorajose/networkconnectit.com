import type { AlertSeverity } from "@prisma/client";

import { StatusBadge } from "@/components/dashboard/status-badge";
import { alertSeverityTone } from "@/lib/status";
import { formatEnumLabel } from "@/lib/utils";

export function AlertSeverityBadge({ severity }: { severity: AlertSeverity }) {
  return (
    <StatusBadge
      tone={alertSeverityTone(severity)}
      label={formatEnumLabel(severity)}
    />
  );
}
