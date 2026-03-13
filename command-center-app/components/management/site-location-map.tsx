import dynamic from "next/dynamic";

import { LoadingState } from "@/components/dashboard/loading-state";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";

const SiteLocationMapClient = dynamic(
  () => import("@/components/management/site-location-map-client"),
  {
    ssr: false,
    loading: () => (
      <LoadingState
        title="Map loading"
        description="Preparing OpenStreetMap for this site."
        className="m-5"
      />
    )
  }
);

type SiteLocationMapProps = {
  title: string;
  location: string;
  latitude: number | null;
  longitude: number | null;
};

export function SiteLocationMap({
  title,
  location,
  latitude,
  longitude
}: SiteLocationMapProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Location map</CardTitle>
        <CardDescription>Site coordinates rendered with OpenStreetMap.</CardDescription>
      </CardHeader>
      <CardContent>
        {latitude === null || longitude === null ? (
          <div className="rounded-3xl border border-dashed border-border/70 bg-background/30 px-5 py-10 text-sm text-muted-foreground">
            Latitude and longitude have not been set for this site yet.
          </div>
        ) : (
          <SiteLocationMapClient
            coordinates={[latitude, longitude]}
            title={title}
            location={location}
          />
        )}
      </CardContent>
    </Card>
  );
}
