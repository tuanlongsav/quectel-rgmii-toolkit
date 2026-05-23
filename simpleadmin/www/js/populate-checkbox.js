// Band sets officially supported by the RM520N-GLAA per Quectel's datasheet.
// Used to flag bands the modem reports as locked but cannot actually camp on.
const RM520N_GLAA_SUPPORT = {
  LTE: new Set([
    1, 2, 3, 4, 5, 7, 8, 12, 13, 14, 17, 18, 19, 20, 25, 26, 28, 29, 30, 32,
    34, 38, 39, 40, 41, 42, 43, 46, 48, 66, 71,
  ]),
  NSA: new Set([1, 2, 3, 5, 7, 8, 20, 28, 38, 41, 66, 71, 77, 78]),
  SA: new Set([
    1, 2, 3, 5, 7, 8, 20, 28, 38, 40, 41, 66, 71, 77, 78, 79,
  ]),
};

// Suggested defaults for VN networks — adjust as needed for your operator.
const RM520N_PRESET = {
  LTE: [3, 7, 20],
  NSA: [3, 78],
  SA: [78, 77],
};

// Apply a numeric filter to the rendered checkboxes. Empty string shows all.
function filterBandCheckboxes(query) {
  const q = (query || "").trim();
  const re = q ? new RegExp(`(^|[^0-9])${q}([^0-9]|$)`) : null;
  document
    .querySelectorAll("#checkboxForm .form-check")
    .forEach((el) => {
      const label = el.querySelector("label");
      if (!label) return;
      const text = label.textContent || "";
      el.style.display = !re || re.test(text) ? "" : "none";
    });
}

// Check every checkbox whose band number is in the RM520N-GLAA supported set
// for the currently selected mode.
function selectSupportedBands() {
  const mode = document.getElementById("networkModeBand").value;
  const allowed = RM520N_GLAA_SUPPORT[mode] || new Set();
  document
    .querySelectorAll("#checkboxForm input[type=checkbox]")
    .forEach((cb) => {
      const band = parseInt(cb.value, 10);
      cb.checked = allowed.has(band);
    });
}

// Apply a known-good RM520N profile per RAT.
function applyRm520nPreset() {
  const mode = document.getElementById("networkModeBand").value;
  const preset = new Set(RM520N_PRESET[mode] || []);
  document
    .querySelectorAll("#checkboxForm input[type=checkbox]")
    .forEach((cb) => {
      cb.checked = preset.has(parseInt(cb.value, 10));
    });
}

// Decorate a checkbox label with a small "PCC"/"SCC" badge if the band is
// currently aggregated. Called from populateCheckboxes after each label is
// constructed.
function decorateActiveBand(label, band, activeBands) {
  const bandNum = parseInt(band, 10);
  for (const role of ["PCC", "SCC"]) {
    if (
      activeBands &&
      Array.isArray(activeBands[role]) &&
      activeBands[role].some((b) => parseInt(b, 10) === bandNum)
    ) {
      const badge = document.createElement("span");
      badge.className = "badge bg-success ms-1";
      badge.style.fontSize = "0.6rem";
      badge.innerText = role;
      label.appendChild(badge);
      label.classList.add("fw-bold");
      return;
    }
  }
}

function populateCheckboxes(
  lte_band,
  nsa_nr5g_band,
  nr5g_band,
  locked_lte_bands,
  locked_nsa_bands,
  locked_sa_bands,
  cellLock
) {
  var checkboxesForm = document.getElementById("checkboxForm");
  var selectedMode = document.getElementById("networkModeBand").value;
  var bands;
  var prefix;

  if (selectedMode === "LTE") {
    bands = lte_band;
    prefix = "B";
  } else if (selectedMode === "NSA") {
    bands = nsa_nr5g_band;
    prefix = "N";
  } else if (selectedMode === "SA") {
    bands = nr5g_band;
    prefix = "N";
  }

  var supportedSet = RM520N_GLAA_SUPPORT[selectedMode] || new Set();

  checkboxesForm.innerHTML = "";

  var locked_lte_bands_array = locked_lte_bands.split(":");
  var locked_nsa_bands_array = locked_nsa_bands.split(":");
  var locked_sa_bands_array = locked_sa_bands.split(":");

  var isBandLocked = function (band) {
    if (selectedMode === "LTE" && locked_lte_bands_array.includes(band)) return true;
    if (selectedMode === "NSA" && locked_nsa_bands_array.includes(band)) return true;
    if (selectedMode === "SA" && locked_sa_bands_array.includes(band)) return true;
    return false;
  };

  var fragment = document.createDocumentFragment();

  if (bands !== null && bands !== "0") {
    var bandsArray = bands.split(":");
    var currentRow;

    bandsArray.forEach(function (band, index) {
      if (index % 5 === 0) {
        currentRow = document.createElement("div");
        currentRow.className = "row mb-2 mx-auto";
        fragment.appendChild(currentRow);
      }

      var checkboxDiv = document.createElement("div");
      checkboxDiv.className = "form-check form-check-reverse col-2";
      var checkboxInput = document.createElement("input");
      checkboxInput.className = "form-check-input";
      checkboxInput.type = "checkbox";
      checkboxInput.id = "inlineCheckbox" + band;
      checkboxInput.value = band;
      checkboxInput.autocomplete = "off";
      checkboxInput.checked = isBandLocked(band);

      var checkboxLabel = document.createElement("label");
      checkboxLabel.className = "form-check-label";
      checkboxLabel.htmlFor = "inlineCheckbox" + band;
      checkboxLabel.innerText = prefix + band;

      // Bands the modem advertises but Quectel doesn't list as supported by
      // the RM520N-GLAA: dim and badge so the user understands the risk.
      if (!supportedSet.has(parseInt(band, 10))) {
        checkboxLabel.classList.add("text-warning");
        checkboxLabel.title =
          "Not on the RM520N-GLAA officially supported list";
        var warnBadge = document.createElement("span");
        warnBadge.className = "badge bg-warning text-dark ms-1";
        warnBadge.style.fontSize = "0.6rem";
        warnBadge.innerText = "?";
        warnBadge.title = checkboxLabel.title;
        checkboxLabel.appendChild(warnBadge);
      }

      // Highlight bands currently aggregated (PCC/SCC) so the user can see
      // what the modem is actually using.
      decorateActiveBand(
        checkboxLabel,
        band,
        window.simpleAdminActiveBands
      );

      checkboxDiv.appendChild(checkboxInput);
      checkboxDiv.appendChild(checkboxLabel);
      currentRow.appendChild(checkboxDiv);
    });
  } else {
    var noBandsText = document.createElement("p");
    noBandsText.className = "text-center";
    noBandsText.innerText = "No supported bands available";
    fragment.appendChild(noBandsText);
  }

  checkboxesForm.appendChild(fragment);
  addCheckboxListeners(cellLock);
}
