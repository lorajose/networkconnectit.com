import type { AlertStatus } from "@prisma/client";

import {
  acknowledgeAlertAction,
  resolveAlertAction
} from "@/app/(protected)/monitoring-actions";
import { Button } from "@/components/ui/button";

type AlertWorkflowActionsProps = {
  alertId: string;
  status: AlertStatus;
  redirectTo: string;
  canAcknowledge: boolean;
  canResolve: boolean;
};

export function AlertWorkflowActions({
  alertId,
  status,
  redirectTo,
  canAcknowledge,
  canResolve
}: AlertWorkflowActionsProps) {
  const acknowledgeAction = acknowledgeAlertAction.bind(null, alertId, redirectTo);
  const resolveAction = resolveAlertAction.bind(null, alertId, redirectTo);

  return (
    <div className="flex flex-wrap gap-2">
      {status === "OPEN" && canAcknowledge ? (
        <form action={acknowledgeAction}>
          <Button type="submit" size="sm" variant="outline">
            Acknowledge
          </Button>
        </form>
      ) : null}
      {status !== "RESOLVED" && canResolve ? (
        <form action={resolveAction}>
          <Button type="submit" size="sm">
            Resolve
          </Button>
        </form>
      ) : null}
    </div>
  );
}
