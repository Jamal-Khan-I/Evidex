// ============ CONFIG ============
// ---------------------------------------------------------------
// ADMIN: after you deploy the contract in Remix, paste its address
// on ONE line below (between the quotes) and re-upload this file.
// Every investigator/lab/court user then just opens the site and
// clicks "Connect Wallet" — they never see or touch this value.
// ---------------------------------------------------------------
const DEFAULT_CONTRACT_ADDRESS = "0x2d8830D1857ff9304aB754E4AcCDE2218B04Dd6b"; // Deployed on Sepolia — includes getEvidenceIdsByCase

// Falls back to a locally-saved override (set via admin mode below) if present,
// otherwise uses the hardcoded default above.
let CONTRACT_ADDRESS = localStorage.getItem("eps_contract_address") || DEFAULT_CONTRACT_ADDRESS;

// Admin mode: only reachable via a secret URL, e.g. index.html?admin=1
// Regular staff links never include this, so they never see the address bar.
const isAdminMode = new URLSearchParams(window.location.search).get("admin") === "1";
if (isAdminMode) {
  document.getElementById("setupBar").style.display = "";
  document.getElementById("contractAddressInput").value =
    CONTRACT_ADDRESS !== "0x0000000000000000000000000000000000000000" ? CONTRACT_ADDRESS : "";
}

const CONTRACT_ABI = [
  "function admin() view returns (address)",
  "function pendingAdmin() view returns (address)",
  "function paused() view returns (bool)",
  "function proposeAdmin(address newAdmin) public",
  "function acceptAdmin() public",
  "function cancelAdminTransfer() public",
  "function pause() public",
  "function unpause() public",
  "function roles(address) view returns (uint8)",
  "function grantRole(address account, uint8 role) public",
  "function revokeRole(address account) public",
  "function getRole(address account) view returns (uint8)",
  "function createCustomRole(string name) public returns (uint8 roleId)",
  "function removeCustomRole(uint8 roleId) public",
  "function roleHolderCount(uint8) view returns (uint256)",
  "function getAllCustomRoles() view returns (uint8[] ids, string[] names)",
  "function getRoleName(uint8 roleId) view returns (string)",
  "function nextCustomRoleId() view returns (uint8)",
  "function registerEvidence(string evidenceId, string caseNumber, string firNumber, string policeStation, string lawSections, string description, bytes32 fileHash, string ipfsCid, string caseKey) public",
  "function registerEvidenceBatch(string[] evidenceIds, string caseNumber, string firNumber, string policeStation, string lawSections, string[] descriptions, bytes32[] fileHashes, string[] ipfsCids, string caseKey) public",
  "function getCaseEncryptionKey(string caseNumber) view returns (string)",
  "function transferCustody(string evidenceId, address newHolder, string note) public",
  "function transferCustodyBatch(string[] evidenceIds, address newHolder, string note) public",
  "function verifyIntegrity(string evidenceId, bytes32 recomputedHash) public returns (bool)",
  "function verifyIntegrityBatch(string[] evidenceIds, bytes32[] recomputedHashes) public returns (bool[])",
  "function closeCase(string evidenceId) public",
  "function submitLabReport(string evidenceId, string findings, string reportHash, string reportIpfsCid) public",
  "function getLabReports(string evidenceId) view returns (string[] findingsList, string[] reportHashes, string[] reportIpfsCids, address[] submittedBys, uint256[] timestamps)",
  "function getLabReportCount(string evidenceId) view returns (uint256)",
  "function clearMyOfficerProfile() public",
  "function clearOfficerProfile(address account) public",
  "function getEvidence(string evidenceId) view returns (string caseNumber, string firNumber, string policeStation, string lawSections, string description, bytes32 fileHash, string ipfsCid, address registeredBy, uint256 registeredAt, uint8 status)",
  "function getCustodyTrail(string evidenceId) view returns (address[] holders, uint8[] holderRoles, uint256[] timestamps, string[] notes)",
  "function getCurrentHolder(string evidenceId) view returns (address)",
  "function getTotalEvidenceCount() view returns (uint256)",
  "function getAllEvidenceIds() view returns (string[])",
  "function getEvidenceIdsByCase(string caseNumber) view returns (string[])",
  "function getCaseEvidenceCount(string caseNumber) view returns (uint256)",
  "function setMyOfficerProfile(string name, string designation, string badgeId) public",
  "function setOfficerProfile(address account, string name, string designation, string badgeId) public",
  "function getOfficerProfile(address account) view returns (string name, string designation, string badgeId, bool isSet)",
  "function totalTransfers() view returns (uint256)",
  "function totalVerificationChecks() view returns (uint256)",
  "function totalVerificationPasses() view returns (uint256)",
  "event RoleGranted(address indexed account, uint8 role, uint256 timestamp)",
  "event RoleRevoked(address indexed account, uint256 timestamp)",
  "event EvidenceRegistered(string evidenceId, string caseNumber, bytes32 fileHash, string ipfsCid, address indexed registeredBy, uint256 timestamp)",
  "event CustodyTransferred(string evidenceId, address indexed from, address indexed to, uint256 timestamp, string note)",
  "event IntegrityChecked(string evidenceId, address indexed checkedBy, bool result, uint256 timestamp)",
  "event CaseClosed(string evidenceId, address indexed closedBy, uint256 timestamp)",
  "event LabReportSubmitted(string evidenceId, address indexed submittedBy, string reportHash, uint256 timestamp)",
  "event AdminTransferProposed(address indexed currentAdmin, address indexed proposedAdmin, uint256 timestamp)",
  "event AdminTransferAccepted(address indexed previousAdmin, address indexed newAdmin, uint256 timestamp)",
  "event Paused(address indexed account, uint256 timestamp)",
  "event Unpaused(address indexed account, uint256 timestamp)",
  "event OfficerProfileSet(address indexed account, string name, string designation, string badgeId, uint256 timestamp)",
  "event OfficerProfileCleared(address indexed account, uint256 timestamp)",
  "event CustomRoleCreated(uint8 indexed roleId, string name, address indexed createdBy, uint256 timestamp)",
  "event CustomRoleRemoved(uint8 indexed roleId, string name, address indexed removedBy, uint256 timestamp)",
  "error NotAdmin()",
  "error NotAuthorizedRole()",
  "error ContractIsPaused()",
  "error ZeroAddress()",
  "error EvidenceNotFound()",
  "error EvidenceAlreadyExists()",
  "error EmptyField(string field)",
  "error FieldTooLong(string field, uint256 max)",
  "error InvalidFileHash()",
  "error CaseIsClosed()",
  "error NewHolderNotAuthorized()",
  "error NotCurrentHolder()",
  "error NoPendingAdmin()",
  "error NotPendingAdmin()",
  "error UnknownRole(uint8 roleId)",
  "error TooManyRoles()",
  "error CannotRemoveBuiltInRole()",
  "error RoleStillAssigned(uint8 roleId, uint256 holderCount)",
  "error EmptyBatch()",
  "error BatchTooLarge(uint256 size, uint256 max)",
  "error BatchLengthMismatch()"
];

// Human-friendly text for each custom Solidity error, keyed by error name.
// Falls back to a generic message if ethers can't match a known error name.
const ERROR_MESSAGES = {
  NotAdmin: () => "Only the contract admin can do this.",
  NotAuthorizedRole: () => "Your wallet doesn't hold the role required for this action.",
  ContractIsPaused: () => "The contract is currently paused by the admin. Try again once it's unpaused.",
  ZeroAddress: () => "That address can't be the zero address.",
  EvidenceNotFound: () => "No evidence record exists with that ID.",
  EvidenceAlreadyExists: () => "An evidence record with that ID already exists.",
  EmptyField: (a) => `"${a[0]}" can't be empty.`,
  FieldTooLong: (a) => `"${a[0]}" is too long — max ${a[1].toString()} characters.`,
  InvalidFileHash: () => "File hash can't be empty/zero.",
  CaseIsClosed: () => "This case is already closed — no further custody changes allowed.",
  NewHolderNotAuthorized: () => "The new holder's wallet doesn't have an authorized role yet. Grant them a role first.",
  NotCurrentHolder: () => "Only the current custody holder can transfer this evidence onward.",
  NoPendingAdmin: () => "There's no pending admin transfer to accept.",
  NotPendingAdmin: () => "Only the nominated address can accept the admin transfer.",
  UnknownRole: (a) => `Role ID ${a[0]} doesn't exist — create it first, or pick an existing role.`,
  TooManyRoles: () => "Maximum number of custom roles reached.",
  CannotRemoveBuiltInRole: () => "Investigator, Lab, and Court are built into the contract and can't be removed.",
  RoleStillAssigned: (a) => `${a[1].toString()} wallet(s) still hold this role — revoke it from all of them in "Grant / Revoke Role" first, then remove it.`,
  EmptyBatch: () => "Select at least one item.",
  BatchTooLarge: (a) => `Too many items in one batch (${a[0].toString()}) — max ${a[1].toString()} per transaction. Split into smaller groups.`,
  BatchLengthMismatch: () => "Internal error — batch arrays didn't line up. Try again."
};

// Turns any thrown error (custom Solidity error, require string, user rejection,
// or network issue) into one readable line for the UI.
function formatError(err) {
  if (err?.errorName && ERROR_MESSAGES[err.errorName]) {
    try { return ERROR_MESSAGES[err.errorName](err.errorArgs || []); } catch (e) { /* fall through */ }
  }
  if (err?.code === "ACTION_REJECTED" || err?.code === 4001) return "Transaction rejected in wallet.";
  if (err?.reason) return err.reason;
  if (err?.data?.message) return err.data.message;
  if (err?.message) return err.message.length > 160 ? err.message.slice(0, 160) + "…" : err.message;
  return "Unknown error — check the browser console for details.";
}

const ROLE_NAMES = ["Unauthorized", "Investigator", "Lab", "Court"];

// Custom roles (ID 4+) are created on-chain by the admin and have no fixed
// name at compile time, so we resolve+cache them lazily via getRoleName().
const roleNameCache = {};
async function resolveRoleName(roleId) {
  const id = typeof roleId === "number" ? roleId : Number(roleId);
  if (id >= 0 && id <= 3) return ROLE_NAMES[id];
  if (roleNameCache[id] !== undefined) return roleNameCache[id];
  try {
    const name = await contract.getRoleName(id);
    roleNameCache[id] = name || `Role #${id}`;
  } catch (e) {
    roleNameCache[id] = `Role #${id}`;
  }
  return roleNameCache[id];
}

// Populates the Grant Role <select> with the 3 built-in roles plus every
// custom role created so far on-chain.
async function refreshRoleOptions() {
  const select = document.getElementById("roleSelect");
  if (!select) return;
  select.innerHTML = `
    <option value="1">Investigator</option>
    <option value="2">Lab</option>
    <option value="3">Court</option>
  `;
  try {
    const [ids, names] = await contract.getAllCustomRoles();
    for (let i = 0; i < ids.length; i++) {
      roleNameCache[ids[i]] = names[i];
      const opt = document.createElement("option");
      opt.value = String(ids[i]);
      opt.textContent = `${names[i]} (custom)`;
      select.appendChild(opt);
    }
  } catch (e) {
    console.warn("Could not load custom roles:", e);
  }
}

let provider, signer, contract;

// ---------- Bulk download: all evidence for a case ----------
let caseBundleItems = []; // [{ evidenceId, description, fileHash, ipfsCid }]

async function findCaseEvidence(btn) {
  const caseNumber = document.getElementById("caseBundleCaseNumber").value.trim();
  const listDiv = document.getElementById("caseBundleList");
  const downloadBtn = document.getElementById("caseBundleDownloadBtn");
  document.getElementById("caseBundleResult").innerHTML = "";
  downloadBtn.style.display = "none";
  caseBundleItems = [];

  if (!caseNumber) {
    listDiv.innerHTML = "";
    showResult("caseBundleResult", "fail", "Enter a case number.");
    return;
  }

  const cachedKey = getCachedCaseKey(caseNumber);
  if (cachedKey && !document.getElementById("caseBundleKey").value.trim()) {
    document.getElementById("caseBundleKey").value = cachedKey;
  } else if (!document.getElementById("caseBundleKey").value.trim()) {
    try {
      const onChainKey = await contract.getCaseEncryptionKey(caseNumber);
      if (onChainKey) {
        document.getElementById("caseBundleKey").value = onChainKey;
        cacheCaseKeyLocally(caseNumber, onChainKey);
      }
    } catch (e) {
      // Caller likely holds no role yet, or the key was registered before this
      // feature existed — leave the field blank rather than failing the search.
    }
  }

  listDiv.innerHTML = `<div style="color:var(--ink-500); font-size:13px;">Searching all registered evidence...</div>`;
  setBtnBusy(btn, true, "Searching...");

  try {
    const caseIds = await contract.getEvidenceIdsByCase(caseNumber);
    const matches = [];
    for (const id of caseIds) {
      try {
        const [cNum, firNumber, policeStation, lawSections, description, fileHash, ipfsCid, registeredBy, registeredAt, status] = await contract.getEvidence(id);
        matches.push({ evidenceId: id, caseNumber: cNum, firNumber, policeStation, lawSections, description, fileHash, ipfsCid, registeredBy, registeredAt, status });
      } catch (e) { /* skip a record that fails to load rather than aborting the whole search */ }
    }

    caseBundleItems = matches;

    if (matches.length === 0) {
      listDiv.innerHTML = `<div style="color:var(--ink-500); font-size:13px;">No evidence found for case "${caseNumber}".</div>`;
      downloadBtn.style.display = "none";
      document.getElementById("courtReportBtn").style.display = "none";
      document.getElementById("courtReportHint").style.display = "none";
      return;
    }

    listDiv.innerHTML = matches.map((m, i) => `
      <div class="case-row">
        <div class="case-row-info">
          <span class="case-row-id">${m.evidenceId}</span>
          <span class="case-row-desc"> — ${m.description || "no description"}</span>
          ${!m.ipfsCid ? '<span class="case-row-flag"> (hash-only, no file on IPFS)</span>' : ''}
        </div>
        ${m.ipfsCid ? `
          <button type="button" class="download-icon-btn case-bundle-download-btn" data-idx="${i}" title="Download ${m.evidenceId} file" aria-label="Download evidence file">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
          </button>
        ` : ''}
      </div>
    `).join("");

    listDiv.querySelectorAll(".case-bundle-download-btn").forEach(rowBtn => {
      rowBtn.addEventListener("click", () => downloadSingleCaseItem(parseInt(rowBtn.dataset.idx, 10), rowBtn));
    });

    downloadBtn.style.display = "";
    document.getElementById("courtReportBtn").style.display = "";
    document.getElementById("courtReportHint").style.display = "";
  } catch (err) {
    listDiv.innerHTML = "";
    showResult("caseBundleResult", "fail", formatError(err));
  } finally {
    setBtnBusy(btn, false);
  }
}

async function downloadSingleCaseItem(idx, btn) {
  const resultEl = "caseBundleResult";
  const item = caseBundleItems[idx];
  if (!item) { showResult(resultEl, "fail", "Evidence item not found — try searching again."); return; }
  if (!item.ipfsCid) { showResult(resultEl, "fail", `${item.evidenceId} has no file on IPFS (hash-only record).`); return; }

  const caseKey = document.getElementById("caseBundleKey").value.trim();
  if (!caseKey) { showResult(resultEl, "fail", "Enter the Case Encryption Key for this case first."); return; }

  setBtnBusy(btn, true, "...");
  try {
    showResult(resultEl, "pending", `Fetching ${item.evidenceId} from IPFS...`);
    const url = `https://gateway.pinata.cloud/ipfs/${item.ipfsCid}`;
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`Gateway returned ${resp.status}`);
    const encryptedBuf = await resp.arrayBuffer();

    const key = await deriveCaseAesKey(item.caseNumber, caseKey);
    cacheCaseKeyLocally(item.caseNumber, caseKey);

    showResult(resultEl, "pending", `Decrypting ${item.evidenceId}...`);
    const { plaintextBuf, filename } = await decryptDownloadedBuffer(encryptedBuf, key);

    const hashBuffer = await crypto.subtle.digest("SHA-256", plaintextBuf);
    const recomputedHash = "0x" + Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, "0")).join("");
    const matches = recomputedHash.toLowerCase() === item.fileHash.toLowerCase();

    const blobUrl = URL.createObjectURL(new Blob([plaintextBuf]));
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = filename || item.evidenceId;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(blobUrl);

    showResult(resultEl, matches ? "ok" : "fail",
      matches
        ? `Decrypted and downloaded "${filename}" (${item.evidenceId}).<br>Hash matches on-chain record — integrity confirmed.`
        : `Decrypted "${filename}" (${item.evidenceId}), but the hash does NOT match the on-chain record.`
    );
  } catch (err) {
    showResult(resultEl, "fail", `${item.evidenceId}: ${formatError(err)}`);
  } finally {
    setBtnBusy(btn, false);
  }
}

async function downloadCaseBundle(btn) {
  const resultEl = "caseBundleResult";
  const caseNumber = document.getElementById("caseBundleCaseNumber").value.trim();
  const caseKey = document.getElementById("caseBundleKey").value.trim();
  const withFiles = caseBundleItems.filter(m => m.ipfsCid);

  if (withFiles.length === 0) {
    showResult(resultEl, "fail", "None of the matched evidence has a file on IPFS to download.");
    return;
  }
  if (!caseKey) {
    showResult(resultEl, "fail", "Enter the Case Encryption Key for this case first.");
    return;
  }

  setBtnBusy(btn, true, "Preparing ZIP...");
  try {
  const zip = new JSZip();
  let succeeded = 0;
  const failed = [];
  const key = await deriveCaseAesKey(caseNumber, caseKey);
  cacheCaseKeyLocally(caseNumber, caseKey);

  for (let i = 0; i < withFiles.length; i++) {
    const item = withFiles[i];
    showResult(resultEl, "pending", `Decrypting ${i + 1} of ${withFiles.length}: ${item.evidenceId}...`);
    try {
      const url = `https://gateway.pinata.cloud/ipfs/${item.ipfsCid}`;
      const resp = await fetch(url);
      if (!resp.ok) throw new Error(`Gateway returned ${resp.status}`);
      const encryptedBuf = await resp.arrayBuffer();

      const { plaintextBuf, filename } = await decryptDownloadedBuffer(encryptedBuf, key);

      const hashBuffer = await crypto.subtle.digest("SHA-256", plaintextBuf);
      const recomputedHash = "0x" + Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, "0")).join("");
      if (recomputedHash.toLowerCase() !== item.fileHash.toLowerCase()) {
        failed.push(`${item.evidenceId} — hash mismatch, excluded from ZIP`);
        continue;
      }

      zip.file(`${item.evidenceId}_${filename || "file"}`, plaintextBuf);
      succeeded++;
    } catch (err) {
      failed.push(`${item.evidenceId} — ${err && err.message ? err.message : "failed"}`);
    }
  }

  if (succeeded === 0) {
    showResult(resultEl, "fail", "Could not decrypt any files.<br>" + failed.join("<br>"));
    return;
  }

  showResult(resultEl, "pending", "Building ZIP...");
  const zipBlob = await zip.generateAsync({ type: "blob" });
  const zipUrl = URL.createObjectURL(zipBlob);
  const a = document.createElement("a");
  a.href = zipUrl;
  a.download = `${caseNumber}_evidence.zip`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(zipUrl);

  showResult(resultEl, failed.length ? "fail" : "ok",
    `Downloaded ${succeeded} of ${withFiles.length} file(s) as ZIP.` +
    (failed.length ? `<br>Skipped:<br>${failed.join("<br>")}` : "")
  );
  } finally {
    setBtnBusy(btn, false);
  }
}

