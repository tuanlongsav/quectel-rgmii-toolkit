const freqNumbersContainer = document.getElementById("freqNumbersContainer");

// EARFCN: 0 .. 262143 (per 3GPP TS 36.101 / 38.101).
// PCI (LTE): 0 .. 503. PCI (NR): 0 .. 1007. The single LTE cell-lock UI uses
// LTE limits; the NR-SA single-cell UI uses its own input pair below.
function generateFreqNumberInputs(num) {
  let html = "";
  const maxFields = Math.min(num, 10);
  for (let i = 1; i <= maxFields; i++) {
    html += `
    <div class="input-group mb-3" x-show="cellNum >= ${i} && networkModeCell == 'LTE'">
      <span class="input-group-text" style="min-width:3rem">#${i}</span>
      <input
        type="number"
        inputmode="numeric"
        min="0"
        max="262143"
        aria-label="EARFCN ${i}"
        placeholder="EARFCN"
        class="form-control"
        x-model="earfcn${i}"
      />
      <input
        type="number"
        inputmode="numeric"
        min="0"
        max="503"
        aria-label="PCI ${i}"
        placeholder="PCI (0-503)"
        class="form-control"
        x-model="pci${i}"
      />
    </div>
  `;
  }
  return html;
}

document.addEventListener("DOMContentLoaded", function () {
  const cellNumInput = document.querySelector("[aria-label='NumCells']");
  if (!cellNumInput) return;
  const render = () => {
    const cellNum = parseInt(cellNumInput.value, 10);
    if (!cellNum || cellNum < 1) {
      freqNumbersContainer.innerHTML = "";
      return;
    }
    freqNumbersContainer.innerHTML = generateFreqNumberInputs(cellNum);
  };
  cellNumInput.addEventListener("input", render);
  // Also rerender on programmatic value changes (used by scan→lock prefill).
  cellNumInput.addEventListener("change", render);
});
