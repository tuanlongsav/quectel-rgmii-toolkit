// Shared frontend helpers for Simple Admin.

// Decode a UTF-16BE hex string (e.g. "0044 0049 0054 004F" without spaces)
// back into text. Used for SMS bodies and UCS2-encoded operator names.
function convertHexToText(hex) {
  if (!hex || hex.length % 2 !== 0) return hex || "";
  const bytes = new Uint8Array(hex.match(/.{1,2}/g).map((b) => parseInt(b, 16)));
  try {
    return new TextDecoder("utf-16be").decode(bytes);
  } catch (_) {
    return hex;
  }
}

// If the input looks like a UCS2-encoded hex string (only hex chars, length
// divisible by 4, longer than 4) decode it; otherwise return as-is. Operator
// names from +QSPN can arrive either as plain ASCII or UCS2 hex depending on
// modem CSCS state, so callers should treat this as a best-effort decoder.
function decodeMaybeUcs2(str) {
  if (typeof str !== "string") return str;
  const trimmed = str.trim();
  if (
    trimmed.length >= 4 &&
    trimmed.length % 4 === 0 &&
    /^[0-9A-Fa-f]+$/.test(trimmed)
  ) {
    const decoded = convertHexToText(trimmed);
    // Drop the result if it contains non-printable noise — fall back to raw.
    if (/^[\x20-\x7E -￿]+$/.test(decoded)) return decoded;
  }
  return str;
}

// Safe array-index access for parsed AT response splits. Returns the trimmed
// field at `idx` or `defaultValue` if the array is too short.
function safeField(parts, idx, defaultValue = "") {
  if (!Array.isArray(parts) || idx < 0 || idx >= parts.length) return defaultValue;
  const v = parts[idx];
  return typeof v === "string" ? v.replace(/"/g, "").trim() : defaultValue;
}

// Find the first line in `lines` that starts (after optional whitespace) with
// `prefix`. Returns the line or null. Replaces fragile lines[N] indexing.
function findLine(lines, prefix) {
  if (!Array.isArray(lines)) return null;
  for (const l of lines) {
    if (typeof l !== "string") continue;
    if (l.trimStart().startsWith(prefix)) return l;
  }
  return null;
}

// Persist a {rat, earfcn, pci, band, scs?} payload then jump to the cell-lock
// section of network.html. Used by the "Lock this cell" buttons on the
// scanner table. network.html's Alpine init() consumes and clears the entry.
function cellLockHandoff(payload) {
  try {
    localStorage.setItem("pendingCellLock", JSON.stringify(payload));
  } catch (e) {
    console.error("Failed to stash pendingCellLock:", e);
  }
  window.location.href = "network.html#celllock";
}