// ---------- Bulk transfer: all evidence for a case, to one new holder ----------
let bulkTransferItems = []; // evidenceIds selected for transfer

async function findCaseEvidenceForTransfer(btn) {
  const caseNumber = document.getElementById("bulkTransferCaseNumber").value.trim();
  const listDiv = document.getElementById("bulkTransferList");
  const transferBtn = document.getElementById("bulkTransferBtn");
  document.getElementById("bulkTransferResult").innerHTML = "";
  transferBtn.style.display = "none";
  bulkTransferItems = [];

  if (!caseNumber) {
    listDiv.innerHTML = "";
    showResult("bulkTransferResult", "fail", "Enter a case number.");
    return;
  }

  listDiv.innerHTML = `<div style="color:var(--ink-500); font-size:13px;">Searching all registered evidence...</div>`;
  setBtnBusy(btn, true, "Searching...");
  try {
    const caseIds = await contract.getEvidenceIdsByCase(caseNumber);
    const matches = [];
    for (const id of caseIds) {
      try {
        const [, , , , description, , , , , status] = await contract.getEvidence(id);
        matches.push({ evidenceId: id, description, status });
      } catch (e) { /* skip a record that fails to load */ }
    }

    if (matches.length === 0) {
      listDiv.innerHTML = `<div style="color:var(--ink-500); font-size:13px;">No evidence found for case "${caseNumber}".</div>`;
      return;
    }

    listDiv.innerHTML = matches.map((m, i) => `
      <label class="case-row" style="cursor:pointer;">
        <span class="case-row-info">
          <input type="checkbox" class="bulk-transfer-check" data-idx="${i}" ${m.status === 0 ? "checked" : "disabled"} style="margin-right:8px;" />
          <span class="case-row-id">${m.evidenceId}</span>
          <span class="case-row-desc"> — ${m.description || "no description"}</span>
          ${m.status !== 0 ? '<span class="case-row-flag"> (case closed — not transferable)</span>' : ''}
        </span>
      </label>
    `).join("");

    bulkTransferItems = matches;
    transferBtn.style.display = "";
  } catch (err) {
    listDiv.innerHTML = "";
    showResult("bulkTransferResult", "fail", formatError(err));
  } finally {
    setBtnBusy(btn, false);
  }
}

async function bulkTransferCustody(btn) {
  const newHolder = document.getElementById("bulkTransferNewHolder").value.trim();
  const note = document.getElementById("bulkTransferNote").value.trim();
  const checked = Array.from(document.querySelectorAll(".bulk-transfer-check:checked"));
  const selectedIds = checked.map(c => bulkTransferItems[parseInt(c.dataset.idx, 10)].evidenceId);

  if (selectedIds.length === 0) {
    showResult("bulkTransferResult", "fail", "Select at least one evidence item.");
    return;
  }
  if (!newHolder) {
    showResult("bulkTransferResult", "fail", "Enter the new holder's address.");
    return;
  }

  setBtnBusy(btn, true, "Transferring...");
  try {
    showResult("bulkTransferResult", "pending", `Submitting one transaction for ${selectedIds.length} item(s)...`);
    const tx = selectedIds.length === 1
      ? await contract.transferCustody(selectedIds[0], newHolder, note)
      : await contract.transferCustodyBatch(selectedIds, newHolder, note);
    await tx.wait();
    showResult("bulkTransferResult", "ok", `Custody of ${selectedIds.length} item(s) transferred to ${newHolder}:<br>${selectedIds.join("<br>")}`);
    loadStats();
  } catch (err) {
    showResult("bulkTransferResult", "fail", formatError(err));
  } finally {
    setBtnBusy(btn, false);
  }
}

// ---------- Court-Ready Report (Section 63 certificate + custody trail) ----------
async function generateCourtReport(btn) {
  const resultEl = "courtReportResult";
  if (!caseBundleItems || caseBundleItems.length === 0) {
    showResult(resultEl, "fail", "Find case evidence first.");
    return;
  }
  setBtnBusy(btn, true, "Building report...");
  try {
    showResult(resultEl, "pending", "Gathering custody trails and officer identities...");
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const marginX = 54;
    let y = 64;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const maxWidth = pageWidth - marginX * 2;
    const INK = 30, INK_MUTED = 100, RULE = 190, NAVY = [20, 30, 60];

    function ensureSpace(neededHeight) {
      if (y + neededHeight > pageHeight - 64) {
        doc.addPage();
        drawLetterhead();
      }
    }
    function rule(gapBefore, gapAfter, weight) {
      gapBefore = gapBefore ?? 8; gapAfter = gapAfter ?? 10;
      ensureSpace(gapBefore + gapAfter + 2);
      y += gapBefore;
      doc.setDrawColor(RULE); doc.setLineWidth(weight || 0.6);
      doc.line(marginX, y, pageWidth - marginX, y);
      y += gapAfter;
    }
    function heading(text, size) {
      size = size || 12.5;
      ensureSpace(size + 10);
      doc.setTextColor(...NAVY);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(size);
      doc.text(text.toUpperCase(), marginX, y);
      y += size + 10;
      doc.setTextColor(INK);
      doc.setFont("helvetica", "normal");
    }
    function para(text, size) {
      size = size || 9.5;
      doc.setTextColor(INK);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(size);
      const lines = doc.splitTextToSize(text, maxWidth);
      ensureSpace(lines.length * (size + 4) + 4);
      doc.text(lines, marginX, y);
      y += lines.length * (size + 4) + 8;
    }
    // Two-column label/value row, like a form field — reads far more like an
    // official document than "Label: value" run into one line of body text.
    function field(label, value, colWidth) {
      colWidth = colWidth || 148;
      const size = 9;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(size);
      doc.setTextColor(INK_MUTED);
      const labelLines = doc.splitTextToSize(label.toUpperCase(), colWidth - 8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(INK);
      const valueLines = doc.splitTextToSize(String(value ?? "—") || "—", maxWidth - colWidth);
      const rows = Math.max(labelLines.length, valueLines.length);
      ensureSpace(rows * (size + 4.5) + 2);
      doc.setFont("helvetica", "bold"); doc.setTextColor(INK_MUTED);
      doc.text(labelLines, marginX, y);
      doc.setFont("helvetica", "normal"); doc.setTextColor(INK);
      doc.text(valueLines, marginX + colWidth, y);
      y += rows * (size + 4.5) + 2;
    }
    function mono(text, size) {
      size = size || 8.5;
      doc.setFont("courier", "normal");
      doc.setFontSize(size);
      doc.setTextColor(INK);
      const lines = doc.splitTextToSize(text, maxWidth - 10);
      ensureSpace(lines.length * (size + 3) + 10);
      doc.setFillColor(246, 247, 250);
      doc.rect(marginX, y - size, maxWidth, lines.length * (size + 3) + 6, "F");
      doc.text(lines, marginX + 5, y);
      y += lines.length * (size + 3) + 10;
      doc.setFont("helvetica", "normal");
    }

    // Repeated header block: title bar + report identifiers, drawn on every
    // page so a page separated from the rest of the bundle is still
    // self-identifying (a real requirement for court submissions).
    const reportRef = `EPS-${(caseBundleItems[0] && caseBundleItems[0].caseNumber) || "CASE"}-${Date.now().toString(36).toUpperCase()}`;
    function drawLetterhead() {
      y = 64;
      doc.setFillColor(...NAVY);
      doc.rect(0, 0, pageWidth, 6, "F");

      doc.setTextColor(...NAVY);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(15);
      doc.text("COURT-READY EVIDENCE REPORT", marginX, y);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(INK_MUTED);
      doc.text(reportRef, pageWidth - marginX, y, { align: "right" });
      y += 14;
      doc.setFontSize(9.5);
      doc.text("Blockchain-Verified Digital Chain of Custody — Evidence Protection System", marginX, y);
      y += 10;
      doc.setDrawColor(...NAVY); doc.setLineWidth(1.1);
      doc.line(marginX, y, pageWidth - marginX, y);
      y += 22;
      doc.setTextColor(INK);
    }

    drawLetterhead();

    // ---- Cover page ----
    const generatedByAddr = connectedAddress || "unknown wallet";
    const generatedByLabel = await getOfficerLabel(generatedByAddr);
    field("Case Number", caseBundleItems[0] && caseBundleItems[0].caseNumber);
    field("Report Generated", new Date().toLocaleString());
    field("Generated By", generatedByLabel + (generatedByLabel !== generatedByAddr ? ` (${generatedByAddr})` : ""));
    field("Evidence Items in Report", String(caseBundleItems.length));
    field("Smart Contract Address", CONTRACT_ADDRESS);
    field("Network", "Ethereum Sepolia Testnet (hackathon deployment)");
    rule(14, 14);

    heading("About This Report", 11);
    para(
      "This report is system-generated from an immutable, publicly verifiable blockchain ledger. It compiles, " +
      "for each evidence item filed under the case above, the registering officer's identity, the file's " +
      "cryptographic hash at the time of registration, the complete custody transfer history, and a draft " +
      "certificate addressing the requirements of Section 63 of the Bharatiya Sakshya Adhiniyam, 2023 " +
      "(electronic evidence)."
    );
    para(
      "This draft certificate must be reviewed and personally signed by the certifying officer before " +
      "submission to court — the on-chain record does not by itself substitute for that signature. Every " +
      "figure in this report can be independently re-verified by any party against the smart contract address " +
      "above on a public block explorer."
    );

    heading("Contents", 11);
    caseBundleItems.forEach((item, i) => field(`${i + 1}.`, item.evidenceId, 34));

    // ---- Evidence items — flow continuously; a new page is only added when
    // content genuinely overflows (via ensureSpace), not once per item ----
    rule(4, 12);
    heading("Evidence Items", 12.5);

    for (let idx = 0; idx < caseBundleItems.length; idx++) {
      const item = caseBundleItems[idx];
      if (idx > 0) rule(10, 12);

      heading(`${idx + 1}. ${item.evidenceId}`, 11);

      field("FIR Number", item.firNumber);
      field("Police Station", item.policeStation);
      field("Sections of Law Invoked", item.lawSections);
      field("Description", item.description);
      field("Status", item.status === 0 ? "Open" : "Closed");
      field("Registered By", await getOfficerLabel(item.registeredBy));
      field("Registered On", new Date(item.registeredAt.toNumber() * 1000).toLocaleString());
      field("SHA-256 File Hash", "");
      mono(item.fileHash);
      field("IPFS CID (encrypted)", "");
      mono(item.ipfsCid || "— hash-only record; no file stored off-chain —");

      y += 4;
      doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(...NAVY);
      ensureSpace(14);
      doc.text("Chain of Custody", marginX, y);
      y += 12;
      doc.setFont("helvetica", "normal"); doc.setTextColor(INK);

      try {
        const [holders, holderRoles, timestamps, notes] = await contract.getCustodyTrail(item.evidenceId);
        for (let i = 0; i < holders.length; i++) {
          const label = await getOfficerLabel(holders[i]);
          const roleName = await resolveRoleName(holderRoles[i]);
          const date = new Date(timestamps[i].toNumber() * 1000).toLocaleString();

          ensureSpace(26);
          doc.setFont("helvetica", "bold"); doc.setFontSize(8.5); doc.setTextColor(...NAVY);
          doc.text(`${i + 1}.  ${roleName} — ${label}`, marginX, y);
          y += 11;
          doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(INK_MUTED);
          doc.text(`${date}${label !== holders[i] ? `  •  ${holders[i]}` : ""}`, marginX + 14, y);
          y += 10;
          if (notes[i]) {
            doc.setTextColor(INK);
            const noteLines = doc.splitTextToSize(notes[i], maxWidth - 14);
            doc.text(noteLines, marginX + 14, y);
            y += noteLines.length * 10 + 3;
          } else {
            y += 3;
          }
          doc.setTextColor(INK);
        }
      } catch (e) {
        para("Custody trail unavailable — " + formatError(e), 8.5);
      }

      try {
        const [findingsList, reportHashes, , submittedBys, labTimestamps] = await contract.getLabReports(item.evidenceId);
        if (findingsList.length > 0) {
          y += 4;
          doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(...NAVY);
          ensureSpace(14);
          doc.text("Lab Analysis Findings", marginX, y);
          y += 12;
          doc.setFont("helvetica", "normal"); doc.setTextColor(INK);
          for (let i = 0; i < findingsList.length; i++) {
            const label = await getOfficerLabel(submittedBys[i]);
            const date = new Date(labTimestamps[i].toNumber() * 1000).toLocaleString();
            ensureSpace(24);
            doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.setTextColor(INK_MUTED);
            doc.text(`${date} — ${label}${label !== submittedBys[i] ? `  •  ${submittedBys[i]}` : ""}`, marginX, y);
            y += 10;
            doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); doc.setTextColor(INK);
            const findingLines = doc.splitTextToSize(findingsList[i], maxWidth);
            doc.text(findingLines, marginX, y);
            y += findingLines.length * 10 + 3;
            if (reportHashes[i]) {
              doc.setFont("courier", "normal"); doc.setFontSize(7.5); doc.setTextColor(INK_MUTED);
              doc.text(`Report Hash: ${reportHashes[i]}`, marginX, y);
              y += 10;
            }
            doc.setTextColor(INK);
          }
        }
      } catch (e) { /* lab reports are optional; skip silently if unavailable */ }
    }

    // ---- One Section 63 certificate covering the whole case, signed once ----
    rule(12, 12);
    heading("Section 63 Certificate (Draft)", 11.5);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8.5);
    doc.setTextColor(INK_MUTED);
    const italicLines = doc.splitTextToSize("Bharatiya Sakshya Adhiniyam, 2023", maxWidth);
    ensureSpace(italicLines.length * 12 + 6);
    doc.text(italicLines, marginX, y);
    y += italicLines.length * 12 + 6;
    doc.setTextColor(INK);
    doc.setFont("helvetica", "normal");

    para(
      "I certify, in relation to each electronic record identified above, that: (a) it was produced by the " +
      "Evidence Protection System, a computer/blockchain-based system used regularly for the storage of " +
      "digital evidence during the ordinary course of the activities of the concerned law-enforcement office; " +
      "(b) during the period in question, the system was operating properly and, if not, was not such as to " +
      "affect the electronic record or the accuracy of its contents; (c) the information contained in each " +
      "electronic record reproduces or is derived from information fed into the system in the ordinary course " +
      "of those activities; and (d) each cryptographic hash recorded above was computed at the time of " +
      "registration and will only match its file if it remains unaltered.",
      9
    );
    para(
      "This certificate is a draft prepared from the on-chain record for the certifying officer's review and " +
      "manual signature; it does not itself constitute the signed certificate required by law.",
      9
    );

    ensureSpace(70);
    y += 6;
    doc.setDrawColor(RULE); doc.setLineWidth(0.6);
    doc.line(marginX, y + 34, marginX + 200, y + 34);
    doc.setFontSize(8); doc.setTextColor(INK_MUTED);
    doc.text("Signature of Certifying Officer", marginX, y + 44);
    doc.line(pageWidth - marginX - 140, y + 34, pageWidth - marginX, y + 34);
    doc.text("Date", pageWidth - marginX - 140, y + 44);
    doc.setTextColor(INK);
    y += 58;

    // ---- Footer on every page ----
    const pageCount = doc.internal.getNumberOfPages();
    for (let p = 1; p <= pageCount; p++) {
      doc.setPage(p);
      doc.setDrawColor(RULE); doc.setLineWidth(0.5);
      doc.line(marginX, pageHeight - 44, pageWidth - marginX, pageHeight - 44);
      doc.setFontSize(7.5);
      doc.setTextColor(INK_MUTED);
      doc.setFont("helvetica", "normal");
      doc.text(reportRef, marginX, pageHeight - 32);
      doc.text(
        "Prototype system — verify independently on-chain before relying on this document.",
        pageWidth / 2, pageHeight - 32, { align: "center" }
      );
      doc.text(`Page ${p} of ${pageCount}`, pageWidth - marginX, pageHeight - 32, { align: "right" });
      doc.setTextColor(0);
    }

    const filename = `Court-Report_${(caseBundleItems[0] && caseBundleItems[0].caseNumber) || "case"}.pdf`;
    doc.save(filename);
    showResult(resultEl, "ok", `Report generated: ${filename}`);
  } catch (err) {
    showResult(resultEl, "fail", formatError(err));
  } finally {
    setBtnBusy(btn, false);
  }
}

// ---------- Contract Address Loader ----------
function loadContractAddress() {
  const input = document.getElementById("contractAddressInput").value.trim();
  const statusEl = document.getElementById("contractStatus");

  if (!ethers.utils.isAddress(input)) {
    statusEl.innerText = "Invalid address — check you copied it correctly from Remix";
    statusEl.classList.remove("loaded");
    return;
  }

  CONTRACT_ADDRESS = input;
  localStorage.setItem("eps_contract_address", input);
  statusEl.innerText = "Saved as default: " + input.slice(0,6) + "..." + input.slice(-4) + " — all users will now use this automatically";
  statusEl.classList.add("loaded");

  // If wallet is already connected, (re)build the contract instance right away
  if (signer) {
    contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
    signer.getAddress().then(addr => { refreshRoleBadge(addr); loadStats(); });
  }
}

// ---------- Tabs ----------
document.querySelectorAll(".stage-tab").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".stage-tab").forEach(t => t.classList.remove("active"));
    document.querySelectorAll(".panel").forEach(p => p.classList.remove("active"));
    tab.classList.add("active");
    document.getElementById(tab.dataset.panel).classList.add("active");
  });
});

// ---------- Wallet ----------
document.getElementById("connectBtn").onclick = connectWallet;

const SEPOLIA_CHAIN_ID = "0xaa36a7"; // 11155111
const SEPOLIA_PARAMS = {
  chainId: SEPOLIA_CHAIN_ID,
  chainName: "Sepolia",
  nativeCurrency: { name: "Sepolia ETH", symbol: "ETH", decimals: 18 },
  rpcUrls: ["https://rpc.sepolia.org"],
  blockExplorerUrls: ["https://sepolia.etherscan.io"]
};

