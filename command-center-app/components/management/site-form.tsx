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
import { Textarea } from "@/components/ui/textarea";
import type { ManagementFormState } from "@/lib/management/form-state";
import { initialManagementFormState } from "@/lib/management/form-state";
import type { OrganizationOption } from "@/lib/management/organizations";
import { siteStatusOptions } from "@/lib/validations/site";
import { formatEnumLabel } from "@/lib/utils";

type SiteFormProps = {
  action: (
    state: ManagementFormState,
    payload: FormData
  ) => Promise<ManagementFormState>;
  submitLabel: string;
  organizations: OrganizationOption[];
  lockOrganization?: boolean;
  initialValues?: {
    organizationId?: string | null;
    name?: string | null;
    addressLine1?: string | null;
    addressLine2?: string | null;
    city?: string | null;
    stateRegion?: string | null;
    postalCode?: string | null;
    country?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    timezone?: string | null;
    status?: string | null;
    notes?: string | null;
  };
};

export function SiteForm({
  action,
  submitLabel,
  organizations,
  lockOrganization = false,
  initialValues
}: SiteFormProps) {
  const [state, formAction] = useFormState(action, initialManagementFormState);
  const selectedOrganizationId =
    initialValues?.organizationId ?? organizations[0]?.id ?? "";

  return (
    <form action={formAction} className="space-y-6">
      <FormMessage state={state} />

      <Card>
        <CardHeader>
          <CardTitle>Site profile</CardTitle>
          <CardDescription>
            Capture the site location, timezone, status, and deployment notes.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5 md:grid-cols-2">
          {lockOrganization ? (
            <input
              type="hidden"
              name="organizationId"
              value={selectedOrganizationId}
            />
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="organizationId">Organization</Label>
            <Select
              id="organizationId"
              name="organizationId"
              defaultValue={selectedOrganizationId}
              disabled={lockOrganization}
            >
              {organizations.map((organization) => (
                <option key={organization.id} value={organization.id}>
                  {organization.name}
                </option>
              ))}
            </Select>
            <FieldError errors={state.fieldErrors?.organizationId} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Site name</Label>
            <Input
              id="name"
              name="name"
              defaultValue={initialValues?.name ?? ""}
              placeholder="Atlanta Distribution Campus"
            />
            <FieldError errors={state.fieldErrors?.name} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="addressLine1">Address line 1</Label>
            <Input
              id="addressLine1"
              name="addressLine1"
              defaultValue={initialValues?.addressLine1 ?? ""}
              placeholder="123 Operations Way"
            />
            <FieldError errors={state.fieldErrors?.addressLine1} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="addressLine2">Address line 2</Label>
            <Input
              id="addressLine2"
              name="addressLine2"
              defaultValue={initialValues?.addressLine2 ?? ""}
              placeholder="Suite or floor"
            />
            <FieldError errors={state.fieldErrors?.addressLine2} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="city">City</Label>
            <Input
              id="city"
              name="city"
              defaultValue={initialValues?.city ?? ""}
              placeholder="Atlanta"
            />
            <FieldError errors={state.fieldErrors?.city} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="stateRegion">State / Region</Label>
            <Input
              id="stateRegion"
              name="stateRegion"
              defaultValue={initialValues?.stateRegion ?? ""}
              placeholder="Georgia"
            />
            <FieldError errors={state.fieldErrors?.stateRegion} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="postalCode">Postal code</Label>
            <Input
              id="postalCode"
              name="postalCode"
              defaultValue={initialValues?.postalCode ?? ""}
              placeholder="30301"
            />
            <FieldError errors={state.fieldErrors?.postalCode} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="country">Country</Label>
            <Input
              id="country"
              name="country"
              defaultValue={initialValues?.country ?? ""}
              placeholder="United States"
            />
            <FieldError errors={state.fieldErrors?.country} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="latitude">Latitude</Label>
            <Input
              id="latitude"
              name="latitude"
              type="number"
              step="any"
              defaultValue={initialValues?.latitude ?? ""}
              placeholder="33.7490"
            />
            <FieldError errors={state.fieldErrors?.latitude} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="longitude">Longitude</Label>
            <Input
              id="longitude"
              name="longitude"
              type="number"
              step="any"
              defaultValue={initialValues?.longitude ?? ""}
              placeholder="-84.3880"
            />
            <FieldError errors={state.fieldErrors?.longitude} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="timezone">Timezone</Label>
            <Input
              id="timezone"
              name="timezone"
              defaultValue={initialValues?.timezone ?? ""}
              placeholder="America/New_York"
            />
            <FieldError errors={state.fieldErrors?.timezone} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              id="status"
              name="status"
              defaultValue={initialValues?.status ?? "ACTIVE"}
            >
              {siteStatusOptions.map((status) => (
                <option key={status} value={status}>
                  {formatEnumLabel(status)}
                </option>
              ))}
            </Select>
            <FieldError errors={state.fieldErrors?.status} />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              name="notes"
              defaultValue={initialValues?.notes ?? ""}
              placeholder="Deployment considerations, access instructions, or operational context."
            />
            <FieldError errors={state.fieldErrors?.notes} />
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center justify-end gap-3">
        <Button variant="outline" asChild>
          <Link href="/sites">Cancel</Link>
        </Button>
        <SubmitButton label={submitLabel} />
      </div>
    </form>
  );
}
