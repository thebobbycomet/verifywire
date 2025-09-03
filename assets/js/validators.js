/**
 * Shared, dependency-free validators + helpers.
 * Keep this file tiny and reusable across pages.
 */

/** Normalize a short code input to lowercase & trimmed. */
export function normalizeShort(input = "") {
    return String(input).trim().toLowerCase();
  }
  
  /**
   * Verify short code: lowercase letters, numbers, hyphens; 1–30 chars;
   * cannot start or end with a hyphen.
   */
  export function isValidShort(code) {
    if (!code) return false;
    const v = normalizeShort(code);
    if (!/^[a-z0-9-]{1,30}$/.test(v)) return false;
    if (v.startsWith("-") || v.endsWith("-")) return false;
    return true;
  }
  
  /** Reserved names that should never be claimable. */
  export const reserved = new Set([
    "www",
    "mail",
    "api",
    "admin",
    "root",
    "support",
    "help",
    "*",
    "_acme-challenge"
  ]);
  
  /* ---------- Extras we’ll use on later steps (rails form & checker) ---------- */
  
  /**
   * ABA / Fedwire routing number (USA): must be 9 digits and pass checksum.
   * Checksum rule: (3*(d1+d4+d7) + 7*(d2+d5+d8) + 1*(d3+d6+d9)) % 10 === 0
   */
  export function isValidABARouting(aba) {
    const digits = String(aba).replace(/\D/g, "");
    if (digits.length !== 9) return false;
    let sum = 0;
    const w = [3, 7, 1];
    for (let i = 0; i < 9; i++) {
      sum += w[i % 3] * Number(digits[i]);
    }
    return sum % 10 === 0;
  }
  
  /**
   * SWIFT/BIC format check (basic): 8 or 11 chars.
   * bank[4 letters] + country[2 letters] + location[2 alnum] + (branch[3 alnum])?
   * Note: This is a structural check, not a registry lookup.
   */
  export function isValidBIC(bic) {
    const v = String(bic).trim().toUpperCase();
    return /^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(v);
  }
  
  /**
   * IBAN quick check (structure only, not mod-97 verification):
   * CCdd + up to 30 alphanumerics. Typical total length 15–34.
   */
  export function isLikelyIBAN(iban) {
    const v = String(iban).replace(/\s+/g, "").toUpperCase();
    if (!/^[A-Z]{2}\d{2}[A-Z0-9]+$/.test(v)) return false;
    return v.length >= 15 && v.length <= 34;
  }
  