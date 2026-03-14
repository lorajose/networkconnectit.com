import { PageHeader } from "@/components/page-header";
import { DeviceForm } from "@/components/management/device-form";
import { requireUser } from "@/lib/auth";
import { getDeviceFormOptions } from "@/lib/management/devices";
import { isGlobalAccessUser, requireInventoryWriteAccess } from "@/lib/management/tenant";

import { createDeviceAction } from "../actions";

export default async function NewDevicePage() {
  const user = requireInventoryWriteAccess(await requireUser());
  const options = await getDeviceFormOptions(user);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Devices"
        title="Create device"
        description="Register a new device inside an accessible organization and site."
        breadcrumbs={[
          {
            label: "Command Center",
            href: "/dashboard"
          },
          {
            label: "Devices",
            href: "/devices"
          },
          {
            label: "New"
          }
        ]}
      />

      <DeviceForm
        action={createDeviceAction}
        submitLabel="Create device"
        organizations={options.organizations}
        sites={options.sites}
        projects={options.projects}
        networkSegments={options.networkSegments}
        lockOrganization={!isGlobalAccessUser(user)}
        initialValues={{
          organizationId:
            user.organizationId ?? options.organizations[0]?.id ?? null,
          type: "CAMERA",
          status: "UNKNOWN",
          monitoringMode: "ACTIVE"
        }}
      />
    </div>
  );
}
