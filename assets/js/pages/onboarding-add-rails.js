// Step 3: Add payment rails (validation + draft save + proceed to Review)
import { isValidABARouting, isLikelyIBAN, isValidBIC } from "../validators.js";

(() => {
  // --- DOM ---
  const bankSummary = document.getElementById("bankSummary");
  const bankName = document.getElementById("bankName");
  const bankCode = document.getElementById("bankCode");

  const enableWire = document.getElementById("enableWire");
  const enableACH  = document.getElementById("enableACH");
  const enableIntl = document.getElementById("enableIntl");

  const wireSection = document.getElementById("wireSection");
  const achSection  = document.getElementById("achSection");
  const intlSection = document.getElementById("intlSection");

  // Wire fields
  const wireRouting = document.getElementById("wireRouting");
  const wireAccount = document.getElementById("wireAccount");
  const wireNotes   = document.getElementById("wireNotes");
  const errWireRouting = document.getElementById("err-wireRouting");
  const errWireAccount = document.getElementById("err-wireAccount");

  // ACH fields
  const achRouting = document.getElementById("achRouting");
  const achAccount = document.getElementById("achAccount");
  const achNotes   = document.getElementById("achNotes");
  const errAchRouting = document.getElementById("err-achRouting");
  const errAchAccount = document.getElementById("err-achAccount");

  // International fields
  const intlIBAN  = document.getElementById("intlIBAN");
  const intlBIC   = document.getElementById("intlBIC");
  const intlNotes = document.getElementById("intlNotes");
  const errIntlIBAN = document.getElementById("err-intlIBAN");
  const errIntlBIC  = document.getElementById("err-intlBIC");

  const saveDraftBtn = document.getElementById("saveDraftBtn");
  const form = document.getElementById("railsForm");
  const reviewBtn = document.getElementById("reviewBtn");

  // --- Helpers ---
  function setHidden(el, hidden) { if (el) el.hidden = hidden; }
  function val(el) { return (el?.value || "").trim(); }

  function toggleSection(sectionEl, enabled) {
    sectionEl.classList.toggle("section-disabled", !enabled);
    const inputs = sectionEl.querySelectorAll("input, textarea, select");
    inputs.forEach((el) => { el.disabled = !enabled; });
  }

  function readClaimDraft() {
    try { return JSON.parse(localStorage.getItem("vw_claim_draft") || "{}"); }
    catch { return {}; }
  }

  function readRailsDraft() {
    try { return JSON.parse(localStorage.getItem("vw_rails_draft") || "{}"); }
    catch { return {}; }
  }

  function writeRailsDraft(d) {
    localStorage.setItem("vw_rails_draft", JSON.stringify(d));
  }

  // --- Prefill summary from previous step ---
  (function initSummary(){
    const draft = readClaimDraft();
    if (draft.legalName || draft.brandName || draft.shortCode) {
      bankName.textContent = draft.brandName || draft.legalName || "Your bank";
      bankCode.textContent = draft.shortCode || "—";
      bankSummary.hidden = false;
    }
  })();

  // --- Enable/disable sections ---
  function applyToggles() {
    toggleSection(wireSection, enableWire.checked);
    toggleSection(achSection,  enableACH.checked);
    toggleSection(intlSection, enableIntl.checked);
  }

  enableWire.addEventListener("change", () => { applyToggles(); recompute(); });
  enableACH .addEventListener("change", () => { applyToggles(); recompute(); });
  enableIntl.addEventListener("change", () => { applyToggles(); recompute(); });

  // --- Validation rules ---
  function validateWire() {
    if (!enableWire.checked) { setHidden(errWireRouting, true); setHidden(errWireAccount, true); return true; }
    const rOk = isValidABARouting(wireRouting.value);
    const aOk = !!val(wireAccount);
    setHidden(errWireRouting, rOk);
    setHidden(errWireAccount, aOk);
    return rOk && aOk;
  }

  function validateACH() {
    if (!enableACH.checked) { setHidden(errAchRouting, true); setHidden(errAchAccount, true); return true; }
    const rOk = isValidABARouting(achRouting.value);
    const aOk = !!val(achAccount);
    setHidden(errAchRouting, rOk);
    setHidden(errAchAccount, aOk);
    return rOk && aOk;
  }

  function validateIntl() {
    if (!enableIntl.checked) { setHidden(errIntlIBAN, true); setHidden(errIntlBIC, true); return true; }
    const iban = val(intlIBAN);
    const bic  = val(intlBIC);

    // Require at least one of IBAN or BIC
    if (!iban && !bic) {
      errIntlIBAN.textContent = "Provide IBAN or BIC.";
      setHidden(errIntlIBAN, false);
      setHidden(errIntlBIC, true);
      return false;
    }

    let ok = true;
    if (iban) {
      const good = isLikelyIBAN(iban);
      errIntlIBAN.textContent = "IBAN looks malformed. Example: GB33BUKB20201555555555";
      setHidden(errIntlIBAN, good);
      ok = ok && good;
    } else {
      setHidden(errIntlIBAN, true);
    }

    if (bic) {
      const good = isValidBIC(bic);
      setHidden(errIntlBIC, good);
      ok = ok && good;
    } else {
      setHidden(errIntlBIC, true);
    }

    return ok;
  }

  // Wire field listeners
  [wireRouting, wireAccount].forEach(el => el.addEventListener("input", () => { validateWire(); recompute(); }));
  // ACH listeners
  [achRouting, achAccount].forEach(el => el.addEventListener("input", () => { validateACH(); recompute(); }));
  // Intl listeners
  [intlIBAN, intlBIC].forEach(el => el.addEventListener("input", () => { validateIntl(); recompute(); }));

  // --- Draft load (prefill) ---
  (function prefill(){
    const d = readRailsDraft();
    if (!d || typeof d !== "object") return;

    if (typeof d.enableWire === "boolean") enableWire.checked = d.enableWire;
    if (typeof d.enableACH  === "boolean") enableACH.checked  = d.enableACH;
    if (typeof d.enableIntl === "boolean") enableIntl.checked = d.enableIntl;

    if (d.wire) {
      wireRouting.value = d.wire.routing || "";
      wireAccount.value = d.wire.account || "";
      wireNotes.value   = d.wire.notes || "";
    }
    if (d.ach) {
      achRouting.value = d.ach.routing || "";
      achAccount.value = d.ach.account || "";
      achNotes.value   = d.ach.notes || "";
    }
    if (d.intl) {
      intlIBAN.value  = d.intl.iban || "";
      intlBIC.value   = d.intl.bic || "";
      intlNotes.value = d.intl.notes || "";
    }
  })();

  // --- Compose current payload ---
  function snapshot() {
    return {
      enableWire: enableWire.checked,
      enableACH:  enableACH.checked,
      enableIntl: enableIntl.checked,
      wire: {
        routing: val(wireRouting),
        account: val(wireAccount),
        notes:   val(wireNotes)
      },
      ach: {
        routing: val(achRouting),
        account: val(achAccount),
        notes:   val(achNotes)
      },
      intl: {
        iban:  val(intlIBAN).replace(/\s+/g, ""),
        bic:   val(intlBIC).toUpperCase(),
        notes: val(intlNotes)
      }
    };
  }

  // --- Global recompute (enable Review button) ---
  function recompute() {
    const anyEnabled = enableWire.checked || enableACH.checked || enableIntl.checked;
    const ok = anyEnabled && validateWire() && validateACH() && validateIntl();
    reviewBtn.disabled = !ok;
  }

  // --- Actions ---
  saveDraftBtn.addEventListener("click", () => {
    writeRailsDraft(snapshot());
    // Tiny visual nudge (optional): change text briefly
    const prev = saveDraftBtn.textContent;
    saveDraftBtn.textContent = "Saved ✓";
    setTimeout(() => { saveDraftBtn.textContent = prev; }, 900);
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (reviewBtn.disabled) return;
    writeRailsDraft(snapshot());
    window.location.href = "./review.html";
  });

  // Init
  applyToggles();
  validateWire(); validateACH(); validateIntl();
  recompute();
})();
