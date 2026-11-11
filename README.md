<div align="center">

# 🛡️ EVIDEX

**Decentralized Digital Evidence Protection & Forensic Chain of Custody System**

[![Solidity](https://img.shields.io/badge/Solidity-0.8.19-363636?style=for-the-badge&logo=solidity)](https://soliditylang.org/)
[![Ethereum Sepolia](https://img.shields.io/badge/Ethereum-Sepolia_Testnet-627EEA?style=for-the-badge&logo=ethereum)](https://sepolia.etherscan.io/)
[![IPFS](https://img.shields.io/badge/Storage-IPFS_%2F_Pinata-65C2CB?style=for-the-badge&logo=ipfs)](https://ipfs.tech/)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?style=for-the-badge&logo=node.js)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)

*An institutional-grade, tamper-proof digital evidence registry and forensic workflow platform bridging Section 61 of the Bharatiya Sakshya Adhiniyam (BSA 2023) / Section 65B of the Indian Evidence Act with Ethereum smart contracts, client-side cryptographic hashing, webcam face capture, e-Aadhaar UIDAI verification, and an intelligent legal voice assistant.*

[Key Features](#-key-features) • [End-to-End Workflow](#-end-to-end-website-workflow) • [Evidex AI Assistant](#-evidex-ai-assistant) • [Architecture](#-architecture) • [Smart Contract Specifications](#-smart-contract-specifications) • [REST API Reference](#-rest-api-reference) • [Security & Admissibility](#-security--legal-admissibility)

---

</div>

## 📌 About The Project

In contemporary criminal investigations, digital exhibits—such as CCTV camera recordings, mobile extraction dumps, VoIP call audio, deepfake media, and financial transaction trails—are vulnerable to:
* **Unauthorized tampering, bit rot, and file substitution** before judicial trial.
* **Fabricated custody transfer logs** lacking cryptographic provenance.
* **Identity spoofing of investigating officers** and lack of department authorization.
* **Judicial challenges regarding statutory admissibility** under Section 61 of the Bharatiya Sakshya Adhiniyam (BSA 2023) / Section 65B of the Indian Evidence Act.

**Evidex** establishes a decentralized, mathematically verifiable chain of custody:
1. Digital exhibits are fingerprinted client-side with **SHA-256** inside the investigator's browser before upload.
2. File fingerprints and custody handovers are permanently anchored on an **Ethereum EVM smart contract**.
3. Officer onboarding requires **cryptographic MetaMask wallet connection, live webcam face capture with passport-guide alignment, official service details, and automated e-Aadhaar PDF cross-verification**.
4. An integrated **Evidex AI Assistant** provides voice-narrated case summaries, forensic status checks, and legal guidance grounded in Indian criminal statutes (BNS, BNSS, BSA, IT Act).

---

## 🌟 Key Features

* **Role-Based Access Control (RBAC):** Dedicated, secure workspace interfaces tailored for **Police Investigators**, **Forensic Science Laboratories (FSL)**, **Judicial Courts**, and **Department Administrators**.
* **Live Webcam Face Capture:** Built-in passport-guide oval framing with digital face zoom (1.0x to 2.8x) that isolates and crops strictly to the officer's face for departmental credentials.
* **UIDAI e-Aadhaar Automated Verification:** Server-side decryption of password-protected official e-Aadhaar PDFs with fuzzy string cross-matching (Levenshtein distance & token overlap) to eliminate fraudulent onboarding.
* **Client-Side SHA-256 Integrity Fingerprinting:** Files generate a 64-character hexadecimal digest on-device using the Web Cryptography API before any network transfer.
* **Immutable On-Chain Custody Ledger:** Gas-optimized batch registration and custody handovers with permanent on-chain timestamps on Ethereum Sepolia.
* **Intelligent Case Overwrite & Clean Re-Registration:** When re-filing an existing case number, the platform automatically cleans stale exhibits and resets lab/court statuses to ensure zero duplicate clutter.
* **Forensic Lab Report Anchoring:** Forensic scientists review raw seized exhibits, conduct specialized analyses, and upload digitally signed lab reports updating the live case docket.
* **Judicial Verdict & Case Sealing:** Judges review full evidence dockets, compare live file hashes with blockchain records to verify zero tampering, issue legal verdicts, and permanently seal cases as `[ CLOSED ]`.
* **Evidex AI Voice Assistant:** A floating 3D assistant powered by Groq Llama 3.3 70B & Whisper with humanized speech synthesis, sanitized text-to-speech, and top-bar audio controls (`Play`, `Pause ⏸`, `Stop ⏹`).

---

## 🔄 End-to-End Website Workflow

Evidex mirrors the complete real-world legal lifecycle of an investigation from officer induction to judicial closure:

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                       EVIDEX END-TO-END WORKFLOW                                       │
└────────────────────────────────────────────────────────────────────────────────────────────────────────┘

  [ Step 1: Officer Onboarding & Identity Application ]
         │
         ├── Connect MetaMask digital wallet (Public address serves as officer identity key)
         ├── Fill official officer profile (Name, Gender, DOB, Mobile, Official Email)
         ├── Select Service Role & Department Details:
         │     • Police: Police Station Name/Code, District, Badge Number, Rank
         │     • Forensics: Forensic Lab Name & ID, Accreditation No, Specialization
         │     • Court: Court Complex & Jurisdiction, Judicial Designation
         ├── Live Webcam Face Capture (Interactive passport guide oval with digital zoom)
         ├── Upload e-Aadhaar PDF (Auto-cracks UIDAI password formula & validates identity)
         └── Submit access application for Department Administrator review
         │
         ▼
  [ Step 2: Department Administrator Approval ]
         │
         ├── Department Chief / Admin logs into the Administration workspace
         ├── Inspects pending officer access requests and Aadhaar tamper confidence scores
         └── Executes on-chain authorization: POLICE, FORENSIC LAB, or COURT JUDGE
         │
         ▼
  [ Step 3: Police Case Registration & Digital Evidence Seizure ]
         │
         ├── Police officer connects authorized MetaMask wallet
         ├── Opens "Register Case" form: enters Case Number, FIR Number, Station, & Sections
         ├── Uploads seized digital evidence (CCTV footage, call logs, bank transaction CSVs)
         ├── Browser calculates SHA-256 on-device -> Pins to IPFS -> Anchors hash on-chain
         └── Case docket is established: Status [ OPEN ] | "FSL: Report Pending"
         │
         ▼
  [ Step 4: Forensic Science Laboratory (FSL) Examination ]
         │
         ├── Forensic Scientist logs in with authorized wallet to the FSL workspace
         ├── Inspects pending cases and downloads original, tamper-proof exhibits
         ├── Performs forensic tests (audio frequency analysis, device extraction, deepfake scan)
         ├── Clicks "Submit Lab Report", uploads signed findings, and signs on-chain
         └── Case docket updates: "FSL: Report Filed ✓"
         │
         ▼
  [ Step 5: Judicial Court Trial & Case Sealing ]
         │
         ├── Judge logs in with authorized wallet to the Court workspace
         ├── Inspects complete case docket: initial police evidence, FIR, and verified FSL report
         ├── Clicks "Verify Integrity" — system matches live disk file hash with on-chain hash
         ├── Confirms zero tamper alerts (Section 61 BSA / 65B Evidence Act compliance)
         ├── Judge records final legal verdict (Conviction / Acquittal / Restitution)
         └── Case docket updates: Status [ CLOSED ] (Permanently sealed & archived)
```

---

## 🤖 Evidex AI Assistant

Evidex features an in-app AI legal assistant located in the workspace:

* **Sleek Floating Avatar:** A minimalist dark orb with glowing expressive eyes and real-time interaction states.
* **Instant Case Intelligence:** Ask anything by voice or text:
  * *"What is the status of CASE-2026-001?"*
  * *"Are there any pending forensic lab reports for this docket?"*
  * *"Explain the legal penalties under BNS Section 318 and IT Act Section 66D."*
* **Natural Speech-to-Text & Text-to-Speech:**
  * Uses Whisper Large v3 for voice queries and Groq Llama 3.3 70B for legal reasoning.
  * **Sanitized Narration:** Cleans all technical symbols, slashes (`/`), dashes (`-`), markdown syntax, and raw hex hashes so the voice reads like a human officer.
  * **Voice Controls:** Integrated top-bar buttons to **Play**, **Pause (⏸)**, and **Stop (⏹)** narration at any time.

---

## 🏛️ Architecture

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                 Client Browser (SPA)                                   │
│  • Pure Vanilla JavaScript (ES6+), Modern HTML5, Responsive Glassmorphic CSS          │
│  • Live Webcam Face Capture with Passport Framing & Digital Zoom Control               │
│  • Web Crypto API: On-Device SHA-256 Hashing & Integrity Calculation                  │
│  • Floating Evidex AI Assistant (Speech Synthesis & Voice Recognition)                 │
│  • Web3 Provider (Ethers.js / MetaMask Wallet Signing)                                │
└───────────────────────────┬────────────────────────────────┬───────────────────────────┘
                            │                                │
        Off-Chain REST APIs │                                │ Web3 Transactions
  (Cases, Audit, Reports)   │                                │ (Batch Registration, Roles)
                            ▼                                ▼
┌─────────────────────────────────────────┐      ┌───────────────────────────────────────┐
│        Node.js / Express Server         │      │       Ethereum Sepolia Testnet        │
│  • Role-Based Cases & Evidence Router   │      │  • EvidenceProtectionSystem.sol       │
│  • UIDAI e-Aadhaar Decryption Engine    │      │  • Immutable Chain of Custody         │
│  • Email OTP & Resend Dispatcher        │      │  • Append-Only Tamper-Proof Ledger    │
│  • Groq AI Gateway (Llama 3.3 / Whisper)│      │  • Gas-Griefing Protected Batching    │
└────────────────────┬────────────────────┘      └───────────────────────────────────────┘
                     │                                               ▲
                     ▼                                               │ Pinata Gateway CIDs
┌─────────────────────────────────────────┐      ┌───────────────────┴───────────────────┐
│       SQLite Database (WAL Mode)        │      │              IPFS Cluster             │
│  • cases (Dockets, FIR, Sections)       │      │  • Decentralized Digital Exhibits     │
│  • evidence_records (SHA-256 Index)     │      │  • Forensic Science Lab Reports       │
│  • forensic_reports & court_reports     │      │  • Permanent Content-Addressed Files  │
│  • officer_profiles & audit_logs        │      └───────────────────────────────────────┘
└─────────────────────────────────────────┘
```

---

## 📜 Smart Contract Specifications

* **Contract File:** [`EvidenceProtectionSystem.sol`](EvidenceProtectionSystem.sol)
* **Compiler Version:** `Solidity ^0.8.19`
* **Network Compatibility:** Ethereum Sepolia / Polygon EVM
* **Security Rules:** Append-only logs, emergency pausable circuit breaker, gas-griefing batch cap (`MAX_BATCH_SIZE = 30`), and two-step admin transfer (`nominateNewAdmin` & `acceptAdmin`).

### Core Contract Methods
| Function Signature | Role Required | Description |
| :--- | :--- | :--- |
| `registerEvidence(...)` | `Police (Investigator)` | Registers digital evidence on-chain with its SHA-256 hash and IPFS CID. |
| `registerEvidenceBatch(...)` | `Police (Investigator)` | Atomically registers up to 30 evidence items in a single gas-optimized transaction. |
| `transferCustody(id, to, note)` | Current Custodian | Verifiably hands over evidence custody to another authenticated officer. |
| `verifyIntegrity(id, hash)` | Public / Court | Compares a re-computed file hash against the immutable on-chain source of truth. |
| `submitLabReport(id, findings, hash, cid)` | `Forensic Lab` | Cryptographically binds an official laboratory report to the evidence docket. |
| `closeCase(caseNumber, notes)` | `Court (Judge)` | Permanently seals the case docket on-chain upon issuing final judgment. |
| `grantRole(account, roleId)` | `Admin` | Authorizes an officer address as Police (`1`), Lab (`2`), or Court (`3`). |

---

## 📡 REST API Reference

### Cases & Docket Management
* `GET /api/cases?role=POLICE&filter=all` — Retrieve cases filtered by role and status (Pending/All).
* `POST /api/cases` — Register or clean-re-register a case docket (handles automatic purge of old records if re-filing).
* `GET /api/cases/stats` — Real-time counter of total registered cases, pending actions, and verified exhibits.
* `POST /api/cases/forensic-report` — Submit an official FSL examination report.
* `POST /api/cases/court-report` — Record a judicial ruling and close a case.

### Evidence & Integrity Verification
* `GET /api/evidence?caseNumber=...` — Search evidence records by case number or file hash.
* `POST /api/evidence/upload` — Upload digital exhibit file, calculate server validation, and stage for pinning.
* `POST /api/evidence/verify` — Compare file bytes against recorded SHA-256 hash to detect bit rot or tampering.

### Authentication & Biometric Onboarding
* `POST /api/auth/register-request` — Submit new officer application with captured face photo and department credentials.
* `POST /api/auth/verify-aadhaar` — Decrypt and validate e-Aadhaar PDF against officer form fields.
* `POST /api/auth/send-otp` / `POST /api/auth/verify-otp` — Email OTP dispatch and verification.
* `GET /api/auth/registration-requests` — Admin queue of pending officer applications.

---

## 🔒 Security & Legal Admissibility

1. **Statutory Admissibility (BSA 2023 / Section 65B):** The combination of on-device SHA-256 calculation, decentralized timestamping, and smart contract audit logs satisfies legal standards for electronic record integrity.
2. **Zero Plaintext Private Key Exposure:** Private keys and seed phrases remain securely inside the officer's MetaMask vault and are never accessed by the application server.
3. **Face Capture & Privacy by Design:** The onboarding webcam tool crops strictly to the officer's face frame for official identification badges, discarding unnecessary background and body surroundings.
4. **Tamper Incident Detection:** Any alteration of even a single byte within an exhibit alters its SHA-256 hash. The system immediately flags the file, blocks courtroom admission, and logs a tamper alert into `tamper_incidents`.

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

<div align="center">
  <sub>Developed by <strong><a href="https://github.com/Jamal-Khan-I">Jamal Khan</a></strong>. Built for secure, transparent, and decentralized justice.</sub>
</div>
