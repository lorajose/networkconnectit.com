# NCI-025 — Camera Placement Advisor Positioning

## V1 decision
Do not label deterministic client-side rules as AI.

Ship the current capability as a Smart Camera Placement Advisor / rule-based design assistant unless a genuine model-backed workflow is later implemented and evaluated.

## Product rules
- Explain recommendations in terms of explicit inputs/rules where practical.
- Do not imply computer vision, learned placement, autonomous engineering or model inference that is not present.
- Preserve useful deterministic guidance because it is fast, predictable and testable.
- A future AI mode must have a separate contract, evaluation criteria and fallback.

## QA
Website/product copy and UI labels must match actual behavior.