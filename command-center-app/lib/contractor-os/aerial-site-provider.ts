export type AerialSiteCandidate = {
  formattedAddress: string;
  latitude: number;
  longitude: number;
  score: number;
};

export type AerialBasemapDescriptor = {
  provider: "arcgis";
  style: "arcgis/imagery";
  attributionRequired: true;
  attributionText: string;
};

export type AerialSiteProvider = {
  id: "arcgis";
  geocodeAddress(input: { query: string; forStorage?: boolean }): Promise<AerialSiteCandidate[]>;
  basemap(): AerialBasemapDescriptor;
};

type ArcGISCandidateResponse = {
  candidates?: Array<{
    address?: string;
    location?: { x?: number; y?: number };
    score?: number;
  }>;
  error?: { message?: string };
};

type FetchLike = typeof fetch;

const ARCGIS_GEOCODE_URL =
  "https://geocode-api.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates";

export function createArcGISAerialSiteProvider(input: {
  accessToken: string;
  fetchImpl?: FetchLike;
}): AerialSiteProvider {
  const accessToken = input.accessToken.trim();
  if (!accessToken) throw new Error("ArcGIS access token is required");

  const fetchImpl = input.fetchImpl ?? fetch;

  return {
    id: "arcgis",

    async geocodeAddress({ query, forStorage = false }) {
      const normalizedQuery = query.trim();
      if (normalizedQuery.length < 4) {
        throw new Error("A complete site address is required");
      }

      const url = new URL(ARCGIS_GEOCODE_URL);
      url.searchParams.set("f", "json");
      url.searchParams.set("singleLine", normalizedQuery);
      url.searchParams.set("outSR", "4326");
      url.searchParams.set("maxLocations", "5");
      url.searchParams.set("forStorage", forStorage ? "true" : "false");

      const response = await fetchImpl(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("ArcGIS geocoding is temporarily unavailable");
      }

      const body = (await response.json()) as ArcGISCandidateResponse;
      if (body.error) {
        throw new Error("ArcGIS geocoding request failed");
      }

      return (body.candidates ?? [])
        .map((candidate) => {
          const latitude = candidate.location?.y;
          const longitude = candidate.location?.x;
          if (
            typeof latitude !== "number" ||
            typeof longitude !== "number" ||
            !Number.isFinite(latitude) ||
            !Number.isFinite(longitude) ||
            latitude < -90 ||
            latitude > 90 ||
            longitude < -180 ||
            longitude > 180
          ) {
            return null;
          }

          return {
            formattedAddress: candidate.address?.trim() || normalizedQuery,
            latitude,
            longitude,
            score: typeof candidate.score === "number" && Number.isFinite(candidate.score)
              ? candidate.score
              : 0,
          } satisfies AerialSiteCandidate;
        })
        .filter((candidate): candidate is AerialSiteCandidate => candidate !== null);
    },

    basemap() {
      return {
        provider: "arcgis",
        style: "arcgis/imagery",
        attributionRequired: true,
        attributionText: "Powered by Esri; data attribution must remain visible.",
      };
    },
  };
}

export function createConfiguredAerialSiteProvider(input?: {
  accessToken?: string | null;
  fetchImpl?: FetchLike;
}) {
  const accessToken = input?.accessToken ?? process.env.ARCGIS_LOCATION_API_TOKEN ?? "";
  return createArcGISAerialSiteProvider({
    accessToken,
    fetchImpl: input?.fetchImpl,
  });
}