// Finds an injected MetaMask provider, waiting briefly for the extension to
// finish injecting (it doesn't always exist the instant the page loads),
// and picking MetaMask specifically out of window.ethereum.providers if the
// user has multiple wallet extensions installed (Coinbase Wallet, etc. can
// otherwise silently take over window.ethereum and make MetaMask "vanish").
function findMetaMaskProvider() {
  const eth = window.ethereum;
  if (!eth) return null;
  if (Array.isArray(eth.providers)) {
    return eth.providers.find(p => p.isMetaMask) || eth.providers[0] || null;
  }
  return eth.isMetaMask || eth ? eth : null;
}

function waitForMetaMask(timeoutMs = 3000) {
  return new Promise(resolve => {
    const existing = findMetaMaskProvider();
    if (existing) return resolve(existing);

    let done = false;
    const onInit = () => {
      if (done) return;
      done = true;
      window.removeEventListener("ethereum#initialized", onInit);
      resolve(findMetaMaskProvider());
    };
    window.addEventListener("ethereum#initialized", onInit);

    const start = Date.now();
    const poll = setInterval(() => {
      const p = findMetaMaskProvider();
      if (p || Date.now() - start > timeoutMs) {
        clearInterval(poll);
        if (!done) {
          done = true;
          window.removeEventListener("ethereum#initialized", onInit);
          resolve(p || null);
        }
      }
    }, 150);
  });
}

async function ensureSepolia(ethProvider) {
  const currentChainId = await ethProvider.request({ method: "eth_chainId" });
  if (currentChainId === SEPOLIA_CHAIN_ID) return true;

  try {
    await ethProvider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: SEPOLIA_CHAIN_ID }]
    });
    return true;
  } catch (switchErr) {
    // 4902 = chain not added to MetaMask yet — add it, then switch
    if (switchErr.code === 4902) {
      try {
        await ethProvider.request({
          method: "wallet_addEthereumChain",
          params: [SEPOLIA_PARAMS]
        });
        return true;
      } catch (addErr) {
        alert("Please add/switch to the Sepolia network in MetaMask manually to continue.");
        return false;
      }
    }
    // 4001 = user rejected the switch request
    alert("Please switch MetaMask to the Sepolia network to use this system.");
    return false;
  }
}

async function connectWallet() {
  try {
    const ethProvider = await waitForMetaMask();

    if (!ethProvider) {
      alert(
        "MetaMask wasn't detected in this browser tab.\n\n" +
        "If it's installed, try:\n" +
        "• Unlocking the MetaMask extension\n" +
        "• Refreshing this page\n" +
        "• Disabling other wallet extensions (Coinbase Wallet, etc.) that may be conflicting\n" +
        "• Opening this page over http(s):// rather than as a local file"
      );
      return;
    }

    const chainOk = await ensureSepolia(ethProvider);
    if (!chainOk) return;

    provider = new ethers.providers.Web3Provider(ethProvider);
    await provider.send("eth_requestAccounts", []);
    signer = provider.getSigner();

    const address = await signer.getAddress();
    const network = await provider.getNetwork();

    document.getElementById("netDot").classList.add("live");
    document.getElementById("netLabel").innerText = network.name !== "unknown" ? network.name : "Sepolia";
    document.getElementById("connectBtn").innerText = address.slice(0,6) + "..." + address.slice(-4);
    document.getElementById("logoutBtn").style.display = "";

    // -- Transition to app if on landing page --
    const landing = document.getElementById("landingPage");
    const app = document.getElementById("appContent");
    if (landing && landing.style.display !== "none") {
      landing.style.opacity = "0";
      setTimeout(() => {
        landing.style.display = "none";
        app.style.display = "block";
        setTimeout(() => app.style.opacity = "1", 50);
      }, 500);
    }

    // Keep the page in sync if the user switches accounts/networks later
    ethProvider.on && ethProvider.on("chainChanged", () => window.location.reload());
    ethProvider.on && ethProvider.on("accountsChanged", () => window.location.reload());

    const isConfigured = CONTRACT_ADDRESS
      && ethers.utils.isAddress(CONTRACT_ADDRESS)
      && CONTRACT_ADDRESS !== "0x0000000000000000000000000000000000000000";

    if (isConfigured) {
      contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      await refreshRoleBadge(address);
      await loadStats();

      if (window.epsApi) {
        window.epsApi.logAudit("WALLET_CONNECTED", address, { network: network.name || "Sepolia" });
        if (!hasFaceEnrollment(address)) {
          window.epsApi.getProfile(address).then(res => {
            if (res && res.exists && res.profile && res.profile.faceDescriptor && res.profile.pinHash) {
              localStorage.setItem(faceStorageKey(address), JSON.stringify({
                descriptor: res.profile.faceDescriptor,
                pinHash: res.profile.pinHash
              }));
              refreshFaceEnrollStatus();
            }
          }).catch(() => {});
        }
      }
    } else if (isAdminMode) {
      document.getElementById("contractStatus").innerText = "Wallet connected — paste your deployed contract address above";
    } else {
      alert("This system hasn't been fully set up yet. Please contact your system administrator.");
    }
  } catch (err) {
    console.error("connectWallet failed:", err);
    if (err.code === 4001) {
      // user closed/rejected the MetaMask popup — not a real error, just inform quietly
      alert("Connection request was closed. Click Connect Wallet again when ready.");
    } else {
      alert("Could not connect wallet: " + (err.message || err));
    }
  }
}

// If the contract address is already configured, build the contract instance
// as soon as the page loads (before the user even clicks Connect), so the
// "Connect Wallet" click is the only action a regular user ever has to take.
window.addEventListener("DOMContentLoaded", () => {
  const isConfigured = CONTRACT_ADDRESS
    && ethers.utils.isAddress(CONTRACT_ADDRESS)
    && CONTRACT_ADDRESS !== "0x0000000000000000000000000000000000000000";
  if (isConfigured) {
    document.getElementById("contractStatus").innerText = "Contract ready: " + CONTRACT_ADDRESS.slice(0,6) + "..." + CONTRACT_ADDRESS.slice(-4);
    document.getElementById("contractStatus").classList.add("loaded");
  }
});

let connectedAddress = null;
let isCurrentUserAdmin = false;

async function refreshRoleBadge(address) {
  connectedAddress = address;
  try {
    const badge = document.getElementById("roleBadge");
    const adminAddr = await contract.admin();
    isCurrentUserAdmin = adminAddr.toLowerCase() === address.toLowerCase();

    if (isCurrentUserAdmin) {
      badge.innerText = "Admin";
      badge.classList.add("assigned");
    } else {
      const role = await contract.getRole(address);
      badge.innerText = await resolveRoleName(role);
      if (role !== 0) badge.classList.add("assigned");
      else badge.classList.remove("assigned");
    }

    document.getElementById("adminOnlyDivider").style.display = isCurrentUserAdmin ? "" : "none";
    document.getElementById("adminOnlyGrid").style.display = isCurrentUserAdmin ? "" : "none";
    await refreshRoleOptions();
    await refreshCustomRoleList();
    await loadSafetyStatus();
    await refreshFaceEnrollStatus();
  } catch (e) { /* contract not deployed yet at placeholder address */ }
}

// ---------- Stage 5b: Emergency Pause & Admin Transfer ----------
async function loadSafetyStatus() {
  try {
    const isPaused = await contract.paused();
    document.getElementById("pauseStatus").innerText = isPaused
      ? "🔴 Contract is currently PAUSED — writes are blocked"
      : "🟢 Contract is active — normal operation";
    document.getElementById("pauseBtn").style.display = isPaused ? "none" : "";
    document.getElementById("unpauseBtn").style.display = isPaused ? "" : "none";

    const pending = await contract.pendingAdmin();
    const zero = "0x0000000000000000000000000000000000000000";
    if (pending.toLowerCase() === zero) {
      document.getElementById("pendingAdminStatus").innerText = "No admin transfer pending.";
      document.getElementById("acceptAdminBtn").style.display = "none";
      document.getElementById("cancelAdminBtn").style.display = "none";
    } else {
      document.getElementById("pendingAdminStatus").innerText = "Pending admin (awaiting acceptance): " + pending;
      document.getElementById("cancelAdminBtn").style.display = isCurrentUserAdmin ? "" : "none";
      document.getElementById("acceptAdminBtn").style.display =
        connectedAddress && connectedAddress.toLowerCase() === pending.toLowerCase() ? "" : "none";
    }
  } catch (e) { /* view calls only work once contract is deployed & reachable */ }
}

async function pauseContract() {
  const verified = await verifyFaceBeforeAction("Pause Contract");
  if (!verified) return;
  try {
    showResult("pauseResult", "pending", "Submitting transaction...");
    const tx = await contract.pause();
    await tx.wait();
    if (window.epsApi) {
      window.epsApi.logAudit("CONTRACT_PAUSED", connectedAddress, { txHash: tx.hash });
    }
    showResult("pauseResult", "ok", "Contract paused.");
    loadSafetyStatus();
  } catch (err) {
    showResult("pauseResult", "fail", formatError(err));
  }
}

async function unpauseContract() {
  const verified = await verifyFaceBeforeAction("Unpause Contract");
  if (!verified) return;
  try {
    showResult("pauseResult", "pending", "Submitting transaction...");
    const tx = await contract.unpause();
    await tx.wait();
    if (window.epsApi) {
      window.epsApi.logAudit("CONTRACT_UNPAUSED", connectedAddress, { txHash: tx.hash });
    }
    showResult("pauseResult", "ok", "Contract unpaused.");
    loadSafetyStatus();
  } catch (err) {
    showResult("pauseResult", "fail", formatError(err));
  }
}

async function proposeAdminAction() {
  const addr = document.getElementById("proposeAdminAddress").value.trim();
  const verified = await verifyFaceBeforeAction("Propose New Admin");
  if (!verified) return;
  try {
    showResult("adminTransferResult", "pending", "Submitting transaction...");
    const tx = await contract.proposeAdmin(addr);
    await tx.wait();
    showResult("adminTransferResult", "ok", `Proposed ${addr} as new admin. They must connect with that wallet and click Accept.`);
    loadSafetyStatus();
  } catch (err) {
    showResult("adminTransferResult", "fail", formatError(err));
  }
}

async function acceptAdminAction() {
  const verified = await verifyFaceBeforeAction("Accept Admin Role");
  if (!verified) return;
  try {
    showResult("adminTransferResult", "pending", "Submitting transaction...");
    const tx = await contract.acceptAdmin();
    await tx.wait();
    showResult("adminTransferResult", "ok", "You are now the admin.");
    if (connectedAddress) refreshRoleBadge(connectedAddress);
  } catch (err) {
    showResult("adminTransferResult", "fail", formatError(err));
  }
}

async function cancelAdminTransferAction() {
  try {
    showResult("adminTransferResult", "pending", "Submitting transaction...");
    const tx = await contract.cancelAdminTransfer();
    await tx.wait();
    showResult("adminTransferResult", "ok", "Pending admin transfer cancelled.");
    loadSafetyStatus();
  } catch (err) {
    showResult("adminTransferResult", "fail", formatError(err));
  }
}

async function loadStats() {
  try {
    const total = await contract.getTotalEvidenceCount();
    const transfers = await contract.totalTransfers();
    const passes = await contract.totalVerificationPasses();
    countUp("statEvidence", total.toNumber());
    countUp("statTransfers", transfers.toNumber());
    countUp("statVerified", passes.toNumber());
  } catch (e) { /* ignore until connected + deployed */ }
}

function countUp(elId, target) {
  const el = document.getElementById(elId);
  let current = 0;
  const step = Math.max(1, Math.ceil(target / 30));
  const interval = setInterval(() => {
    current += step;
    if (current >= target) { current = target; clearInterval(interval); }
    el.innerText = current;
  }, 25);
}

// ---------- Off-chain storage: IPFS via Pinata ----------
let PINATA_JWT = "";

// Auto-retrieve configured Pinata JWT from local backend config
fetch('/api/config')
  .then(r => r.json())
  .then(cfg => { if (cfg && cfg.pinataJwt) PINATA_JWT = cfg.pinataJwt; })
  .catch(() => {});

async function uploadToPinata(fileOrBlob, filename) {
  if (!PINATA_JWT) {
    try {
      const cfgRes = await fetch('/api/config');
      const cfg = await cfgRes.json();
      if (cfg && cfg.pinataJwt) PINATA_JWT = cfg.pinataJwt;
    } catch (_) {}
  }
  if (!PINATA_JWT) {
    throw new Error("Pinata IPFS JWT is not configured. Please set PINATA_JWT in .env");
  }

  const formData = new FormData();
  formData.append("file", fileOrBlob, filename || fileOrBlob.name);
  formData.append("pinataMetadata", JSON.stringify({ name: filename || fileOrBlob.name }));
  formData.append("pinataOptions", JSON.stringify({ cidVersion: 1 }));

  const response = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
    method: "POST",
    headers: { Authorization: `Bearer ${PINATA_JWT}` },
    body: formData
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Pinata upload failed: ${response.status} ${errText}`);
  }

  const data = await response.json();
  return data.IpfsHash; // CID to store on-chain as ipfsCid
}

// ---------- Case-level encryption key ----------
function generateCaseKey() {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return btoa(String.fromCharCode(...bytes)).replace(/[+/=]/g, "");
}

async function deriveCaseAesKey(caseNumber, caseKeyPassphrase) {
  const enc = new TextEncoder();
  const baseKey = await crypto.subtle.importKey("raw", enc.encode(caseKeyPassphrase), "PBKDF2", false, ["deriveKey"]);
  const salt = enc.encode(`EPS-CASE-SALT:v1:${caseNumber}`);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 150000, hash: "SHA-256" },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

const caseKeyMemory = {};
function cacheCaseKeyLocally(caseNumber, caseKeyPassphrase) {
  caseKeyMemory[caseNumber] = caseKeyPassphrase;
  try { sessionStorage.setItem("eps_case_key:" + caseNumber, caseKeyPassphrase); } catch (e) {}
}
function getCachedCaseKey(caseNumber) {
  if (caseKeyMemory[caseNumber]) return caseKeyMemory[caseNumber];
  try { return sessionStorage.getItem("eps_case_key:" + caseNumber) || ""; } catch (e) { return ""; }
}

const ENC_FORMAT_VERSION = 2;

async function encryptFileForUpload(file, key) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const filenameBytes = new TextEncoder().encode(file.name);
  if (filenameBytes.length > 65535) throw new Error("Filename too long to encode");
  const filenameLen = new Uint8Array(2);
  new DataView(filenameLen.buffer).setUint16(0, filenameBytes.length, false);

  const plaintext = await file.arrayBuffer();
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plaintext);

  const headerLen = 1 + iv.byteLength + filenameLen.byteLength + filenameBytes.byteLength;
  const combined = new Uint8Array(headerLen + ciphertext.byteLength);
  let offset = 0;
  combined[offset] = ENC_FORMAT_VERSION; offset += 1;
  combined.set(iv, offset); offset += iv.byteLength;
  combined.set(filenameLen, offset); offset += filenameLen.byteLength;
  combined.set(filenameBytes, offset); offset += filenameBytes.byteLength;
  combined.set(new Uint8Array(ciphertext), offset);

  return new Blob([combined], { type: "application/octet-stream" });
}

async function decryptDownloadedBuffer(buf, key) {
  const bytes = new Uint8Array(buf);
  const version = bytes[0];
  if (version !== ENC_FORMAT_VERSION) {
    throw new Error(`Unrecognized encrypted-file format (v${version}). This evidence may have been registered before filename support was added — it will need to be re-registered.`);
  }
  let offset = 1;
  const iv = bytes.slice(offset, offset + 12); offset += 12;
  const filenameLen = new DataView(bytes.buffer, bytes.byteOffset + offset, 2).getUint16(0, false); offset += 2;
  const filenameBytes = bytes.slice(offset, offset + filenameLen); offset += filenameLen;
  const filename = new TextDecoder().decode(filenameBytes);
  const ciphertext = bytes.slice(offset);

  const plaintextBuf = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
  return { plaintextBuf, filename };
}

// ---------- Helpers ----------
async function hashFile(file) {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return "0x" + hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

function showResult(elId, cls, html) {
  document.getElementById(elId).innerHTML = `<div class="result ${cls}"><span>${html}</span></div>`;
}

function setBtnBusy(btn, busy, busyLabel) {
  if (!btn) return;
  if (busy) {
    if (btn.dataset.originalLabel === undefined) btn.dataset.originalLabel = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<span class="btn-spinner"></span>${busyLabel || "Working..."}`;
  } else {
    btn.disabled = false;
    if (btn.dataset.originalLabel !== undefined) btn.innerHTML = btn.dataset.originalLabel;
  }
}

// ---------- Stage 1: Register ----------
function generateAndFillCaseKey() {
  const caseNumber = document.getElementById("regCaseNumber").value.trim();
  const firNumber = document.getElementById("regFirNumber").value.trim();
  const files = document.getElementById("regFiles").files;
  if (!caseNumber || !firNumber || files.length === 0) {
    showResult("regResult", "fail", "Fill in the Case Number, FIR Number, and select at least one file before generating a key.");
    return;
  }
  document.getElementById("regResult").innerHTML = "";
  document.getElementById("regCaseKey").value = generateCaseKey();
}

function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/* ═══════════════════════════════════════════════════════════════════
   REFERENCE-MATCHED FILE UPLOAD ANIMATION SYSTEM
   Matches user screenshots:
   - Compact View: 98px pill card, purple wave (#6558f5), 4 circular action buttons
   - Expanded View: 295px morph, 165px slim tracks, status, single-file removal
   - Complete State: 100% complete, emerald wave (#10b981), green checkmark, confetti
   ═══════════════════════════════════════════════════════════════════ */

const dropzoneWaveTimers = {};
const dropzoneSimTimers = {};
const dropzoneCardStates = {};

function burstConfetti(container) {
  if (!container) return;
  container.innerHTML = '';
  const colors = ['#6558f5', '#10b981', '#f59e0b', '#ec4899', '#3b82f6', '#8b5cf6'];
  for (let i = 0; i < 32; i++) {
    const p = document.createElement('div');
    p.className = 'confetti-particle';
    const angle = Math.random() * Math.PI * 2;
    const dist = 60 + Math.random() * 150;
    const dx = Math.cos(angle) * dist;
    const dy = Math.sin(angle) * dist - 35;
    p.style.setProperty('--dx', `${dx.toFixed(1)}px`);
    p.style.setProperty('--dy', `${dy.toFixed(1)}px`);
    p.style.left = '50%';
    p.style.top = '50%';
    p.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    p.style.animationDelay = `${(Math.random() * 0.12).toFixed(2)}s`;
    container.appendChild(p);
    setTimeout(() => p.remove(), 1100);
  }
}

