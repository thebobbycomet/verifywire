# VerifyWire Architecture

## Overview

VerifyWire is a lean, privacy-first system for on-chain bank rail verification that eliminates BEC fraud by enabling mathematical verification of payment instructions against bank-attested records.

---

## Core Flow

### 1. Bank Onboarding (Frontend)
Bank enters payment rails → Build canonical JSON → Get wallet signature for audit trail

### 2. Publish (On-Chain)
Normalize each rail field → Hash with **keccak256** → Call `VerifyWireRegistry.publish(...)`

### 3. Verify (Paste-to-Check)
User pastes text → Extract identifiers → Normalize → keccak256 → Compare to on-chain hashes → ✅/🟡/🔴

---

## On-Chain Data Storage

### Per Short Code
- **Hash Fields** (all `bytes32`):
  - `wireRoutingHash`, `wireAccountHash`
  - `achRoutingHash`, `achAccountHash`
  - `ibanHash`, `bicHash`
- **Metadata**:
  - `owner` (publisher wallet address)
  - `version` (incrementing counter)
  - `updatedAt` (timestamp)

### Event Logging
```solidity
event Published(string shortCode, uint32 version, uint64 timestamp, bytes32[6] hashes);
```

---

## Out-of-Scope (MVP)
- No plaintext rail storage
- No JSON blobs on-chain
- No IPFS integration
- No complex data structures

---

## Frontend Architecture

### Existing Pages
- `/index.html` – Landing page with modals
- `/onboarding/claim.html` – Bank claim interface
- `/onboarding/connect.html` – MetaMask connection + Doma testnet setup
- `/onboarding/add-rails.html` – Payment rails form with validation
- `/onboarding/review.html` – Canonical JSON preview + SHA-256 signature
- `/onboarding/share.html` – Signed receipt + transaction display
- `/dashboard.html` – Bank dashboard for entity management

### Core Verification Page
- `/check/index.html` – Textarea for payment instructions → Result analysis → Clear explanations

---

## Security Model

### Privacy-First Design
- Only cryptographic hashes stored on-chain
- No sensitive financial data exposed
- Mathematical verification without data disclosure

### Trust Minimization
- Banks attest their own rails
- Immutable on-chain records
- Zero-trust verification process
