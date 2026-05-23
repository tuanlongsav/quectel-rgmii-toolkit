// Parse the chained AT response used by network.html getCurrentSettings:
//   AT+QUIMSLOT?;+CGCONTRDP=1;+QNWLOCK="common/4g";+QNWLOCK="common/5g";
//      +QNWPREFCFG="mode_pref";+QNWPREFCFG="nr5g_disable_mode";+QCAINFO;+CGDCONT?
//
// Every field is matched by prefix and any missing line is tolerated — when
// the modem omits a row (no SIM, no PDP active, no cells aggregated) the
// associated field falls back to "—" instead of throwing and silently
// freezing the entire Alpine state.
//
// Depends on safeField + findLine from utils.js.
function parseCurrentSettings(rawdata) {
  const lines = (rawdata || "").split("\n").map((l) => l.trim());

  // --- SIM slot ---------------------------------------------------------
  // +QUIMSLOT: <slot>   (slot can be 0 when no SIM is inserted)
  const simLine = findLine(lines, "+QUIMSLOT:");
  this.sim = simLine
    ? simLine.split(":")[1].replace(/\s/g, "")
    : "—";

  // --- APN currently in use (CGCONTRDP) --------------------------------
  // Often absent when no PDP is active. Leave a clear label.
  const apnLine = findLine(lines, "+CGCONTRDP: 1");
  this.apn = apnLine
    ? safeField(apnLine.split(","), 2, "—") || "—"
    : "No active APN";

  // --- Cell lock state for 4G / 5G -------------------------------------
  // +QNWLOCK: "common/4g",<n_cells>,...
  const lock4gLine = findLine(lines, '+QNWLOCK: "common/4g"');
  this.cellLock4GStatus = lock4gLine
    ? safeField(lock4gLine.split(","), 1, "0") || "0"
    : "0";
  const lock5gLine = findLine(lines, '+QNWLOCK: "common/5g"');
  this.cellLock5GStatus = lock5gLine
    ? safeField(lock5gLine.split(","), 1, "0") || "0"
    : "0";

  // --- Preferred RAT + NR5G enable mode --------------------------------
  // +QNWPREFCFG: "mode_pref",<mode>
  // +QNWPREFCFG: "nr5g_disable_mode",<mode>
  const modePrefLine = findLine(lines, '+QNWPREFCFG: "mode_pref"');
  this.prefNetwork = modePrefLine
    ? safeField(modePrefLine.split(","), 1, "—") || "—"
    : "—";
  const nrDisableLine = findLine(lines, '+QNWPREFCFG: "nr5g_disable_mode"');
  this.nrModeControlStatus = nrDisableLine
    ? safeField(nrDisableLine.split(","), 1, "0") || "0"
    : "0";

  // --- APN PDP type (CGDCONT) ------------------------------------------
  // +CGDCONT: 1,"IPV4V6","internet.dito.ph"...
  const cgdcontLine = findLine(lines, "+CGDCONT: 1");
  this.apnIP = cgdcontLine
    ? safeField(cgdcontLine.split(","), 1, "—") || "—"
    : "—";

  // --- QCAINFO PCC + every SCC -----------------------------------------
  // +QCAINFO: "PCC|SCC",<earfcn>,<bw>,<band>,...
  const pccLine = findLine(lines, '+QCAINFO: "PCC"');
  const PCCbands = pccLine ? safeField(pccLine.split(","), 3, "") : "";
  const SCCbands = lines
    .filter((line) => line.includes('+QCAINFO: "SCC"'))
    .map((line) => safeField(line.split(","), 3, ""))
    .filter(Boolean);
  if (PCCbands && SCCbands.length) {
    this.bands = [PCCbands, ...SCCbands].join(", ");
  } else if (PCCbands) {
    this.bands = PCCbands;
  } else {
    this.bands = "—";
  }

  // Expose active band split so populate-checkbox.js can highlight aggregated
  // bands directly on the checkbox list.
  window.simpleAdminActiveBands = {
    PCC: PCCbands ? [PCCbands] : [],
    SCC: SCCbands,
  };

  // --- Derived labels --------------------------------------------------
  if (this.cellLock4GStatus == 1 && this.cellLock5GStatus == 1) {
    this.cellLockStatus = "Locked to 4G and 5G";
  } else if (this.cellLock4GStatus == 1) {
    this.cellLockStatus = "Locked to 4G";
  } else if (this.cellLock5GStatus == 1) {
    this.cellLockStatus = "Locked to 5G";
  } else {
    this.cellLockStatus = "Not Locked";
  }

  if (this.nrModeControlStatus == 0) {
    this.nrModeControlStatus = "Not Disabled";
  } else if (this.nrModeControlStatus == 1) {
    this.nrModeControlStatus = "SA Disabled";
  } else if (this.nrModeControlStatus == 2) {
    this.nrModeControlStatus = "NSA Disabled";
  } else {
    this.nrModeControlStatus = "—";
  }

  // The caller spreads the returned object back onto its own Alpine state,
  // so mirror what we just assigned to `this`. Use this.* so the keys
  // resolve regardless of strict mode / global pollution.
  return {
    sim: this.sim,
    apn: this.apn,
    apnIP: this.apnIP,
    cellLockStatus: this.cellLockStatus,
    prefNetwork: this.prefNetwork,
    nrModeControl: this.nrModeControlStatus,
    bands: this.bands,
  };
}
