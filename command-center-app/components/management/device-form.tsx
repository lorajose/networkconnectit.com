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
import type { ProjectOption } from "@/lib/management/projects";
import type { SiteOption } from "@/lib/management/sites";
import type { NetworkSegmentOption } from "@/lib/management/devices";
import {
  deviceStatusOptions,
  deviceTypeOptions,
  monitoringModeOptions,
  switchRoleOptions
} from "@/lib/validations/device";
import {
  formatEnumLabel,
  toDateInputValue,
  toDateTimeLocalValue
} from "@/lib/utils";

type DeviceFormProps = {
  action: (
    state: ManagementFormState,
    payload: FormData
  ) => Promise<ManagementFormState>;
  submitLabel: string;
  organizations: OrganizationOption[];
  sites: SiteOption[];
  projects: ProjectOption[];
  networkSegments: NetworkSegmentOption[];
  lockOrganization?: boolean;
  initialValues?: {
    organizationId?: string | null;
    siteId?: string | null;
    projectInstallationId?: string | null;
    networkSegmentId?: string | null;
    name?: string | null;
    hostname?: string | null;
    type?: string | null;
    brand?: string | null;
    model?: string | null;
    firmwareVersion?: string | null;
    vendorExternalId?: string | null;
    ipAddress?: string | null;
    macAddress?: string | null;
    serialNumber?: string | null;
    switchRole?: string | null;
    portCount?: number | null;
    usedPortCount?: number | null;
    poeBudgetWatts?: number | null;
    poeUsedWatts?: number | null;
    poeRequired?: boolean | null;
    estimatedPoeWatts?: number | null;
    status?: string | null;
    monitoringMode?: string | null;
    installedAt?: string | Date | null;
    lastSeenAt?: string | null;
    notes?: string | null;
  };
};

