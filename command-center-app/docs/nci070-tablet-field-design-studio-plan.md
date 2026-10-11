# NCI-070 — Tablet & Field Design Studio

## Goal
Make Design Studio practical on iPad/tablet/phone without changing the authoritative server-side tenant, review, or entitlement model.

## Priority
P1. This is the highest-value field-operations follow-up because NCI-073 already requires iPad/browser runtime evidence.

## V1 interaction contract
- Minimum touch targets suitable for field use.
- One-finger select/drag; two-finger pan/zoom.
- Rotation uses explicit handle/control instead of fragile gesture-only behavior.
- Cable waypoint add/move/delete works without hover.
- Inspector collapses to drawer/sheet on constrained widths.
- Canvas always retains a usable working area.
- Save/sync state is visible: Saved / Saving / Offline / Retry required.

## Offline/intermittent-network policy
V1 should be resilient, not silently offline-authoritative:
- local pending edits may be queued temporarily;
- server remains canonical after successful sync;
- unsynced state must be visible;
- navigation/close with unsynced changes must warn;
- conflict behavior must be explicit before enabling background replay.

Do not market full offline mode until a conflict-safe persistence design exists.

## Test matrix
- iPad Safari.
- iPhone Safari / narrow mobile viewport.
- Android Chrome tablet/phone where available.
- Desktop Chrome/Edge/Safari regression.
- Touch waypoint editing.
- Touch rotate/zoom/pan.
- Responsive inspector.
- Network interruption during edit/save.
- Reload with pending/failed sync.

## Dependency
Build on NCI-073 exact Design Studio behavior; do not fork a second mobile canvas implementation.
