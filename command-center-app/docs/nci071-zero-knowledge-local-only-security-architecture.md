# NCI-071 — Zero-Knowledge / Local-Only Security Architecture

## Goal
Evaluate stronger privacy modes for sensitive floor plans/security layouts without making unverified security claims.

## Threat model
Protect against:
- cloud/operator access to customer floor plans;
- exposure of device placement/security layouts;
- credential leakage;
- unauthorized share-link access;
- storage-provider compromise;
- lost/stolen field device;
- tenant crossover;
- backup/export leakage.

## Architectures to evaluate

### A. Current server-encrypted/private storage
Server can process content; strongest compatibility with collaboration, export, search and recovery.

### B. Client-side encrypted cloud storage
Browser/device encrypts project payload before upload. Server stores ciphertext.
Open questions:
- metadata leakage;
- multi-user key sharing;
- key rotation/revocation;
- recovery;
- server-side export/search incompatibility.

### C. Zero-knowledge project vault
Server cannot decrypt protected project content.
Tradeoff: major redesign for collaboration, thumbnails, exports, server-side analysis and support.

### D. Local-only project mode
Project never cloud-autosaves by default.
Tradeoff: backup, device loss, multi-device access and collaboration become user responsibilities.

## Required design decisions
- key derivation and storage;
- device trust/bootstrap;
- organization member key distribution;
- lost-key recovery policy;
- collaborator revocation;
- encrypted attachment handling;
- export/decryption boundary;
- offline backup strategy;
- auditability without exposing content.

## Security rule
No "zero-knowledge", "end-to-end encrypted", or equivalent marketing claim may ship until implementation and threat assumptions are independently verified.

## Recommendation
Treat NCI-071 as architecture/research first. Do not put it on the V1 release critical path.
