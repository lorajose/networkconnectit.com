import Link from "next/link";

import { DeviceImportWorkbench } from "@/components/management/device-import-workbench";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth";
import { getDeviceImportBootstrap } from "@/lib/management/device-import";
import { requireInventoryWriteAccess } from "@/lib/management/tenant";

export default async function DeviceImportPage() {
  const user = requireInventoryWriteAccess(await requireUser());
  const bootstrap = await getDeviceImportBootstrap(user);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Devices"
        title="Bulk Device Import"
        description="Import cameras, NVRs, switches, access points, and other field devices from CSV with tenant-safe validation, preview, and NVR channel mapping support."
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
            label: "Import"
          }
        ]}
        actions={
          <>
            <Button variant="outline" asChild>
              <Link href="/devices/new">New device</Link>
            </Button>
            <Button variant="ghost" asChild>
              <Link href="/devices">Back to devices</Link>
            </Button>
          </>
        }
      />

      <DeviceImportWorkbench {...bootstrap} />
    </div>
  );
}
