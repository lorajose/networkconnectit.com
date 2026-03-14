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
import type { ManagementFormState } from "@/lib/management/form-state";
import { initialManagementFormState } from "@/lib/management/form-state";

type NetworkSegmentFormProps = {
  action: (
    state: ManagementFormState,
    payload: FormData
  ) => Promise<ManagementFormState>;
  submitLabel: string;
  context: {
    organizationId: string;
    siteId: string;
  };
  initialValues?: {
    name?: string | null;
    vlanId?: number | null;
    subnetCidr?: string | null;
    gatewayIp?: string | null;
    purpose?: string | null;
    notes?: string | null;
  };
};

export function NetworkSegmentForm({
  action,
  submitLabel,
  context,
  initialValues
}: NetworkSegmentFormProps) {
  const [state, formAction] = useFormState(action, initialManagementFormState);

  return (
    <form action={formAction}>
      <input type="hidden" name="organizationId" value={context.organizationId} />
      <input type="hidden" name="siteId" value={context.siteId} />

      <Card className="border-border/80 bg-card/70">
        <CardHeader>
          <CardTitle>Network segment</CardTitle>
          <CardDescription>
            Register VLANs and subnets so devices can be grouped by management,
            cameras, voice, or guest traffic.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <FormMessage state={state} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="segment-name">Name</Label>
            <Input
              id="segment-name"
              name="name"
              defaultValue={initialValues?.name ?? ""}
              placeholder="Camera VLAN"
            />
            <FieldError errors={state.fieldErrors?.name} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="segment-vlan">VLAN ID</Label>
            <Input
              id="segment-vlan"
              name="vlanId"
              type="number"
              min="1"
              max="4094"
              defaultValue={initialValues?.vlanId ?? ""}
              placeholder="20"
            />
            <FieldError errors={state.fieldErrors?.vlanId} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="segment-cidr">Subnet CIDR</Label>
            <Input
              id="segment-cidr"
              name="subnetCidr"
              defaultValue={initialValues?.subnetCidr ?? ""}
              placeholder="10.20.20.0/24"
            />
            <FieldError errors={state.fieldErrors?.subnetCidr} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="segment-gateway">Gateway IP</Label>
            <Input
              id="segment-gateway"
              name="gatewayIp"
              defaultValue={initialValues?.gatewayIp ?? ""}
              placeholder="10.20.20.1"
            />
            <FieldError errors={state.fieldErrors?.gatewayIp} />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="segment-purpose">Purpose</Label>
            <Input
              id="segment-purpose"
              name="purpose"
              defaultValue={initialValues?.purpose ?? ""}
              placeholder="Camera traffic and recorder uplinks"
            />
            <FieldError errors={state.fieldErrors?.purpose} />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="segment-notes">Notes</Label>
            <Textarea
              id="segment-notes"
              name="notes"
              defaultValue={initialValues?.notes ?? ""}
              placeholder="Reserved for cameras and NVR uplinks. Avoid guest traffic."
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
