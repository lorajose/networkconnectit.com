# NCI-049 — Contractor OS Design Studio Architecture

## Decision

Design Studio is an integrated Contractor OS domain inside the existing Command Center application. It is not a separate product or data silo.

The product workflow is:

Bid → Design Studio → Takeoff/BOM → Cost Engine → Estimate → Scope/Risk → Proposal → Project Installation → Commissioning/As-Built.

Design-derived quantities and recommendations are evidence. They never silently overwrite authoritative Takeoff overrides, Estimate quantities, unit costs, sell prices, approvals, or project records.

## Product boundary

Design Studio owns spatial security-system design and the evidence generated from it:

- design projects and floor/level canvases
- imported floor-plan backgrounds
- scale calibration
- walls, obstacles, guides and spatial annotations
- discipline layers
- placed security/network devices
- camera orientation and coverage geometry
- cable paths and measured lengths
- design connections and network topology source data
- design versions and snapshots
- design-derived takeoff suggestions

Existing Contractor OS domains remain authoritative for:

- BidWorkspace: bid package/document intake
- TakeoffWorkspace: contractor-approved counted quantities and overrides
- Estimate: commercial quantities, costs, pricing and margin
- Scope Risk: advisory scope/quantity/risk findings and human decisions
- Proposal: client-facing commercial document and approval lifecycle
- ProjectInstallation: awarded work and field execution

## Core domain model

### DesignProject
Tenant-owned design container. May link to BidWorkspace, TakeoffWorkspace, Estimate and ProjectInstallation, but none are mandatory at creation.

Fields planned:
- id
- organizationId
- name
- status
- bidWorkspaceId?
- takeoffWorkspaceId?
- estimateId?
- projectInstallationId?
- currentVersionId?
- createdByUserId
- createdAt / updatedAt

### DesignFloor
One level, floor, site image or exterior area inside a DesignProject.

Fields planned:
- id
- organizationId
- designProjectId
- name
- levelOrder
- backgroundAssetId?
- width / height in design coordinates
- scaleUnit
- scaleRatio
- calibration metadata

### DesignLayer
Logical visibility/editability grouping.

Initial disciplines:
- CCTV
- ACCESS_CONTROL
- INTRUSION
- NETWORK
- PATHWAY
- ANNOTATION

Layers are not security boundaries by themselves; authorization remains project/tenant based.

### DesignElement
Generic spatial entity persisted independently from renderer implementation.

Element kinds include:
- DEVICE
- WALL
- OBSTACLE
- CABLE_PATH
- TEXT
- DIMENSION
- ZONE
- GUIDE

Geometry is stored in normalized design coordinates and versioned JSON payloads with schemaVersion. This avoids coupling persisted data to any specific canvas library.

### DesignDevice
Placed device instance linked optionally to DeviceCatalogItem.

Stores placement-specific information such as position, rotation, mounting height, lens/focal override, IP assignment, notes and custom properties. Catalog specifications are referenced/snapshotted so historical designs do not change when catalog data is updated.

### DesignConnection
Logical connection between design devices/endpoints.

Examples:
- CAMERA → SWITCH
- SWITCH → NVR
- READER → ACCESS_PANEL
- AP → SWITCH

Connections can reference one or more cable paths and provide source data for topology generation.

### DesignCablePath
Polyline/path geometry with cable type, endpoints, waypoint coordinates, measured design length, slack factor and calculated installation length.

Cable quantities generated here feed Takeoff as suggestions/evidence, never as silent authoritative changes.

### DesignVersion
Immutable design snapshot containing a canonical serialization hash, author and reason. Autosave may update working state, while explicit/version checkpoints produce immutable restore points.

## Rendering architecture

The persisted domain must remain renderer-agnostic.

Recommended browser architecture:

1. Server Components load tenant-authorized project metadata and initial design state.
2. A client-only DesignCanvas component owns high-frequency pointer/zoom/pan interactions.
3. Geometry/calculation functions live in pure TypeScript modules with deterministic tests.
4. Canvas rendering library is an adapter behind our own interfaces. Candidate evaluation for NCI-050 should compare Konva/react-konva, Fabric.js and custom SVG/Canvas approaches for mobile performance, hit testing, transforms, large floor plans and export needs.
5. Heavy PDF/DXF parsing and export may use backend workers/server endpoints; interactive geometry remains local for responsiveness.

Do not persist framework-specific node trees as the source of truth.

## Coordinate and measurement system

Use a stable design coordinate space independent of CSS pixels and device pixel ratio.

Each floor stores calibration mapping between design units and real-world units. All length calculations derive from this calibration. Zoom is a view transform only and cannot affect measurements.

Geometry calculations must be deterministic and testable without rendering.

## Camera coverage architecture