function startCardWave(cardId) {
  if (dropzoneWaveTimers[cardId]) clearInterval(dropzoneWaveTimers[cardId]);
  let phase = 0;
  dropzoneWaveTimers[cardId] = setInterval(() => {
    const state = dropzoneCardStates[cardId];
    if (state && state.isPaused) return;
    phase += 0.08;

    const stroke = document.getElementById(`${cardId}-stroke`);
    const fill = document.getElementById(`${cardId}-fill`);
    if (!stroke || !fill) return;

    const isDone = state ? state.isDone : false;
    const isStaged = state ? state.isStaged : false;
    const baseHeight = isStaged ? 30 : 25;
    const amp = isDone ? 2.0 : (isStaged ? 2.5 : 4.5);
    const p1 = baseHeight + Math.sin(phase) * amp;
    const p2 = baseHeight + Math.sin(phase + 1.2) * amp;
    const p3 = baseHeight + Math.sin(phase + 2.4) * amp;
    const p4 = baseHeight + Math.sin(phase + 3.6) * amp;

    fill.setAttribute('d', `M0,40 L0,${p1.toFixed(1)} Q130,${p2.toFixed(1)} 260,${p3.toFixed(1)} T520,${p4.toFixed(1)} L520,40 Z`);
    stroke.setAttribute('d', `M0,${p1.toFixed(1)} Q130,${p2.toFixed(1)} 260,${p3.toFixed(1)} T520,${p4.toFixed(1)}`);
  }, 45);
}

function toggleDropzoneCardExpand(inputId) {
  const card = document.getElementById(`${inputId}-upload-card`);
  if (!card) return;
  card.classList.toggle('is-expanded');
  const state = dropzoneCardStates[inputId];
  if (state) state.isExpanded = card.classList.contains('is-expanded');
}

function toggleDropzoneCardPause(inputId) {
  const state = dropzoneCardStates[inputId];
  if (!state || state.isDone) return;
  state.isPaused = !state.isPaused;
  const toggleBtn = document.getElementById(`${inputId}-toggle-btn`);
  const statusEl = document.getElementById(`${inputId}-status`);
  if (toggleBtn) {
    if (state.isPaused) toggleBtn.classList.add('is-paused');
    else toggleBtn.classList.remove('is-paused');
  }
  if (statusEl) {
    if (state.isPaused) {
      statusEl.textContent = `${state.percent || 0}% · Paused · Click to resume`;
    } else {
      statusEl.textContent = `${state.percent || 0}% · ${state.stageText || 'In Progress'}${state.speedText ? ' · ' + state.speedText : ''}`;
    }
  }
}

function setDropzoneCardProgress(inputId, pct, stageText, speedText) {
  const state = dropzoneCardStates[inputId];
  if (state) {
    state.isStaged = false;
    state.percent = pct;
    state.stageText = stageText;
    state.speedText = speedText;
  }
  const fillBg = document.getElementById(`${inputId}-fill-bg`);
  const statusEl = document.getElementById(`${inputId}-status`);
  const titleEl = document.getElementById(`${inputId}-title`);
  const expTitleEl = document.getElementById(`${inputId}-exp-title`);
  const badge = document.getElementById(`${inputId}-badge`);
  const expBadge = document.getElementById(`${inputId}-exp-badge`);

  if (fillBg) {
    fillBg.classList.remove('is-staged');
    fillBg.style.width = `${pct}%`;
  }
  const count = state && state.files ? state.files.length : 1;
  const countTitle = `Filing ${count} Evidence File${count > 1 ? 's' : ''}`;
  if (titleEl) titleEl.textContent = countTitle;
  if (expTitleEl) expTitleEl.textContent = countTitle;

  const badgeHtml = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:11px; height:11px; animation: pulseDot 1.4s infinite;">
      <circle cx="12" cy="12" r="9"/>
    </svg>
    <span>Filing...</span>
  `;
  if (badge) {
    badge.className = 'staged-badge';
    badge.innerHTML = badgeHtml;
  }
  if (expBadge) {
    expBadge.className = 'staged-badge';
    expBadge.innerHTML = badgeHtml;
  }

  if (statusEl) {
    const speedPart = speedText ? ` · ${speedText}` : '';
    statusEl.textContent = `${pct}% · ${stageText}${speedPart}`;
    statusEl.style.color = '#6e768e';
  }
}

function completeDropzoneCard(inputId, blockNumber) {
  const state = dropzoneCardStates[inputId];
  if (state) {
    state.isDone = true;
    state.percent = 100;
  }
  const card = document.getElementById(`${inputId}-upload-card`);
  const fillBg = document.getElementById(`${inputId}-fill-bg`);
  const title = document.getElementById(`${inputId}-title`);
  const expTitle = document.getElementById(`${inputId}-exp-title`);
  const badge = document.getElementById(`${inputId}-badge`);
  const expBadge = document.getElementById(`${inputId}-exp-badge`);
  const status = document.getElementById(`${inputId}-status`);
  const toggleBtn = document.getElementById(`${inputId}-toggle-btn`);
  const fill = document.getElementById(`${inputId}-fill`);
  const stroke = document.getElementById(`${inputId}-stroke`);
  const confetti = document.getElementById(`${inputId}-confetti`);

  if (card) card.classList.add('is-done', 'is-complete-bounce');
  if (fillBg) {
    fillBg.classList.remove('is-staged');
    fillBg.style.width = '100%';
    fillBg.classList.add('is-done');
  }
  const fileCount = state && state.files ? state.files.length : 1;
  const countText = `${fileCount} Evidence File${fileCount > 1 ? 's' : ''} Filed On-Chain ✓`;
  if (title) title.textContent = countText;
  if (expTitle) expTitle.textContent = countText;

  const doneBadgeHtml = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="width:11px; height:11px;">
      <polyline points="20 6 9 17 4 12"></polyline>
    </svg>
    <span>Done ✓</span>
  `;
  if (badge) {
    badge.className = 'complete-badge show';
    badge.innerHTML = doneBadgeHtml;
  }
  if (expBadge) {
    expBadge.className = 'complete-badge show';
    expBadge.innerHTML = doneBadgeHtml;
  }
  if (status) {
    const blockText = blockNumber ? ` · Block #${blockNumber}` : ' · Confirmed';
    status.textContent = `100% · Recorded On-Chain${blockText}`;
    status.style.color = '#10b981';
    status.style.fontWeight = '600';
  }
  if (toggleBtn) {
    toggleBtn.classList.remove('is-paused');
    toggleBtn.classList.add('is-complete');
  }
  if (fill) fill.setAttribute('fill', `url(#${inputId}-greenGrad)`);
  if (stroke) stroke.style.stroke = '#10b981';

  if (state && state.files) {
    state.files.forEach((_, idx) => {
      const bar = document.getElementById(`${inputId}-bar-${idx}`);
      const rowStatus = document.getElementById(`${inputId}-rowstatus-${idx}`);
      const row = document.getElementById(`${inputId}-row-${idx}`);
      if (bar) {
        bar.style.width = '100%';
        bar.style.backgroundColor = '#10b981';
      }
      if (rowStatus) {
        rowStatus.textContent = '100% · Filed On-Chain ✓';
        rowStatus.style.color = '#10b981';
        rowStatus.style.fontWeight = '600';
      }
      if (row) row.classList.add('is-done');
    });
  }

  burstConfetti(confetti);
}

function handleModernFileChange(input, previewId, contentId) {
  const preview = document.getElementById(previewId);
  const content = document.getElementById(contentId);
  if (!preview || !content) return;

  const dropzone = input.closest('.modern-file-dropzone');
  const files = Array.from(input.files || []);

  if (files.length === 0) {
    if (dropzoneWaveTimers[input.id]) {
      clearInterval(dropzoneWaveTimers[input.id]);
      delete dropzoneWaveTimers[input.id];
    }
    if (dropzoneSimTimers[input.id]) {
      clearInterval(dropzoneSimTimers[input.id]);
      delete dropzoneSimTimers[input.id];
    }
    delete dropzoneCardStates[input.id];
    if (dropzone) dropzone.classList.remove('has-files');
    preview.style.display = 'none';
    preview.innerHTML = '';
    content.style.display = 'flex';
    return;
  }

  if (dropzone) dropzone.classList.add('has-files');
  content.style.display = 'none';
  preview.style.display = 'flex';

  const count = files.length;
  const totalBytes = files.reduce((acc, f) => acc + (f.size || 0), 0);
  const totalSizeFormatted = formatFileSize(totalBytes);
  const titleText = `${count} Evidence File${count > 1 ? 's' : ''} Staged`;
  const statusSubtitle = `${totalSizeFormatted} total · Ready to encrypt & file on-chain`;

  const fileRowsHtml = files.map((file, idx) => {
    const sizeStr = formatFileSize(file.size);
    const rowStatus = `${sizeStr} · Staged`;

    return `
      <div class="file-row" id="${input.id}-row-${idx}">
        <div class="file-left">
          <span class="file-name" title="${file.name}">${file.name}</span>
          <div class="file-progress-track">
            <div class="file-progress-bar" id="${input.id}-bar-${idx}" style="width: 100%; opacity: 0.85;"></div>
          </div>
        </div>
        <div class="file-right">
          <span class="file-status" id="${input.id}-rowstatus-${idx}">${rowStatus}</span>
          <button type="button" class="file-row-remove" title="Remove ${file.name}" onclick="removeSingleModernFile(event, '${input.id}', ${idx}, '${previewId}', '${contentId}')">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      </div>
    `;
  }).join('');

  preview.innerHTML = `
    <div class="upload-card" id="${input.id}-upload-card" role="region" aria-label="Upload Status">
      <!-- Confetti Burst Container -->
      <div class="confetti-container" id="${input.id}-confetti"></div>

      <!-- COMPACT TOAST VIEW -->
      <div class="card-view compact-view" id="${input.id}-compact-view">
        <div class="progress-fill-bg is-staged" id="${input.id}-fill-bg"></div>

        <!-- Sleek Wave Graph at Bottom with Purple Gradient -->
        <div class="graph-container">
          <svg class="speed-graph-svg" id="${input.id}-wave-svg" viewBox="0 0 520 40" preserveAspectRatio="none">
            <defs>
              <linearGradient id="${input.id}-purpleGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#6558f5" stop-opacity="0.32" />
                <stop offset="100%" stop-color="#6558f5" stop-opacity="0.0" />
              </linearGradient>
              <linearGradient id="${input.id}-greenGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#10b981" stop-opacity="0.35" />
                <stop offset="100%" stop-color="#10b981" stop-opacity="0.0" />
              </linearGradient>
            </defs>
            <path class="graph-area-fill" id="${input.id}-fill" fill="url(#${input.id}-purpleGrad)" d="M0,40 L0,32 L520,32 L520,40 Z" />
            <path class="graph-line-stroke" id="${input.id}-stroke" fill="none" stroke="#6558f5" stroke-width="2.2" stroke-linecap="round" d="M0,32 L520,32" />
          </svg>
        </div>

        <div class="card-content">
          <div class="text-group">
            <div class="title-row">
              <h2 class="title" id="${input.id}-title">${titleText}</h2>
              <span class="staged-badge" id="${input.id}-badge">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
                <span>Ready</span>
              </span>
            </div>
            <div class="status-row">
              <span class="status-text" id="${input.id}-status">${statusSubtitle}</span>
            </div>
          </div>

          <!-- Clean Action Buttons for Staged View -->
          <div class="action-buttons">
            <!-- 1. Remove All / Cancel Button -->
            <button type="button" class="action-btn cancel-btn" id="${input.id}-cancel-btn" aria-label="Clear all files" title="Clear all staged files" onclick="clearModernFileInput(event, '${input.id}', '${previewId}', '${contentId}')">
              <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>

            <!-- 2. Expand Button -->
            <button type="button" class="action-btn expand-btn" id="${input.id}-expand-btn" aria-label="View staged files" title="View staged files list" onclick="toggleDropzoneCardExpand('${input.id}')">
              <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="15 3 21 3 21 9"></polyline>
                <polyline points="9 21 3 21 3 15"></polyline>
                <line x1="21" y1="3" x2="14" y2="10"></line>
                <line x1="3" y1="21" x2="10" y2="14"></line>
              </svg>
            </button>

            <!-- 3. Add More Files Button -->
            <button type="button" class="action-btn more-btn" id="${input.id}-more-btn" aria-label="Add more files" title="Add more files" onclick="triggerAddMoreFiles(event, '${input.id}', '${previewId}', '${contentId}')">
              <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
            </button>
          </div>
        </div>
      </div>

      <!-- EXPANDED DETAILED LIST VIEW -->
      <div class="card-view expanded-view" id="${input.id}-expanded-view">
        <div class="expanded-header">
          <div class="title-row">
            <h2 class="expanded-title" id="${input.id}-exp-title">${titleText}</h2>
            <span class="staged-badge" id="${input.id}-exp-badge">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
              <span>Ready</span>
            </span>
          </div>
          <div class="header-actions">
            <!-- Contract Button -->
            <button type="button" class="action-btn contract-btn" id="${input.id}-contract-btn" aria-label="Collapse Details" title="Collapse view" onclick="toggleDropzoneCardExpand('${input.id}')">
              <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="4 14 10 14 10 20"></polyline>
                <polyline points="20 10 14 10 14 4"></polyline>
                <line x1="14" y1="10" x2="21" y2="3"></line>
                <line x1="3" y1="21" x2="10" y2="14"></line>
              </svg>
            </button>

            <!-- Add More Files Button -->
            <button type="button" class="action-btn more-btn" id="${input.id}-exp-more-btn" aria-label="Add more files" title="Add more files" onclick="triggerAddMoreFiles(event, '${input.id}', '${previewId}', '${contentId}')">
              <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
            </button>
          </div>
        </div>

        <!-- 165px Slim Progress Track File List with Individual Removal -->
        <div class="file-list" id="${input.id}-file-list">
          ${fileRowsHtml}
        </div>
      </div>
    </div>
  `;

  dropzoneCardStates[input.id] = {
    files,
    isExpanded: false,
    isDone: false,
    isStaged: true,
    totalBytes,
    percent: 0
  };

  startCardWave(input.id);
}

