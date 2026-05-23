// Parse +QENG="servingcell" output for the RM520N-GLAA (SDX62).
//
// Quectel emits one of three shapes depending on the camped RAT. Format
// reference: Quectel RM520N-GL AT Commands Manual §6.2.
//
//   LTE only:
//     +QENG: "servingcell",<state>,"LTE",<is_tdd>,<MCC>,<MNC>,<cellID>,<PCI>,
//             <EARFCN>,<band>,<ul_bw>,<dl_bw>,<TAC>,<RSRP>,<RSRQ>,<RSSI>,<SINR>,<srxlev>
//
//   NR5G-SA:
//     +QENG: "servingcell",<state>,"NR5G-SA",<duplex>,<MCC>,<MNC>,<cellID>,
//             <PCI>,<TAC>,<ARFCN>,<band>,<dl_bw>,<RSRP>,<RSRQ>,<SINR>,<scs>,<srxlev>
//
//   NR5G-NSA: two follow-on lines instead of one tagged servingcell row.
//     +QENG: "servingcell",<state>
//     +QENG: "LTE",<is_tdd>,<MCC>,<MNC>,<cellID>,<PCI>,<EARFCN>,<band>,
//             <ul_bw>,<dl_bw>,<TAC>,<RSRP>,<RSRQ>,<RSSI>,<SINR>,<srxlev>
//     +QENG: "NR5G-NSA",<MCC>,<MNC>,<PCI>,<RSRP>,<SINR>,<RSRQ>
//
// Returns { rat, state, mcc, mnc, band, earfcn, pci, tac, rsrp, rsrq, sinr }
// or null if no QENG line was present.
function parseQengServingCell(rawdata) {
  if (!rawdata) return null;
  const lines = rawdata
    .split("\n")
    .map((l) => l.replace(/\r/g, "").trim())
    .filter(Boolean);
  const qengLines = lines.filter((l) => l.startsWith("+QENG:"));
  if (qengLines.length === 0) return null;

  const fieldsOf = (line) =>
    line
      .replace(/^\+QENG:\s*/, "")
      .split(",")
      .map((f) => f.replace(/"/g, "").trim());

  const primary = qengLines.find((l) => fieldsOf(l)[0] === "servingcell");
  if (!primary) return null;
  const f = fieldsOf(primary);
  // f[0]="servingcell", f[1]=state, f[2]=rat for the LTE / NR5G-SA paths.
  // For NSA the primary row carries only the state; we detect NSA via the
  // presence of an NR5G-NSA follow-on line.
  const nsaLine = qengLines.find((l) => fieldsOf(l)[0] === "NR5G-NSA");

  const result = {
    rat: "",
    state: f[1] || "",
    mcc: "",
    mnc: "",
    band: "",
    earfcn: "",
    pci: "",
    tac: "",
    rsrp: "",
    rsrq: "",
    sinr: "",
  };

  if (nsaLine) {
    const n = fieldsOf(nsaLine);
    // NR5G-NSA: mcc,mnc,pci,rsrp,sinr,rsrq
    result.rat = "NR5G-NSA";
    result.mcc = n[1] || "";
    result.mnc = n[2] || "";
    result.pci = n[3] || "";
    result.rsrp = n[4] || "";
    result.sinr = n[5] || "";
    result.rsrq = n[6] || "";
    result.tac = n[7] || "";
    result.earfcn = n[8] || "";
    result.band = n[9] || "";
    return result;
  }

  const rat = f[2] || "";
  if (rat === "LTE") {
    result.rat = "LTE";
    result.mcc = f[4] || "";
    result.mnc = f[5] || "";
    result.pci = f[7] || "";
    result.earfcn = f[8] || "";
    result.band = f[9] || "";
    result.tac = f[12] || "";
    result.rsrp = f[13] || "";
    result.rsrq = f[14] || "";
    result.sinr = f[16] || "";
    return result;
  }

  if (rat === "NR5G-SA") {
    result.rat = "NR5G-SA";
    result.mcc = f[4] || "";
    result.mnc = f[5] || "";
    result.pci = f[7] || "";
    result.tac = f[8] || "";
    result.earfcn = f[9] || "";
    result.band = f[10] || "";
    result.rsrp = f[12] || "";
    result.rsrq = f[13] || "";
    result.sinr = f[14] || "";
    return result;
  }

  // Unknown / search state: return what we have so the UI can display
  // at least the serving-cell state field.
  result.rat = rat || "—";
  return result;
}