NCI-055 owns the camera FOV geometry engine. Inputs should include:
- sensor/resolution metadata where available
- horizontal/vertical FOV or lens/sensor inputs
- camera position
- rotation/heading
- mounting height
- target plane/height assumptions
- max visualization range

Outputs are geometry primitives suitable for any renderer.

NCI-056 adds DORI/PPM overlays on top of the same engine. Standards/threshold profiles must be explicit and versioned rather than hard-coded into rendered polygons.

NCI-057 extends the model for IR and PTZ behavior.

## Device catalog architecture

Device catalog data is a separate tenant-aware domain from placed devices.

Sources:
- curated internal catalog
- tenant private library
- licensed manufacturer/distributor feeds
- user-created custom devices

Every external catalog record must retain provenance/source metadata and licensing status. We must not scrape or copy a competitor's proprietary device database.

Placed devices store a specification snapshot/version reference for historical reproducibility.

## Integration contracts

### Bid → Design
A DesignProject can be created from a BidWorkspace and inherit document references. Imported design backgrounds are stored as private tenant assets.

### Design → Takeoff
Design Studio produces a DesignTakeoffSuggestion payload with stable source references, category, item/device identity, quantity/length, floor and evidence. A human explicitly imports/reconciles these into TakeoffWorkspace.

### Design → Estimate
No direct automatic pricing write. Commercial flow should pass through Takeoff/BOM and existing Cost Engine. A future explicit shortcut may create draft Estimate evidence, but cannot overwrite approved values.

### Design → Scope Risk
Analyzer can compare design-derived counts/evidence against Takeoff and Estimate to flag conflicts.

### Design → Proposal
Proposal can include approved plan images, coverage summaries, topology diagrams and accepted commercial scope. Proposal generation must respect approval policies.

### Design → Project Installation
When awarded, approved design/version can be linked as installation baseline. Field changes create new versions rather than mutating the awarded snapshot.

## Tenant isolation and authorization

Every Design Studio persistence table carries organizationId.

Rules:
- SUPER_ADMIN / INTERNAL_ADMIN may select organization context.
- CLIENT_ADMIN is tenant-scoped and may only read/write its organization.
- VIEWER access is read-only only if/when explicitly enabled by route policy; no implicit design edit permission.
- every direct-ID lookup must include organizationId
- linked Bid/Takeoff/Estimate/Project IDs must be verified to belong to the same tenant
- private background assets and exports must be resolved through tenant-safe storage paths/keys

## Persistence strategy

Phase 1 uses the existing MySQL/Prisma infrastructure. High-interaction design state should be normalized enough for search/linkage while complex geometry uses versioned JSON payloads.

Proposed tables:
- DesignProject
- DesignFloor
- DesignLayer
- DesignElement
- DesignDevice
- DesignConnection
- DesignCablePath
- DesignVersion
- DesignAsset
- DeviceCatalogItem
- DeviceCatalogRevision

Raw SQL migrations may be used consistently with existing commercial modules until Prisma schema representation is intentionally reconciled.

## Autosave and versioning

Working edits use debounced autosave with optimistic revision numbers to prevent last-write-wins data loss.

Explicit checkpoints produce immutable DesignVersion snapshots with:
- canonical JSON snapshot
- SHA-256 hash
- createdByUserId
- createdAt
- reason/source

Restore creates a new working revision based on an old snapshot; historical versions remain immutable.

## Offline/local-only boundary

Full zero-knowledge/local-only mode is not part of the first implementation. NCI-071 will define whether encrypted local-only projects can coexist with server-backed Contractor OS workflows. The core domain should avoid assumptions that make this impossible later.

## Feature rollout

### Phase A — Design Foundation
NCI-049, NCI-050, NCI-051, NCI-052, NCI-061, NCI-063.

### Phase B — CCTV Intelligence
NCI-053, NCI-054, NCI-055, NCI-056, NCI-057.

### Phase C — Infrastructure & Commercial Handoff
NCI-058, NCI-059, NCI-060, NCI-062, NCI-065.

### Phase D — Enterprise/Growth
NCI-064, NCI-066, NCI-067, NCI-068, NCI-069, NCI-070, NCI-071, NCI-072, NCI-073.

## Backward compatibility

Existing Bid, Takeoff, Estimate, Scope Risk, Proposal and Project flows continue working with no DesignProject present. All Design Studio links are nullable initially. No migration should require existing commercial records to be backfilled.

## Acceptance decisions

- Design Studio is integrated into Contractor OS, not deployed as a separate application.
- Persistence is renderer-agnostic.
- Tenant isolation is mandatory on every persisted design entity and direct-ID access path.
- Design data is evidence until explicitly reconciled into authoritative commercial records.
- Immutable snapshots/version hashes are required for auditable design history.
- Existing commercial workflows remain backward compatible.
