# VerifyWire Smart Contract Documentation

## Overview

The `VerifyWireRegistry` is a minimal, gas-efficient smart contract that stores cryptographic hashes of bank payment rails on the Doma Testnet, enabling privacy-preserving verification of payment instructions.

---

## Contract Interface

### Core Functions

#### Publish Payment Rails
```solidity
function publish(
    string memory lowercaseShortCode,
    bytes32 wireRoutingHash,
    bytes32 wireAccountHash,
    bytes32 achRoutingHash,
    bytes32 achAccountHash,
    bytes32 ibanHash,
    bytes32 bicHash
) external;
```

#### Query Records
```solidity
function getRecord(string memory lowercaseShortCode)
    external
    view
    returns (
        address owner,
        uint64 updatedAt,
        uint32 version,
        bytes32 wireRouting,
        bytes32 wireAccount,
        bytes32 achRouting,
        bytes32 achAccount,
        bytes32 iban,
        bytes32 bic
    );
```

---

## Data Storage Structure

### Per Short Code Record
```solidity
struct Record {
    address owner;          // Publisher wallet address
    uint64 updatedAt;       // Unix timestamp
    uint32 version;         // Incrementing version counter
    bytes32[6] hashes;      // [wireRouting, wireAccount, achRouting, achAccount, iban, bic]
}
```

### Event Logging
```solidity
event Published(
    string indexed shortCode,
    address indexed owner,
    uint32 version,
    uint64 timestamp,
    bytes32 wireRouting,
    bytes32 wireAccount,
    bytes32 achRouting,
    bytes32 achAccount,
    bytes32 iban,
    bytes32 bic
);
```

---

## Ownership Model

### First Publication
- Sets `owner = msg.sender` for the short code
- Creates initial record with version 1

### Subsequent Publications
- Must be called by current owner
- Increments version counter
- Updates timestamp

### Transfer Ownership
- Owner can transfer control via `transferOwnership(newOwner)`
- Only current owner can transfer

---

## Short Code Requirements

### Format Rules
- Must be lowercase ASCII
- Frontend normalizes to lowercase before calling contract
- Case-insensitive for user input but stored as lowercase

### Uniqueness
- Short codes are globally unique
- First publisher claims the short code
- No short code can be reused by different owners

---

## Deployment Guide

### Prerequisites
- Foundry installed: `foundryup`
- Project structure:
  - `src/VerifyWireRegistry.sol`
  - `script/Deploy.s.sol`
  - `foundry.toml`

### Environment Variables
```bash
DOMA_RPC_URL=https://rpc-testnet.doma.xyz
PRIVATE_KEY=0x... # Your test wallet private key
```

### Deploy Command
```bash
source .env
forge script script/Deploy.s.sol \
  --rpc-url "$DOMA_RPC_URL" \
  --broadcast \
  --chain 97476 \
  --gas-limit 8000000
```

### Record Deployment
After deployment, record the contract address in:
```json
// /verifywire/contracts/deployments/doma-testnet.json
{
  "VerifyWireRegistry": "0xYOUR_DEPLOYED_ADDRESS"
}
```

---

## Frontend Integration

### Publishing Flow

#### Integration Point
Hook into the **Review & Sign** page after signature validation, before redirect to Share page.

#### Implementation Steps
1. Load rails draft from localStorage
2. Normalize fields using standard rules
3. Hash each field with keccak256
4. Submit transaction via MetaMask
5. Store transaction hash for Share page

#### Example Code
```javascript
import { ethers } from "https://cdn.jsdelivr.net/npm/ethers@6.13.2/dist/ethers.min.js";

const REGISTRY_ADDR = "0x..."; // Deployed contract address
const ABI = [
    "function publish(string,bytes32,bytes32,bytes32,bytes32,bytes32,bytes32)",
    "function getRecord(string) view returns (address,uint64,uint32,bytes32,bytes32,bytes32,bytes32,bytes32,bytes32)"
];

// Normalization functions
function digitsOnly(s = "") { return (s || "").replace(/\D/g, ""); }
function upperNoSpaces(s = "") { return (s || "").replace(/\s+/g, "").toUpperCase(); }
const hash = (s) => ethers.keccak256(ethers.toUtf8Bytes(s || ""));

async function publishRails(shortCode, rails) {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const registry = new ethers.Contract(REGISTRY_ADDR, ABI, signer);

    const normalizedShortCode = (shortCode || "").toLowerCase();

    const tx = await registry.publish(
        normalizedShortCode,
        hash(digitsOnly(rails.wire?.routing)),
        hash(digitsOnly(rails.wire?.account)),
        hash(digitsOnly(rails.ach?.routing)),
        hash(digitsOnly(rails.ach?.account)),
        hash(upperNoSpaces(rails.international?.iban)),
        hash(upperNoSpaces(rails.international?.bic))
    );

    const receipt = await tx.wait();
    return receipt.hash;
}
```

### Share Page Updates
- Read `vw_publish_tx` from localStorage
- Display transaction link to Doma Explorer:
  ```
  https://explorer-testnet.doma.xyz/tx/${txHash}
  ```

---

## Verification Implementation

### UI Structure
- Large textarea for payment instruction text
- Bank short code selector
- Result display with clear status indicators

### Identifier Extraction (Regex Patterns)
```javascript
const patterns = {
    routing: /\b\d{9}\b/,                    // ABA routing number
    account: /\b\d{6,}\b/,                   // US account (6+ digits)
    iban: /\b[A-Z]{2}\d{2}[A-Z0-9]{11,30}\b/i,  // IBAN format
    bic: /\b[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?\b/i  // BIC/SWIFT
};
```

### Verification Flow
1. Extract payment identifiers from pasted text
2. Normalize extracted values
3. Hash normalized values with keccak256
4. Query on-chain record for selected bank
5. Compare hashes for each rail type
6. Generate clear result explanations

### Result Logic

#### ✅ Green (Safe)
- At least one strong identifier match
- No contradictory information
- All present identifiers have corresponding attested rails

#### 🟡 Yellow (Caution)
- Unusual combinations (e.g., IBAN present but bank only has US rails)
- Partial information matches
- Ambiguous or incomplete data

#### 🔴 Red (Block)
- Payment identifiers present but no matches to attested rails
- Clear mismatch with bank's published rails
- Potential fraud indicator

### Result Explanations
- "Routing `026009593` matches **Wells Fargo US Wires**"
- "Account `...6789` matches **ACH transfers**"
- "IBAN present but no international rails attested (⚠️ verify manually)"

---

## Files

- **Contract Source**: `onchain/src/VerifyWireRegistry.sol`
- **Deployment Script**: `onchain/script/Deploy.s.sol`
- **Configuration**: `onchain/foundry.toml`
- **Frontend Integration**: `assets/js/pages/onboarding-review.js`
- **Verification Logic**: `assets/js/pages/check.js`