function removeSingleModernFile(e, inputId, indexToRemove, previewId, contentId) {
  if (e) {
    e.stopPropagation();
    e.preventDefault();
  }
  const input = document.getElementById(inputId);
  if (!input || !input.files) return;

  const currentFiles = Array.from(input.files);
  if (indexToRemove < 0 || indexToRemove >= currentFiles.length) return;

  const dt = new DataTransfer();
  currentFiles.forEach((file, idx) => {
    if (idx !== indexToRemove) {
      dt.items.add(file);
    }
  });

  input.files = dt.files;
  handleModernFileChange(input, previewId, contentId);
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

function triggerAddMoreFiles(e, inputId, previewId, contentId) {
  if (e) {
    e.stopPropagation();
    e.preventDefault();
  }
  const mainInput = document.getElementById(inputId);
  if (!mainInput) return;

  const tempInput = document.createElement('input');
  tempInput.type = 'file';
  tempInput.multiple = true;
  tempInput.onchange = () => {
    if (!tempInput.files || tempInput.files.length === 0) return;
    const dt = new DataTransfer();
    Array.from(mainInput.files || []).forEach(f => dt.items.add(f));
    Array.from(tempInput.files).forEach(f => {
      const already = Array.from(mainInput.files || []).some(ef => ef.name === f.name && ef.size === f.size && ef.lastModified === f.lastModified);
      if (!already) {
        dt.items.add(f);
      }
    });
    mainInput.files = dt.files;
    handleModernFileChange(mainInput, previewId, contentId);
    mainInput.dispatchEvent(new Event('change', { bubbles: true }));
  };
  tempInput.click();
}

function clearModernFileInput(e, inputId, previewId, contentId) {
  if (e) {
    e.stopPropagation();
    e.preventDefault();
  }
  if (dropzoneWaveTimers[inputId]) {
    clearInterval(dropzoneWaveTimers[inputId]);
    delete dropzoneWaveTimers[inputId];
  }
  if (dropzoneSimTimers[inputId]) {
    clearInterval(dropzoneSimTimers[inputId]);
    delete dropzoneSimTimers[inputId];
  }
  delete dropzoneCardStates[inputId];

  const input = document.getElementById(inputId);
  if (input) {
    input.value = '';
    const dropzone = input.closest('.modern-file-dropzone');
    if (dropzone) dropzone.classList.remove('has-files');
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }
  const preview = document.getElementById(previewId);
  const content = document.getElementById(contentId);
  if (preview) {
    preview.style.display = 'none';
    preview.innerHTML = '';
  }
  if (content) content.style.display = 'flex';
  const listDiv = document.getElementById('regFileList');
  if (listDiv) listDiv.innerHTML = '';
}

/* ═══════════════════════════════════════════════════════════════════
   UploadAnimationCard Controller
   Pixel-matched submission card with purple wave and emerald completion
   ═══════════════════════════════════════════════════════════════════ */
class UploadAnimationCard {
  constructor(containerId, files) {
    this.container = document.getElementById(containerId);
    this.files = Array.from(files || []);
    this.isExpanded = false;
    this.isDone = false;
    this.isPaused = false;
    this.waveTimer = null;
    this.wavePhase = 0;
    this.render();
    this.startWave();
  }

  render() {
    if (!this.container) return;
    const count = this.files.length;
    const titleText = `Uploading ${count} file${count > 1 ? 's' : ''}`;

    const fileRowsHtml = this.files.map((file, idx) => `
      <div class="file-row" id="uacFileRow_${idx}">
        <div class="file-left">
          <span class="file-name" title="${file.name}">${file.name}</span>
          <div class="file-progress-track">
            <div class="file-progress-bar" id="uacFileBar_${idx}" style="width: 0%;"></div>
          </div>
        </div>
        <div class="file-right">
          <span class="file-status" id="uacFileStatus_${idx}">Waiting...</span>
        </div>
      </div>
    `).join('');

    this.container.innerHTML = `
      <div class="upload-card-wrapper">
        <div class="upload-card" id="uacCard">
          <div class="confetti-container" id="uacConfetti"></div>

          <!-- COMPACT VIEW -->
          <div class="card-view compact-view" id="uacCompactView">
            <div class="progress-fill-bg" id="uacProgressFillBg" style="width: 0%;"></div>

            <div class="graph-container">
              <svg class="speed-graph-svg" viewBox="0 0 520 40" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="uacPurpleGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="#6558f5" stop-opacity="0.32" />
                    <stop offset="100%" stop-color="#6558f5" stop-opacity="0.0" />
                  </linearGradient>
                  <linearGradient id="uacGreenGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="#10b981" stop-opacity="0.35" />
                    <stop offset="100%" stop-color="#10b981" stop-opacity="0.0" />
                  </linearGradient>
                </defs>
                <path class="graph-area-fill" id="uacGraphFill" fill="url(#uacPurpleGrad)" d="M0,40 L0,32 L520,32 L520,40 Z" />
                <path class="graph-line-stroke" id="uacGraphStroke" fill="none" stroke="#6558f5" stroke-width="2.2" stroke-linecap="round" d="M0,32 L520,32" />
              </svg>
            </div>

            <div class="card-content">
              <div class="text-group">
                <div class="title-row">
                  <h2 class="title" id="uacTitle">${titleText}</h2>
                  <span class="complete-badge" id="uacBadge">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    <span>Done</span>
                  </span>
                </div>
                <div class="status-row">
                  <span class="status-text" id="uacStatus">Initializing cryptographic hashing &amp; encryption...</span>
                </div>
              </div>

              <!-- 4 Action Buttons -->
              <div class="action-buttons">
                <button type="button" class="action-btn toggle-btn" id="uacToggleBtn" title="Click to Pause / Resume" onclick="window.currentUploadAnim?.togglePause()">
                  <svg class="icon icon-pause" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <rect x="7" y="5" width="3.5" height="14" rx="1.5" fill="currentColor" stroke="none" />
                    <rect x="13.5" y="5" width="3.5" height="14" rx="1.5" fill="currentColor" stroke="none" />
                  </svg>
                  <svg class="icon icon-resume" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.85.99 6.57 2.57L21 8"></path>
                    <polyline points="21 3 21 8 16 8"></polyline>
                  </svg>
                  <svg class="icon icon-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                </button>
                <button type="button" class="action-btn cancel-btn" id="uacCancelBtn" title="Cancel" onclick="window.currentUploadAnim?.destroy()">
                  <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
                <button type="button" class="action-btn expand-btn" id="uacExpandBtn" title="Toggle detailed progress" onclick="window.currentUploadAnim?.toggleExpand()">
                  <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="15 3 21 3 21 9"></polyline>
                    <polyline points="9 21 3 21 3 15"></polyline>
                    <line x1="21" y1="3" x2="14" y2="10"></line>
                    <line x1="3" y1="21" x2="10" y2="14"></line>
                  </svg>
                </button>
                <button type="button" class="action-btn more-btn" id="uacMoreBtn" title="Options">
                  <svg class="icon" viewBox="0 0 24 24" fill="currentColor">
                    <circle cx="12" cy="5" r="1.8" />
                    <circle cx="12" cy="12" r="1.8" />
                    <circle cx="12" cy="19" r="1.8" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          <!-- EXPANDED VIEW -->
          <div class="card-view expanded-view" id="uacExpandedView">
            <div class="expanded-header">
              <div class="title-row">
                <h2 class="expanded-title" id="uacExpTitle">${titleText}</h2>
                <span class="complete-badge" id="uacExpBadge">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                  <span>Done</span>
                </span>
              </div>
              <div class="header-actions">
                <button type="button" class="action-btn contract-btn" title="Contract view" onclick="window.currentUploadAnim?.toggleExpand()">
                  <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="4 14 10 14 10 20"></polyline>
                    <polyline points="20 10 14 10 14 4"></polyline>
                    <line x1="14" y1="10" x2="21" y2="3"></line>
                    <line x1="3" y1="21" x2="10" y2="14"></line>
                  </svg>
                </button>
                <button type="button" class="action-btn more-btn" title="Options">
                  <svg class="icon" viewBox="0 0 24 24" fill="currentColor">
                    <circle cx="12" cy="5" r="1.8" />
                    <circle cx="12" cy="12" r="1.8" />
                    <circle cx="12" cy="19" r="1.8" />
                  </svg>
                </button>
              </div>
            </div>
            <div class="file-list">
              ${fileRowsHtml}
            </div>
          </div>
        </div>
      </div>
    `;

    window.currentUploadAnim = this;
  }

  toggleExpand() {
    this.isExpanded = !this.isExpanded;
    const card = document.getElementById('uacCard');
    if (card) {
      if (this.isExpanded) card.classList.add('is-expanded');
      else card.classList.remove('is-expanded');
    }
  }

  togglePause() {
    this.isPaused = !this.isPaused;
    const toggleBtn = document.getElementById('uacToggleBtn');
    if (toggleBtn) {
      if (this.isPaused) toggleBtn.classList.add('is-paused');
      else toggleBtn.classList.remove('is-paused');
    }
  }

  startWave() {
    if (this.waveTimer) clearInterval(this.waveTimer);
    const stroke = document.getElementById('uacGraphStroke');
    const fill = document.getElementById('uacGraphFill');

    this.waveTimer = setInterval(() => {
      if (this.isPaused) return;
      this.wavePhase += 0.14;
      if (!stroke || !fill) return;

      const baseHeight = 24;
      const amp = this.isDone ? 2.2 : 5.0;
      const p1 = baseHeight + Math.sin(this.wavePhase) * amp;
      const p2 = baseHeight + Math.sin(this.wavePhase + 1.2) * amp;
      const p3 = baseHeight + Math.sin(this.wavePhase + 2.4) * amp;
      const p4 = baseHeight + Math.sin(this.wavePhase + 3.6) * amp;

      const pathD = `M0,40 L0,${p1.toFixed(1)} Q130,${p2.toFixed(1)} 260,${p3.toFixed(1)} T520,${p4.toFixed(1)} L520,40 Z`;
      const strokeD = `M0,${p1.toFixed(1)} Q130,${p2.toFixed(1)} 260,${p3.toFixed(1)} T520,${p4.toFixed(1)}`;

      fill.setAttribute('d', pathD);
      stroke.setAttribute('d', strokeD);
    }, 45);
  }

  updateFile(idx, percent, statusText) {
    const bar = document.getElementById(`uacFileBar_${idx}`);
    const status = document.getElementById(`uacFileStatus_${idx}`);
    const row = document.getElementById(`uacFileRow_${idx}`);
    if (bar) bar.style.width = `${Math.min(100, Math.max(0, percent))}%`;
    if (status) status.textContent = statusText;
    if (row && percent >= 100) row.classList.add('is-done');
  }

  updateOverall(percent, statusText, titleText) {
    const fill = document.getElementById('uacProgressFillBg');
    const status = document.getElementById('uacStatus');
    const title = document.getElementById('uacTitle');
    const expTitle = document.getElementById('uacExpTitle');

    if (fill) fill.style.width = `${Math.min(100, Math.max(0, percent))}%`;
    if (status && statusText) status.textContent = statusText;
    if (title && titleText) title.textContent = titleText;
    if (expTitle && titleText) expTitle.textContent = titleText;
  }

  complete(successTitle = "3 files uploaded") {
    this.isDone = true;
    const card = document.getElementById('uacCard');
    const fill = document.getElementById('uacProgressFillBg');
    const badge = document.getElementById('uacBadge');
    const expBadge = document.getElementById('uacExpBadge');
    const stroke = document.getElementById('uacGraphStroke');
    const graphFill = document.getElementById('uacGraphFill');
    const title = document.getElementById('uacTitle');
    const expTitle = document.getElementById('uacExpTitle');
    const status = document.getElementById('uacStatus');
    const toggleBtn = document.getElementById('uacToggleBtn');

    if (card) card.classList.add('is-done', 'is-complete-bounce');
    if (fill) {
      fill.style.width = '100%';
      fill.classList.add('is-done');
    }
    if (badge) badge.classList.add('show');
    if (expBadge) expBadge.classList.add('show');
    const count = this.files.length;
    const displayTitle = `${count} file${count > 1 ? 's' : ''} uploaded`;
    if (title) title.textContent = displayTitle;
    if (expTitle) expTitle.textContent = displayTitle;
    if (status) {
      status.textContent = "100% · Complete";
      status.style.color = '#10b981';
      status.style.fontWeight = '600';
    }
    if (toggleBtn) {
      toggleBtn.classList.remove('is-paused');
      toggleBtn.classList.add('is-complete');
    }
    if (graphFill) graphFill.setAttribute('fill', 'url(#uacGreenGrad)');
    if (stroke) stroke.style.stroke = '#10b981';

    this.files.forEach((_, idx) => {
      this.updateFile(idx, 100, "100% · Complete");
      const bar = document.getElementById(`uacFileBar_${idx}`);
      if (bar) bar.style.backgroundColor = '#10b981';
      const rowStatus = document.getElementById(`uacFileStatus_${idx}`);
      if (rowStatus) {
        rowStatus.style.color = '#10b981';
        rowStatus.style.fontWeight = '600';
      }
    });

    burstConfetti(document.getElementById('uacConfetti'));
  }

  destroy() {
    if (this.waveTimer) {
      clearInterval(this.waveTimer);
      this.waveTimer = null;
    }
    if (this.container) this.container.innerHTML = '';
  }
}

function initModernDropzones() {
  ['labReportDropzone', 'regFilesDropzone'].forEach(id => {
    const el = document.getElementById(id);
    if (!el || el.dataset.dropzoneInit) return;
    el.dataset.dropzoneInit = 'true';
    el.addEventListener('dragover', (e) => {
      e.preventDefault();
      el.classList.add('drag-active');
    });
    el.addEventListener('dragleave', (e) => {
      if (!el.contains(e.relatedTarget)) {
        el.classList.remove('drag-active');
      }
    });
    el.addEventListener('drop', (e) => {
      e.preventDefault();
      el.classList.remove('drag-active');
      const input = el.querySelector('input[type="file"]');
      if (input && e.dataTransfer && e.dataTransfer.files.length > 0) {
        input.files = e.dataTransfer.files;
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
  });
}
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initModernDropzones);
} else {
  initModernDropzones();
}

document.getElementById("regFiles")?.addEventListener("change", () => {
  const files = Array.from(document.getElementById("regFiles").files);
  const listDiv = document.getElementById("regFileList");
  if (listDiv) {
    if (files.length === 0) { listDiv.innerHTML = ""; return; }
    listDiv.innerHTML = files.map(f => f.name).join("<br>");
  }
});

async function registerEvidence(btn) {
  const caseNumber = document.getElementById("regCaseNumber").value.trim();
  const idPrefix = caseNumber;
  const firNumber = document.getElementById("regFirNumber").value.trim();
  const policeStation = document.getElementById("regPoliceStation").value.trim();
  const lawSections = document.getElementById("regLawSections").value.trim();
  const description = document.getElementById("regDescription").value.trim();
  const files = Array.from(document.getElementById("regFiles").files);
  const caseKey = document.getElementById("regCaseKey").value.trim();
  document.getElementById("regUploadResult").innerHTML = "";

  if (files.length === 0 || !caseNumber || !firNumber) {
    showResult("regResult", "fail", "Case Number, FIR Number, and at least one file are required.");
    return;
  }
  if (files.length > 30) {
    showResult("regResult", "fail", "Max 30 files per batch transaction. Split into smaller groups.");
    return;
  }
  if (!caseKey) {
    showResult("regResult", "fail", "Enter or generate a Case Encryption Key first — it's needed to encrypt these files.");
    return;
  }

  setBtnBusy(btn, true, `Preparing ${files.length} file(s)...`);
  const evidenceIds = [];
  const fileHashes = [];
  const ipfsCids = [];
  const descriptions = [];
  let ipfsFailures = 0;

  const uploadAnim = new UploadAnimationCard('regUploadResult', files);
  uploadAnim.updateOverall(4, `Preparing cryptographic hashing & AES-256 derivation...`);
  setDropzoneCardProgress('regFiles', 6, 'Deriving AES-256 Case Key...');

  try {
    const aesKey = await deriveCaseAesKey(caseNumber, caseKey);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const evidenceId = `${idPrefix}-EV${String(i + 1).padStart(2, "0")}`;
      const fileBasePct = Math.round(10 + (i / files.length) * 75);
      const fileSlice = Math.round((1 / files.length) * 75);

      uploadAnim.updateFile(i, 20, "Hashing SHA-256...");
      uploadAnim.updateOverall(fileBasePct + fileSlice * 0.2, `Hashing ${file.name} (${i + 1}/${files.length})...`);
      showResult("regResult", "pending", `Hashing &amp; encrypting ${i + 1} of ${files.length}: ${file.name}...`);
      setDropzoneCardProgress('regFiles', fileBasePct + 2, `Hashing ${file.name} (SHA-256)...`);
      const dzBar = document.getElementById(`regFiles-bar-${i}`);
      const dzStatus = document.getElementById(`regFiles-rowstatus-${i}`);
      if (dzBar) dzBar.style.width = '25%';
      if (dzStatus) dzStatus.textContent = 'Hashing SHA-256...';

      const fileHash = await hashFile(file);
      uploadAnim.updateFile(i, 50, "Encrypting AES-256...");
      uploadAnim.updateOverall(fileBasePct + fileSlice * 0.5, `Encrypting ${file.name} with Case Key...`);
      setDropzoneCardProgress('regFiles', fileBasePct + Math.round(fileSlice * 0.4), `Encrypting ${file.name} (AES-256)...`);
      if (dzBar) dzBar.style.width = '60%';
      if (dzStatus) dzStatus.textContent = 'Encrypting AES-256...';

      let ipfsCid = "";
      try {
        const encryptedBlob = await encryptFileForUpload(file, aesKey);
        uploadAnim.updateFile(i, 78, "Pinning to IPFS...");
        uploadAnim.updateOverall(fileBasePct + fileSlice * 0.8, `Uploading encrypted ${file.name} to IPFS...`);
        showResult("regResult", "pending", `Uploading ${i + 1} of ${files.length} to IPFS: ${file.name}...`);
        
        const uploadStart = performance.now();
        setDropzoneCardProgress('regFiles', fileBasePct + Math.round(fileSlice * 0.7), `Pinning encrypted payload to IPFS...`);
        if (dzBar) dzBar.style.width = '85%';
        if (dzStatus) dzStatus.textContent = 'Pinning to IPFS...';

        ipfsCid = await uploadToPinata(encryptedBlob, file.name + ".enc");
        const elapsedSec = Math.max(0.1, (performance.now() - uploadStart) / 1000);
        const speedMBps = ((file.size / (1024 * 1024)) / elapsedSec).toFixed(1);
        const speedText = parseFloat(speedMBps) > 0.05 ? `${speedMBps} MB/s` : `${(file.size / 1024 / elapsedSec).toFixed(1)} KB/s`;

        uploadAnim.updateFile(i, 100, `Encrypted & Pinned ✓ (${speedText})`);
        setDropzoneCardProgress('regFiles', fileBasePct + fileSlice, `Pinned ${file.name} to IPFS`, speedText);
        if (dzBar) {
          dzBar.style.width = '100%';
          dzBar.style.backgroundColor = '#10b981';
        }
        if (dzStatus) {
          dzStatus.textContent = `Pinned ✓ · ${speedText}`;
          dzStatus.style.color = '#10b981';
          dzStatus.style.fontWeight = '600';
        }
      } catch (ipfsErr) {
        console.warn(`Encrypted IPFS upload failed for ${file.name} — registering with hash only.`, ipfsErr);
        ipfsFailures++;
        ipfsCid = "";
        uploadAnim.updateFile(i, 100, "Hash registered (IPFS skipped)");
        if (dzBar) dzBar.style.width = '100%';
        if (dzStatus) dzStatus.textContent = 'Hash recorded';
      }

      evidenceIds.push(evidenceId);
      fileHashes.push(fileHash);
      ipfsCids.push(ipfsCid);
      descriptions.push(files.length > 1 ? `${description} (${file.name})` : description);
    }

    uploadAnim.updateOverall(88, `Submitting batch registration on blockchain...`, "Filing to Blockchain");
    showResult("regResult", "pending", `Submitting one transaction for ${files.length} file(s)...`);
    setDropzoneCardProgress('regFiles', 90, 'Mining transaction on Sepolia blockchain...');
    const tx = files.length === 1
      ? await contract.registerEvidence(evidenceIds[0], caseNumber, firNumber, policeStation, lawSections, descriptions[0], fileHashes[0], ipfsCids[0], caseKey)
      : await contract.registerEvidenceBatch(evidenceIds, caseNumber, firNumber, policeStation, lawSections, descriptions, fileHashes, ipfsCids, caseKey);
    const receipt = await tx.wait();

    cacheCaseKeyLocally(caseNumber, caseKey);

    if (window.epsApi) {
      for (let i = 0; i < evidenceIds.length; i++) {
        window.epsApi.indexEvidence({
          id: evidenceIds[i],
          caseNumber,
          fileName: files[i]?.name || null,
          fileHash: fileHashes[i],
          fileSize: files[i]?.size || null,
          mimeType: files[i]?.type || null,
          description: descriptions[i],
          submitterAddress: connectedAddress,
          currentCustodian: connectedAddress,
          txHash: tx?.hash || null
        });
        window.epsApi.logAudit("EVIDENCE_REGISTERED", connectedAddress, {
          evidenceId: evidenceIds[i],
          caseNumber,
          fileHash: fileHashes[i],
          txHash: tx?.hash
        }, evidenceIds[i], caseNumber);
      }
    }

    uploadAnim.complete("Filed On-Chain ✓");
    completeDropzoneCard('regFiles', receipt?.blockNumber);

    showResult("regResult", "ok",
      `${files.length} evidence item(s) registered on-chain under ${caseNumber}.` +
      (ipfsFailures ? ` ${ipfsFailures} file(s) registered as hash-only — IPFS upload failed for those.` : "") +
      `<br><br><strong>Case Encryption Key:</strong><br>${caseKey}<br><span style="color:var(--ink-500);">Any role holder can now retrieve this automatically from the Case Evidence List — no need to note it down.</span>`
    );
    loadStats();
  } catch (err) {
    if (uploadAnim) uploadAnim.destroy();
    showResult("regResult", "fail", formatError(err));
  } finally {
    setBtnBusy(btn, false);
  }
}

// ---------- Stage 2: Transfer ----------
async function lookupHolder(btn) {
  const caseNumber = document.getElementById("holderLookupCaseNumber").value.trim();
  if (!caseNumber) {
    showResult("holderResult", "fail", "Enter a case number.");
    return;
  }

  setBtnBusy(btn, true, "Searching...");
  showResult("holderResult", "pending", "Searching all registered evidence...");
  try {
    const matches = await contract.getEvidenceIdsByCase(caseNumber);

    if (matches.length === 0) {
      showResult("holderResult", "fail", `No evidence found for case "${caseNumber}".`);
      return;
    }

    const rows = [];
    for (const id of matches) {
      const holder = await contract.getCurrentHolder(id);
      const role = await contract.getRole(holder);
      rows.push(`${id} — ${holder} (${await resolveRoleName(role)})`);
    }
    showResult("holderResult", "ok", rows.join("<br>"));
  } catch (err) {
    showResult("holderResult", "fail", formatError(err));
  } finally {
    setBtnBusy(btn, false);
  }
}

// ---------- Stage 3: Verify (all by case number) ----------
let bulkVerifyItems = []; // [{ evidenceId, description }]

async function findCaseEvidenceForVerify(btn) {
  const caseNumber = document.getElementById("bulkVerifyCaseNumber").value.trim();
  const listDiv = document.getElementById("bulkVerifyList");
  const verifyBtn = document.getElementById("bulkVerifyBtn");
  document.getElementById("bulkVerifyResult").innerHTML = "";
  verifyBtn.style.display = "none";
  bulkVerifyItems = [];

  if (!caseNumber) {
    listDiv.innerHTML = "";
    showResult("bulkVerifyResult", "fail", "Enter a case number.");
    return;
  }

  listDiv.innerHTML = `<div style="color:var(--ink-500); font-size:13px;">Searching all registered evidence...</div>`;
  setBtnBusy(btn, true, "Searching...");
  try {
    const caseIds = await contract.getEvidenceIdsByCase(caseNumber);
    const matches = [];
    for (const id of caseIds) {
      try {
        const [, , , , description] = await contract.getEvidence(id);
        matches.push({ evidenceId: id, description });
      } catch (e) { /* skip a record that fails to load */ }
    }

    if (matches.length === 0) {
      listDiv.innerHTML = `<div style="color:var(--ink-500); font-size:13px;">No evidence found for case "${caseNumber}".</div>`;
      return;
    }

    listDiv.innerHTML = matches.map((m, i) => `
      <div class="case-row" style="flex-direction:column; align-items:flex-start; gap:6px;">
        <div class="case-row-info">
          <span class="case-row-id">${m.evidenceId}</span>
          <span class="case-row-desc"> — ${m.description || "no description"}</span>
        </div>
        <input type="file" class="bulk-verify-file" data-idx="${i}" style="width:100%;" />
      </div>
    `).join("");

    bulkVerifyItems = matches;
    verifyBtn.style.display = "";
  } catch (err) {
    listDiv.innerHTML = "";
    showResult("bulkVerifyResult", "fail", formatError(err));
  } finally {
    setBtnBusy(btn, false);
  }
}

async function bulkVerifyIntegrity(btn) {
  const fileInputs = Array.from(document.querySelectorAll(".bulk-verify-file"));
  const withFiles = fileInputs.filter(inp => inp.files[0]);
  const seal = document.getElementById("sealEl");
  const verdict = document.getElementById("sealVerdict");

  if (withFiles.length === 0) {
    showResult("bulkVerifyResult", "fail", "Select a file for at least one evidence item.");
    return;
  }

  seal.className = "seal";
  verdict.className = "seal-verdict";
  verdict.innerText = "Checking...";
  document.getElementById("sealCard").style.display = "";
  setBtnBusy(btn, true, "Hashing files...");
  try {
    const evidenceIds = [];
    const recomputedHashes = [];
    for (const inp of withFiles) {
      const idx = parseInt(inp.dataset.idx, 10);
      const item = bulkVerifyItems[idx];
      const hash = await hashFile(inp.files[0]);
      evidenceIds.push(item.evidenceId);
      recomputedHashes.push(hash);
    }

    showResult("bulkVerifyResult", "pending", `Submitting one transaction to verify ${evidenceIds.length} item(s)...`);
    const results = evidenceIds.length === 1
      ? [await contract.callStatic.verifyIntegrity(evidenceIds[0], recomputedHashes[0])]
      : await contract.callStatic.verifyIntegrityBatch(evidenceIds, recomputedHashes);
    const tx = evidenceIds.length === 1
      ? await contract.verifyIntegrity(evidenceIds[0], recomputedHashes[0])
      : await contract.verifyIntegrityBatch(evidenceIds, recomputedHashes);
    await tx.wait();

    const allMatch = results.every(Boolean);
    void seal.offsetWidth; // restart animation
    seal.classList.add("stamping");
    setTimeout(() => {
      if (allMatch) {
        seal.classList.add("verified");
        verdict.classList.add("ok-text");
        verdict.innerText = "✅ Verified — Matches Original";
        if (window.epsApi) {
          window.epsApi.logAudit("INTEGRITY_VERIFIED", connectedAddress, { evidenceIds, match: true });
        }
      } else {
        seal.classList.add("tampered");
        verdict.classList.add("fail-text");
        verdict.innerText = "⚠️ Tamper Detected";
        if (window.epsApi) {
          window.epsApi.reportTamperIncident({
            evidenceId: evidenceIds.join(", "),
            caseNumber: null,
            expectedHash: "on-chain stored hash",
            actualHash: recomputedHashes.join(", "),
            verifierAddress: connectedAddress,
            incidentDetails: "Tamper Detected during integrity verification"
          });
        }
      }
    }, 550);

    showResult("bulkVerifyResult", allMatch ? "ok" : "fail",
      evidenceIds.map((id, i) => `${results[i] ? "✅" : "⚠️"} ${id} — ${results[i] ? "matches on-chain record" : "hash mismatch"}`).join("<br>")
    );
    loadStats();
  } catch (err) {
    verdict.innerText = "Error running check";
    showResult("bulkVerifyResult", "fail", formatError(err));
  } finally {
    setBtnBusy(btn, false);
  }
}

// ---------- Stage 4: Trail ----------
let currentTrailCaseItems = []; // items loaded for the case currently shown

async function findCaseEvidenceForTrail(btn) {
  const caseNumber = document.getElementById("trailCaseNumber").value.trim();
  const listDiv = document.getElementById("trailCaseList");
  const detailsDiv = document.getElementById("caseDetails");
  const resultDiv = document.getElementById("trailResult");
  const closeCaseBtn = document.getElementById("closeCaseBtn");
  const anomalyDiv = document.getElementById("anomalyResult");
  detailsDiv.innerHTML = "";
  closeCaseBtn.style.display = "none";
  document.getElementById("closeCaseResult").innerHTML = "";
  resultDiv.innerHTML = `<div style="color:var(--ink-500); font-size:13px;">No record loaded yet.</div>`;
  anomalyDiv.innerHTML = `<div style="color:var(--ink-500); font-size:13px;">Load a custody trail above to run checks.</div>`;
  currentTrailCaseItems = [];

  if (!caseNumber) {
    listDiv.innerHTML = "";
    showResult("closeCaseResult", "fail", "Enter a case number.");
    return;
  }

  listDiv.innerHTML = `<div style="color:var(--ink-500); font-size:13px;">Searching all registered evidence...</div>`;
  setBtnBusy(btn, true, "Searching...");
  try {
    const caseIds = await contract.getEvidenceIdsByCase(caseNumber);

    const items = [];
    for (const id of caseIds) {
      try {
        const [cNum, firNumber, policeStation, lawSections, description, fileHash, ipfsCid, registeredBy, registeredAt, status] =
          await contract.getEvidence(id);
        const [holders, holderRoles, timestamps, notes] = await contract.getCustodyTrail(id);
        items.push({
          evidenceId: id, caseNumber: cNum, firNumber, policeStation, lawSections, description,
          registeredBy, registeredAt, isOpen: status === 0,
          holders, holderRoles, timestamps, notes,
        });
      } catch (e) { /* skip a record that fails to load rather than aborting the whole search */ }
    }

    if (items.length === 0) {
      listDiv.innerHTML = `<div style="color:var(--ink-500); font-size:13px;">No evidence found for case "${caseNumber}".</div>`;
      return;
    }

    listDiv.innerHTML = `<div style="color:var(--ink-500); font-size:13px;">${items.length} evidence item(s) found under ${caseNumber}.</div>`;
    currentTrailCaseItems = items;

    const anyOpen = items.some(it => it.isOpen);
    const first = items[0];
    const legalRow = `<div style="font-family:var(--mono); font-size:10.5px; color:var(--ink-500); margin-top:6px;">FIR: ${first.firNumber || "—"} &nbsp;|&nbsp; PS: ${first.policeStation || "—"}<br>Sections: ${first.lawSections || "—"}</div>`;
    const itemRows = items.map(it => `
      <div style="font-size:12.5px; color:var(--ink-300); padding:6px 0; border-top:1px solid var(--navy-800);">
        <strong>${it.evidenceId}</strong> — ${it.description || "no description"}
        <span style="font-family:var(--mono); font-size:10px; text-transform:uppercase; letter-spacing:0.5px; color:${it.isOpen ? '#7FD4AB' : '#F0A29D'};"> (${it.isOpen ? 'open' : 'closed'})</span>
      </div>
    `).join("");

    detailsDiv.innerHTML = `
      <div style="border:1px solid var(--glass-border); border-radius:var(--radius); padding:14px; background:var(--glass-bg);">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
          <span style="color:var(--ink-100); font-weight:600; font-size:13.5px;">Case ${caseNumber}</span>
          <span style="font-family:var(--mono); font-size:10.5px; padding:3px 10px; border-radius:100px; text-transform:uppercase; letter-spacing:0.6px; ${anyOpen ? 'background:rgba(55,158,111,0.15); color:#7FD4AB;' : 'background:rgba(193,69,61,0.15); color:#F0A29D;'}">${anyOpen ? 'Open' : 'Closed'}</span>
        </div>
        ${legalRow}
        ${itemRows}
      </div>
    `;

    closeCaseBtn.style.display = anyOpen ? "" : "none";

    const events = [];
    for (const it of items) {
      for (let i = 0; i < it.holders.length; i++) {
        events.push({
          evidenceId: it.evidenceId,
          holder: it.holders[i],
          role: it.holderRoles[i],
          ts: it.timestamps[i].toNumber(),
          note: it.notes[i],
        });
      }
    }
    events.sort((a, b) => a.ts - b.ts);

    let html = "";
    for (let i = 0; i < events.length; i++) {
      const e = events[i];
      const date = new Date(e.ts * 1000).toLocaleString();
      const roleName = await resolveRoleName(e.role);
      html += `<div class="t-item" style="animation-delay:${i * 0.06}s">
        <div class="note">${e.note}</div>
        <div class="meta">${e.evidenceId} &bull; ${e.holder}</div>
        <div class="meta">${date}</div>
        <span class="role-tag">${roleName}</span>
      </div>`;
    }
    resultDiv.innerHTML = html || `<div style="color:var(--ink-500); font-size:13px;">No records found.</div>`;

    await runCaseAnomalyChecks(items, anomalyDiv);
  } catch (err) {
    listDiv.innerHTML = "";
    detailsDiv.innerHTML = "";
    resultDiv.innerHTML = `<div class="result fail">${formatError(err)}</div>`;
    anomalyDiv.innerHTML = "";
    showResult("closeCaseResult", "fail", formatError(err));
  } finally {
    setBtnBusy(btn, false);
  }
}

async function computeAnomalyFlags(evidenceId, trailData, isOpen) {
  const DWELL_THRESHOLD_DAYS = 5;
  const RAPID_TRANSFER_SECONDS = 60;
  const OFFHOURS_START_HOUR = 21; // 9 PM
  const OFFHOURS_END_HOUR = 7;    // 7 AM

  const flags = [];
  const { holders, holderRoles, timestamps, notes } = trailData;
  const tsSeconds = timestamps.map(t => t.toNumber());

  if (isOpen && tsSeconds.length > 0) {
    const lastTs = tsSeconds[tsSeconds.length - 1];
    const dwellDays = (Date.now() / 1000 - lastTs) / 86400;
    if (dwellDays > DWELL_THRESHOLD_DAYS) {
      flags.push({
        level: "warn",
        rule: "Dwell time",
        message: `Evidence has sat with ${await getOfficerLabel(holders[holders.length - 1])} for ${dwellDays.toFixed(1)} days without a further custody transfer or case closure (threshold: ${DWELL_THRESHOLD_DAYS} days).`
      });
    }
  }

  for (let i = 1; i < tsSeconds.length; i++) {
    const d = new Date(tsSeconds[i] * 1000);
    const hour = d.getHours();
    const day = d.getDay(); // 0 = Sunday, 6 = Saturday
    const isOffHours = hour >= OFFHOURS_START_HOUR || hour < OFFHOURS_END_HOUR;
    const isWeekend = day === 0 || day === 6;
    if (isOffHours || isWeekend) {
      flags.push({
        level: "info",
        rule: "Off-hours transfer",
        message: `Custody transfer #${i + 1} to ${await getOfficerLabel(holders[i])} occurred at ${d.toLocaleString()} (${isWeekend ? "weekend" : "outside typical working hours"}) — worth a manual look, not necessarily wrongdoing.`
      });
    }
  }

  for (let i = 1; i < tsSeconds.length; i++) {
    const gap = tsSeconds[i] - tsSeconds[i - 1];
    if (gap >= 0 && gap < RAPID_TRANSFER_SECONDS) {
      flags.push({
        level: "warn",
        rule: "Rapid transfer",
        message: `Only ${gap}s elapsed between custody transfer #${i} and #${i + 1} — faster than a manual handoff would typically take.`
      });
    }
  }

  const hasLab = holderRoles.some(r => r === 2); // Role.Lab
  const hasCourt = holderRoles.some(r => r === 3); // Role.Court
  if (hasCourt && !hasLab) {
    flags.push({
      level: "warn",
      rule: "Skipped lab verification",
      message: "This evidence reached a Court-role holder without ever passing through a Lab-role holder — no forensic lab custody step is on record."
    });
  }

  if (hasCourt) {
    try {
      const events = await contract.queryFilter(contract.filters.IntegrityChecked());
      const relevant = events.filter(e => e.args && e.args.evidenceId === evidenceId);
      const courtIdx = holderRoles.findIndex(r => r === 3);
      const courtTs = courtIdx >= 0 ? tsSeconds[courtIdx] : null;
      const checkedBeforeCourt = relevant.some(e => e.args.timestamp.toNumber() <= (courtTs || Infinity));
      if (!checkedBeforeCourt) {
        flags.push({
          level: "warn",
          rule: "No pre-court verification",
          message: "No on-chain Verify Integrity check is recorded before this evidence reached a Court-role holder."
        });
      }
    } catch (e) { }
  }

  return flags;
}

async function runCaseAnomalyChecks(items, anomalyDiv) {
  let allFlags = [];
  for (const it of items) {
    const trailData = { holders: it.holders, holderRoles: it.holderRoles, timestamps: it.timestamps, notes: it.notes };
    const itemFlags = await computeAnomalyFlags(it.evidenceId, trailData, it.isOpen);
    allFlags = allFlags.concat(itemFlags.map(f => ({ ...f, evidenceId: it.evidenceId })));
  }

  if (allFlags.length === 0) {
    anomalyDiv.innerHTML = `<div style="color:#7FD4AB; font-size:13px;">✓ No anomalies flagged by any rule across this case's custody trail.</div>`;
    return;
  }

  anomalyDiv.innerHTML = allFlags.map(f => `
    <div style="display:flex; gap:10px; padding:10px 0; border-bottom:1px solid var(--navy-700);">
      <span style="font-family:var(--mono); font-size:10px; padding:2px 8px; border-radius:100px; height:fit-content; white-space:nowrap; ${f.level === 'warn' ? 'background:rgba(217,164,65,0.15); color:#E8C27A;' : 'background:rgba(110,150,220,0.15); color:#9DBBEA;'}">${f.rule}</span>
      <span style="font-size:12.5px; color:var(--ink-300); line-height:1.5;"><strong>${f.evidenceId}</strong> — ${f.message}</span>
    </div>
  `).join("");
}

async function logoutAccount() {
  const ethProvider = await waitForMetaMask();

  // MetaMask (v10.34+) supports EIP-2255 wallet_revokePermissions, which
  // actually forces the account picker to reopen on the next Connect click.
  // Older MetaMask versions don't support it — if the request fails, we
  // still reset our own app state below so the UI is never stuck showing
  // a "connected" account after logout.
  if (ethProvider) {
    try {
      await ethProvider.request({
        method: "wallet_revokePermissions",
        params: [{ eth_accounts: {} }]
      });
    } catch (err) {
      console.warn("wallet_revokePermissions not supported by this wallet — resetting local session only.", err);
    }
  }

  // Reset local app state regardless of whether MetaMask itself could be revoked.
  provider = null;
  signer = null;
  contract = null;
  connectedAddress = null;
  isCurrentUserAdmin = false;

  document.getElementById("netDot").classList.remove("live");
  document.getElementById("netLabel").innerText = "Not Connected";
  document.getElementById("connectBtn").innerText = "Connect Wallet";
  document.getElementById("connectBtn").title =
    "If MetaMask reconnects the same account without asking, open the MetaMask " +
    "extension → account picker (top) or Connected Sites → disconnect this site once, " +
    "then click Connect Wallet again and pick the account you want.";
  document.getElementById("logoutBtn").style.display = "none";
  document.getElementById("adminOnlyDivider").style.display = "none";
  document.getElementById("adminOnlyGrid").style.display = "none";

  const badge = document.getElementById("roleBadge");
  if (badge) { badge.innerText = ""; badge.classList.remove("assigned"); }
  const faceStatusEl = document.getElementById("faceEnrollStatus");
  if (faceStatusEl) faceStatusEl.innerText = "Connect a wallet to enroll.";
}

async function closeCaseAction(btn) {
  const openItems = currentTrailCaseItems.filter(it => it.isOpen);
  if (openItems.length === 0) return;
  setBtnBusy(btn, true, "Closing...");
  try {
    showResult("closeCaseResult", "pending", `Submitting ${openItems.length} transaction(s) to close ${openItems.length} item(s)...`);
    for (const it of openItems) {
      const tx = await contract.closeCase(it.evidenceId);
      await tx.wait();
    }
    showResult("closeCaseResult", "ok", `Case closed — ${openItems.length} evidence item(s) marked Closed.`);
    findCaseEvidenceForTrail(null); // refresh the whole panel
    loadStats();
  } catch (err) {
    showResult("closeCaseResult", "fail", formatError(err));
  } finally {
    setBtnBusy(btn, false);
  }
}

// ---------- Lab Analysis Reports ----------
async function loadLabCaseEvidence() {
  const caseNumber = document.getElementById("labReportCaseNumber").value.trim();
  const select = document.getElementById("labReportEvidenceSelect");
  const keyInput = document.getElementById("labReportCaseKey");
  document.getElementById("labReportsList").innerHTML = "";

  if (!caseNumber) {
    showResult("labReportSubmitResult", "fail", "Enter a Case Number first.");
    return;
  }
  select.disabled = true;
  select.innerHTML = `<option value="">Loading...</option>`;
  try {
    const evidenceIds = await contract.getEvidenceIdsByCase(caseNumber);
    if (evidenceIds.length === 0) {
      select.innerHTML = `<option value="">No evidence found for this case</option>`;
      showResult("labReportSubmitResult", "fail", `No evidence found under case "${caseNumber}".`);
      return;
    }
    select.innerHTML = evidenceIds.map(id => `<option value="${id}">${id}</option>`).join("");
    select.disabled = false;
    document.getElementById("labReportSubmitResult").innerHTML = "";

    const cachedKey = getCachedCaseKey(caseNumber);
    if (cachedKey) keyInput.value = cachedKey;
  } catch (err) {
    select.innerHTML = `<option value="">Error loading case</option>`;
    showResult("labReportSubmitResult", "fail", formatError(err));
  }
}

async function submitLabReportAction(btn) {
  const evidenceId = document.getElementById("labReportEvidenceSelect").value;
  const caseNumber = document.getElementById("labReportCaseNumber").value.trim();
  const findings = document.getElementById("labReportFindings").value.trim();
  const file = document.getElementById("labReportFile").files[0];
  const caseKey = document.getElementById("labReportCaseKey").value.trim();

  if (!evidenceId) {
    showResult("labReportSubmitResult", "fail", "Load a case and select an evidence item first.");
    return;
  }
  if (!findings) {
    showResult("labReportSubmitResult", "fail", "Findings are required.");
    return;
  }
  if (file && !caseKey) {
    showResult("labReportSubmitResult", "fail", "A file is attached — enter the Case Encryption Key so it can be encrypted the same way as evidence files.");
    return;
  }

  setBtnBusy(btn, true, "Submitting...");
  let reportHash = "";
  let reportIpfsCid = "";
  let uploadAnim = null;
  if (file) {
    uploadAnim = new UploadAnimationCard('labReportUploadResult', [file]);
    uploadAnim.updateOverall(10, `Processing forensic report file...`);
  }

  try {
    if (file) {
      showResult("labReportSubmitResult", "pending", `Hashing ${file.name}...`);
      setDropzoneCardProgress('labReportFile', 25, `Hashing ${file.name} (SHA-256)...`);
      if (uploadAnim) {
        uploadAnim.updateFile(0, 30, "Computing SHA-256...");
        uploadAnim.updateOverall(30, "Hashing report file...");
      }
      reportHash = await hashFile(file);
      try {
        showResult("labReportSubmitResult", "pending", `Encrypting ${file.name}...`);
        setDropzoneCardProgress('labReportFile', 55, `Encrypting ${file.name} (AES-256)...`);
        if (uploadAnim) {
          uploadAnim.updateFile(0, 60, "Encrypting AES-256...");
          uploadAnim.updateOverall(60, "Encrypting report file...");
        }
        const aesKey = await deriveCaseAesKey(caseNumber, caseKey);
        const encryptedBlob = await encryptFileForUpload(file, aesKey);
        showResult("labReportSubmitResult", "pending", `Uploading ${file.name} to IPFS...`);
        setDropzoneCardProgress('labReportFile', 75, `Uploading encrypted payload to IPFS...`);
        if (uploadAnim) {
          uploadAnim.updateFile(0, 85, "Pinning to IPFS...");
          uploadAnim.updateOverall(85, "Uploading to IPFS...");
        }
        const uploadStart = performance.now();
        reportIpfsCid = await uploadToPinata(encryptedBlob, file.name + ".enc");
        const elapsedSec = Math.max(0.1, (performance.now() - uploadStart) / 1000);
        const speedMBps = ((file.size / (1024 * 1024)) / elapsedSec).toFixed(1);
        const speedText = parseFloat(speedMBps) > 0.05 ? `${speedMBps} MB/s` : `${(file.size / 1024 / elapsedSec).toFixed(1)} KB/s`;

        setDropzoneCardProgress('labReportFile', 90, `Pinned ${file.name} to IPFS`, speedText);
        if (uploadAnim) uploadAnim.updateFile(0, 100, `Encrypted & Pinned ✓ (${speedText})`);
      } catch (ipfsErr) {
        console.warn("Encrypted IPFS upload failed for lab report file — recording hash only.", ipfsErr);
        reportIpfsCid = "";
        if (uploadAnim) uploadAnim.updateFile(0, 100, "Hash recorded (IPFS skipped)");
      }
    }

    showResult("labReportSubmitResult", "pending", "Submitting transaction...");
    if (uploadAnim) uploadAnim.updateOverall(90, "Submitting lab report transaction on blockchain...");
    if (file) setDropzoneCardProgress('labReportFile', 92, 'Mining transaction on Sepolia blockchain...');
    const tx = await contract.submitLabReport(evidenceId, findings, reportHash, reportIpfsCid);
    const receipt = await tx.wait();

    if (uploadAnim) uploadAnim.complete("Lab Report Secured On-Chain ✓");
    if (file) completeDropzoneCard('labReportFile', receipt?.blockNumber);

    showResult("labReportSubmitResult", "ok",
      `Lab report recorded for ${evidenceId}.` +
      (file
        ? (reportIpfsCid
            ? `<br>File encrypted &amp; stored on IPFS (CID: ${reportIpfsCid}).`
            : `<br>File hashed, but IPFS upload failed — hash-only record.`)
        : "")
    );
    document.getElementById("labReportFindings").value = "";
    viewLabReports();
  } catch (err) {
    if (uploadAnim) uploadAnim.destroy();
    showResult("labReportSubmitResult", "fail", formatError(err));
  } finally {
    setBtnBusy(btn, false);
  }
}

async function viewLabReports() {
  const evidenceId = document.getElementById("labReportEvidenceSelect").value;
  const listEl = document.getElementById("labReportsList");
  if (!evidenceId) {
    listEl.innerHTML = `<div class="result fail"><span>Load a case and select an evidence item above first.</span></div>`;
    return;
  }
  listEl.innerHTML = `<div style="color:var(--ink-500); font-size:13px;">Loading...</div>`;
  try {
    const [findingsList, reportHashes, reportIpfsCids, submittedBys, timestamps] = await contract.getLabReports(evidenceId);
    if (findingsList.length === 0) {
      listEl.innerHTML = `<div style="color:var(--ink-500); font-size:13px;">No lab reports submitted for this evidence item yet.</div>`;
      return;
    }
    let html = "";
    for (let i = 0; i < findingsList.length; i++) {
      const label = await getOfficerLabel(submittedBys[i]);
      const date = new Date(timestamps[i].toNumber() * 1000).toLocaleString();
      html += `<div style="border:1px solid var(--navy-700); border-radius:10px; padding:12px 14px; margin-bottom:10px;">
        <div style="font-size:11.5px; color:var(--ink-500); margin-bottom:6px;">${date} — ${label}${label !== submittedBys[i] ? ` (${submittedBys[i]})` : ""}</div>
        <div style="font-size:13px;">${findingsList[i]}</div>
        ${reportHashes[i] ? `<div style="font-family:var(--mono); font-size:11px; color:var(--ink-500); margin-top:6px;">File Hash: ${reportHashes[i]}</div>` : ""}
        ${reportIpfsCids[i] ? `<div style="font-family:var(--mono); font-size:11px; color:var(--ink-500);">IPFS CID: ${reportIpfsCids[i]}</div>` : ""}
      </div>`;
    }
    listEl.innerHTML = html;
  } catch (err) {
    listEl.innerHTML = `<div class="result fail"><span>${formatError(err)}</span></div>`;
  }
}

// ---------- Stage 5: Access Control ----------
async function createCustomRoleAction(btn) {
  const name = document.getElementById("newRoleName").value.trim();
  if (!name) {
    showResult("createRoleResult", "fail", "Enter a role name.");
    return;
  }
  setBtnBusy(btn, true, "Creating...");
  try {
    const tx = await contract.createCustomRole(name);
    const receipt = await tx.wait();
    showResult("createRoleResult", "ok", `Role "${name}" created.`);
    document.getElementById("newRoleName").value = "";
    await refreshRoleOptions();
    await refreshCustomRoleList();
  } catch (err) {
    showResult("createRoleResult", "fail", formatError(err));
  } finally {
    setBtnBusy(btn, false);
  }
}

async function refreshCustomRoleList() {
  const listEl = document.getElementById("customRoleList");
  const selectEl = document.getElementById("removeRoleSelect");

  try {
    const [ids, names] = await contract.getAllCustomRoles();

    if (listEl) {
      listEl.innerHTML = ids.length === 0
        ? "No custom roles created yet."
        : ids.map((id, i) => `#${id} — ${names[i]}`).join("<br>");
    }

    if (selectEl) {
      if (ids.length === 0) {
        selectEl.innerHTML = `<option value="">No custom roles yet</option>`;
      } else {
        selectEl.innerHTML = ids.map((id, i) => `<option value="${id}">#${id} — ${names[i]}</option>`).join("");
      }
    }
  } catch (e) {
    if (listEl) listEl.innerHTML = "";
    if (selectEl) selectEl.innerHTML = `<option value="">No custom roles yet</option>`;
  }
}

async function removeCustomRoleAction(btn) {
  const select = document.getElementById("removeRoleSelect");
  const roleId = select.value;
  if (!roleId) {
    showResult("removeRoleResult", "fail", "No custom role selected.");
    return;
  }
  const roleName = select.options[select.selectedIndex].textContent;

  setBtnBusy(btn, true, "Removing...");
  try {
    const tx = await contract.removeCustomRole(roleId);
    await tx.wait();
    showResult("removeRoleResult", "ok", `Removed ${roleName}.`);
    await refreshRoleOptions();
    await refreshCustomRoleList();
  } catch (err) {
    showResult("removeRoleResult", "fail", formatError(err));
  } finally {
    setBtnBusy(btn, false);
  }
}

async function grantRoleAction() {
  const addr = document.getElementById("roleAddress").value.trim();
  const role = document.getElementById("roleSelect").value;
  try {
    showResult("roleResult", "pending", "Submitting transaction...");
    const tx = await contract.grantRole(addr, role);
    await tx.wait();
    showResult("roleResult", "ok", `Role granted: ${await resolveRoleName(Number(role))} → ${addr}`);
  } catch (err) {
    showResult("roleResult", "fail", formatError(err));
  }
}

async function revokeRoleAction() {
  const addr = document.getElementById("roleAddress").value.trim();
  try {
    showResult("roleResult", "pending", "Submitting transaction...");
    const tx = await contract.revokeRole(addr);
    await tx.wait();
    showResult("roleResult", "ok", `Role revoked for ${addr}`);
  } catch (err) {
    showResult("roleResult", "fail", formatError(err));
  }
}

async function checkRoleAction() {
  const addr = document.getElementById("checkAddress").value.trim();
  try {
    const role = await contract.getRole(addr);
    const roleName = await resolveRoleName(role);
    const isAuthorized = Number(role) !== 0;
    showResult("checkRoleResult", isAuthorized ? "ok" : "fail", `${addr}<br>Role: ${roleName}`);
  } catch (err) {
    showResult("checkRoleResult", "fail", formatError(err));
  }
}

// ---------- Officer identity registry ----------
async function saveMyOfficerProfile(btn) {
  const name = document.getElementById("myOfficerName").value.trim();
  const designation = document.getElementById("myOfficerDesignation").value.trim();
  const badgeId = document.getElementById("myOfficerBadge").value.trim();
  if (!name) {
    showResult("myOfficerResult", "fail", "Name is required.");
    return;
  }
  setBtnBusy(btn, true, "Saving...");
  try {
    const tx = await contract.setMyOfficerProfile(name, designation, badgeId);
    await tx.wait();
    showResult("myOfficerResult", "ok", "Identity saved on-chain.");
  } catch (err) {
    showResult("myOfficerResult", "fail", formatError(err));
  } finally {
    setBtnBusy(btn, false);
  }
}

async function removeMyOfficerProfile(btn) {
  if (!confirm("Remove your saved identity (name, designation, badge ID) from this wallet? Existing evidence and custody records already attributed to you are unaffected — this only clears the label shown going forward.")) return;
  setBtnBusy(btn, true, "Removing...");
  try {
    const tx = await contract.clearMyOfficerProfile();
    await tx.wait();
    document.getElementById("myOfficerName").value = "";
    document.getElementById("myOfficerDesignation").value = "";
    document.getElementById("myOfficerBadge").value = "";
    showResult("myOfficerResult", "ok", "Identity removed. Custody trails will now show your raw wallet address until you save a new identity.");
  } catch (err) {
    showResult("myOfficerResult", "fail", formatError(err));
  } finally {
    setBtnBusy(btn, false);
  }
}

async function saveAdminOfficerProfile(btn) {
  const address = document.getElementById("adminOfficerAddress").value.trim();
  const name = document.getElementById("adminOfficerName").value.trim();
  const designation = document.getElementById("adminOfficerDesignation").value.trim();
  const badgeId = document.getElementById("adminOfficerBadge").value.trim();
  if (!address || !name) {
    showResult("adminOfficerResult", "fail", "Wallet address and name are required.");
    return;
  }
  setBtnBusy(btn, true, "Saving...");
  try {
    const tx = await contract.setOfficerProfile(address, name, designation, badgeId);
    await tx.wait();
    showResult("adminOfficerResult", "ok", `Identity saved for ${address}.`);
  } catch (err) {
    showResult("adminOfficerResult", "fail", formatError(err));
  } finally {
    setBtnBusy(btn, false);
  }
}

// Returns "Inspector R. Khan (TN-4471)" style label, or the raw address if
// no on-chain identity has been set for it yet.
async function getOfficerLabel(address) {
  try {
    const [name, designation, badgeId, isSet] = await contract.getOfficerProfile(address);
    if (!isSet) return address;
    const parts = [designation, name].filter(Boolean).join(" ");
    return badgeId ? `${parts} (${badgeId})` : parts || address;
  } catch (e) {
    return address;
  }
}

// ---------- Face Verification (client-side only, optional UX safeguard) ----------
// This is NOT a cryptographic control — the smart contract has no idea a face
// was checked. It's a browser-side speed bump so someone who picks up an
// already-unlocked wallet still hits a face check before Pause/Unpause/Admin
// Transfer. Enrollment lives in localStorage, so it's per-browser/device, not
// portable, and never touches the network — face-api.js runs entirely
// on-device once the model files are downloaded.
//
// Using the project's own GitHub Pages model host (not a third-party CDN
// mirror) — this is the most reliable source for the weight files.
const FACE_MODEL_URL = "https://justadudewhohacks.github.io/face-api.js/models";
const FACE_MATCH_THRESHOLD = 0.50; // relaxed from 0.42 for faster, more reliable matching
const FACE_LIVE_TICK_MS = 150;          // how often the live tracking loop checks for a face
const FACE_STABLE_TICKS_REQUIRED = 4;   // ~0.6s of steady detection before auto-capturing

let faceModelsLoaded = false;
let faceStream = null;
let faceLiveLoopId = null;
let faceStableCount = 0;
let faceModalBusy = false;      // true while running the final (heavier) capture
let faceActiveHandler = null;   // the function to call once detection is stable
let faceModalCancelResolve = null; // set only while a verify-before-action flow awaits Cancel
let faceActivePinCheck = null;      // set while the PIN step is showing during verification

function faceStorageKey(address) {
  return `eps_face_${(address || "").toLowerCase()}`;
}

// Stored value is JSON: { descriptor: number[128], pinHash: hex string }.
// The PIN exists because face-embedding distance alone cannot reliably tell
// apart people who look very similar (identical twins, close siblings) —
// that's a real, documented limitation of 2D face recognition in general,
// not specific to this implementation. The PIN is a knowledge factor that
// doesn't depend on appearance at all.
async function sha256Hex(text) {
  const data = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, "0")).join("");
}

