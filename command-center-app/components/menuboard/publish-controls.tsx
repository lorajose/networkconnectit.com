"use client";

import { useFormState } from "react-dom";

import { SubmitButton } from "@/components/management/submit-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  initialManagementFormState,
  type ManagementFormState
} from "@/lib/management/form-state";

type StatefulAction = (
  state: ManagementFormState,
  payload: FormData
) => Promise<ManagementFormState>;

type PublishRecord = {
  id: string;
  version: number;
  payloadHash: string;
  publishedAt: Date;
  publishedBy: {
    name: string | null;
    email: string | null;
  };
  _count: {
    activeAssignments: number;
  };
};

function ActionMessage({ state }: { state: ManagementFormState }) {
  if (!state.message) {
    return null;
  }

  return (
    <p
      className={
        state.status === "error"
          ? "text-sm text-rose-300"
          : "text-sm text-muted-foreground"
      }
    >
      {state.message}
    </p>
  );
}

function RollbackButton({
  action,
  version
}: {
  action: StatefulAction;
  version: number;
}) {
  const [state, formAction] = useFormState(action, initialManagementFormState);

  return (
    <form action={formAction} className="space-y-1">
      <Button type="submit" size="sm" variant="ghost">
        Roll back to v{version}
      </Button>
      <ActionMessage state={state} />
    </form>
  );
}

export function MenuPublishControls({
  publishAction,
  publishes,
  rollbackActions
}: {
  publishAction: StatefulAction;
  publishes: PublishRecord[];
  rollbackActions: Array<{
    version: number;
    action: StatefulAction;
  }>;
}) {
  const [publishState, publishFormAction] = useFormState(
    publishAction,
    initialManagementFormState
  );
  const latest = publishes[0] ?? null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Publish to assigned screens</CardTitle>
        <CardDescription>
          Draft edits stay private until Publish creates an immutable version and atomically switches assigned screens.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form action={publishFormAction} className="flex flex-wrap items-center gap-3">
          <SubmitButton label={latest ? "Publish new version" : "Publish v1"} />
          <ActionMessage state={publishState} />
        </form>

        {publishes.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border p-5 text-sm text-muted-foreground">
            This menu has never been published. Assigned players will keep their prior live content until the first publish.
          </p>
        ) : (
          <div className="space-y-3">
            {publishes.map((publish) => {
              const rollback = rollbackActions.find(
                (entry) => entry.version === publish.version
              );
              const isActive = publish._count.activeAssignments > 0;

              return (
                <div
                  key={publish.id}
                  className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-background/40 p-4 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">Version {publish.version}</p>
                      {isActive ? (
                        <span className="rounded-full bg-emerald-500/10 px-2 py-1 text-xs text-emerald-300">
                          Live on {publish._count.activeAssignments} screen
                          {publish._count.activeAssignments === 1 ? "" : "s"}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {new Date(publish.publishedAt).toLocaleString()} ·{" "}
                      {publish.publishedBy.name ||
                        publish.publishedBy.email ||
                        "Unknown user"}
                    </p>
                    <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                      SHA-256 {publish.payloadHash.slice(0, 16)}…
                    </p>
                  </div>

                  {!isActive && rollback ? (
                    <RollbackButton
                      action={rollback.action}
                      version={publish.version}
                    />
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
