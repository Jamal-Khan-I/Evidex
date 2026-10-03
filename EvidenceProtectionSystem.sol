// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title EvidenceProtectionSystem
 * @notice Tamper-evident, role-controlled digital evidence chain-of-custody
 *         ledger. Every registration, custody transfer, and role change is
 *         permanently and publicly auditable on-chain.
 *
 * Roles:
 *  - ADMIN        : deploys the contract, authorizes/revokes all other roles
 *  - INVESTIGATOR : can register new evidence and initiate custody transfers
 *  - LAB          : can receive custody, run/record integrity checks
 *  - COURT        : can receive custody, close a case
 *
 * Core guarantee: once evidence is registered, its file hash and every
 * custody transfer are immutable. Nobody -- not even the Admin -- can
 * edit or delete history. Only new records can be appended.
 *
 * v2 additions on top of the hardened base version:
 *  - Batch variants of register/transfer/verify so multiple evidence files
 *    filed under one case number can be handled in a single transaction
 *    instead of one signature per file.
 *  - clearMyOfficerProfile(), letting an officer remove their own bound
 *    identity (e.g. reassignment, wallet retirement).
 */
contract EvidenceProtectionSystem {

    // ---------------- CONSTANTS ----------------

    uint256 public constant MAX_ID_LENGTH = 64;
    uint256 public constant MAX_CASE_NUMBER_LENGTH = 64;
    uint256 public constant MAX_DESCRIPTION_LENGTH = 500;
    uint256 public constant MAX_NOTE_LENGTH = 300;
    uint256 public constant MAX_FIR_LENGTH = 64;
    uint256 public constant MAX_STATION_LENGTH = 100;
    uint256 public constant MAX_SECTIONS_LENGTH = 200;
    uint256 public constant MAX_NAME_LENGTH = 100;
    uint256 public constant MAX_DESIGNATION_LENGTH = 100;
    uint256 public constant MAX_BADGE_LENGTH = 40;
    uint256 public constant MAX_CASE_KEY_LENGTH = 64;

    uint256 public constant MAX_ROLE_NAME_LENGTH = 60;
    uint256 public constant MAX_FINDINGS_LENGTH = 1000;
    uint256 public constant MAX_REPORT_HASH_LENGTH = 100;
    uint256 public constant MAX_BATCH_SIZE = 30; // gas-griefing guard on array-input functions
    uint8 public constant ROLE_NONE = 0;
    uint8 public constant ROLE_INVESTIGATOR = 1;
    uint8 public constant ROLE_LAB = 2;
    uint8 public constant ROLE_COURT = 3;
    uint8 public constant MAX_ROLE_ID = 100; // sanity cap on total distinct roles ever created

    // ---------------- STATE ----------------

    address public admin;
    address public pendingAdmin;
    bool public paused;

    enum CaseStatus { Open, Closed }

    // Roles are represented as uint8 IDs rather than a fixed enum so the
    // admin can create new named roles after deployment (e.g. "Forensic
    // Examiner", "Prosecutor") without redeploying the contract. IDs 0-3
    // are permanently reserved for the built-in roles below; only those
    // built-in roles carry the privileged register/close-case permissions.
    // Custom roles (ID 4+) are custody-eligible -- they can receive and hold
    // evidence and appear by name everywhere in the UI/reports -- but do not
    // gain register/close authority unless the admin also explicitly notes
    // that elsewhere; this keeps the two most sensitive actions tied to
    // roles that were reviewed at contract-design time, not created ad hoc.
    mapping(address => uint8) public roles;

    // Number of addresses currently holding each role ID. Kept in sync by
    // grantRole/revokeRole so removeCustomRole can refuse to delete a role
    // that's still assigned to someone, instead of silently leaving those
    // holders with a dangling privilege tied to a name that no longer
    // resolves anywhere.
    mapping(uint8 => uint256) public roleHolderCount;

    struct CustomRoleInfo {
        string name;
        bool exists;
    }

    mapping(uint8 => CustomRoleInfo) private customRoles;
    uint8 public nextCustomRoleId = 4;

    struct CustodyRecord {
        address holder;
        uint8 holderRole;
        uint256 timestamp;
        string note;
    }

    struct Evidence {
        string evidenceId;
        string caseNumber;
        string firNumber;
        string policeStation;
        string lawSections;
        string description;
        bytes32 fileHash;
        string ipfsCid;
        address registeredBy;
        uint256 registeredAt;
        CaseStatus status;
        bool exists;
    }

    struct OfficerProfile {
        string name;
        string designation;
        string badgeId;
        bool isSet;
    }

    mapping(address => OfficerProfile) public officerProfiles;

    // A Lab officer's analysis findings for an evidence item. Multiple
    // reports can accumulate per item (e.g. separate tests, or a second
    // opinion) -- nothing is ever overwritten, only appended, matching the
    // append-only guarantee the rest of the ledger already gives.
    struct LabReport {
        string findings;
        string reportHash;
        string reportIpfsCid;
        address submittedBy;
        uint256 submittedAt;
    }

    mapping(string => LabReport[]) private labReports;

    mapping(string => Evidence) private evidences;
    mapping(string => CustodyRecord[]) private custodyTrail;
    mapping(string => string[]) private caseToEvidenceIds;
    // NOTE: storing the key here makes it retrievable by any role holder via
    // getCaseEncryptionKey, but it is also permanently public on-chain to
    // ANYONE who reads chain data directly (raw storage or tx calldata) --
    // the role check below only gates access through this contract's own
    // functions, not the chain itself.
    mapping(string => string) private caseEncryptionKeys;
    string[] public allEvidenceIds;

    uint256 public totalTransfers;
    uint256 public totalVerificationChecks;
    uint256 public totalVerificationPasses;

    // ---------------- EVENTS ----------------

    event RoleGranted(address indexed account, uint8 role, uint256 timestamp);
    event RoleRevoked(address indexed account, uint256 timestamp);
    event CustomRoleCreated(uint8 indexed roleId, string name, address indexed createdBy, uint256 timestamp);
    event CustomRoleRemoved(uint8 indexed roleId, string name, address indexed removedBy, uint256 timestamp);
    event EvidenceRegistered(string evidenceId, string caseNumber, bytes32 fileHash, string ipfsCid, address indexed registeredBy, uint256 timestamp);
    event CustodyTransferred(string evidenceId, address indexed from, address indexed to, uint256 timestamp, string note);
    event IntegrityChecked(string evidenceId, address indexed checkedBy, bool result, uint256 timestamp);
    event CaseClosed(string evidenceId, address indexed closedBy, uint256 timestamp);
    event AdminTransferProposed(address indexed currentAdmin, address indexed proposedAdmin, uint256 timestamp);
    event AdminTransferAccepted(address indexed previousAdmin, address indexed newAdmin, uint256 timestamp);
    event Paused(address indexed account, uint256 timestamp);
    event Unpaused(address indexed account, uint256 timestamp);
    event OfficerProfileSet(address indexed account, string name, string designation, string badgeId, uint256 timestamp);
    event OfficerProfileCleared(address indexed account, uint256 timestamp);
    event LabReportSubmitted(string evidenceId, address indexed submittedBy, string reportHash, uint256 timestamp);

    // ---------------- ERRORS ----------------

    error NotAdmin();
    error NotAuthorizedRole();
    error ContractIsPaused();
    error ZeroAddress();
    error EvidenceNotFound();
    error EvidenceAlreadyExists();
    error EmptyField(string field);
    error FieldTooLong(string field, uint256 max);
    error InvalidFileHash();
    error CaseIsClosed();
    error NewHolderNotAuthorized();
    error NotCurrentHolder();
    error NoPendingAdmin();
    error NotPendingAdmin();
    error UnknownRole(uint8 roleId);
    error TooManyRoles();
    error CannotRemoveBuiltInRole();
    error RoleStillAssigned(uint8 roleId, uint256 holderCount);
    error EmptyBatch();
    error BatchTooLarge(uint256 size, uint256 max);
    error BatchLengthMismatch();

    // ---------------- MODIFIERS ----------------

    modifier onlyAdmin() {
        if (msg.sender != admin) revert NotAdmin();
        _;
    }

    modifier onlyRole(uint8 requiredRole) {
        if (roles[msg.sender] != requiredRole) revert NotAuthorizedRole();
        _;
    }

    modifier onlyAnyRole() {
        if (roles[msg.sender] == ROLE_NONE) revert NotAuthorizedRole();
        _;
    }

    modifier whenNotPaused() {
        if (paused) revert ContractIsPaused();
        _;
    }

    modifier evidenceMustExist(string memory evidenceId) {
        if (!evidences[evidenceId].exists) revert EvidenceNotFound();
        _;
    }

    modifier notZeroAddress(address account) {
        if (account == address(0)) revert ZeroAddress();
        _;
    }

    modifier validBatchSize(uint256 size) {
        if (size == 0) revert EmptyBatch();
        if (size > MAX_BATCH_SIZE) revert BatchTooLarge(size, MAX_BATCH_SIZE);
        _;
    }

    // ---------------- CONSTRUCTOR ----------------

    constructor() {
        admin = msg.sender;
    }

    // ---------------- ADMIN TRANSFER (two-step) ----------------

    function proposeAdmin(address newAdmin) external onlyAdmin notZeroAddress(newAdmin) {
        pendingAdmin = newAdmin;
        emit AdminTransferProposed(admin, newAdmin, block.timestamp);
    }

    function acceptAdmin() external {
        if (pendingAdmin == address(0)) revert NoPendingAdmin();
        if (msg.sender != pendingAdmin) revert NotPendingAdmin();
        address previous = admin;
        admin = pendingAdmin;
        pendingAdmin = address(0);
        emit AdminTransferAccepted(previous, admin, block.timestamp);
    }

    function cancelAdminTransfer() external onlyAdmin {
        pendingAdmin = address(0);
    }

    // ---------------- EMERGENCY PAUSE ----------------

    function pause() external onlyAdmin {
        paused = true;
        emit Paused(msg.sender, block.timestamp);
    }

    function unpause() external onlyAdmin {
        paused = false;
        emit Unpaused(msg.sender, block.timestamp);
    }

    // ---------------- ROLE MANAGEMENT ----------------

    function grantRole(address account, uint8 role) public onlyAdmin notZeroAddress(account) {
        if (role == ROLE_NONE) revert UnknownRole(role);
        if (!_roleExists(role)) revert UnknownRole(role);

        uint8 previousRole = roles[account];
        if (previousRole != ROLE_NONE) {
            roleHolderCount[previousRole] -= 1;
        }
        roles[account] = role;
        roleHolderCount[role] += 1;

        emit RoleGranted(account, role, block.timestamp);
    }

    function revokeRole(address account) public onlyAdmin {
        uint8 previousRole = roles[account];
        if (previousRole != ROLE_NONE) {
            roleHolderCount[previousRole] -= 1;
        }
        roles[account] = ROLE_NONE;
        emit RoleRevoked(account, block.timestamp);
    }

    function getRole(address account) public view returns (uint8) {
        return roles[account];
    }

    function _roleExists(uint8 roleId) private view returns (bool) {
        if (roleId == ROLE_INVESTIGATOR || roleId == ROLE_LAB || roleId == ROLE_COURT) return true;
        return customRoles[roleId].exists;
    }

    function createCustomRole(string memory name) external onlyAdmin returns (uint8 roleId) {
        if (bytes(name).length == 0) revert EmptyField("name");
        if (bytes(name).length > MAX_ROLE_NAME_LENGTH) revert FieldTooLong("name", MAX_ROLE_NAME_LENGTH);
        if (nextCustomRoleId > MAX_ROLE_ID) revert TooManyRoles();

        roleId = nextCustomRoleId;
        nextCustomRoleId++;
        customRoles[roleId] = CustomRoleInfo({ name: name, exists: true });

        emit CustomRoleCreated(roleId, name, msg.sender, block.timestamp);
    }

    function removeCustomRole(uint8 roleId) external onlyAdmin {
        if (roleId < 4) revert CannotRemoveBuiltInRole();
        if (!customRoles[roleId].exists) revert UnknownRole(roleId);
        uint256 holders = roleHolderCount[roleId];
        if (holders != 0) revert RoleStillAssigned(roleId, holders);

        string memory name = customRoles[roleId].name;
        delete customRoles[roleId];

        emit CustomRoleRemoved(roleId, name, msg.sender, block.timestamp);
    }

    function getRoleName(uint8 roleId) public view returns (string memory) {
        if (roleId == ROLE_NONE) return "None";
        if (roleId == ROLE_INVESTIGATOR) return "Investigator";
        if (roleId == ROLE_LAB) return "Lab";
        if (roleId == ROLE_COURT) return "Court";
        if (customRoles[roleId].exists) return customRoles[roleId].name;
        return "Unknown";
    }

    function getAllCustomRoles() external view returns (uint8[] memory ids, string[] memory names) {
        uint8 total = nextCustomRoleId - 4;

        uint256 activeCount = 0;
        for (uint8 i = 0; i < total; i++) {
            if (customRoles[i + 4].exists) activeCount++;
        }

        ids = new uint8[](activeCount);
        names = new string[](activeCount);
        uint256 idx = 0;
        for (uint8 i = 0; i < total; i++) {
            uint8 id = i + 4;
            if (customRoles[id].exists) {
                ids[idx] = id;
                names[idx] = customRoles[id].name;
                idx++;
            }
        }
    }

    // ---------------- OFFICER IDENTITY REGISTRY ----------------

    function setMyOfficerProfile(string memory name, string memory designation, string memory badgeId) external {
        _setOfficerProfile(msg.sender, name, designation, badgeId);
    }

    function setOfficerProfile(address account, string memory name, string memory designation, string memory badgeId)
        external
        onlyAdmin
        notZeroAddress(account)
    {
        _setOfficerProfile(account, name, designation, badgeId);
    }

    /// @notice Lets an officer remove their own bound identity (e.g. reassignment, retiring a wallet).
    ///         Does not touch any evidence or custody records -- those remain permanently attributed
    ///         to the address as recorded at the time, this only clears the human-readable label
    ///         going forward.
    function clearMyOfficerProfile() external {
        delete officerProfiles[msg.sender];
        emit OfficerProfileCleared(msg.sender, block.timestamp);
    }

    /// @notice Admin-only: force-clear another account's officer identity.
    function clearOfficerProfile(address account) external onlyAdmin notZeroAddress(account) {
        delete officerProfiles[account];
        emit OfficerProfileCleared(account, block.timestamp);
    }

    function _setOfficerProfile(address account, string memory name, string memory designation, string memory badgeId) private {
        if (bytes(name).length == 0) revert EmptyField("name");
        if (bytes(name).length > MAX_NAME_LENGTH) revert FieldTooLong("name", MAX_NAME_LENGTH);
        if (bytes(designation).length > MAX_DESIGNATION_LENGTH) revert FieldTooLong("designation", MAX_DESIGNATION_LENGTH);
        if (bytes(badgeId).length > MAX_BADGE_LENGTH) revert FieldTooLong("badgeId", MAX_BADGE_LENGTH);

        officerProfiles[account] = OfficerProfile({
            name: name,
            designation: designation,
            badgeId: badgeId,
            isSet: true
        });

        emit OfficerProfileSet(account, name, designation, badgeId, block.timestamp);
    }

    function getOfficerProfile(address account) public view returns (string memory name, string memory designation, string memory badgeId, bool isSet) {
        OfficerProfile storage p = officerProfiles[account];
        return (p.name, p.designation, p.badgeId, p.isSet);
    }

    // ---------------- EVIDENCE REGISTRATION ----------------

    function registerEvidence(
        string memory evidenceId,
        string memory caseNumber,
        string memory firNumber,
        string memory policeStation,
        string memory lawSections,
        string memory description,
        bytes32 fileHash,
        string memory ipfsCid,
        string memory caseKey
    ) public onlyRole(ROLE_INVESTIGATOR) whenNotPaused {
        _registerOne(evidenceId, caseNumber, firNumber, policeStation, lawSections, description, fileHash, ipfsCid);
        _storeCaseKey(caseNumber, caseKey);
    }

    /**
     * @notice Registers multiple evidence files under the same case in a single
     *         transaction -- one signature instead of one per file. All shared
     *         case-level fields (case number, FIR, station, law sections) are
     *         passed once; per-file fields are passed as parallel arrays that
     *         must all be the same length.
     */
    function registerEvidenceBatch(
        string[] memory evidenceIds,
        string memory caseNumber,
        string memory firNumber,
        string memory policeStation,
        string memory lawSections,
        string[] memory descriptions,
        bytes32[] memory fileHashes,
        string[] memory ipfsCids,
        string memory caseKey
    ) public onlyRole(ROLE_INVESTIGATOR) whenNotPaused validBatchSize(evidenceIds.length) {
        uint256 n = evidenceIds.length;
        if (descriptions.length != n || fileHashes.length != n || ipfsCids.length != n) revert BatchLengthMismatch();

        for (uint256 i = 0; i < n; i++) {
            _registerOne(evidenceIds[i], caseNumber, firNumber, policeStation, lawSections, descriptions[i], fileHashes[i], ipfsCids[i]);
        }
        _storeCaseKey(caseNumber, caseKey);
    }

    function _storeCaseKey(string memory caseNumber, string memory caseKey) private {
        if (bytes(caseKey).length == 0) return; // nothing supplied; leave any existing value untouched
        if (bytes(caseKey).length > MAX_CASE_KEY_LENGTH) revert FieldTooLong("caseKey", MAX_CASE_KEY_LENGTH);
        caseEncryptionKeys[caseNumber] = caseKey;
    }

    function _registerOne(
        string memory evidenceId,
        string memory caseNumber,
        string memory firNumber,
        string memory policeStation,
        string memory lawSections,
        string memory description,
        bytes32 fileHash,
        string memory ipfsCid
    ) private {
        _validateEvidenceInputs(evidenceId, caseNumber, firNumber, policeStation, lawSections, description, fileHash);
        if (evidences[evidenceId].exists) revert EvidenceAlreadyExists();

        evidences[evidenceId] = Evidence({
            evidenceId: evidenceId,
            caseNumber: caseNumber,
            firNumber: firNumber,
            policeStation: policeStation,
            lawSections: lawSections,
            description: description,
            fileHash: fileHash,
            ipfsCid: ipfsCid,
            registeredBy: msg.sender,
            registeredAt: block.timestamp,
            status: CaseStatus.Open,
            exists: true
        });

        custodyTrail[evidenceId].push(CustodyRecord({
            holder: msg.sender,
            holderRole: ROLE_INVESTIGATOR,
            timestamp: block.timestamp,
            note: "Evidence registered at point of collection"
        }));

        allEvidenceIds.push(evidenceId);
        caseToEvidenceIds[caseNumber].push(evidenceId);

        emit EvidenceRegistered(evidenceId, caseNumber, fileHash, ipfsCid, msg.sender, block.timestamp);
    }

    function _validateEvidenceInputs(
        string memory evidenceId,
        string memory caseNumber,
        string memory firNumber,
        string memory policeStation,
        string memory lawSections,
        string memory description,
        bytes32 fileHash
    ) private pure {
        uint256 idLen = bytes(evidenceId).length;
        if (idLen == 0) revert EmptyField("evidenceId");
        if (idLen > MAX_ID_LENGTH) revert FieldTooLong("evidenceId", MAX_ID_LENGTH);

        uint256 caseLen = bytes(caseNumber).length;
        if (caseLen == 0) revert EmptyField("caseNumber");
        if (caseLen > MAX_CASE_NUMBER_LENGTH) revert FieldTooLong("caseNumber", MAX_CASE_NUMBER_LENGTH);

        uint256 firLen = bytes(firNumber).length;
        if (firLen == 0) revert EmptyField("firNumber");
        if (firLen > MAX_FIR_LENGTH) revert FieldTooLong("firNumber", MAX_FIR_LENGTH);

        if (bytes(policeStation).length > MAX_STATION_LENGTH) revert FieldTooLong("policeStation", MAX_STATION_LENGTH);
        if (bytes(lawSections).length > MAX_SECTIONS_LENGTH) revert FieldTooLong("lawSections", MAX_SECTIONS_LENGTH);

        if (bytes(description).length > MAX_DESCRIPTION_LENGTH) {
            revert FieldTooLong("description", MAX_DESCRIPTION_LENGTH);
        }

        if (fileHash == bytes32(0)) revert InvalidFileHash();
    }

    // ---------------- CUSTODY TRANSFER ----------------

    function transferCustody(
        string memory evidenceId,
        address newHolder,
        string memory note
    ) public evidenceMustExist(evidenceId) whenNotPaused notZeroAddress(newHolder) {
        _transferOne(evidenceId, newHolder, note);
    }

    /**
     * @notice Transfers custody of every listed evidence item to the same
     *         new holder in a single transaction -- e.g. handing an entire
     *         case's exhibits from Investigator to Lab at once. The caller
     *         must currently hold custody of every item in the list.
     */
    function transferCustodyBatch(
        string[] memory evidenceIds,
        address newHolder,
        string memory note
    ) public whenNotPaused notZeroAddress(newHolder) validBatchSize(evidenceIds.length) {
        for (uint256 i = 0; i < evidenceIds.length; i++) {
            if (!evidences[evidenceIds[i]].exists) revert EvidenceNotFound();
            _transferOne(evidenceIds[i], newHolder, note);
        }
    }

    function _transferOne(string memory evidenceId, address newHolder, string memory note) private {
        if (bytes(note).length > MAX_NOTE_LENGTH) revert FieldTooLong("note", MAX_NOTE_LENGTH);
        if (roles[newHolder] == ROLE_NONE) revert NewHolderNotAuthorized();

        CustodyRecord[] storage trail = custodyTrail[evidenceId];
        address currentHolder = trail[trail.length - 1].holder;
        if (msg.sender != currentHolder) revert NotCurrentHolder();
        if (evidences[evidenceId].status != CaseStatus.Open) revert CaseIsClosed();

        trail.push(CustodyRecord({
            holder: newHolder,
            holderRole: roles[newHolder],
            timestamp: block.timestamp,
            note: note
        }));

        totalTransfers++;

        emit CustodyTransferred(evidenceId, currentHolder, newHolder, block.timestamp, note);
    }

    // ---------------- INTEGRITY VERIFICATION ----------------

    function verifyIntegrity(string memory evidenceId, bytes32 recomputedHash)
        public
        evidenceMustExist(evidenceId)
        whenNotPaused
        returns (bool)
    {
        return _verifyOne(evidenceId, recomputedHash);
    }

    /**
     * @notice Runs an integrity check against every listed evidence item in
     *         one transaction -- e.g. re-verifying a whole case's exhibits
     *         at once. evidenceIds[i] is checked against recomputedHashes[i].
     */
    function verifyIntegrityBatch(string[] memory evidenceIds, bytes32[] memory recomputedHashes)
        public
        whenNotPaused
        validBatchSize(evidenceIds.length)
        returns (bool[] memory results)
    {
        if (evidenceIds.length != recomputedHashes.length) revert BatchLengthMismatch();
        results = new bool[](evidenceIds.length);
        for (uint256 i = 0; i < evidenceIds.length; i++) {
            if (!evidences[evidenceIds[i]].exists) revert EvidenceNotFound();
            results[i] = _verifyOne(evidenceIds[i], recomputedHashes[i]);
        }
    }

    function _verifyOne(string memory evidenceId, bytes32 recomputedHash) private returns (bool) {
        bool isMatch = evidences[evidenceId].fileHash == recomputedHash;

        totalVerificationChecks++;
        if (isMatch) totalVerificationPasses++;

        emit IntegrityChecked(evidenceId, msg.sender, isMatch, block.timestamp);
        return isMatch;
    }

    // ---------------- CASE CLOSURE ----------------

    function closeCase(string memory evidenceId)
        public
        onlyRole(ROLE_COURT)
        evidenceMustExist(evidenceId)
        whenNotPaused
    {
        if (evidences[evidenceId].status != CaseStatus.Open) revert CaseIsClosed();
        evidences[evidenceId].status = CaseStatus.Closed;
        emit CaseClosed(evidenceId, msg.sender, block.timestamp);
    }

    // ---------------- LAB ANALYSIS REPORTS ----------------

    /**
     * @notice Lab-only: records forensic findings against an evidence item.
     *         Mirrors registerEvidence (Investigator-only) and closeCase
     *         (Court-only) -- Lab previously had no dedicated action of its
     *         own beyond generic custody transfer/integrity-check, which are
     *         open to any role. This gives Lab officers something genuinely
     *         theirs to submit, permanently appended to the item's record.
     * @param reportHash Optional SHA-256 (or similar) hash of a full written
     *        report, if one exists off-chain -- leave empty if findings is
     *        the complete record.
     * @param reportIpfsCid Optional IPFS CID if the full report file was
     *        uploaded (e.g. encrypted the same way evidence files are).
     */
    function submitLabReport(
        string memory evidenceId,
        string memory findings,
        string memory reportHash,
        string memory reportIpfsCid
    ) public onlyRole(ROLE_LAB) evidenceMustExist(evidenceId) whenNotPaused {
        if (bytes(findings).length == 0) revert EmptyField("findings");
        if (bytes(findings).length > MAX_FINDINGS_LENGTH) revert FieldTooLong("findings", MAX_FINDINGS_LENGTH);
        if (bytes(reportHash).length > MAX_REPORT_HASH_LENGTH) revert FieldTooLong("reportHash", MAX_REPORT_HASH_LENGTH);

        labReports[evidenceId].push(LabReport({
            findings: findings,
            reportHash: reportHash,
            reportIpfsCid: reportIpfsCid,
            submittedBy: msg.sender,
            submittedAt: block.timestamp
        }));

        emit LabReportSubmitted(evidenceId, msg.sender, reportHash, block.timestamp);
    }

    function getLabReports(string memory evidenceId) public view evidenceMustExist(evidenceId) returns (
        string[] memory findingsList,
        string[] memory reportHashes,
        string[] memory reportIpfsCids,
        address[] memory submittedBys,
        uint256[] memory timestamps
    ) {
        LabReport[] storage reports = labReports[evidenceId];
        findingsList = new string[](reports.length);
        reportHashes = new string[](reports.length);
        reportIpfsCids = new string[](reports.length);
        submittedBys = new address[](reports.length);
        timestamps = new uint256[](reports.length);

        for (uint256 i = 0; i < reports.length; i++) {
            findingsList[i] = reports[i].findings;
            reportHashes[i] = reports[i].reportHash;
            reportIpfsCids[i] = reports[i].reportIpfsCid;
            submittedBys[i] = reports[i].submittedBy;
            timestamps[i] = reports[i].submittedAt;
        }
    }

    function getLabReportCount(string memory evidenceId) public view returns (uint256) {
        return labReports[evidenceId].length;
    }

    // ---------------- VIEW FUNCTIONS ----------------

    function getEvidence(string memory evidenceId) public view evidenceMustExist(evidenceId) returns (
        string memory caseNumber,
        string memory firNumber,
        string memory policeStation,
        string memory lawSections,
        string memory description,
        bytes32 fileHash,
        string memory ipfsCid,
        address registeredBy,
        uint256 registeredAt,
        CaseStatus status
    ) {
        Evidence storage e = evidences[evidenceId];
        return (e.caseNumber, e.firNumber, e.policeStation, e.lawSections, e.description, e.fileHash, e.ipfsCid, e.registeredBy, e.registeredAt, e.status);
    }

    function getCustodyTrail(string memory evidenceId) public view evidenceMustExist(evidenceId) returns (
        address[] memory holders,
        uint8[] memory holderRoles,
        uint256[] memory timestamps,
        string[] memory notes
    ) {
        CustodyRecord[] storage trail = custodyTrail[evidenceId];
        holders = new address[](trail.length);
        holderRoles = new uint8[](trail.length);
        timestamps = new uint256[](trail.length);
        notes = new string[](trail.length);

        for (uint256 i = 0; i < trail.length; i++) {
            holders[i] = trail[i].holder;
            holderRoles[i] = trail[i].holderRole;
            timestamps[i] = trail[i].timestamp;
            notes[i] = trail[i].note;
        }
    }

    function getCurrentHolder(string memory evidenceId) public view evidenceMustExist(evidenceId) returns (address) {
        CustodyRecord[] storage trail = custodyTrail[evidenceId];
        return trail[trail.length - 1].holder;
    }

    function getTotalEvidenceCount() public view returns (uint256) {
        return allEvidenceIds.length;
    }

    function getAllEvidenceIds() public view returns (string[] memory) {
        return allEvidenceIds;
    }

    function getEvidenceIdsByCase(string memory caseNumber) public view returns (string[] memory) {
        return caseToEvidenceIds[caseNumber];
    }

    function getCaseEvidenceCount(string memory caseNumber) public view returns (uint256) {
        return caseToEvidenceIds[caseNumber].length;
    }

    /// @notice Returns the case encryption key for any role holder (built-in or
    /// custom, as assigned by the admin). NOTE: this only gates access through
    /// this contract's own interface — the key is stored on public chain state
    /// and is retrievable by anyone directly reading chain data, role or not.
    function getCaseEncryptionKey(string memory caseNumber) public view onlyAnyRole returns (string memory) {
        return caseEncryptionKeys[caseNumber];
    }
}
