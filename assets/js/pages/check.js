// Paste-to-Check (Lean MVP)
// - Extract identifiers from pasted text
// - Normalize & keccak256 hash
// - Read on-chain registry (Doma Testnet) and compare
// - Render ✅ / 🟡 / 🔴 with plain-English explanations

// Status element (declare once at top)
let statusEl = document.getElementById("status");

// Dynamic import to handle potential mixed content issues
let ethers;
try {
  if (statusEl) statusEl.textContent = "Loading ethers library...";
  const ethersModule = await import("https://cdn.jsdelivr.net/npm/ethers@6.13.2/dist/ethers.min.js");
  ethers = ethersModule.ethers;
  console.log('Ethers loaded successfully');
  if (statusEl) statusEl.textContent = "Ethers library loaded";
} catch (error) {
  console.error('Failed to load ethers:', error);
  if (statusEl) statusEl.textContent = "Failed to load ethers: " + error.message;
  throw new Error('Ethers library failed to load. Please check your internet connection or try refreshing the page.');
}

let REGISTRY_ADDR, DOMA_RPC_URL;
try {
  if (statusEl) statusEl.textContent = "Loading configuration...";
  const config = await import("../config.js");
  REGISTRY_ADDR = config.REGISTRY_ADDR;
  DOMA_RPC_URL = config.DOMA_RPC_URL;
  console.log('Config loaded:', { REGISTRY_ADDR, DOMA_RPC_URL });
  if (statusEl) statusEl.textContent = "Configuration loaded";
} catch (error) {
  console.error('Failed to load config:', error);
  if (statusEl) statusEl.textContent = "Failed to load config: " + error.message;
  throw error;
}

const ABI = [
  "function getRecord(string) view returns (address owner,uint64 updatedAt,uint32 version,bytes32 wireRouting,bytes32 wireAccount,bytes32 achRouting,bytes32 achAccount,bytes32 iban,bytes32 bic)"
];

/** ---------- DOM ---------- */
console.log('Looking for DOM elements...');
const shortCode = document.getElementById("shortCode");
const pasteArea = document.getElementById("pasteArea");
const exampleBtn = document.getElementById("exampleBtn");
const clearBtn = document.getElementById("clearBtn");
const checkBtn = document.getElementById("checkBtn");

const exRouting = document.getElementById("exRouting");
const exAccount = document.getElementById("exAccount");
const exIBAN = document.getElementById("exIBAN");
const exBIC = document.getElementById("exBIC");

const verdictText = document.getElementById("verdictText");
const dot = document.getElementById("dot");
const explain = document.getElementById("explain");

if (statusEl) {
  statusEl.textContent = "DOM elements loaded";
}

console.log('DOM elements found:', {
  shortCode, pasteArea, exampleBtn, clearBtn, checkBtn,
  exRouting, exAccount, exIBAN, exBIC,
  verdictText, dot, explain
});

// Check if any elements are null
const missingElements = [];
if (!shortCode) missingElements.push('shortCode');
if (!pasteArea) missingElements.push('pasteArea');
if (!exampleBtn) missingElements.push('exampleBtn');
if (!clearBtn) missingElements.push('clearBtn');
if (!checkBtn) missingElements.push('checkBtn');
if (!exRouting) missingElements.push('exRouting');
if (!exAccount) missingElements.push('exAccount');
if (!exIBAN) missingElements.push('exIBAN');
if (!exBIC) missingElements.push('exBIC');
if (!verdictText) missingElements.push('verdictText');
if (!dot) missingElements.push('dot');
if (!explain) missingElements.push('explain');

if (missingElements.length > 0) {
  console.error('Missing DOM elements:', missingElements);
  throw new Error(`Missing DOM elements: ${missingElements.join(', ')}`);
}

console.log('All DOM elements found successfully');

/** ---------- Helpers ---------- */
const digitsOnly = (s = "") => String(s).replace(/\D/g, "");
const upperNoSpaces = (s = "") => String(s).replace(/\s+/g, "").toUpperCase();
const lower = (s = "") => String(s).trim().toLowerCase();
const h = (s) => ethers.keccak256(ethers.toUtf8Bytes(s || ""));

function mask(val = "", show = 4) {
  if (!val) return "—";
  const last = val.slice(-show);
  return "•••" + last;
}
function setPill(el, val) { el.textContent = val || "—"; }

function setVerdict(kind, text) {
  // kind: "green" | "yellow" | "red"
  dot.className = "dot " + (kind || "");
  verdictText.textContent = text || "—";
}

