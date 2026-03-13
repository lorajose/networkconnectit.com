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
  deviceStatusOptions,
  deviceTypeOptions,
  monitoringModeOptions
} from "@/lib/validations/device";
import { formatEnumLabel } from "@/lib/utils";

type DeviceFormProps = {
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
    siteId?: string | null;
    name?: string | null;
    type?: string | null;
    brand?: string | null;
    model?: string | null;
    ipAddress?: string | null;
    macAddress?: string | null;
    serialNumber?: string | null;
    status?: string | null;
    monitoringMode?: string | null;
    lastSeenAt?: string | null;
    notes?: string | null;
  };
};

export function DeviceForm({
  action,
  submitLabel,
  organizations,
  sites,
  lockOrganization = false,
  initialValues
}: DeviceFormProps) {
  const [state, formAction] = useFormState(action, initialManagementFormState);
  const [selectedOrganizationId, setSelectedOrganizationId] = useState(
    initialValues?.organizationId ?? organizations[0]?.id ?? ""
  );
  const [selectedSiteId, setSelectedSiteId] = useState(
    initialValues?.siteId ?? ""
  );

  const filteredSites = useMemo(
    () =>
      sites.filter(
        (site) => !selectedOrganizationId || site.organizationId === selectedOrganizationId
      ),
    [selectedOrganizationId, sites]
  );

  useEffect(() => {
    if (
      filteredSites.length > 0 &&
      !filteredSites.some((site) => site.id === selectedSiteId)
    ) {
      setSelectedSiteId(filteredSites[0]?.id ?? "");
      return;
    }

    if (filteredSites.length === 0) {
      setSelectedSiteId("");
    }
  }, [filteredSites, selectedSiteId]);

  return (
    <form action={formAction} className="space-y-6">
      <FormMessage state={state} />

      <Card>
        <CardHeader>
          <CardTitle>Device profile</CardTitle>
          <CardDescription>
            Register the hardware identity, network metadata, and monitoring mode.
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
            <Label htmlFor="siteId">Site</Label>
            <Select
              id="siteId"
              name="siteId"
              value={selectedSiteId}
              onChange={(event) => setSelectedSiteId(event.target.value)}
            >
              {filteredSites.length === 0 ? (
                <option value="">No sites available</option>
              ) : null}
              {filteredSites.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.name} · {site.organizationName}
                </option>
              ))}
            </Select>
            <FieldError errors={state.fieldErrors?.siteId} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Device name</Label>
            <Input
              id="name"
              name="name"
              defaultValue={initialValues?.name ?? ""}
              placeholder="CAM-ATL-DOCK-01"
            />
            <FieldError errors={state.fieldErrors?.name} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Type</Label>
            <Select
              id="type"
              name="type"
              defaultValue={initialValues?.type ?? "CAMERA"}
            >
              {deviceTypeOptions.map((type) => (
                <option key={type} value={type}>
                  {formatEnumLabel(type)}
                </option>
              ))}
            </Select>
            <FieldError errors={state.fieldErrors?.type} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="brand">Brand</Label>
            <Input
              id="brand"
              name="brand"
              defaultValue={initialValues?.brand ?? ""}
              placeholder="Axis"
            />
            <FieldError errors={state.fieldErrors?.brand} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="model">Model</Label>
            <Input
              id="model"
              name="model"
              defaultValue={initialValues?.model ?? ""}
              placeholder="P3265-LVE"
            />
            <FieldError errors={state.fieldErrors?.model} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ipAddress">IP address</Label>
            <Input
              id="ipAddress"
              name="ipAddress"
              defaultValue={initialValues?.ipAddress ?? ""}
              placeholder="10.30.4.21"
            />
            <FieldError errors={state.fieldErrors?.ipAddress} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="macAddress">MAC address</Label>
            <Input
              id="macAddress"
              name="macAddress"
              defaultValue={initialValues?.macAddress ?? ""}
              placeholder="00:1B:44:11:3A:B7"
            />
            <FieldError errors={state.fieldErrors?.macAddress} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="serialNumber">Serial number</Label>
            <Input
              id="serialNumber"
              name="serialNumber"
              defaultValue={initialValues?.serialNumber ?? ""}
              placeholder="AXIS-0012389"
            />
            <FieldError errors={state.fieldErrors?.serialNumber} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              id="status"
              name="status"
              defaultValue={initialValues?.status ?? "UNKNOWN"}
            >
              {deviceStatusOptions.map((status) => (
                <option key={status} value={status}>
                  {formatEnumLabel(status)}
                </option>
              ))}
            </Select>
            <FieldError errors={state.fieldErrors?.status} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="monitoringMode">Monitoring mode</Label>
            <Select
              id="monitoringMode"
              name="monitoringMode"
              defaultValue={initialValues?.monitoringMode ?? "ACTIVE"}
            >
              {monitoringModeOptions.map((mode) => (
                <option key={mode} value={mode}>
                  {formatEnumLabel(mode)}
                </option>
              ))}
            </Select>
            <FieldError errors={state.fieldErrors?.monitoringMode} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="lastSeenAt">Last seen at</Label>
            <Input
              id="lastSeenAt"
              name="lastSeenAt"
              type="datetime-local"
              defaultValue={initialValues?.lastSeenAt ?? ""}
            />
            <FieldError errors={state.fieldErrors?.lastSeenAt} />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              name="notes"
              defaultValue={initialValues?.notes ?? ""}
              placeholder="Rack location, camera view, maintenance notes, or escalation context."
            />
            <FieldError errors={state.fieldErrors?.notes} />
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center justify-end gap-3">
        <Button variant="outline" asChild>
          <Link href="/devices">Cancel</Link>
        </Button>
        <SubmitButton label={submitLabel} />
      </div>
    </form>
  );
}
