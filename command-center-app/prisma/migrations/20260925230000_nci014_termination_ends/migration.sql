-- NCI-014 hardening: explicit A/B cable termination state.
-- Existing completed termination data is backfilled to both ends for compatibility.

ALTER TABLE ProjectWorkOrderItem
  ADD COLUMN terminatedEndA BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN terminatedEndB BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE ProjectWorkOrderItem
SET terminatedEndA=isTerminated, terminatedEndB=isTerminated;
