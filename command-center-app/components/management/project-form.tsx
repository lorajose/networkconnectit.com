"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
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
import type { SiteOption } from "@/lib/management/sites";
import {
  handoffStatusOptions,
  projectInstallationStatusOptions,
  projectPriorityOptions,
  projectTypeOptions
} from "@/lib/validations/project";
import {
  formatEnumLabel,
  toDateInputValue
} from "@/lib/utils";

type ProjectFormProps = {
  action: (
    state: ManagementFormState,
    payload: FormData
  ) => Promise<ManagementFormState>;
  submitLabel: string;
  organizations: OrganizationOption[];
  sites: SiteOption[];
  lockOrganization?: boolean;
  initialValues?: {
    organizationId?: string | null;
    primarySiteId?: string | null;
    name?: string | null;
    projectCode?: string | null;
    status?: string | null;
    projectType?: string | null;
    priority?: string | null;
    installationDate?: string | Date | null;
    goLiveDate?: string | Date | null;
    warrantyStartAt?: string | Date | null;
    warrantyEndAt?: string | Date | null;
    clientContactName?: string | null;
    clientContactEmail?: string | null;
    clientContactPhone?: string | null;
    internalProjectManager?: string | null;
    leadTechnician?: string | null;
    salesOwner?: string | null;
    scopeSummary?: string | null;
    remoteAccessMethod?: string | null;
    handoffStatus?: string | null;
    monitoringReady?: boolean | null;
    vendorSystemsPlanned?: string | null;
    externalReference?: string | null;
    internalNotes?: string | null;
    clientFacingNotes?: string | null;
    siteIds?: string[];
  };
};