function hasFaceEnrollment(address) {
  return !!address && !!localStorage.getItem(faceStorageKey(address));
}

async function refreshFaceEnrollStatus() {
  const el = document.getElementById("faceEnrollStatus");
  if (!el) return;
  if (!connectedAddress) {
    el.innerText = "Connect a wallet to enroll.";
    return;
  }
  el.innerText = hasFaceEnrollment(connectedAddress)
    ? "✓ Enrolled on this browser/device."
    : "Not enrolled on this browser/device yet.";
}

// Loads all four models needed: TinyFaceDetector for fast live tracking,
// SsdMobilenetv1 for a more accurate one-shot capture, plus landmarks and
// the recognition net for descriptors. Errors are surfaced distinctly from
// "no face in frame" so a failed model download doesn't just look like a
// detection problem.
async function loadFaceModels() {
  if (faceModelsLoaded) return;
  await Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri(FACE_MODEL_URL),
    faceapi.nets.ssdMobilenetv1.loadFromUri(FACE_MODEL_URL),
    faceapi.nets.faceLandmark68Net.loadFromUri(FACE_MODEL_URL),
    faceapi.nets.faceRecognitionNet.loadFromUri(FACE_MODEL_URL)
  ]);
  faceModelsLoaded = true;
}

async function startFaceCamera() {
  const video = document.getElementById("faceVideo");
  // 4:3 to match the modal's display box (object-fit:cover on both video and
  // canvas handles any camera that ignores this and returns a different
  // native ratio, but requesting the right shape up front means less gets
  // cropped away). Higher resolution than before gives the model more
  // detail to work with.
  faceStream = await navigator.mediaDevices.getUserMedia({
    video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
    audio: false
  });
  video.srcObject = faceStream;
  await new Promise(resolve => { video.onloadedmetadata = resolve; });
}