export function DeviceForm({
  action,
  submitLabel,
  organizations,
  sites,
  projects,
  networkSegments,
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
  const [selectedProjectId, setSelectedProjectId] = useState(
    initialValues?.projectInstallationId ?? ""
  );
  const [selectedNetworkSegmentId, setSelectedNetworkSegmentId] = useState(
    initialValues?.networkSegmentId ?? ""
  );

  const filteredSites = useMemo(
    () =>
      sites.filter(
        (site) => !selectedOrganizationId || site.organizationId === selectedOrganizationId
      ),
    [selectedOrganizationId, sites]
  );

  const filteredProjects = useMemo(
    () =>
      projects.filter(
        (project) =>
          !selectedOrganizationId || project.organizationId === selectedOrganizationId
      ),
    [projects, selectedOrganizationId]
  );

  const filteredNetworkSegments = useMemo(
    () =>
      networkSegments.filter(
        (segment) => !selectedSiteId || segment.siteId === selectedSiteId
      ),
    [networkSegments, selectedSiteId]
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

  useEffect(() => {
    if (
      selectedProjectId &&
      !filteredProjects.some((project) => project.id === selectedProjectId)
    ) {
      setSelectedProjectId("");
    }
  }, [filteredProjects, selectedProjectId]);

  useEffect(() => {
    if (
      selectedNetworkSegmentId &&
      !filteredNetworkSegments.some((segment) => segment.id === selectedNetworkSegmentId)
    ) {
      setSelectedNetworkSegmentId("");
    }
  }, [filteredNetworkSegments, selectedNetworkSegmentId]);

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
            <Label htmlFor="projectInstallationId">Project</Label>
            <Select
              id="projectInstallationId"
              name="projectInstallationId"
              value={selectedProjectId}
              onChange={(event) => setSelectedProjectId(event.target.value)}
            >
              <option value="">No project assignment</option>
              {filteredProjects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name} · {project.organizationName}
                </option>
              ))}
            </Select>
            <FieldError errors={state.fieldErrors?.projectInstallationId} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="networkSegmentId">Network segment</Label>
            <Select
              id="networkSegmentId"
              name="networkSegmentId"
              value={selectedNetworkSegmentId}
              onChange={(event) => setSelectedNetworkSegmentId(event.target.value)}
            >
              <option value="">No segment assigned</option>
              {filteredNetworkSegments.map((segment) => (
                <option key={segment.id} value={segment.id}>
                  {segment.label}
                </option>
              ))}
            </Select>
            <FieldError errors={state.fieldErrors?.networkSegmentId} />
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
            <Label htmlFor="hostname">Hostname</Label>
            <Input
              id="hostname"
              name="hostname"
              defaultValue={initialValues?.hostname ?? ""}
              placeholder="mmg-nyc-core-sw1"
            />
            <FieldError errors={state.fieldErrors?.hostname} />
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
            <Label htmlFor="firmwareVersion">Firmware version</Label>
            <Input
              id="firmwareVersion"
              name="firmwareVersion"
              defaultValue={initialValues?.firmwareVersion ?? ""}
              placeholder="6.5.62"
            />
            <FieldError errors={state.fieldErrors?.firmwareVersion} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="vendorExternalId">Vendor external ID</Label>
            <Input
              id="vendorExternalId"
              name="vendorExternalId"
              defaultValue={initialValues?.vendorExternalId ?? ""}
              placeholder="unifi-device-01"
            />
            <FieldError errors={state.fieldErrors?.vendorExternalId} />
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
            <Label htmlFor="installedAt">Installed at</Label>
            <Input
              id="installedAt"
              name="installedAt"
              type="date"
              defaultValue={toDateInputValue(initialValues?.installedAt)}
            />
            <FieldError errors={state.fieldErrors?.installedAt} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="lastSeenAt">Last seen at</Label>
            <Input
              id="lastSeenAt"
              name="lastSeenAt"
              type="datetime-local"
              defaultValue={toDateTimeLocalValue(initialValues?.lastSeenAt)}
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

      <Card>
        <CardHeader>
          <CardTitle>Capacity &amp; PoE</CardTitle>
          <CardDescription>
            Optional switch capacity and powered-device metadata used by engineering rollups and upgrade reviews.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="switchRole">Switch role</Label>
            <Select
              id="switchRole"
              name="switchRole"
              defaultValue={initialValues?.switchRole ?? ""}
            >
              <option value="">Not specified</option>
              {switchRoleOptions.map((role) => (
                <option key={role} value={role}>
                  {formatEnumLabel(role)}
                </option>
              ))}
            </Select>
            <FieldError errors={state.fieldErrors?.switchRole} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="portCount">Port count</Label>
            <Input
              id="portCount"
              name="portCount"
              type="number"
              min={1}
              step="1"
              defaultValue={initialValues?.portCount ?? ""}
              placeholder="24"
            />
            <FieldError errors={state.fieldErrors?.portCount} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="usedPortCount">Used port count</Label>
            <Input
              id="usedPortCount"
              name="usedPortCount"
              type="number"
              min={0}
              step="1"
              defaultValue={initialValues?.usedPortCount ?? ""}
              placeholder="7"
            />
            <FieldError errors={state.fieldErrors?.usedPortCount} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="poeBudgetWatts">PoE budget (watts)</Label>
            <Input
              id="poeBudgetWatts"
              name="poeBudgetWatts"
              type="number"
              min={0}
              step="0.1"
              defaultValue={initialValues?.poeBudgetWatts ?? ""}
              placeholder="370"
            />
            <FieldError errors={state.fieldErrors?.poeBudgetWatts} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="poeUsedWatts">Measured PoE usage (watts)</Label>
            <Input
              id="poeUsedWatts"
              name="poeUsedWatts"
              type="number"
              min={0}
              step="0.1"
              defaultValue={initialValues?.poeUsedWatts ?? ""}
              placeholder="92.5"
            />
            <FieldError errors={state.fieldErrors?.poeUsedWatts} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="poeRequired">PoE required</Label>
            <Select
              id="poeRequired"
              name="poeRequired"
              defaultValue={
                typeof initialValues?.poeRequired === "boolean"
                  ? String(initialValues.poeRequired)
                  : ""
              }
            >
              <option value="">Not specified</option>
              <option value="true">Yes</option>
              <option value="false">No</option>
            </Select>
            <FieldError errors={state.fieldErrors?.poeRequired} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="estimatedPoeWatts">Estimated PoE draw (watts)</Label>
            <Input
              id="estimatedPoeWatts"
              name="estimatedPoeWatts"
              type="number"
              min={0}
              step="0.1"
              defaultValue={initialValues?.estimatedPoeWatts ?? ""}
              placeholder="12.5"
            />
            <FieldError errors={state.fieldErrors?.estimatedPoeWatts} />
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
