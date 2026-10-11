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

## Provider decision gate
Before implementation select one provider and record:
- geocoding API terms;
- static/interactive imagery terms;
- attribution rules;
- caching/storage restrictions;
- commercial pricing/rate limits;
- export/screenshot rights.

No provider is considered approved until licensing is documented.

## Proposed flow
1. User selects organization/project/site.
2. Enter/search address.
3. Server/provider resolves coordinates.
4. User confirms location.
5. Aerial background loads as locked reference layer.
6. User confirms orientation/scale or calibrates.
7. User places outdoor cameras/devices/pathways using existing Design Studio tools.
8. Save only provider-safe metadata plus Design Studio geometry.

## Acceptance mapping
- Address/geocode flow: pending implementation.
- Provider terms/licensing: design-time blocker.
- Lock orientation/scale: reuse Design Studio calibration/layer primitives.
- Attribution: explicit provider requirement.
- Outdoor placement: reuse existing Design Studio canvas/device tools.

## Non-goals
- GIS-grade surveying.
- Property-boundary certification.
- Hidden removal of provider attribution.
- DXF/GIS import expansion under this ticket.