function stopFaceCamera() {
  if (faceStream) {
    faceStream.getTracks().forEach(t => t.stop());
    faceStream = null;
  }
}

// ---- Real-time wireframe face mesh animation ----
// Draws a Delaunay-triangulated mesh of all 68 facial landmark points,
// producing the wireframe-polygon overlay seen in biometric UI references.
// The mesh automatically aligns to the face as it moves.
let faceAnimFrame = null;
let faceTrackData = null;
let faceFrameCount = 0;

// Delaunay triangulation (Bowyer–Watson) — turns 68 landmark points into
// a clean triangle mesh so we can draw connected lines across the face.
function delaunayTriangulate(points) {
  const n = points.length;
  if (n < 3) return [];
  // Super-triangle that encloses all points
  const margin = 1000;
  const st = [
    { x: -margin, y: -margin },
    { x: margin * 3, y: -margin },
    { x: 0, y: margin * 3 }
  ];
  let triangles = [{ a: n, b: n + 1, c: n + 2 }];
  const allPts = points.concat(st);

  function circumscribed(tri, p) {
    const ax = allPts[tri.a].x, ay = allPts[tri.a].y;
    const bx = allPts[tri.b].x, by = allPts[tri.b].y;
    const cx = allPts[tri.c].x, cy = allPts[tri.c].y;
    const D = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by));
    if (Math.abs(D) < 1e-10) return false;
    const ux = ((ax * ax + ay * ay) * (by - cy) + (bx * bx + by * by) * (cy - ay) + (cx * cx + cy * cy) * (ay - by)) / D;
    const uy = ((ax * ax + ay * ay) * (cx - bx) + (bx * bx + by * by) * (ax - cx) + (cx * cx + cy * cy) * (bx - ax)) / D;
    const dx = ax - ux, dy = ay - uy;
    const r2 = dx * dx + dy * dy;
    const dpx = p.x - ux, dpy = p.y - uy;
    return (dpx * dpx + dpy * dpy) <= r2;
  }

  for (let i = 0; i < n; i++) {
    const p = allPts[i];
    const bad = [];
    for (let j = 0; j < triangles.length; j++) {
      if (circumscribed(triangles[j], p)) bad.push(j);
    }
    const edges = [];
    for (const idx of bad) {
      const t = triangles[idx];
      edges.push([t.a, t.b], [t.b, t.c], [t.c, t.a]);
    }
    // Remove bad triangles (in reverse order to keep indices valid)
    for (let j = bad.length - 1; j >= 0; j--) triangles.splice(bad[j], 1);
    // Find boundary edges (appear exactly once)
    const unique = [];
    for (let j = 0; j < edges.length; j++) {
      let shared = false;
      for (let k = 0; k < edges.length; k++) {
        if (j === k) continue;
        if ((edges[j][0] === edges[k][1] && edges[j][1] === edges[k][0]) ||
            (edges[j][0] === edges[k][0] && edges[j][1] === edges[k][1])) {
          shared = true; break;
        }
      }
      if (!shared) unique.push(edges[j]);
    }
    for (const [a, b] of unique) {
      triangles.push({ a, b, c: i });
    }
  }
  // Remove triangles that use super-triangle vertices
  return triangles.filter(t => t.a < n && t.b < n && t.c < n);
}

