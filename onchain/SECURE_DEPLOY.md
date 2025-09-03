# 🔐 Secure Contract Deployment Guide

Deploy VerifyWire Registry without exposing your private key!

## 🚀 Option 1: Environment Variable (Recommended)

Run this command directly in your terminal:

```bash
cd /verifywire/onchain
PRIVATE_KEY=your_private_key_here forge script script/Deploy.s.sol --rpc-url https://rpc-testnet.doma.xyz --broadcast --chain 97476
```

## 🚀 Deployment Command

```bash
cd /verifywire/onchain
PRIVATE_KEY=your_private_key_here forge script script/Deploy.s.sol --rpc-url https://rpc-testnet.doma.xyz --broadcast --chain 97476
```

## 🔑 Getting Your Private Key

**SECURITY WARNING:** Only export private keys when absolutely necessary for development/testing. Never share them or store them insecurely.

For testnet deployment:
1. Use a dedicated test wallet/address
2. Export private key only when needed
3. Delete the exported key immediately after use
4. Never use mainnet private keys for testing

## 💰 Funding Your Wallet

Before deploying, fund your wallet:
- Visit: https://faucet.doma.xyz/
- Connect your wallet
- Request test tokens

## 📋 After Deployment

The deployment will print your contract address. Copy it and update:

**`/assets/js/config.js`:**
```js
export const REGISTRY_ADDR = "0xYOUR_DEPLOYED_ADDRESS";
```

**`/contracts/deployments/doma-testnet.json`:**
```json
{
  "VerifyWireRegistry": "0xYOUR_DEPLOYED_ADDRESS"
}
```

## ✅ Security Notes

- Your private key is **never stored** in any files
- It's only used in memory for the deployment
- The deployment happens locally on your machine
- No one else sees your private key
