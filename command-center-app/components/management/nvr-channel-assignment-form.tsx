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
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { ManagementFormState } from "@/lib/management/form-state";
import { initialManagementFormState } from "@/lib/management/form-state";
import type { SiteDeviceOption } from "@/lib/management/infrastructure";
import { formatEnumLabel } from "@/lib/utils";

type NvrChannelAssignmentFormProps = {
  action: (
    state: ManagementFormState,
    payload: FormData
  ) => Promise<ManagementFormState>;
  submitLabel: string;
  context: {
    organizationId: string;
    siteId: string;
  };
  nvrDevices: SiteDeviceOption[];
  cameraDevices: SiteDeviceOption[];
  initialValues?: {
    nvrDeviceId?: string | null;
    cameraDeviceId?: string | null;
    channelNumber?: number | null;
    recordingEnabled?: boolean | null;
    notes?: string | null;
  };
};

export function NvrChannelAssignmentForm({
  action,
  submitLabel,
  context,
  nvrDevices,
  cameraDevices,
  initialValues
}: NvrChannelAssignmentFormProps) {
  const [state, formAction] = useFormState(action, initialManagementFormState);

  return (
    <form action={formAction}>
      <input type="hidden" name="organizationId" value={context.organizationId} />
      <input type="hidden" name="siteId" value={context.siteId} />

      <Card className="border-border/80 bg-card/70">
        <CardHeader>
          <CardTitle>NVR channel assignment</CardTitle>
          <CardDescription>
            Map recorder channels explicitly to the cameras installed at this
            site.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <FormMessage state={state} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="assignment-nvr">NVR</Label>
            <Select
              id="assignment-nvr"
              name="nvrDeviceId"
              defaultValue={initialValues?.nvrDeviceId ?? nvrDevices[0]?.id ?? ""}
            >
              {nvrDevices.length === 0 ? <option value="">No NVR devices available</option> : null}
              {nvrDevices.map((device) => (
                <option key={device.id} value={device.id}>
                  {device.name}
                  {device.brand ? ` · ${device.brand}` : ""}
                  {device.model ? ` ${device.model}` : ""}
                </option>
              ))}
            </Select>
            <FieldError errors={state.fieldErrors?.nvrDeviceId} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="assignment-camera">Camera</Label>
            <Select
              id="assignment-camera"
              name="cameraDeviceId"
              defaultValue={initialValues?.cameraDeviceId ?? cameraDevices[0]?.id ?? ""}
            >
              {cameraDevices.length === 0 ? (
                <option value="">No camera devices available</option>
              ) : null}
              {cameraDevices.map((device) => (
                <option key={device.id} value={device.id}>
                  {device.name}
                  {device.brand ? ` · ${device.brand}` : ""}
                </option>
              ))}
            </Select>
            <FieldError errors={state.fieldErrors?.cameraDeviceId} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="assignment-channel">Channel number</Label>
            <Input
              id="assignment-channel"
              name="channelNumber"
              type="number"
              min="1"
              max="256"
              defaultValue={initialValues?.channelNumber ?? 1}
            />
            <FieldError errors={state.fieldErrors?.channelNumber} />
          </div>

          <div className="rounded-2xl border border-border/70 bg-background/30 px-4 py-4">
            <label className="inline-flex items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                name="recordingEnabled"
                defaultChecked={initialValues?.recordingEnabled ?? true}
                className="h-4 w-4 rounded border-border bg-background"
              />
              Recording enabled
            </label>
            <p className="mt-2 text-xs text-muted-foreground">
              Use this flag to distinguish monitored-but-not-recording channels
              from active recorder mappings.
            </p>
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="assignment-notes">Notes</Label>
            <Textarea
              id="assignment-notes"
              name="notes"
              defaultValue={initialValues?.notes ?? ""}
              placeholder="Channel 5 reserved for lobby overview, main stream only."
            />
            <FieldError errors={state.fieldErrors?.notes} />
          </div>

          <div className="md:col-span-2 flex justify-end">
            <SubmitButton label={submitLabel} />
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