function drawScanRing(ctx, cx, cy, radius, frame) {
  const startAngle = frame * 0.03;
  const arcLength = Math.PI * 0.6;

  ctx.beginPath();
  ctx.arc(cx, cy, radius, startAngle, startAngle + arcLength);
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx, cy, radius, startAngle + Math.PI, startAngle + Math.PI + arcLength * 0.4);
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx, cy, radius * 0.85, -startAngle * 0.7, -startAngle * 0.7 + arcLength * 0.3);
  ctx.strokeStyle = 'rgba(255,255,255,0.2)';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.setLineDash([3, 8]);
  ctx.beginPath();
  ctx.arc(cx, cy, radius + 8, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255,255,255,0.1)';
  ctx.lineWidth = 0.5;
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawCornerLock(ctx, x, y, w, h, len, alpha) {
  ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
  ctx.lineWidth = 2;
  [[x, y, 1, 1], [x + w, y, -1, 1], [x, y + h, 1, -1], [x + w, y + h, -1, -1]].forEach(([cx, cy, dx, dy]) => {
    ctx.beginPath();
    ctx.moveTo(cx, cy + dy * len);
    ctx.lineTo(cx, cy);
    ctx.lineTo(cx + dx * len, cy);
    ctx.stroke();
  });
}

function drawHexReadout(ctx, x, y, frame, alpha) {
  ctx.font = '9px monospace';
  ctx.fillStyle = `rgba(255,255,255,${alpha * 0.5})`;
  ctx.textAlign = 'left';
  const hex = 'ABCDEF0123456789';
  for (let i = 0; i < 3; i++) {
    let line = '';
    for (let j = 0; j < 12; j++) {
      line += hex[(frame + i * 7 + j * 3) % 16];
      if (j % 2 === 1) line += ' ';
    }
    ctx.fillText(line, x, y + i * 12);
  }
}

function runFaceScanAnimation() {
  stopFaceScanAnimation(); // Prevent duplicate rendering loops that cause extreme lag
  const video = document.getElementById("faceVideo");
  const canvas = document.getElementById("faceOverlay");
  const ctx = canvas.getContext("2d");
  faceFrameCount = 0;

  function draw() {
    if (!faceStream) return;
    const vw = video.videoWidth || 640;
    const vh = video.videoHeight || 480;
    canvas.width = vw;
    canvas.height = vh;
    ctx.clearRect(0, 0, vw, vh);
    faceFrameCount++;

    if (video.readyState >= 2) {
      if (faceTrackData) {
        // Draw bounding box
        const box = faceTrackData.box;
        ctx.strokeStyle = 'rgba(255,255,255,0.4)';
        ctx.lineWidth = 1;
        ctx.strokeRect(box.x, box.y, box.width, box.height);

        // Lock-on corners on the face box
        const pulse = 0.5 + (Math.sin(faceFrameCount * 0.1) * 0.5 * (faceStableCount / FACE_STABLE_TICKS_REQUIRED));
        const pad = 16;
        drawCornerLock(ctx, box.x - pad, box.y - pad, box.width + pad * 2, box.height + pad * 2, 20, pulse * 0.7);
        
        // Rotating scan ring
        const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
        const radius = Math.max(box.width, box.height) * 0.65;
        drawScanRing(ctx, cx, cy, radius, faceFrameCount);

        // Data readout near face
        drawHexReadout(ctx, box.x - 12 + 4, box.y - 12 + box.height + 32, faceFrameCount, pulse);
      }

      // Sweep line (White QR style)
      const sweepY = (faceFrameCount * 3.5) % (vh + 60) - 30;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.fillRect(0, sweepY - 20, vw, 40);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(0, sweepY); ctx.lineTo(vw, sweepY); ctx.stroke();

      // Corner brackets on viewport
      drawCornerLock(ctx, 20, 20, vw - 40, vh - 40, 25, 0.2);

      // Scanning text
      ctx.font = '10px monospace';
      ctx.fillStyle = `rgba(255, 255, 255, ${0.5 + Math.sin(faceFrameCount * 0.04) * 0.2})`;
      ctx.textAlign = 'center';
      ctx.fillText('SCANNING...', vw / 2, vh - 20);
    }

    // Confidence fill bar at bottom
    const fill = document.getElementById('faceConfidenceFill');
    if (fill) {
      fill.style.width = `${Math.min(faceStableCount / FACE_STABLE_TICKS_REQUIRED * 100, 100)}%`;
    }

    faceAnimFrame = requestAnimationFrame(draw);
  }
  draw();
}

function stopFaceScanAnimation() {
  if (faceAnimFrame) {
    cancelAnimationFrame(faceAnimFrame);
    faceAnimFrame = null;
  }
  faceTrackData = null;
  const hud = document.getElementById('faceTrackingHUD');
  if (hud) hud.innerHTML = '';
  const fill = document.getElementById('faceConfidenceFill');
  if (fill) fill.style.width = '0%';
}

// Continuously tracks the face and feeds detection results to the
// animation renderer for real-time tracking visualization.
function startFaceLiveLoop(onStableCapture) {
  stopFaceLiveLoop(); // Prevent duplicate intervals that cause extreme lag
  faceActiveHandler = onStableCapture;
  faceStableCount = 0;
  faceTrackData = null;
  faceLiveLoopId = setInterval(async () => {
    if (faceModalBusy) return;
    const video = document.getElementById("faceVideo");
    if (!video || video.readyState < 2) return;

    try {
      const result = await faceapi
        .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.4 }))
        .withFaceLandmarks();

      if (result) {
        faceTrackData = {
          box: result.detection.box,
          landmarks: result.landmarks,
          score: result.detection.score
        };
        faceStableCount++;
        document.getElementById("faceModalStatus").innerText =
          `Face locked — hold steady (${Math.min(faceStableCount, FACE_STABLE_TICKS_REQUIRED)}/${FACE_STABLE_TICKS_REQUIRED})`;

        if (faceStableCount >= FACE_STABLE_TICKS_REQUIRED) {
          faceModalBusy = true;
          stopFaceLiveLoop();
          await onStableCapture();
          faceModalBusy = false;
        }
      } else {
        faceTrackData = null;
        faceStableCount = 0;
        document.getElementById("faceModalStatus").innerText = "No face detected — center your face in the frame.";
      }
    } catch (err) {
      console.error("Face detection tick failed:", err);
    }
  }, FACE_LIVE_TICK_MS);
}

function stopFaceLiveLoop() {
  if (faceLiveLoopId) {
    clearInterval(faceLiveLoopId);
    faceLiveLoopId = null;
  }
}

// One-shot, higher-accuracy descriptor extraction — SsdMobilenetv1 is more
// accurate (if slower) than the TinyFaceDetector used for live tracking.
// Rejects the frame (returns null) if confidence is low or the face is too
// small/far in the shot, rather than accepting a blurry/distant reading.
async function captureAccurateDescriptor() {
  const video = document.getElementById("faceVideo");
  const detection = await faceapi
    .detectSingleFace(video, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.40 }))
    .withFaceLandmarks()
    .withFaceDescriptor();
  if (!detection) return null;

  const box = detection.detection.box;
  const videoArea = video.videoWidth * video.videoHeight;
  const coverage = videoArea > 0 ? (box.width * box.height) / videoArea : 0;
  if (detection.detection.score < 0.40 || coverage < 0.02) {
    return null; // too low-confidence or too small/far — treat as no usable read
  }
  return detection.descriptor;
}

// Takes several single-frame readings a beat apart and averages them,
// rather than trusting one instant. This smooths out a stray blink, a
// half-second of motion blur, or a slightly odd angle — the same trick
// production face-recognition systems use to get more reliable readings out
// of a single 2D camera. Needs a majority of samples to succeed, or the
// whole capture is rejected rather than averaging over too few good frames.
async function captureAveragedDescriptor(samples, delayMs, onProgress) {
  samples = samples || 3;
  delayMs = delayMs || 180;
  const descriptors = [];
  for (let i = 0; i < samples; i++) {
    if (onProgress) onProgress(i + 1, samples);
    const d = await captureAccurateDescriptor();
    if (d) descriptors.push(d);
    if (i < samples - 1) await new Promise(r => setTimeout(r, delayMs));
  }
  if (descriptors.length < Math.ceil(samples / 2)) return null;

  const length = descriptors[0].length;
  const avg = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    let sum = 0;
    for (const d of descriptors) sum += d[i];
    avg[i] = sum / descriptors.length;
  }
  return avg;
}

async function openFaceModal(mode, onAutoCapture) {
  document.getElementById("faceModalOverlay").style.display = "flex";
  document.getElementById("faceModalTitle").innerText = mode === "enroll" ? "Enroll Your Face" : "Verify It's You";
  document.getElementById("faceModalDesc").innerText = mode === "enroll"
    ? "Center your face in the frame — it enrolls automatically once steadily detected."
    : "Center your face in the frame — it verifies automatically once steadily detected.";
  document.getElementById("faceModalStatus").innerText = "Loading face recognition models...";
  document.getElementById("faceModalResult").innerHTML = "";
  document.getElementById("faceRetryBtn").style.display = "none";
  document.getElementById("facePinStep").style.display = "none";
  document.getElementById("facePinVerify").value = "";

  try {
    await loadFaceModels();
  } catch (err) {
    document.getElementById("faceModalStatus").innerText = "";
    showResult("faceModalResult", "fail", "Face recognition models failed to load (check your internet connection): " + (err.message || err));
    return;
  }

  document.getElementById("faceModalStatus").innerText = "Starting camera...";
  try {
    await startFaceCamera();
  } catch (err) {
    document.getElementById("faceModalStatus").innerText = "";
    showResult("faceModalResult", "fail", "Could not access camera: " + (err.message || err));
    return;
  }

  const handler = mode === "enroll" ? handleEnrollAutoCapture : onAutoCapture;
  runFaceScanAnimation();
  startFaceLiveLoop(handler);
}

function closeFaceModal() {
  document.getElementById("faceModalOverlay").style.display = "none";
  stopFaceLiveLoop();
  stopFaceScanAnimation();
  stopFaceCamera();
  faceModalBusy = false;
  faceActiveHandler = null;
  faceActivePinCheck = null;
  document.getElementById("facePinStep").style.display = "none";
  document.getElementById("facePinVerify").value = "";
  if (faceModalCancelResolve) {
    const resolveFn = faceModalCancelResolve;
    faceModalCancelResolve = null;
    resolveFn(false);
  }
}

function retryFaceCapture() {
  document.getElementById("faceRetryBtn").style.display = "none";
  document.getElementById("faceModalResult").innerHTML = "";
  if (faceActiveHandler) startFaceLiveLoop(faceActiveHandler);
}

async function submitFacePinVerify() {
  if (faceActivePinCheck) await faceActivePinCheck();
}

let pendingEnrollPin = null; // holds the validated PIN between startFaceEnrollment() and the auto-capture callback

function startFaceEnrollment() {
  const pin = document.getElementById("facePinEnroll").value.replace(/[^0-9]/g, '');
  if (pin.length < 4) {
    showResult("faceEnrollResult", "fail", "PIN must be at least 4 digits.");
    return;
  }
  pendingEnrollPin = pin;
  openFaceModal("enroll");
}

async function handleEnrollAutoCapture() {
  try {
    const descriptor = await captureAveragedDescriptor(3, 120, (n, total) => {
      document.getElementById("faceModalStatus").innerText = `Capturing sample ${n}/${total}...`;
    });
    if (!descriptor) {
      stopFaceScanAnimation();
      stopFaceLiveLoop();
      showResult("faceModalResult", "fail", "Couldn't get enough clear readings — try better lighting or hold still.");
      document.getElementById("faceRetryBtn").style.display = "";
      return;
    }
    if (!pendingEnrollPin) return; // Prevent duplicate concurrent executions from wiping the PIN

    const pinHash = await sha256Hex(pendingEnrollPin);
    pendingEnrollPin = null;
    localStorage.setItem(faceStorageKey(connectedAddress), JSON.stringify({
      descriptor: Array.from(descriptor),
      pinHash
    }));
    if (window.epsApi) {
      window.epsApi.backupProfile(connectedAddress, {
        faceDescriptor: Array.from(descriptor),
        pinHash
      });
      window.epsApi.logAudit("FACE_ENROLLED", connectedAddress, {});
    }
    document.getElementById("facePinEnroll").value = "";
    showResult("faceModalResult", "ok", "Face + PIN enrolled for this wallet on this browser.");
    stopFaceScanAnimation(); // stop cpu hog while idle
    stopFaceLiveLoop();
    document.getElementById("faceModalStatus").innerText = "Done.";
    await refreshFaceEnrollStatus();
    setTimeout(closeFaceModal, 1200);
  } catch (err) {
    stopFaceScanAnimation(); // halt render loop
    showResult("faceModalResult", "fail", "Enrollment failed: " + (err.message || err));
    document.getElementById("faceRetryBtn").style.display = "";
  }
}

function clearFaceEnrollment() {
  if (!connectedAddress) return;
  localStorage.removeItem(faceStorageKey(connectedAddress));
  if (window.epsApi) {
    window.epsApi.deleteProfile(connectedAddress);
    window.epsApi.logAudit("FACE_ENROLLMENT_CLEARED", connectedAddress, {});
  }
  refreshFaceEnrollStatus();
  showResult("faceEnrollResult", "ok", "Enrollment removed for this wallet on this browser.");
}

// Opens the verify modal before a high-stakes action. Resolves true only if
// BOTH the live face matches the enrolled one AND the correct PIN is
// entered — face matching alone is not enough to reliably tell apart
// people who look very similar (twins, close siblings), so the PIN is the
// actual decisive factor, not just a formality. Resolves true immediately
// if nothing is enrolled for this wallet (this layer is optional and never
// blocks wallets that haven't set it up). Resolves false only if the user
// actively cancels. A mismatch does NOT auto-retry — it requires a
// deliberate "Try Again" click.
function verifyFaceBeforeAction(actionLabel) {
  return new Promise(async (resolve) => {
    if (!hasFaceEnrollment(connectedAddress)) {
      resolve(true);
      return;
    }

    const stored = JSON.parse(localStorage.getItem(faceStorageKey(connectedAddress)));
    const enrolledDescriptor = new Float32Array(stored.descriptor);
    const enrolledPinHash = stored.pinHash;
    faceModalCancelResolve = resolve;

    const verifyHandler = async () => {
      try {
        const liveDescriptor = await captureAveragedDescriptor(3, 120, (n, total) => {
          document.getElementById("faceModalStatus").innerText = `Confirming match — sample ${n}/${total}...`;
        });
        if (!liveDescriptor) {
          stopFaceScanAnimation();
          stopFaceLiveLoop();
          showResult("faceModalResult", "fail", "Couldn't get enough clear readings.");
          document.getElementById("faceRetryBtn").style.display = "";
          return;
        }
        const distance = faceapi.euclideanDistance(enrolledDescriptor, liveDescriptor);
        const distanceNote = `<div style="font-family:var(--mono); font-size:10.5px; color:var(--ink-500); margin-top:4px;">match distance: ${distance.toFixed(3)} (needs &lt; ${FACE_MATCH_THRESHOLD})</div>`;
        
        stopFaceScanAnimation(); // ALWAYS stop scanning animation here to prevent background lag
        stopFaceLiveLoop();
        
        if (distance < FACE_MATCH_THRESHOLD) {
          showResult("faceModalResult", "ok", "✓ Face matched — enter your PIN to finish." + distanceNote);
          document.getElementById("faceModalStatus").innerText = "Now enter your PIN.";
          document.getElementById("facePinStep").style.display = "";
          document.getElementById("facePinVerify").focus();
          faceActivePinCheck = async () => {
            if (!enrolledPinHash) {
              showResult("faceModalResult", "fail", "✕ Legacy enrollment detected (no PIN). Please close this, click 'Reset Face Data' in the dashboard, and re-enroll.");
              document.getElementById("facePinVerify").value = "";
              return;
            }
            const enteredPin = document.getElementById("facePinVerify").value.replace(/[^0-9]/g, '');
            const enteredHash = await sha256Hex(enteredPin);
            if (enteredHash === enrolledPinHash) {
              showResult("faceModalResult", "ok", "✓ Identity verified.");
              document.getElementById("facePinStep").style.display = "none";
              setTimeout(() => {
                faceModalCancelResolve = null; // prevent closeFaceModal's auto-resolve(false) below
                closeFaceModal();
                resolve(true);
              }, 700);
            } else {
              showResult("faceModalResult", "fail", `✕ Incorrect PIN.`);
              document.getElementById("facePinVerify").value = "";
            }
          };
        } else {
          showResult("faceModalResult", "fail", "✕ Face does not match the enrolled identity for this wallet." + distanceNote);
          document.getElementById("faceRetryBtn").style.display = "";
        }
      } catch (err) {
        showResult("faceModalResult", "fail", "Verification failed: " + (err.message || err));
        document.getElementById("faceRetryBtn").style.display = "";
      }
    };

    await openFaceModal("verify", verifyHandler);
    document.getElementById("faceModalDesc").innerText = `Verify it's you before: ${actionLabel} — hold steady, it checks automatically.`;
  });
}