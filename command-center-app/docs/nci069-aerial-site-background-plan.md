# NCI-069 — Aerial / Satellite Site Background by Address

## Goal
Allow an outdoor Design Studio project to start from an address-based aerial/satellite background without weakening tenant isolation, scale accuracy, licensing compliance, or export rules.

## V1 scope
- Address input resolves to a normalized site location.
- Provider imagery is treated as a background/reference layer, never as authoritative survey geometry.
- Orientation and scale can be locked after user confirmation.
- Existing Design Studio device/camera placement works on top of the map background.
- Provider attribution remains visible wherever terms require it.
- Existing calibrated geometry remains the source of truth for distance/cable calculations.

## Architecture constraints
- Geocoding/map provider credentials remain server-owned where possible.
- Do not persist third-party imagery beyond provider terms.
- Do not strip required attribution from screenshots/exports.
- Tenant/project identifiers remain server scoped.
- Any provider-specific cache/persistence policy must be documented before implementation.

## Provider decision — V1
Preferred provider: **ArcGIS Location Platform / Esri**, subject to final account setup and production credential approval.

Reasons:
- ArcGIS basemap services support commercial application use under paid usage terms.
- ArcGIS Location Platform terms expressly permit Resultant Output in static, unalterable final formats such as PDF, GIF, JPEG and HTML, provided applicable attribution is preserved.
- Esri provides satellite/aerial imagery basemaps suitable for outdoor site context.
- Required Esri/data attribution can be retrieved and displayed with static map output.
- This better matches Contractor OS's requirement to generate client-facing static design/report artifacts than providers whose terms more strongly restrict derived/exported map content.

### Geocoding/storage policy
- Prefer a stored-geocode-capable ArcGIS location service configuration when the project must retain coordinates across sessions.
- Persist only provider-permitted geocode/location metadata needed to reopen the project.
- Never persist raw basemap tile/image payloads as long-lived Contractor OS assets unless the provider terms for the selected service explicitly permit it.
- Store the user's normalized project/site address separately from provider-derived map content.

### Imagery/rendering policy
- Treat ArcGIS imagery as a licensed visual reference layer only.
- Do not trace property boundaries or claim survey accuracy from the basemap.
- Design Studio geometry, user calibration and field measurements remain authoritative for cable/path/device calculations.
- Attribution must remain visible in interactive views and in any static client-facing output containing the basemap.
- Static exported output containing Esri basemap imagery must remain a final, non-editable rendered artifact.

### Credentials
- ArcGIS API keys/tokens are environment secrets and must never be committed to the repository.
- Browser-exposed credentials, if required by the selected SDK/service, must use the narrowest possible scopes/restrictions.
- Server-side calls are preferred for geocoding and any operation involving sensitive credentials.

## Proposed flow
1. User selects organization/project/site.
2. Enter/search address.
3. Server-side ArcGIS geocoding resolves candidate coordinates.
4. User confirms the intended site location.
5. ArcGIS aerial/satellite basemap loads as a locked reference layer with attribution.
6. User confirms orientation/scale or calibrates using Design Studio controls.
7. User places outdoor cameras/devices/pathways using existing Design Studio tools.
8. Persist only provider-permitted location metadata plus Contractor OS geometry.
9. Exported client artifacts preserve required Esri/data attribution.

## Acceptance mapping
- Address/geocode flow: pending implementation.
- Provider terms/licensing decision: **resolved for V1 architecture — ArcGIS Location Platform preferred**.
- Production account/API credential approval: pending.
- Lock orientation/scale: reuse Design Studio calibration/layer primitives.
- Attribution: mandatory in interactive and exported views containing provider imagery.
- Outdoor placement: reuse existing Design Studio canvas/device tools.
- Static report compatibility: provider terms reviewed for final static PDF/JPEG-style output; implementation must preserve attribution.
- Tenant isolation: provider calls must not weaken existing organization/project authorization boundaries.

## Implementation slices
### NCI-069A — Provider adapter
- Introduce provider-neutral interfaces for forward geocode and aerial basemap metadata.
- Add ArcGIS implementation behind server-side configuration.
- No provider token in source control.

### NCI-069B — Site location model
- Add tenant-scoped persisted site map metadata: confirmed latitude/longitude, zoom/scale metadata, orientation and provider identifier.
- Do not persist raw imagery unless separately approved.

### NCI-069C — Design Studio aerial layer
- Load imagery as a locked background/reference layer.
- Preserve provider attribution.
- Reuse existing device/path/layer interactions.

### NCI-069D — Export policy
- Ensure PDF/static design exports containing the aerial layer preserve required attribution.
- Keep exported map-bearing reports final/non-editable.
- Add tests preventing attribution removal in provider-backed exports.

### NCI-069E — Security/QA
- Cross-tenant access tests.
- Missing/invalid provider credential tests.
- Provider outage/fallback behavior.
- Address ambiguity confirmation tests.
- Attribution regression tests.

## Non-goals
- GIS-grade surveying.
- Property-boundary certification.
- Hidden removal of provider attribution.
- DXF/GIS import expansion under this ticket.
- Long-term storage or resale of third-party basemap imagery.
- Treating provider imagery as authoritative measurement geometry.