/** Extract identifiers with light regex + heuristics */
function extract(text) {
  const t = text || "";
  // ABA routing: 9 consecutive digits
  const routingMatches = [...t.matchAll(/\b\d{9}\b/g)].map(m => m[0]);

  // IBAN
  const ibanMatches = [...t.matchAll(/\b[A-Z]{2}\d{2}[A-Z0-9]{11,30}\b/gi)].map(m => m[0]);

  // BIC / SWIFT
  const bicMatches = [...t.matchAll(/\b[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}(?:[A-Z0-9]{3})?\b/gi)].map(m => m[0]);

  // Account candidates: 6+ digits, but avoid ones already used as routing
  const longDigits = [...t.matchAll(/\b\d{6,}\b/g)].map(m => m[0]);
  const routingSet = new Set(routingMatches);
  const accountCandidates = longDigits.filter(d => !(d.length === 9 && routingSet.has(d)));

  // Heuristic: pick the longest account candidate; fallback = first
  let account = "";
  if (accountCandidates.length) {
    accountCandidates.sort((a,b) => b.length - a.length);
    account = accountCandidates[0];
  }

  return {
    routing: routingMatches[0] || "",
    account,
    iban: ibanMatches[0] || "",
    bic: bicMatches[0] || ""
  };
}

/** Compare pasted values (normalized & hashed) to on-chain hashes */
async function checkNow() {
  explain.innerHTML = "";
  setVerdict("", "Checking…");

  // Guard: check if registry is configured
  if (!/^0x[a-fA-F0-9]{40}$/.test(REGISTRY_ADDR)) {
    setVerdict("red", "Registry not configured. Set REGISTRY_ADDR in /assets/js/config.js.");
    explain.innerHTML = "";
    return;
  }

  const sc = lower(shortCode.value);
  if (!sc) {
    setVerdict("red", "Please enter the bank’s short code (e.g., boa).");
    return;
  }

  const ext = extract(pasteArea.value || "");
  console.log('Extracted identifiers:', ext);

  // Show extracted pills
  setPill(exRouting, ext.routing);
  setPill(exAccount, ext.account ? mask(ext.account, 4) : "");
  setPill(exIBAN, ext.iban ? mask(upperNoSpaces(ext.iban), 6) : "");
  setPill(exBIC, ext.bic);

  // Normalize
  const n = {
    routing: digitsOnly(ext.routing),
    account: digitsOnly(ext.account),
    iban: upperNoSpaces(ext.iban),
    bic: upperNoSpaces(ext.bic)
  };

  console.log('Normalized values:', n);
  console.log('Any identifiers pasted?', !!n.routing || !!n.account || !!n.iban || !!n.bic);

  // Hash
  const hashes = {
    routing: h(n.routing),
    account: h(n.account),
    iban: h(n.iban),
    bic: h(n.bic)
  };

  // Read on-chain
  let rec;
  try {
    const provider = new ethers.JsonRpcProvider(DOMA_RPC_URL);
    const reg = new ethers.Contract(REGISTRY_ADDR, ABI, provider);
    rec = await reg.getRecord(sc);
  } catch (e) {
    console.error(e);
    setVerdict("red", "Could not reach registry RPC. Check your network and REGISTRY_ADDR.");
    return;
  }

  // Unpack record
  const owner = rec[0];
  const updatedAt = Number(rec[1] ?? 0);
  const version = Number(rec[2] ?? 0);
  const on = {
    wireRouting: rec[3],
    wireAccount: rec[4],
    achRouting:  rec[5],
    achAccount:  rec[6],
    iban:        rec[7],
    bic:         rec[8]
  };

  const zero = (x) => !x || /^0x0+$/.test(x) || x === ethers.ZeroHash;

  if (!owner || owner === ethers.ZeroAddress) {
    setVerdict("red", `No attestation found for "${sc}".`);
    addLine(`This bank short code has no published rails on chain.`);
    return;
  }

  // Matches - only consider real matches, not empty string matches
  const matches = {
    wireRouting: (!zero(on.wireRouting) && hashes.routing === on.wireRouting && !!n.routing),
    wireAccount: (!zero(on.wireAccount) && hashes.account === on.wireAccount && !!n.account),
    achRouting:  (!zero(on.achRouting)  && hashes.routing === on.achRouting && !!n.routing),
    achAccount:  (!zero(on.achAccount)  && hashes.account === on.achAccount && !!n.account),
    intlIBAN:    (!zero(on.iban)        && hashes.iban === on.iban && !!n.iban),
    intlBIC:     (!zero(on.bic)         && hashes.bic === on.bic && !!n.bic),
  };

  // Build explanations
  const foundAny =
    matches.wireRouting || matches.wireAccount ||
    matches.achRouting  || matches.achAccount  ||
    matches.intlIBAN    || matches.intlBIC;

  // Check if user actually pasted any extractable identifiers (not just gibberish)
  const pastedAny =
    !!n.routing || !!n.account || !!n.iban || !!n.bic;

  // Explain matches
  if (matches.wireRouting) addLine(`Routing ${strong(n.routing)} matches **US Wires** (attested).`);
  if (matches.wireAccount) addLine(`Account ${strong(mask(n.account))} matches **US Wires** (attested).`);
  if (matches.achRouting)  addLine(`Routing ${strong(n.routing)} matches **ACH** (attested).`);
  if (matches.achAccount)  addLine(`Account ${strong(mask(n.account))} matches **ACH** (attested).`);
  if (matches.intlIBAN)    addLine(`IBAN ${strong(mask(n.iban, 6))} matches **International** (attested).`);
  if (matches.intlBIC)     addLine(`BIC ${strong(n.bic)} matches **International** (attested).`);

  // Explain unusual combos
  if ((n.iban || n.bic) && zero(on.iban) && zero(on.bic)) {
    addLine(`International identifiers present, but bank has **no** attested international rails.`, "warn");
  }
  if ((n.routing || n.account) && zero(on.wireRouting) && zero(on.achRouting) && zero(on.wireAccount) && zero(on.achAccount)) {
    addLine(`US routing/account present, but bank has **no** attested US rails.`, "warn");
  }

  // Verdict
  if (foundAny) {
    setVerdict("green", "✅ Matches bank-attested rails.");
  } else if (pastedAny) {
    // If identifiers exist but no matches, decide red vs yellow based on warnings above
    const warned = document.querySelectorAll("#explain li.warn").length > 0;
    if (warned) {
      setVerdict("yellow", "🟡 Unusual or incomplete — please double-check.");
    } else {
      setVerdict("red", "🔴 No match to bank-attested rails.");
      // Add a friendly detail if we extracted values but none matched
      if (n.routing) addLine(`Routing ${strong(n.routing)} did not match attested US rails.`, "err");
      if (n.account) addLine(`Account ${strong(mask(n.account))} did not match attested US rails.`, "err");
      if (n.iban) addLine(`IBAN ${strong(mask(n.iban,6))} did not match attested international rails.`, "err");
      if (n.bic) addLine(`BIC ${strong(n.bic)} did not match attested international rails.`, "err");
    }
  } else {
    setVerdict("yellow", "🟡 No payment identifiers detected in the pasted text.");
    addLine(`Paste the full wiring or ACH instructions to verify.`);
  }

  // Footer hint with version/time (optional)
  if (updatedAt) {
    const dt = new Date(updatedAt * 1000).toISOString();
    addLine(`Attestation version ${version}, updated ${dt}.`, "hint");
  }

  function strong(s){ return `\`${s}\``; }
  function addLine(text, tone){
    const li = document.createElement("li");
    li.textContent = text;
    if (tone === "warn") li.classList.add("warn");
    if (tone === "err") li.classList.add("err");
    if (tone === "hint") li.classList.add("hint");
    explain.appendChild(li);
  }
}

