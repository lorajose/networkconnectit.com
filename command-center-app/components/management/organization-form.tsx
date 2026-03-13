"use client";

import Link from "next/link";
import { useFormState } from "react-dom";

import { FieldError } from "@/components/management/field-error";
import { FormMessage } from "@/components/management/form-message";
import { SubmitButton } from "@/components/management/submit-button";
import { Button } from "@/components/ui/button";
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
import { initialManagementFormState, type ManagementFormState } from "@/lib/management/form-state";
import { organizationStatusOptions } from "@/lib/validations/organization";
import { formatEnumLabel } from "@/lib/utils";

type OrganizationFormProps = {
  action: (
    state: ManagementFormState,
    payload: FormData
  ) => Promise<ManagementFormState>;
  submitLabel: string;
  initialValues?: {
    name?: string | null;
    slug?: string | null;
    contactName?: string | null;
    contactEmail?: string | null;
    phone?: string | null;
    status?: string | null;
  };
};

export function OrganizationForm({
  action,
  submitLabel,
  initialValues
}: OrganizationFormProps) {
  const [state, formAction] = useFormState(action, initialManagementFormState);

  return (
    <form action={formAction} className="space-y-6">
      <FormMessage state={state} />

      <Card>
        <CardHeader>
          <CardTitle>Organization profile</CardTitle>
          <CardDescription>
            Define the tenant identity and primary administrative contact.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="name">Organization name</Label>
            <Input
              id="name"
              name="name"
              defaultValue={initialValues?.name ?? ""}
              placeholder="NetworkConnectIT Client"
            />
            <FieldError errors={state.fieldErrors?.name} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="slug">Slug</Label>
            <Input
              id="slug"
              name="slug"
              defaultValue={initialValues?.slug ?? ""}
              placeholder="networkconnectit-client"
            />
            <FieldError errors={state.fieldErrors?.slug} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contactName">Contact name</Label>
            <Input
              id="contactName"
              name="contactName"
              defaultValue={initialValues?.contactName ?? ""}
              placeholder="Primary client contact"
            />
            <FieldError errors={state.fieldErrors?.contactName} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contactEmail">Contact email</Label>
            <Input
              id="contactEmail"
              name="contactEmail"
              type="email"
              defaultValue={initialValues?.contactEmail ?? ""}
              placeholder="ops@example.com"
            />
            <FieldError errors={state.fieldErrors?.contactEmail} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              name="phone"
              defaultValue={initialValues?.phone ?? ""}
              placeholder="+1 555 010 2200"
            />
            <FieldError errors={state.fieldErrors?.phone} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              id="status"
              name="status"
              defaultValue={initialValues?.status ?? "ACTIVE"}
            >
              {organizationStatusOptions.map((status) => (
                <option key={status} value={status}>
                  {formatEnumLabel(status)}
                </option>
              ))}
            </Select>
            <FieldError errors={state.fieldErrors?.status} />
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center justify-end gap-3">
        <Button variant="outline" asChild>
          <Link href="/organizations">Cancel</Link>
        </Button>
        <SubmitButton label={submitLabel} />
      </div>
    </form>
  );
}
