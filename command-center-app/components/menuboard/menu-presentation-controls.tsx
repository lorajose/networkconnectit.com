"use client";

import { useFormState } from "react-dom";

import { FieldError } from "@/components/management/field-error";
import { FormMessage } from "@/components/management/form-message";
import { SubmitButton } from "@/components/management/submit-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  initialManagementFormState,
  type ManagementFormState
} from "@/lib/management/form-state";
import { formatEnumLabel } from "@/lib/utils";

type StatefulAction = (
  state: ManagementFormState,
  payload: FormData
) => Promise<ManagementFormState>;

export function MenuPresentationForm({
  action,
  initialValues
}: {
  action: StatefulAction;
  initialValues: {
    displayName?: string | null;
    logoUrl?: string | null;
    promotionTitle?: string | null;
    promotionText?: string | null;
  };
}) {
  const [state, formAction] = useFormState(action, initialManagementFormState);

  return (
    <form action={formAction}>
      <Card>
        <CardHeader>
          <CardTitle>Deli template branding</CardTitle>
          <CardDescription>
            These values appear in the 16:9 TV preview and future player rendering.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <FormMessage state={state} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="displayName">Store display name</Label>
            <Input
              id="displayName"
              name="displayName"
              defaultValue={initialValues.displayName ?? ""}
              placeholder="Jose's Deli & Grocery"
            />
            <FieldError errors={state.fieldErrors?.displayName} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="logoUrl">Logo URL</Label>
            <Input
              id="logoUrl"
              name="logoUrl"
              type="url"
              defaultValue={initialValues.logoUrl ?? ""}
              placeholder="https://..."
            />
            <FieldError errors={state.fieldErrors?.logoUrl} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="promotionTitle">Promotion title</Label>
            <Input
              id="promotionTitle"
              name="promotionTitle"
              defaultValue={initialValues.promotionTitle ?? ""}
              placeholder="Lunch Special"
            />
            <FieldError errors={state.fieldErrors?.promotionTitle} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="promotionText">Promotion text</Label>
            <Textarea
              id="promotionText"
              name="promotionText"
              defaultValue={initialValues.promotionText ?? ""}
              placeholder="Hero + fries + can soda — $10.99"
            />
            <FieldError errors={state.fieldErrors?.promotionText} />
          </div>

          <div className="md:col-span-2 flex justify-end">
            <SubmitButton label="Save branding" />
          </div>
        </CardContent>
      </Card>
    </form>
  );
}

export function MenuScreenAssignmentForm({
  action,
  screens,
  assignedScreenIds
}: {
  action: StatefulAction;
  screens: Array<{
    id: string;
    name: string;
    status: string;
    assignment: {
      menuId: string;
    } | null;
  }>;
  assignedScreenIds: string[];
}) {
  const [state, formAction] = useFormState(action, initialManagementFormState);
  const assigned = new Set(assignedScreenIds);

  return (
    <form action={formAction}>
      <Card>
        <CardHeader>
          <CardTitle>Screen assignment</CardTitle>
          <CardDescription>
            Select any number of screens in this store. A screen can show one menu at a time.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormMessage state={state} />

          {screens.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border p-5 text-sm text-muted-foreground">
              No screens are registered for this store yet.
            </p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {screens.map((screen) => (
                <label
                  key={screen.id}
                  className="flex cursor-pointer items-start gap-3 rounded-2xl border border-border/70 bg-background/40 p-4"
                >
                  <input
                    type="checkbox"
                    name="screenIds"
                    value={screen.id}
                    defaultChecked={assigned.has(screen.id)}
                    className="mt-1 h-4 w-4"
                  />
                  <span className="min-w-0">
                    <span className="block font-medium">{screen.name}</span>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      {formatEnumLabel(screen.status)}
                      {screen.assignment && !assigned.has(screen.id)
                        ? " · currently assigned to another menu"
                        : ""}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          )}

          <div className="flex justify-end">
            <SubmitButton label="Save screen assignments" />
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
