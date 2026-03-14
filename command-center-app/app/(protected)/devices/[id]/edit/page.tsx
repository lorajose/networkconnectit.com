import { notFound } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import { DeviceForm } from "@/components/management/device-form";
import { requireUser } from "@/lib/auth";
import { getDeviceForEdit, getDeviceFormOptions } from "@/lib/management/devices";
import { isGlobalAccessUser, requireInventoryWriteAccess } from "@/lib/management/tenant";
import { toDateTimeLocalValue } from "@/lib/utils";

import { updateDeviceAction } from "../../actions";

type EditDevicePageProps = {
  params: {
    id: string;
  };
};

export default async function EditDevicePage({ params }: EditDevicePageProps) {
  const user = requireInventoryWriteAccess(await requireUser());
  const [device, options] = await Promise.all([
    getDeviceForEdit(user, params.id),
    getDeviceFormOptions(user)
  ]);

  if (!device) {
    notFound();
  }

  const action = updateDeviceAction.bind(null, device.id);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Devices"
        title={`Edit ${device.name}`}
        description="Update inventory metadata, monitoring mode, and the linked site within your accessible scope."
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
            label: device.name,
            href: `/devices/${device.id}`
          },
          {
            label: "Edit"
          }
        ]}
      />

      <DeviceForm
        action={action}
        submitLabel="Save changes"
        organizations={options.organizations}
        sites={options.sites}
        projects={options.projects}
        networkSegments={options.networkSegments}
        lockOrganization={!isGlobalAccessUser(user)}
        initialValues={{
          ...device,
          type: device.type,
          status: device.status,
          monitoringMode: device.monitoringMode,
          lastSeenAt: toDateTimeLocalValue(device.lastSeenAt)
        }}
      />
    </div>
  );
}
