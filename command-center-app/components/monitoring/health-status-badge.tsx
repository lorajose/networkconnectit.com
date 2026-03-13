import type { HealthStatus } from "@prisma/client";

import { StatusBadge } from "@/components/dashboard/status-badge";
import { healthStatusTone } from "@/lib/status";
import { formatEnumLabel } from "@/lib/utils";

export function HealthStatusBadge({ status }: { status: HealthStatus }) {
  return (
    <StatusBadge
      tone={healthStatusTone(status)}
      label={formatEnumLabel(status)}
      withIcon
    />
  );
}
