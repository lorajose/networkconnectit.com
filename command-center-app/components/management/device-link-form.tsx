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
import { deviceLinkTypeOptions } from "@/lib/validations/device-link";
import { formatEnumLabel } from "@/lib/utils";

type DeviceLinkFormProps = {
  action: (
    state: ManagementFormState,
    payload: FormData
  ) => Promise<ManagementFormState>;
  submitLabel: string;
  context: {
    organizationId: string;
    siteId: string;
  };
  devices: SiteDeviceOption[];
  initialValues?: {
    sourceDeviceId?: string | null;
    targetDeviceId?: string | null;
    linkType?: string | null;
    sourcePort?: string | null;
    targetPort?: string | null;
    poeProvided?: boolean | null;
    notes?: string | null;
  };
};

export function DeviceLinkForm({
  action,
  submitLabel,
  context,
  devices,
  initialValues
}: DeviceLinkFormProps) {
  const [state, formAction] = useFormState(action, initialManagementFormState);

  return (
    <form action={formAction}>
      <input type="hidden" name="organizationId" value={context.organizationId} />
      <input type="hidden" name="siteId" value={context.siteId} />

      <Card className="border-border/80 bg-card/70">
        <CardHeader>
          <CardTitle>Device relationship</CardTitle>
          <CardDescription>
            Model the uplink, downstream, PoE, or logical relationship between
            devices at this site.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <FormMessage state={state} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="link-source">Source device</Label>
            <Select
              id="link-source"
              name="sourceDeviceId"
              defaultValue={initialValues?.sourceDeviceId ?? devices[0]?.id ?? ""}
            >
              {devices.length === 0 ? <option value="">No devices available</option> : null}
              {devices.map((device) => (
                <option key={device.id} value={device.id}>
                  {device.name} · {formatEnumLabel(device.type)}
                </option>
              ))}
            </Select>
            <FieldError errors={state.fieldErrors?.sourceDeviceId} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="link-target">Target device</Label>
            <Select
              id="link-target"
              name="targetDeviceId"
              defaultValue={initialValues?.targetDeviceId ?? devices[0]?.id ?? ""}
            >
              {devices.length === 0 ? <option value="">No devices available</option> : null}
              {devices.map((device) => (
                <option key={device.id} value={device.id}>
                  {device.name} · {formatEnumLabel(device.type)}
                </option>
              ))}
            </Select>
            <FieldError errors={state.fieldErrors?.targetDeviceId} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="link-type">Link type</Label>
            <Select
              id="link-type"
              name="linkType"
              defaultValue={initialValues?.linkType ?? "UPLINK"}
            >
              {deviceLinkTypeOptions.map((linkType) => (
                <option key={linkType} value={linkType}>
                  {formatEnumLabel(linkType)}
                </option>
              ))}
            </Select>
            <FieldError errors={state.fieldErrors?.linkType} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="link-poe">PoE provided</Label>
            <Select
              id="link-poe"
              name="poeProvided"
              defaultValue={
                typeof initialValues?.poeProvided === "boolean"
                  ? String(initialValues.poeProvided)
                  : ""
              }
            >
              <option value="">Not specified</option>
              <option value="true">Yes</option>
              <option value="false">No</option>
            </Select>
            <FieldError errors={state.fieldErrors?.poeProvided} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="link-source-port">Source port</Label>
            <Input
              id="link-source-port"
              name="sourcePort"
              defaultValue={initialValues?.sourcePort ?? ""}
              placeholder="Port 24"
            />
            <FieldError errors={state.fieldErrors?.sourcePort} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="link-target-port">Target port</Label>
            <Input
              id="link-target-port"
              name="targetPort"
              defaultValue={initialValues?.targetPort ?? ""}
              placeholder="eth0"
            />
            <FieldError errors={state.fieldErrors?.targetPort} />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="link-notes">Notes</Label>
            <Textarea
              id="link-notes"
              name="notes"
              defaultValue={initialValues?.notes ?? ""}
              placeholder="Switch port 24 uplinks to router LAN1; PoE budget supplied downstream."
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
