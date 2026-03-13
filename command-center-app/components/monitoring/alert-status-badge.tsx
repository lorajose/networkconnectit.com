import type { AlertStatus } from "@prisma/client";

import { StatusBadge } from "@/components/dashboard/status-badge";
import { alertStatusTone } from "@/lib/status";
import { formatEnumLabel } from "@/lib/utils";

export function AlertStatusBadge({ status }: { status: AlertStatus }) {
  return (
    <StatusBadge
      tone={alertStatusTone(status)}
      label={formatEnumLabel(status)}
      withIcon
    />
  );
}
