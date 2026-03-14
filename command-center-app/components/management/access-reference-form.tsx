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
import { accessTypeOptions } from "@/lib/validations/access-reference";
import { formatEnumLabel, toDateTimeLocalValue } from "@/lib/utils";

type AccessReferenceFormProps = {
  title: string;
  description: string;
  action: (
    state: ManagementFormState,
    payload: FormData
  ) => Promise<ManagementFormState>;
  submitLabel: string;
  context: {
    organizationId: string;
    siteId?: string | null;
    projectInstallationId?: string | null;
    deviceId?: string | null;
  };
  initialValues?: {
    name?: string | null;
    accessType?: string | null;
    vaultProvider?: string | null;
    vaultPath?: string | null;
    owner?: string | null;
    remoteAccessMethod?: string | null;
    notes?: string | null;
    lastValidatedAt?: string | Date | null;
  };
};

export function AccessReferenceForm({
  title,
  description,
  action,
  submitLabel,
  context,
  initialValues
}: AccessReferenceFormProps) {
  const [state, formAction] = useFormState(action, initialManagementFormState);

  return (
    <form action={formAction}>
      <input type="hidden" name="organizationId" value={context.organizationId} />
      <input type="hidden" name="siteId" value={context.siteId ?? ""} />
      <input
        type="hidden"
        name="projectInstallationId"
        value={context.projectInstallationId ?? ""}
      />
      <input type="hidden" name="deviceId" value={context.deviceId ?? ""} />

      <Card className="border-border/80 bg-card/70">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <FormMessage state={state} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reference-name">Reference name</Label>
            <Input
              id="reference-name"
              name="name"
              defaultValue={initialValues?.name ?? ""}
              placeholder="1Password · Site VPN"
            />
            <FieldError errors={state.fieldErrors?.name} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reference-type">Access type</Label>
            <Select
              id="reference-type"
              name="accessType"
              defaultValue={initialValues?.accessType ?? "OTHER"}
            >
              {accessTypeOptions.map((accessType) => (
                <option key={accessType} value={accessType}>
                  {formatEnumLabel(accessType)}
                </option>
              ))}
            </Select>
            <FieldError errors={state.fieldErrors?.accessType} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reference-vault-provider">Vault provider</Label>
            <Input
              id="reference-vault-provider"
              name="vaultProvider"
              defaultValue={initialValues?.vaultProvider ?? ""}
              placeholder="1Password"
            />
            <FieldError errors={state.fieldErrors?.vaultProvider} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reference-vault-path">Vault path / item</Label>
            <Input
              id="reference-vault-path"
              name="vaultPath"
              defaultValue={initialValues?.vaultPath ?? ""}
              placeholder="NetworkConnectIT / Midtown / VPN"
            />
            <FieldError errors={state.fieldErrors?.vaultPath} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reference-owner">Owner</Label>
            <Input
              id="reference-owner"
              name="owner"
              defaultValue={initialValues?.owner ?? ""}
              placeholder="Managed services"
            />
            <FieldError errors={state.fieldErrors?.owner} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reference-remote-method">Remote access method</Label>
            <Input
              id="reference-remote-method"
              name="remoteAccessMethod"
              defaultValue={initialValues?.remoteAccessMethod ?? ""}
              placeholder="VPN tunnel + web UI"
            />
            <FieldError errors={state.fieldErrors?.remoteAccessMethod} />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="reference-last-validated">Last validated at</Label>
            <Input
              id="reference-last-validated"
              name="lastValidatedAt"
              type="datetime-local"
              defaultValue={toDateTimeLocalValue(initialValues?.lastValidatedAt)}
            />
            <FieldError errors={state.fieldErrors?.lastValidatedAt} />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="reference-notes">Notes</Label>
            <Textarea
              id="reference-notes"
              name="notes"
              defaultValue={initialValues?.notes ?? ""}
              placeholder="Store only safe metadata and pointer references here, never raw credentials."
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
