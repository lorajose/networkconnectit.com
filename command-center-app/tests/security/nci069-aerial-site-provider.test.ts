import assert from "node:assert/strict";
import test from "node:test";

import {
  createArcGISAerialSiteProvider,
  type AerialSiteCandidate,
} from "../../lib/contractor-os/aerial-site-provider";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

test("NCI-069 ArcGIS adapter geocodes with server-owned bearer token", async () => {
  let capturedUrl = "";
  let capturedAuthorization = "";

  const provider = createArcGISAerialSiteProvider({
    accessToken: "server-secret-token",
    fetchImpl: (async (input, init) => {
      capturedUrl = String(input);
      capturedAuthorization = new Headers(init?.headers).get("Authorization") ?? "";
      return jsonResponse({
        candidates: [{
          address: "421 E 155th St, Bronx, NY 10455",
          location: { x: -73.917, y: 40.819 },
          score: 99.4,
        }],
      });
    }) as typeof fetch,
  });

  const results = await provider.geocodeAddress({
    query: "421 E 155th St, Bronx, NY 10455",
    forStorage: true,
  });

  assert.equal(capturedAuthorization, "Bearer server-secret-token");
  assert.equal(capturedUrl.includes("server-secret-token"), false);
  assert.equal(capturedUrl.includes("forStorage=true"), true);
  assert.equal(capturedUrl.includes("outSR=4326"), true);
  assert.deepEqual(results, [{
    formattedAddress: "421 E 155th St, Bronx, NY 10455",
    latitude: 40.819,
    longitude: -73.917,
    score: 99.4,
  }] satisfies AerialSiteCandidate[]);
});

test("NCI-069 ArcGIS adapter does not leak provider errors or credentials", async () => {
  const provider = createArcGISAerialSiteProvider({
    accessToken: "do-not-leak-me",
    fetchImpl: (async () => jsonResponse({
      error: { message: "provider detail containing do-not-leak-me" },
    })) as typeof fetch,
  });

  await assert.rejects(
    () => provider.geocodeAddress({ query: "100 Main Street, New York, NY" }),
    (error: unknown) => {
      assert.equal(error instanceof Error, true);
      const message = error instanceof Error ? error.message : "";
      assert.equal(message.includes("do-not-leak-me"), false);
      assert.equal(message.includes("provider detail"), false);
      return true;
    }
  );
});

test("NCI-069 ArcGIS adapter rejects unusable coordinates and short addresses", async () => {
  const provider = createArcGISAerialSiteProvider({
    accessToken: "test-token",
    fetchImpl: (async () => jsonResponse({
      candidates: [
        { address: "Bad latitude", location: { x: -73, y: 100 }, score: 100 },
        { address: "Bad longitude", location: { x: -190, y: 40 }, score: 100 },
        { address: "Valid", location: { x: -73.9, y: 40.8 }, score: 95 },
      ],
    })) as typeof fetch,
  });

  await assert.rejects(() => provider.geocodeAddress({ query: "NY" }));

  const results = await provider.geocodeAddress({ query: "Bronx, New York" });
  assert.equal(results.length, 1);
  assert.equal(results[0].formattedAddress, "Valid");
});

test("NCI-069 imagery descriptor fails closed on attribution requirements", () => {
  const provider = createArcGISAerialSiteProvider({ accessToken: "test-token" });
  const basemap = provider.basemap();

  assert.equal(basemap.provider, "arcgis");
  assert.equal(basemap.style, "arcgis/imagery");
  assert.equal(basemap.attributionRequired, true);
  assert.match(basemap.attributionText, /Esri/i);
});
