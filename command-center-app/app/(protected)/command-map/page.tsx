import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import { MetricCard } from "@/components/dashboard/metric-card";
import { CommandMapConsole } from "@/components/command-map/command-map-console";
import { CommandMapFilterBar } from "@/components/command-map/command-map-filter-bar";
import { requireRoles } from "@/lib/auth";
import {
  getCommandMapSnapshot,
  parseCommandMapFilters
} from "@/lib/command-map/service";
import { routeAccess, roleLabels } from "@/lib/rbac";

type CommandMapPageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

export default async function CommandMapPage({
  searchParams = {}
}: CommandMapPageProps) {
  const user = await requireRoles(routeAccess.commandMap);
  const filters = parseCommandMapFilters(searchParams);
  const snapshot = await getCommandMapSnapshot(user, filters);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Global NOC"
        title={snapshot.title}
        description={snapshot.subtitle}
        breadcrumbs={snapshot.breadcrumbs}
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="outline">Internal operations only</Badge>
            <Badge>{roleLabels[user.role]}</Badge>
          </div>
        }
      />

      <section className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
        {snapshot.metrics.map((metric) => (
          <MetricCard key={metric.id} metric={metric} />
        ))}
      </section>

      <CommandMapFilterBar snapshot={snapshot} />

      <CommandMapConsole snapshot={snapshot} />
    </div>
  );
}