export function ProjectForm({
  action,
  submitLabel,
  organizations,
  sites,
  lockOrganization = false,
  initialValues
}: ProjectFormProps) {
  const [state, formAction] = useFormState(action, initialManagementFormState);
  const [selectedOrganizationId, setSelectedOrganizationId] = useState(
    initialValues?.organizationId ?? organizations[0]?.id ?? ""
  );
  const [selectedSiteIds, setSelectedSiteIds] = useState<string[]>(
    initialValues?.siteIds ?? []
  );
  const [selectedPrimarySiteId, setSelectedPrimarySiteId] = useState(
    initialValues?.primarySiteId ?? ""
  );

  const filteredSites = useMemo(
    () =>
      sites.filter(
        (site) =>
          !selectedOrganizationId || site.organizationId === selectedOrganizationId
      ),
    [selectedOrganizationId, sites]
  );

  useEffect(() => {
    const availableSiteIds = new Set(filteredSites.map((site) => site.id));

    setSelectedSiteIds((current) =>
      current.filter((siteId) => availableSiteIds.has(siteId))
    );
  }, [filteredSites]);

  useEffect(() => {
    if (selectedPrimarySiteId && !selectedSiteIds.includes(selectedPrimarySiteId)) {
      setSelectedPrimarySiteId("");
    }
  }, [selectedPrimarySiteId, selectedSiteIds]);

  function toggleSite(siteId: string, checked: boolean) {
    setSelectedSiteIds((current) => {
      if (checked) {
        return current.includes(siteId) ? current : [...current, siteId];
      }

      return current.filter((value) => value !== siteId);
    });
  }

  return (
    <form action={formAction} className="space-y-6">
      <FormMessage state={state} />

      <Card>
        <CardHeader>
          <CardTitle>Project profile</CardTitle>
          <CardDescription>
            Track the real installation, rollout, refresh, or managed handoff as
            a first-class deployment record.
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
              value={selectedOrganizationId}
              onChange={(event) => setSelectedOrganizationId(event.target.value)}
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
            <Label htmlFor="name">Project name</Label>
            <Input
              id="name"
              name="name"
              defaultValue={initialValues?.name ?? ""}
              placeholder="Midtown Medical CCTV Refresh Phase 1"
            />
            <FieldError errors={state.fieldErrors?.name} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="projectCode">Project code</Label>
            <Input
              id="projectCode"
              name="projectCode"
              defaultValue={initialValues?.projectCode ?? ""}
              placeholder="MMG-NYC-Q2-2026"
            />
            <FieldError errors={state.fieldErrors?.projectCode} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              id="status"
              name="status"
              defaultValue={initialValues?.status ?? "PLANNING"}
            >
              {projectInstallationStatusOptions.map((status) => (
                <option key={status} value={status}>
                  {formatEnumLabel(status)}
                </option>
              ))}
            </Select>
            <FieldError errors={state.fieldErrors?.status} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="projectType">Project type</Label>
            <Select
              id="projectType"
              name="projectType"
              defaultValue={initialValues?.projectType ?? "INSTALLATION"}
            >
              {projectTypeOptions.map((projectType) => (
                <option key={projectType} value={projectType}>
                  {formatEnumLabel(projectType)}
                </option>
              ))}
            </Select>
            <FieldError errors={state.fieldErrors?.projectType} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="priority">Priority</Label>
            <Select
              id="priority"
              name="priority"
              defaultValue={initialValues?.priority ?? "MEDIUM"}
            >
              {projectPriorityOptions.map((priority) => (
                <option key={priority} value={priority}>
                  {formatEnumLabel(priority)}
                </option>
              ))}
            </Select>
            <FieldError errors={state.fieldErrors?.priority} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="primarySiteId">Primary site</Label>
            <Select
              id="primarySiteId"
              name="primarySiteId"
              value={selectedPrimarySiteId}
              onChange={(event) => setSelectedPrimarySiteId(event.target.value)}
            >
              <option value="">No primary site selected</option>
              {filteredSites
                .filter((site) => selectedSiteIds.includes(site.id))
                .map((site) => (
                  <option key={site.id} value={site.id}>
                    {site.name} · {site.organizationName}
                  </option>
                ))}
            </Select>
            <FieldError errors={state.fieldErrors?.primarySiteId} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="handoffStatus">Handoff status</Label>
            <Select
              id="handoffStatus"
              name="handoffStatus"
              defaultValue={initialValues?.handoffStatus ?? "NOT_STARTED"}
            >
              {handoffStatusOptions.map((handoffStatus) => (
                <option key={handoffStatus} value={handoffStatus}>
                  {formatEnumLabel(handoffStatus)}
                </option>
              ))}
            </Select>
            <FieldError errors={state.fieldErrors?.handoffStatus} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="installationDate">Installation date</Label>
            <Input
              id="installationDate"
              name="installationDate"
              type="date"
              defaultValue={toDateInputValue(initialValues?.installationDate)}
            />
            <FieldError errors={state.fieldErrors?.installationDate} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="goLiveDate">Go-live date</Label>
            <Input
              id="goLiveDate"
              name="goLiveDate"
              type="date"
              defaultValue={toDateInputValue(initialValues?.goLiveDate)}
            />
            <FieldError errors={state.fieldErrors?.goLiveDate} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="warrantyStartAt">Warranty start</Label>
            <Input
              id="warrantyStartAt"
              name="warrantyStartAt"
              type="date"
              defaultValue={toDateInputValue(initialValues?.warrantyStartAt)}
            />
            <FieldError errors={state.fieldErrors?.warrantyStartAt} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="warrantyEndAt">Warranty end</Label>
            <Input
              id="warrantyEndAt"
              name="warrantyEndAt"
              type="date"
              defaultValue={toDateInputValue(initialValues?.warrantyEndAt)}
            />
            <FieldError errors={state.fieldErrors?.warrantyEndAt} />
          </div>

          <div className="md:col-span-2 rounded-2xl border border-border/70 bg-background/30 p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-foreground">
                  Monitoring readiness
                </p>
                <p className="text-xs text-muted-foreground">
                  Mark the project ready once the linked infrastructure can be
                  monitored safely.
                </p>
              </div>
              <label className="inline-flex items-center gap-2 text-sm text-foreground">
                <input
                  type="checkbox"
                  name="monitoringReady"
                  defaultChecked={Boolean(initialValues?.monitoringReady)}
                  className="h-4 w-4 rounded border-border bg-background"
                />
                Ready
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Linked sites</CardTitle>
          <CardDescription>
            Attach one or more existing sites to this project. A site can appear
            in multiple projects over time.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {filteredSites.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/80 px-4 py-6 text-sm text-muted-foreground">
              No sites are available for the selected organization yet.
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {filteredSites.map((site) => {
                const checked = selectedSiteIds.includes(site.id);

                return (
                  <label
                    key={site.id}
                    className="flex cursor-pointer gap-3 rounded-2xl border border-border/70 bg-background/30 px-4 py-4 text-sm"
                  >
                    <input
                      type="checkbox"
                      name="siteIds"
                      value={site.id}
                      checked={checked}
                      onChange={(event) => toggleSite(site.id, event.target.checked)}
                      className="mt-1 h-4 w-4 rounded border-border bg-background"
                    />
                    <span className="space-y-1">
                      <span className="block font-medium text-foreground">
                        {site.name}
                      </span>
                      <span className="block text-muted-foreground">
                        {site.organizationName}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          )}
          <FieldError errors={state.fieldErrors?.siteIds} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contacts and ownership</CardTitle>
          <CardDescription>
            Store the client-facing contact and the internal delivery owners.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="clientContactName">Client contact name</Label>
            <Input
              id="clientContactName"
              name="clientContactName"
              defaultValue={initialValues?.clientContactName ?? ""}
              placeholder="Alicia Reyes"
            />
            <FieldError errors={state.fieldErrors?.clientContactName} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="clientContactEmail">Client contact email</Label>
            <Input
              id="clientContactEmail"
              name="clientContactEmail"
              type="email"
              defaultValue={initialValues?.clientContactEmail ?? ""}
              placeholder="areyes@midtownmedical.com"
            />
            <FieldError errors={state.fieldErrors?.clientContactEmail} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="clientContactPhone">Client contact phone</Label>
            <Input
              id="clientContactPhone"
              name="clientContactPhone"
              defaultValue={initialValues?.clientContactPhone ?? ""}
              placeholder="+1 212 555 0100"
            />
            <FieldError errors={state.fieldErrors?.clientContactPhone} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="internalProjectManager">Internal project manager</Label>
            <Input
              id="internalProjectManager"
              name="internalProjectManager"
              defaultValue={initialValues?.internalProjectManager ?? ""}
              placeholder="Jose Lora"
            />
            <FieldError errors={state.fieldErrors?.internalProjectManager} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="leadTechnician">Lead technician</Label>
            <Input
              id="leadTechnician"
              name="leadTechnician"
              defaultValue={initialValues?.leadTechnician ?? ""}
              placeholder="Carlos Jimenez"
            />
            <FieldError errors={state.fieldErrors?.leadTechnician} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="salesOwner">Sales owner</Label>
            <Input
              id="salesOwner"
              name="salesOwner"
              defaultValue={initialValues?.salesOwner ?? ""}
              placeholder="Ana Torres"
            />
            <FieldError errors={state.fieldErrors?.salesOwner} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Scope and handoff notes</CardTitle>
          <CardDescription>
            Capture rollout scope, remote access method, vendor targets, and
            internal/client notes.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="scopeSummary">Scope summary</Label>
            <Textarea
              id="scopeSummary"
              name="scopeSummary"
              defaultValue={initialValues?.scopeSummary ?? ""}
              placeholder="Refresh the surveillance core, replace legacy switches, and hand off managed visibility."
            />
            <FieldError errors={state.fieldErrors?.scopeSummary} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="remoteAccessMethod">Remote access method</Label>
            <Input
              id="remoteAccessMethod"
              name="remoteAccessMethod"
              defaultValue={initialValues?.remoteAccessMethod ?? ""}
              placeholder="Site-to-site VPN with vendor portal fallback"
            />
            <FieldError errors={state.fieldErrors?.remoteAccessMethod} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="externalReference">External reference</Label>
            <Input
              id="externalReference"
              name="externalReference"
              defaultValue={initialValues?.externalReference ?? ""}
              placeholder="Quote 2026-117 / PM-882"
            />
            <FieldError errors={state.fieldErrors?.externalReference} />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="vendorSystemsPlanned">Vendor systems planned</Label>
            <Textarea
              id="vendorSystemsPlanned"
              name="vendorSystemsPlanned"
              defaultValue={initialValues?.vendorSystemsPlanned ?? ""}
              placeholder="UniFi gateway and switch stack, Reolink cameras, LTS NVR handoff."
            />
            <FieldError errors={state.fieldErrors?.vendorSystemsPlanned} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="internalNotes">Internal notes</Label>
            <Textarea
              id="internalNotes"
              name="internalNotes"
              defaultValue={initialValues?.internalNotes ?? ""}
              placeholder="Escalation path, credential handoff prerequisites, and site constraints."
            />
            <FieldError errors={state.fieldErrors?.internalNotes} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="clientFacingNotes">Client-facing notes</Label>
            <Textarea
              id="clientFacingNotes"
              name="clientFacingNotes"
              defaultValue={initialValues?.clientFacingNotes ?? ""}
              placeholder="Post-install expectations and monitoring handoff notes."
            />
            <FieldError errors={state.fieldErrors?.clientFacingNotes} />
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center justify-end gap-3">
        <Button variant="outline" asChild>
          <Link href="/projects">Cancel</Link>
        </Button>
        <SubmitButton label={submitLabel} />
      </div>
    </form>
  );
}