/** ---------- Wire up UI ---------- */
console.log('Setting up event listeners...');

try {
  exampleBtn.addEventListener("click", (e) => {
    console.log('Example button clicked');
    e.preventDefault();
    // Example content; adjust to your demo values
    shortCode.value = shortCode.value || "boa";
    pasteArea.value =
`Please wire the deposit to:
Bank: Bank of America
Routing: 026009593
Account: 000123456789
Reference: INV-1029`;
    // Pre-extract to show pills
    const ext = extract(pasteArea.value);
    setPill(exRouting, ext.routing);
    setPill(exAccount, ext.account ? mask(ext.account, 4) : "");
    setPill(exIBAN, ext.iban ? mask(upperNoSpaces(ext.iban), 6) : "");
    setPill(exBIC, ext.bic);
    console.log('Example data loaded');
  });

  clearBtn.addEventListener("click", (e) => {
    console.log('Clear button clicked');
    e.preventDefault();
    pasteArea.value = "";
    setPill(exRouting, "");
    setPill(exAccount, "");
    setPill(exIBAN, "");
    setPill(exBIC, "");
    setVerdict("", "—");
    explain.innerHTML = "";
  });

  checkBtn.addEventListener("click", async (e) => {
    console.log('Check button clicked');
    e.preventDefault();
    checkBtn.disabled = true;
    try {
      await checkNow();
    } catch (error) {
      console.error('Error during check:', error);
      setVerdict("red", "Error: " + error.message);
    } finally {
      checkBtn.disabled = false;
    }
  });

  console.log('Event listeners set up successfully');
} catch (error) {
  console.error('Failed to set up event listeners:', error);
  throw error;
}

// Optional: prefill short code if user came from onboarding
try {
  const draft = JSON.parse(localStorage.getItem("vw_claim_draft") || "{}");
  if (draft.shortCode) {
    shortCode.value = draft.shortCode.toLowerCase();
    console.log('Prefilled short code from localStorage:', draft.shortCode);
  }
} catch (error) {
  console.warn('Could not load draft from localStorage:', error);
}

console.log('Check page initialization complete');
if (statusEl) {
  statusEl.textContent = "✅ Ready to check payments";
  statusEl.style.color = "#52c41a";
}
