// Claim step behavior: inputs, inline validation, availability badge, and progression.
import { normalizeShort, isValidShort, reserved } from "../validators.js"; // <-- fixed path

(() => {
  const form = document.getElementById("claimForm");
  const legalName = document.getElementById("legalName");
  const brandName = document.getElementById("brandName");
  const shortCode = document.getElementById("shortCode");
  const auth = document.getElementById("auth");

  const errLegal = document.getElementById("err-legalName");
  const errShort = document.getElementById("err-shortCode");
  const badge = document.getElementById("availabilityBadge");
  const continueBtn = document.getElementById("continueBtn");

  // Demo: allow anything that's valid and not reserved.
  // (If you want to simulate unavailability, add codes to this set.)
  const takenDemo = new Set([]);

  // Prefill from draft if returning to this page
  try {
    const draft = JSON.parse(localStorage.getItem("vw_claim_draft") || "{}");
    if (draft.legalName) legalName.value = draft.legalName;
    if (draft.brandName) brandName.value = draft.brandName;
    if (draft.shortCode) shortCode.value = draft.shortCode;
    if (draft.authorized) auth.checked = !!draft.authorized;
  } catch { /* ignore */ }

  /** Simulated async availability check (swap with real API later). */
  function checkAvailability(code) {
    const v = normalizeShort(code);
    return new Promise((resolve) => {
      setTimeout(() => {
        if (!isValidShort(v) || reserved.has(v)) return resolve({ ok: false, reason: "invalid" });
        if (takenDemo.has(v)) return resolve({ ok: false, reason: "taken" });
        return resolve({ ok: true });
      }, 40);
    });
  }

  function setBadge(state) {
    badge.className = "badge";
    switch (state) {
      case "invalid": badge.classList.add("err"); badge.textContent = "Invalid"; break;
      case "taken":   badge.classList.add("err"); badge.textContent = "Taken";   break;
      case "available": badge.classList.add("ok"); badge.textContent = "Available"; break;
      default: badge.textContent = "—";
    }
  }

  async function handleShortInput() {
    const code = shortCode.value.trim();
    if (!code) { errShort.hidden = true; setBadge(); recomputeSubmit(); return; }

    if (!isValidShort(code) || reserved.has(code)) {
      errShort.hidden = false;
      setBadge("invalid");
      recomputeSubmit();
      return;
    }

    const res = await checkAvailability(code);
    if (res.ok) {
      errShort.hidden = true;
      setBadge("available");
    } else {
      // If "taken", show badge as taken but don't show the regex error message.
      errShort.hidden = (res.reason === "taken");
      setBadge(res.reason);
    }
    recomputeSubmit();
  }

  function recomputeSubmit() {
    const lOk = !!legalName.value.trim();
    const s = normalizeShort(shortCode.value);
    const sOk = isValidShort(s) && !reserved.has(s) && !takenDemo.has(s);
    continueBtn.disabled = !(lOk && sOk && auth.checked);
    errLegal.hidden = lOk;
  }

  shortCode.addEventListener("input", handleShortInput);
  legalName.addEventListener("input", () => { errLegal.hidden = !!legalName.value.trim(); recomputeSubmit(); });
  auth.addEventListener("change", recomputeSubmit);

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (continueBtn.disabled) return;

    const payload = {
      legalName: legalName.value.trim(),
      brandName: brandName.value.trim(),
      shortCode: normalizeShort(shortCode.value),
      authorized: auth.checked
    };
    localStorage.setItem("vw_claim_draft", JSON.stringify(payload));

    // Proceed to Step 2
    window.location.href = "./connect.html";
  });

  // init
  setBadge();
  recomputeSubmit();
  if (shortCode.value) handleShortInput();
})();
