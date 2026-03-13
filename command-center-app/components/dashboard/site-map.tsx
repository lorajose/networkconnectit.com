import dynamic from "next/dynamic";

import { DashboardSection } from "@/components/dashboard/dashboard-section";
import { FilterRowPlaceholder } from "@/components/dashboard/filter-row-placeholder";
import { LoadingState } from "@/components/dashboard/loading-state";
import type { DashboardSnapshot, FilterToken } from "@/lib/dashboard/types";

const SiteMapClient = dynamic(
  () => import("@/components/dashboard/site-map-client"),
  {
    ssr: false,
    loading: () => (
      <LoadingState
        title="Map loading"
        description="Preparing OpenStreetMap layers and site markers."
        className="m-5"
      />
    )
  }
);

type SiteMapProps = {
  map: DashboardSnapshot["map"];
  filters: readonly FilterToken[];
};

export function SiteMap({ map, filters }: SiteMapProps) {
  return (
    <DashboardSection
      title={map.title}
      description={map.description}
      action={<FilterRowPlaceholder filters={filters} label="Map filters" />}
      contentClassName="p-5"
    >
      <SiteMapClient map={map} />
    </DashboardSection>
  );
}
