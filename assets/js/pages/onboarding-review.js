// Step 4: Review & sign
// - Builds canonical JSON from drafts
// - Computes SHA-256 hash
// - Network guard (must be on Doma Testnet)
// - Requests MetaMask signature of a readable message
// - Publishes to on-chain registry
// - Saves a local "publish receipt" and routes to Step 5

import { ethers } from "https://cdn.jsdelivr.net/npm/ethers@6.13.2/dist/ethers.min.js";
import { REGISTRY_ADDR } from "../config.js";

(() => {
    // ---- DOM ----
    const bankNameEl = document.getElementById("bankName");
    const bankCodeEl = document.getElementById("bankCode");
    const railsIncludedEl = document.getElementById("railsIncluded");
    const payloadPreviewEl = document.getElementById("payloadPreview");
    const schemaIdEl = document.getElementById("schemaId");
    const hashHexEl = document.getElementById("hashHex");
    const sigStatusEl = document.getElementById("sigStatus");
    const addrHintEl = document.getElementById("addrHint");
    const downloadBtn = document.getElementById("downloadJsonBtn");
    const signBtn = document.getElementById("signPublishBtn");
    const copyHashBtn = document.getElementById("copyHashBtn");
    const copySigBtn = document.getElementById("copySigBtn");
  
    // ---- Constants ----
    const SCHEMA_ID = "vwire-rails-v1";
    const DOMA_CHAIN_HEX = "0x17cc4"; // Doma Testnet
  
    // ---- Small helpers ----
    const read = (k, fb = {}) => {
      try { return JSON.parse(localStorage.getItem(k) || JSON.stringify(fb)); }
      catch { return fb; }
    };
    const write = (k, v) => localStorage.setItem(k, JSON.stringify(v));
    const bytesToHex = (buf) =>
      "0x" + Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
    const canonicalize = (v) => {
      if (Array.isArray(v)) return v.map(canonicalize);
      if (v && typeof v === "object") {
        const o = {};
        Object.keys(v).sort().forEach(k => { o[k] = canonicalize(v[k]); });
        return o;
      }
      return v;
    };
    const canonicalJSONString = (o) => JSON.stringify(canonicalize(o), null, 2);
    const compactCanonicalJSON = (o) => JSON.stringify(canonicalize(o));
    const chip = (text) => {
      const span = document.createElement("span");
      span.className = "codechip";
      span.textContent = text;
      return span;
    };
    const copy = (text) => navigator.clipboard?.writeText(text).catch(() => {});

    // ---- Normalization helpers (match contract expectations) ----
    const digitsOnly = (s = "") => (s || "").replace(/\D/g, "");
    const upperNoSpaces = (s = "") => (s || "").replace(/\s+/g, "").toUpperCase();
    const h = (s) => ethers.keccak256(ethers.toUtf8Bytes(s || ""));

    async function ensureOnDoma() {
      if (!window.ethereum) return false;
      try {
        const cid = await ethereum.request({ method: "eth_chainId" });
        return cid?.toLowerCase() === DOMA_CHAIN_HEX;
      } catch { return false; }
    }
  
    // ---- Build payload from drafts ----
    const claim = read("vw_claim_draft", {});
    const rails = read("vw_rails_draft", {});
    const anyEnabled = !!(rails.enableWire || rails.enableACH || rails.enableIntl);
  
    const payload = {
      schema: SCHEMA_ID,
      organization: {
        shortCode: claim.shortCode || "",
        legalName: claim.legalName || "",
        brandName: claim.brandName || ""
      },
      rails: {
        ach: rails.enableACH
          ? { routing: rails.ach?.routing || "", account: rails.ach?.account || "", notes: rails.ach?.notes || "" }
          : null,
        wire: rails.enableWire
          ? { routing: rails.wire?.routing || "", account: rails.wire?.account || "", notes: rails.wire?.notes || "" }
          : null,
        international: rails.enableIntl
          ? { iban: rails.intl?.iban || "", bic: rails.intl?.bic || "", notes: rails.intl?.notes || "" }
          : null
      },
      meta: {
        createdAt: Math.floor(Date.now() / 1000),
        networkHint: "doma-testnet"
      }
    };
  
    // ---- Populate UI ----
    bankNameEl.textContent = claim.brandName || claim.legalName || "—";
    bankCodeEl.textContent = claim.shortCode || "—";
    railsIncludedEl.innerHTML = "";
    if (rails.enableWire) railsIncludedEl.append(chip("US Wires"));
    if (rails.enableACH) railsIncludedEl.append(chip("ACH"));
    if (rails.enableIntl) railsIncludedEl.append(chip("International"));
    if (!anyEnabled) railsIncludedEl.append(chip("None selected"));
  
    const jsonText = canonicalJSONString(payload); // Pretty version for display
    const compactJsonText = compactCanonicalJSON(payload); // Compact version for hashing
    payloadPreviewEl.textContent = jsonText;
    schemaIdEl.textContent = SCHEMA_ID;

    // ---- Compute SHA-256 of canonical JSON ----
    (async () => {
      try {
        const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(compactJsonText));
        hashHexEl.textContent = bytesToHex(buf);
      } catch (e) {
        hashHexEl.textContent = "Error computing hash";
        console.error("Hash error", e);
      }
    })();
  
    // ---- Wallet hint ----
    const addr = localStorage.getItem("vw_wallet_addr") || "";
    addrHintEl.textContent = addr ? `Signing as ${addr}` : "Connect a wallet on Step 2 to enable signing.";
  
    // ---- Download JSON ----
    downloadBtn.addEventListener("click", () => {
      const blob = new Blob([jsonText], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${claim.shortCode || "rails"}-v1.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    });
  
    // ---- Copy helpers ----
    copyHashBtn?.addEventListener("click", () => copy(hashHexEl.textContent));
    copySigBtn?.addEventListener("click", () => {
      try {
        const r = JSON.parse(localStorage.getItem("vw_publish_receipt") || "{}");
        copy(r?.signature || "");
      } catch { /* noop */ }
    });
  
    // ---- Sign & publish ----
    signBtn.addEventListener("click", async () => {
      if (!anyEnabled) {
        alert("Select at least one rail (Wires, ACH, or International) before publishing.");
        return;
      }
      if (!window.ethereum) {
        alert("MetaMask not detected.");
        return;
      }
      const onDoma = await ensureOnDoma();
      if (!onDoma) {
        alert("Please switch MetaMask to Doma Testnet and try again.");
        return;
      }
      const account = localStorage.getItem("vw_wallet_addr");
      if (!account) {
        alert("Please connect your wallet on Step 2 (Connect & authorize) before signing.");
        return;
      }
  
      // Build readable message to sign (binds schema + shortCode + hash + time)
      const signedAt = Math.floor(Date.now() / 1000);
      const hexHash = hashHexEl.textContent;
      const message = [
        "VerifyWire Attestation",
        `Schema: ${SCHEMA_ID}`,
        `Org: ${claim.shortCode || ""}`,
        `Hash: ${hexHash}`,
        `Time: ${signedAt}`,
        "Network: doma-testnet"
      ].join("\n");
  
      let signature = "";
      try {
        signature = await window.ethereum.request({
          method: "personal_sign",
          params: [message, account]
        });
        sigStatusEl.textContent = "Signed ✓";
        sigStatusEl.style.background = "#f0fdf4";
      } catch (e) {
        console.error(e);
        alert(e?.message || "Signature rejected.");
        return;
      }

      // ---- Publish to on-chain registry ----
      let txHash = "";
      if (REGISTRY_ADDR && /^0x[a-fA-F0-9]{40}$/.test(REGISTRY_ADDR)) {
        try {
          sigStatusEl.textContent = "Publishing...";
          const provider = new ethers.BrowserProvider(window.ethereum);
          const signer = await provider.getSigner();
          const abi = ["function publish(string,bytes32,bytes32,bytes32,bytes32,bytes32,bytes32)"];
          const reg = new ethers.Contract(REGISTRY_ADDR, abi, signer);

          const sc = (claim.shortCode || "").toLowerCase();

          // Optional: Add debug logging in development
          // console.log("Publishing rails for:", sc);

          const tx = await reg.publish(
            sc,
            h(digitsOnly(rails.wire?.routing)),
            h(digitsOnly(rails.wire?.account)),
            h(digitsOnly(rails.ach?.routing)),
            h(digitsOnly(rails.ach?.account)),
            h(upperNoSpaces(rails.intl?.iban)),
            h(upperNoSpaces(rails.intl?.bic))
          );
          const rcpt = await tx.wait();
          txHash = rcpt.hash;

          sigStatusEl.textContent = "Published ✓";
        } catch (e) {
          console.error("Publish error:", e);
          alert(`Publish failed: ${e?.message || "Unknown error"}. Signature was successful.`);
          // Continue anyway - signature is valid
          sigStatusEl.textContent = "Signed ✓ (publish failed)";
        }
      } else {
        console.warn("REGISTRY_ADDR not configured, skipping on-chain publish");
        sigStatusEl.textContent = "Signed ✓ (registry not configured)";
      }

      const receipt = {
        schema: SCHEMA_ID,
        orgShortCode: claim.shortCode || "",
        hash: hexHash,
        signature,
        signer: account,
        signedMessage: message,
        payload,
        cid: null,                 // TODO: set real IPFS CID when added
        network: "doma-testnet",
        publishedAt: signedAt,
        txHash
      };
      write("vw_publish_receipt", receipt);

      // Save txHash separately for share page
      if (txHash) {
        localStorage.setItem("vw_publish_tx", txHash);
      }

      // Step 5
      window.location.href = "./share.html";
    });
  })();
  