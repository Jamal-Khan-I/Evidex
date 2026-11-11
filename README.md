<div align="center">

# <img width="52" height="47" alt="image" src="https://github.com/user-attachments/assets/becf57fe-3c2e-4e7b-a541-07fb72fe0b43" />
**EVIDEX**

**Decentralized Digital Evidence Protection & Forensic Chain of Custody System**

[![Solidity](https://img.shields.io/badge/Solidity-0.8.19-363636?style=for-the-badge&logo=solidity)](https://soliditylang.org/)
[![Ethereum Sepolia](https://img.shields.io/badge/Ethereum-Sepolia_Testnet-627EEA?style=for-the-badge&logo=ethereum)](https://sepolia.etherscan.io/)
[![IPFS](https://img.shields.io/badge/Storage-IPFS_%2F_Pinata-65C2CB?style=for-the-badge&logo=ipfs)](https://ipfs.tech/)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?style=for-the-badge&logo=node.js)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)


[Workflow](#-workflow) • [Key Features](#-key-features) • [Floating AI Assistant](#-floating-ai-assistant) • [Architecture](#-architecture) • [Smart Contract Specifications](#-smart-contract-specifications) • [REST API Reference](#-rest-api-reference) • [Security & Admissibility](#-security--legal-admissibility)

---

</div>

## 📌 About The Project

In contemporary criminal investigations, digital exhibits—such as CCTV camera recordings, mobile extraction dumps, VoIP call audio, deepfake media, and financial transaction trails—are vulnerable to:
* **Unauthorized tampering, bit rot, and file substitution** before judicial trial.
* **Fabricated custody transfer logs** lacking cryptographic provenance.
* **Identity spoofing of investigating officers** and lack of department authorization.
* **Judicial challenges regarding statutory admissibility** under Section 61 of the Bharatiya Sakshya Adhiniyam (BSA 2023) / Section 65B of the Indian Evidence Act.

**Evidex** establishes a decentralized, mathematically verifiable chain of custody where evidence files are fingerprinted and encrypted client-side by the browser, hosted on decentralized IPFS, and permanently anchored on an Ethereum smart contract.

---

## 🔄 Workflow


* **Step 1: Sign-Up**  
  The officer fills in an identity form on the website with name, department, badge number, and the wallet address to be used. The officer then captures a live photo with the webcam and uploads the official e-Aadhaar document, which is verified for its digital signature directly on the website.

* **Step 2: Approval**  
  The request—including the captured picture and verified signed document—is reviewed by the department administrator who approves or denies the application. The officer receives an email notification, and the approved wallet is assigned its official responsibility (Police, Forensic Lab, or Court).

* **Step 3: Case Registration**  
  The police officer provides the case number, FIR number, police station, sections of law, description, etc., selects one or more digital evidence files, and optionally requests a laboratory examination. Each file is fingerprinted (SHA-256) and encrypted by the browser, then uploaded to IPFS. The fingerprint and case details are recorded by the smart contract in one step. The case status turns to **'open'** with **lab report pending**.

* **Step 4: Laboratory Examination**  
  The forensic scientist views the case in their pending list, reviews the case files, conducts examination, updates the forensic findings, and uploads the signed lab report. The report is saved on the blockchain, and the case status becomes **'report filed'**.

* **Step 5: Court**  
  The judge reads through the complete case dossier containing the evidence exhibits with their fingerprints, the custodians, the laboratory report, and the complete audit timeline. The judge enters the judicial order and attaches the signed ruling, closing the case. Once closed, the case is no longer subject to further custody changes, and any authorized user with access can download the entire case docket as a ZIP file. The floating AI assistant explains case facts in human language via text or voice, without altering any records.

---

## 🌟 Key Features

* **Strict Role-Based Responsibilities:** Dedicated workspaces for **Police Investigators**, **Forensic Science Laboratories (FSL)**, **Judicial Courts**, and **System Administrators**.
* **Live Webcam Face Capture:** Interactive passport-guide framing with digital face zoom to verify officer appearance during sign-up.
* **On-Site e-Aadhaar Verification:** Automatic verification of the official e-Aadhaar digital signature and tamper validation directly on the platform.
* **Client-Side Fingerprinting & Encryption:** Evidence files are fingerprinted and encrypted directly inside the investigator's browser before upload to IPFS.
* **One-Step Smart Contract Anchoring:** The file fingerprints, case docket details, and custody entries are committed to the Ethereum smart contract in an atomic transaction.
* **Complete Case ZIP Download:** Once a case is reviewed or closed, authorized personnel can export the entire case dossier—including exhibits, logs, and reports—as a single ZIP archive.
* **Clean Case Re-Registration:** If an existing case number is re-submitted, the system cleans out stale records and establishes the new case cleanly from scratch.

---

## 🤖 Floating AI Assistant

The platform integrates a floating AI assistant in the lower corner of the interface:

* **Human-Language Explanations:** Explains case timelines, legal statutes, FIR details, and forensic findings in clear text or natural spoken voice.
* **Read-Only Non-Modifying Role:** Answers questions and reads case context aloud, but strictly does not change or manipulate any case files, hashes, or records.
* **Sanitized Voice Narration:** Automatically strips out raw code symbols, slashes (`/`), dashes (`-`), and hex hashes for clean, natural-sounding audio.
* **Top-Bar Audio Controls:** Includes built-in **Play**, **Pause (⏸)**, and **Stop (⏹)** controls.

---

## 🏛️ Architecture

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                 Client Browser (SPA)                                   │
│  • Pure Vanilla JavaScript (ES6+), Modern HTML5, Responsive Glassmorphic CSS          │
│  • Live Webcam Face Capture with Passport Framing & Digital Zoom                       │
│  • Client-Side File Fingerprinting (SHA-256) & Encryption                             │
│  • Floating AI Assistant (Text & Natural Speech Voice Explanations)                    │
│  • Web3 Provider (Ethers.js / MetaMask Wallet Signing)                                │
└───────────────────────────┬────────────────────────────────┬───────────────────────────┘
                            │                                │
        Off-Chain REST APIs │                                │ Web3 Transactions
    (Cases, Dossier, ZIP)   │                                │ (One-Step Contract Anchoring)
                            ▼                                ▼
┌─────────────────────────────────────────┐      ┌───────────────────────────────────────┐
│        Node.js / Express Server         │      │       Ethereum Sepolia Testnet        │
│  • Role-Based Cases & Evidence Router   │      │  • EvidenceProtectionSystem.sol       │
│  • e-Aadhaar Digital Signature Checker  │      │  • Immutable Chain of Custody         │
│  • Email Dispatcher for Approval Alerts │      │  • Append-Only Tamper-Proof Ledger    │
│  • Groq AI Gateway (Llama 3.3 / Whisper)│      │  • Gas-Griefing Protected Batching    │
└────────────────────┬────────────────────┘      └───────────────────────────────────────┘
                     │                                               ▲
                     ▼                                               │ Pinata Gateway CIDs
┌─────────────────────────────────────────┐      ┌───────────────────┴───────────────────┐
│       SQLite Database (WAL Mode)        │      │              IPFS Cluster             │
│  • cases (Dockets, FIR, Sections)       │      │  • Decentralized Digital Exhibits     │
│  • evidence_records (Fingerprint Index) │      │  • Forensic Science Lab Reports       │
│  • forensic_reports & court_reports     │      │  • Permanent Content-Addressed Files  │
│  • officer_profiles & audit_logs        │      └───────────────────────────────────────┘
└─────────────────────────────────────────┘
```

---

## 📜 Smart Contract Specifications

* **Contract File:** [`EvidenceProtectionSystem.sol`](EvidenceProtectionSystem.sol)
* **Compiler Version:** `Solidity ^0.8.19`
* **Network Compatibility:** Ethereum Sepolia / Polygon EVM
* **Security Rules:** Append-only history logs, emergency circuit breaker, and gas-griefing batch caps.

### Core Contract Methods
| Function Signature | Role Required | Description |
| :--- | :--- | :--- |
| `registerEvidence(...)` | `Police (Investigator)` | Records case details, file fingerprints, and IPFS CIDs in one step. |
| `registerEvidenceBatch(...)` | `Police (Investigator)` | Atomically registers multiple evidence items in a single gas-optimized transaction. |
| `transferCustody(id, to, note)` | Current Custodian | Verifiably hands over evidence custody to another authenticated officer. |
| `verifyIntegrity(id, hash)` | Public / Court | Compares a re-computed file hash against the immutable on-chain source of truth. |
| `submitLabReport(id, findings, hash, cid)` | `Forensic Lab` | Saves the signed laboratory examination findings and report on the blockchain. |
| `closeCase(caseNumber, notes)` | `Court (Judge)` | Formally closes the case on-chain, preventing any further custody changes. |
| `grantRole(account, roleId)` | `Admin` | Authorizes an officer address as Police (`1`), Lab (`2`), or Court (`3`). |

---

## 📡 REST API Reference

### Cases & Dossier Management
* `GET /api/cases?role=POLICE&filter=all` — Retrieve cases filtered by role and status (Pending/All).
* `POST /api/cases` — Register or clean re-register a case docket.
* `GET /api/cases/stats` — Real-time counters of total registered cases, pending lab reports, and verified dockets.
* `POST /api/cases/forensic-report` — Submit an official signed laboratory report.
* `POST /api/cases/court-report` — Record a judicial ruling and close the case docket.

### Evidence & Verification
* `GET /api/evidence?caseNumber=...` — Search evidence records by case number or file fingerprint.
* `POST /api/evidence/upload` — Upload digital exhibit file to IPFS.
* `POST /api/evidence/verify` — Compare file bytes against recorded fingerprint to detect bit rot or tampering.

### Authentication & Onboarding
* `POST /api/auth/register-request` — Submit Step 1 sign-up request with live photo, department details, and e-Aadhaar.
* `POST /api/auth/verify-aadhaar` — Verify the digital signature of the official e-Aadhaar PDF.
* `GET /api/auth/registration-requests` — Admin queue of pending officer applications.
* `POST /api/auth/admin-decision` — Admin approval or denial of sign-up request with email notification.

---

## 🔒 Security & Legal Admissibility

1. **Statutory Admissibility (BSA 2023 / Section 65B):** Client-side fingerprinting, decentralized timestamping, and smart contract custody logs provide mathematical proof of integrity for courtroom presentation.
2. **Zero Plaintext Private Key Exposure:** Private keys and seed phrases remain securely inside the officer's wallet and are never accessed by the application server.
3. **Non-Alterable Evidence Integrity:** Once a file is fingerprinted and recorded by the contract, any alteration to a single byte changes its hash and triggers an immediate tamper alert.
4. **Permanent Sealing Upon Case Closure:** Once the judge issues the final order and closes the case, the docket is sealed against any further custody alterations.

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

<div align="center">
  <sub>Developed by <strong><a href="https://github.com/Jamal-Khan-I">Jamal Khan</a></strong>. Built for secure, transparent, and decentralized justice.</sub>
</div>
