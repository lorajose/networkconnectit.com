# NCI-013 Site Survey connectivity behavior

The Site Survey Studio is mobile-first and uses normal authenticated server actions for durable writes.

## Poor connectivity contract

- The UI must never claim that a checklist response, photo, measurement, room, or survey point is saved until the server action succeeds.
- Camera capture can occur on the device, but the evidence is not part of the project record until upload completes and the private-storage metadata row is persisted.
- If connectivity drops before submission, the technician should keep the browser page open and retry the affected action when service returns.
- The current V1 intentionally does not provide background synchronization or an offline mutation queue. This avoids duplicate writes and false completion state.
- Required checklist items are revalidated on the server before a survey can be completed, so a locally visible but unsaved field change cannot satisfy the completion gate.
- Direct-ID asset reads remain authenticated and tenant/assignment scoped; cached public photo URLs are not used.

## Future enhancement

A service-worker-backed draft queue may be added later only with idempotency keys, conflict handling, encrypted local storage for sensitive evidence, visible sync state, and server acknowledgement before completion.
