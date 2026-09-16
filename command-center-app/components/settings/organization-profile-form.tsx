"use client";

import { useFormState } from "react-dom";
import { FormMessage } from "@/components/management/form-message";
import { SubmitButton } from "@/components/management/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { initialManagementFormState, type ManagementFormState } from "@/lib/management/form-state";
import { organizationStatusOptions } from "@/lib/validations/organization";
import { formatEnumLabel } from "@/lib/utils";

type Values = Record<string, string | null | undefined>;
type Props = { action: (state: ManagementFormState, payload: FormData) => Promise<ManagementFormState>; initialValues: Values };
const Field = ({ name, label, values, type = "text", placeholder }: { name: string; label: string; values: Values; type?: string; placeholder?: string }) => <div className="space-y-2"><Label htmlFor={name}>{label}</Label><Input id={name} name={name} type={type} defaultValue={values[name] ?? ""} placeholder={placeholder} /></div>;

export function OrganizationProfileForm({ action, initialValues }: Props) {
  const [state, formAction] = useFormState(action, initialManagementFormState);
  return <form action={formAction} className="space-y-6">
    <FormMessage state={state} />
    <Card><CardHeader><CardTitle>Company profile</CardTitle><CardDescription>Authoritative organization identity reused across Contractor OS documents and customer-facing outputs.</CardDescription></CardHeader><CardContent className="grid gap-5 md:grid-cols-2">
      <Field name="name" label="Display name" values={initialValues} /><Field name="legalName" label="Legal name" values={initialValues} />
      <Field name="slug" label="Organization slug" values={initialValues} /><Field name="websiteUrl" label="Website" values={initialValues} type="url" placeholder="https://example.com" />
      <Field name="contactName" label="Primary contact" values={initialValues} /><Field name="contactEmail" label="Contact email" values={initialValues} type="email" />
      <Field name="phone" label="Phone" values={initialValues} /><div className="space-y-2"><Label htmlFor="status">Status</Label><Select id="status" name="status" defaultValue={initialValues.status ?? "ACTIVE"}>{organizationStatusOptions.map((s)=><option key={s} value={s}>{formatEnumLabel(s)}</option>)}</Select></div>
      <div className="space-y-2 md:col-span-2"><Label htmlFor="description">Company description</Label><Textarea id="description" name="description" defaultValue={initialValues.description ?? ""} /></div>
    </CardContent></Card>
    <Card><CardHeader><CardTitle>Business address</CardTitle><CardDescription>Used as the organization default for proposals, estimates, invoices, and closeout packages.</CardDescription></CardHeader><CardContent className="grid gap-5 md:grid-cols-2">
      <Field name="addressLine1" label="Address line 1" values={initialValues} /><Field name="addressLine2" label="Address line 2" values={initialValues} />
      <Field name="city" label="City" values={initialValues} /><Field name="stateRegion" label="State / region" values={initialValues} />
      <Field name="postalCode" label="Postal code" values={initialValues} /><Field name="country" label="Country" values={initialValues} />
      <Field name="timezone" label="Timezone" values={initialValues} placeholder="America/New_York" />
    </CardContent></Card>
    <Card><CardHeader><CardTitle>Branding</CardTitle><CardDescription>Logo and brand tokens for future branded PDF, proposal, invoice, and closeout rendering.</CardDescription></CardHeader><CardContent className="grid gap-5 md:grid-cols-2">
      <Field name="logoUrl" label="Logo URL" values={initialValues} type="url" placeholder="https://.../logo.png" /><Field name="brandTagline" label="Tagline" values={initialValues} />
      <Field name="brandPrimaryColor" label="Primary color" values={initialValues} placeholder="#0EA5E9" /><Field name="brandAccentColor" label="Accent color" values={initialValues} placeholder="#22C55E" />
      <div className="md:col-span-2 rounded-2xl border border-border/70 p-4"><p className="text-sm font-medium">Brand preview</p><div className="mt-3 flex items-center gap-3"><span className="h-8 w-8 rounded-full border" style={{ backgroundColor: initialValues.brandPrimaryColor ?? "#0EA5E9" }} /><span className="h-8 w-8 rounded-full border" style={{ backgroundColor: initialValues.brandAccentColor ?? "#22C55E" }} /><span className="text-sm text-muted-foreground">{initialValues.brandTagline || initialValues.name || "Organization"}</span></div></div>
    </CardContent></Card>
    <div className="flex justify-end"><SubmitButton label="Save organization profile" /></div>
  </form>;
}
