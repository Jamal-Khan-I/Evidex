<div align="center">

# 🛡️ Evidex

**Decentralized Digital Evidence Protection & Chain of Custody System**

[![Solidity](https://img.shields.io/badge/Solidity-0.8.20-363636?style=for-the-badge&logo=solidity)](https://soliditylang.org/)
[![Ethereum Sepolia](https://img.shields.io/badge/Ethereum-Sepolia_Testnet-627EEA?style=for-the-badge&logo=ethereum)](https://sepolia.etherscan.io/address/0x2d8830D1857ff9304aB754E4AcCDE2218B04Dd6b)
[![IPFS](https://img.shields.io/badge/Storage-IPFS_%2F_Pinata-65C2CB?style=for-the-badge&logo=ipfs)](https://ipfs.tech/)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?style=for-the-badge&logo=node.js)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)

*An enterprise-grade, tamper-evident digital forensic evidence registry integrating Ethereum Smart Contracts, Client-Side AES-256-GCM Encryption, IPFS Decentralized Storage, Local Biometric Verification, and High-Performance SQLite Audit Logging.*

[Features](#-key-features) • [Architecture](#-architecture) • [Smart Contract](#-smart-contract-specifications) • [Quick Start](#-quick-start) • [API Reference](#-rest-api-reference) • [Security](#-security--threat-model)

---

</div>

## 📌 Executive Summary & Problem Statement

In modern criminal jurisprudence, digital evidence (CCTV footage, hard drive forensics, mobile extraction dumps, audio recordings) is prone to:
* **Uncontrolled custody handovers** where physical and digital possession logs can be altered or fabricated.
* **Malicious tampering & bit rot**, where unauthorized modifications compromise evidence integrity before trial.
* **Premature cloud exposure**, where sensitive, unencrypted case files are leaked before judicial review.
* **Legal inadmissibility**, failing rigorous chain-of-custody statutory requirements (such as India's *Bharatiya Sakshya Adhiniyam / Section 65B* and the US *Federal Rules of Evidence Rule 902(14)*).

**Evidex** solves this by establishing a decentralized, mathematically verifiable chain of custody:
1. Evidence files are hashed (`SHA-256`) and client-side encrypted (`AES-256-GCM`) before leaving the investigator's machine.
2. Encrypted payloads are pinned to decentralized IPFS storage.
3. Every custody transfer, lab analysis, and verification is recorded permanently on the Ethereum blockchain.
4. An off-chain sync bridge logs real-time audit trails into SQLite for rapid indexing and forensic telemetry.

---

## 🌟 Key Features

* **Multi-Role Access Control (RBAC):** Granular permissions for `Admin`, `Police`, `Forensic Lab`, and `Court / Judiciary`.
* **Zero-Knowledge Biometric Authentication:** On-device 128-dimensional facial vector recognition and SHA-256 PIN verification powered by `face-api.js`. Raw camera feeds never leave the browser.
* **Client-Side AES-256-GCM Encryption:** Case-derived symmetric encryption ensures that unencrypted files never touch any network gateway.
* **Decentralized IPFS Storage:** Redundant pinning of encrypted ciphertext via Pinata cluster.
* **Immutable On-Chain Custody Protocol:** Two-step custody handovers (`transferCustody` → `acceptCustody`) prevent repudiation and lost-in-transit disputes.
* **Live Cryptographic Pipeline:** Real-time throughput (MB/s) calculation and visual state machine tracking SHA-256 hashing, AES-256 encryption, IPFS pinning, and Sepolia transaction mining.
* **Forensic Lab Report Anchoring:** Forensic scientists submit lab findings directly on-chain, binding lab reports cryptographically to evidence IDs.
* **Dual Offline-Resilient Backend:** Express.js REST API with embedded SQLite database guarantees that local network outages never disrupt client MetaMask blockchain operations.

---

## 🏛️ Architecture

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                 Client Browser (SPA)                                   │
│  • Modern Glassmorphic Dark UI & Custom Neon Cursor HUD                                │
│  • Biometric Face Recognition (face-api.js 128D Vectors) + Security PIN Verification   │
│  • Web Crypto API: SHA-256 Hashing & AES-256-GCM Symmetric Encryption                 │
│  • Web3 Provider (Ethers.js v6 / MetaMask Signing)                                     │
└───────────────────────────┬────────────────────────────────┬───────────────────────────┘
                            │                                │
        Off-Chain REST APIs │                                │ Web3 Transactions
  (Audit Sync, Diagnostics) │                                │ (Batch Registration, Handovers)
                            ▼                                ▼
┌─────────────────────────────────────────┐      ┌───────────────────────────────────────┐
│        Node.js / Express Server         │      │       Ethereum Sepolia Testnet        │
│  • Health & Telemetry Engine            │      │  • EvidenceProtectionSystem.sol       │
│  • Tamper Incident Reporting            │      │  • Contract Address:                  │
│  • Biometric Profile Sync Bridge        │      │    0x2d8830D1857ff9304aB754E4AcCDE2218│
│  • Dynamic IPFS Credentials Gateway     │      │  • Immutable Chain of Custody         │
└────────────────────┬────────────────────┘      └───────────────────────────────────────┘
                     │                                               ▲
                     ▼                                               │ Pinata Metadata CIDs
┌─────────────────────────────────────────┐      ┌───────────────────┴───────────────────┐
│         SQLite Native Database          │      │              IPFS Cluster             │
│  • audit_logs (Off-chain event stream)  │      │  • Encrypted Evidence Payloads (.enc) │
│  • evidence_records (Search index)      │      │  • Encrypted Forensic Lab Reports     │
│  • tamper_incidents (Forensic alerts)   │      │  • Global Decentralized Retrieval     │
│  • officer_profiles (Biometric vector)  │      └───────────────────────────────────────┘
└─────────────────────────────────────────┘
```

---

## 📜 Smart Contract Specifications

* **Contract File:** [`EvidenceProtectionSystem.sol`](EvidenceProtectionSystem.sol)
* **Compiler Version:** `Solidity ^0.8.20`
* **Network:** `Ethereum Sepolia Testnet`
* **Chain ID:** `11155111`
* **Deployed Address:** [`0x2d8830D1857ff9304aB754E4AcCDE2218B04Dd6b`](https://sepolia.etherscan.io/address/0x2d8830D1857ff9304aB754E4AcCDE2218B04Dd6b)

### Primary Contract Interfaces
| Function Signature | Role Required | Description |
| :--- | :--- | :--- |
| `registerEvidence(...)` | `Police` | Registers a single piece of evidence on-chain with its SHA-256 hash and IPFS CID. |
| `registerEvidenceBatch(...)` | `Police` | Batch registers up to 30 evidence items in an atomic gas-optimized transaction. |
| `transferCustody(id, to)` | Current Holder | Initiates a verifiable custody handover to another authenticated wallet. |
| `acceptCustody(id)` | Pending Holder | Finalizes and signs receipt of the evidence, updating the immutable custodian. |
| `verifyIntegrity(id, hash)` | Public / Court | Compares a re-computed file hash against the blockchain source of truth. |
| `submitLabReport(id, findings, hash, cid)` | `Forensic Lab` | Attaches a cryptographically signed laboratory analysis report to an item. |
| `grantRole(user, role)` | `Admin` | Assigns an address to Police (`1`), Forensics (`2`), or Court (`3`). |
| `getEvidenceHistory(id)` | Anyone | Returns the complete chronological transfer log for court admissibility. |

---

## 🚀 Quick Start

### 1. Prerequisites
* **Node.js**: `v18.0.0` or later (`node -v`)
* **MetaMask Browser Extension**: Connected to Ethereum Sepolia Testnet
* **Sepolia ETH**: Obtain free testnet tokens from any Sepolia faucet

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/Jamal-Khan-I/Evidex.git

# Enter the project directory
cd Evidex

# Install dependencies
npm install
```

### 3. Configuration
Copy `.env.example` to create your local `.env`:
```bash
cp .env.example .env
```
Edit `.env` with your settings:
```env
PORT=3000
NODE_ENV=development
DEFAULT_CONTRACT_ADDRESS=0x2d8830D1857ff9304aB754E4AcCDE2218B04Dd6b
DEFAULT_NETWORK_NAME=Sepolia
DEFAULT_CHAIN_ID=11155111
RPC_URL=https://rpc.sepolia.org
DATABASE_PATH=./data/evidence_system.sqlite
PINATA_JWT=your_pinata_jwt_here
```

### 4. Running the Application
```bash
# Production launch
npm start

# Development launch with auto-restart on changes
npm run dev
```

Visit **`http://localhost:3000`** in your browser.

---

## ☁️ Deploy to Render

Evidex is fully pre-configured for zero-friction cloud deployment on [Render](https://render.com).

### Method 1: Using Render Blueprints (Recommended — 1-Click Setup)
1. Fork or push this repository to your GitHub account (`https://github.com/Jamal-Khan-I/Evidex`).
2. Go to your [Render Dashboard](https://dashboard.render.com).
3. Click **New +** → **Blueprint**.
4. Connect your `Evidex` repository. Render will automatically detect the [`render.yaml`](render.yaml) specification file.
5. In the configuration prompt, enter your `PINATA_JWT` (or leave it to add later in environment variables).
6. Click **Apply**. Render will build and deploy your live full-stack instance!

### Method 2: Manual Web Service Setup
1. On [Render Dashboard](https://dashboard.render.com), click **New +** → **Web Service**.
2. Select **Build and deploy from a Git repository** and pick `Evidex`.
3. Configure the following fields:
   * **Name:** `evidex` (or your choice)
   * **Region:** Any (e.g. `Oregon (US West)` or `Frankfurt (EU)`)
   * **Branch:** `main`
   * **Runtime:** `Node`
   * **Build Command:** `npm install`
   * **Start Command:** `npm start`
   * **Plan:** `Free`
4. Expand **Advanced** → **Environment Variables** and add:
   | Key | Recommended Value | Description |
   | :--- | :--- | :--- |
   | `NODE_VERSION` | `22` | Required for native `node:sqlite` runtime |
   | `NODE_ENV` | `production` | Production environment flag |
   | `DEFAULT_CONTRACT_ADDRESS` | `0x2d8830D1857ff9304aB754E4AcCDE2218B04Dd6b` | Deployed Sepolia contract |
   | `DEFAULT_NETWORK_NAME` | `Sepolia` | Target Ethereum network |
   | `DEFAULT_CHAIN_ID` | `11155111` | Sepolia chain ID |
   | `RPC_URL` | `https://rpc.sepolia.org` | Ethereum RPC provider |
   | `PINATA_JWT` | `your_pinata_jwt_here` | IPFS pinning token |
5. Click **Deploy Web Service**. Once deployed, Render provides your live `https://evidex.onrender.com` URL with automatic SSL/TLS!

---

## 📂 Repository Structure

```
Evidex/
├── css/
│   └── style.css               # Glassmorphic UI design system & responsive styling
├── data/
│   └── .gitkeep                # SQLite storage volume root
├── js/
│   ├── api.js                  # Asynchronous backend REST bridge
│   ├── app.js                  # Core Web3, smart contract & cryptographic engine
│   └── particles.js            # Ambient canvas background particle network
├── public/                     # Static distribution assets mirrored for Express
│   ├── css/
│   ├── js/
│   └── index.html
├── server/
│   ├── config/
│   │   └── config.js           # Server settings & dynamic environment loader
│   ├── db/
│   │   ├── database.js         # SQLite connection manager & query helpers
│   │   └── schema.sql          # SQL schema definition for audit logs & incidents
│   ├── middleware/
│   │   ├── errorHandler.js     # Standardized JSON error response handler
│   │   └── logger.js           # Request logging middleware
│   ├── routes/
│   │   ├── api.js              # API router & health telemetry
│   │   ├── audit.js            # /api/audit endpoints
│   │   ├── evidence.js         # /api/evidence indexing endpoints
│   │   ├── incidents.js        # /api/incidents tamper notification endpoints
│   │   └── profile.js          # /api/profile officer biometric backup
│   └── index.js                # Express application bootstrapping
├── EvidenceProtectionSystem.sol# Solidity Smart Contract (0.8.20)
├── index.html                  # Main Single-Page Application interface
├── server.js                   # Server entrypoint
├── package.json                # Project dependencies and metadata
├── .env.example                # Sample environment template
├── .gitignore                  # Git exclusion rules
├── LICENSE                     # MIT License
└── README.md                   # System documentation
```

---

## 📡 REST API Reference

### Health & Telemetry
```http
GET /api/health
```
```json
{
  "status": "online",
  "system": "Evidence Protection System (EPS) Full-Stack Server",
  "version": "2.0.0",
  "uptime": 450,
  "database": {
    "status": "healthy",
    "totalAuditLogs": 22,
    "totalEvidenceRecords": 8,
    "totalTamperIncidents": 1
  },
  "blockchain": {
    "network": "Sepolia",
    "chainId": 11155111,
    "defaultContractAddress": "0x2d8830D1857ff9304aB754E4AcCDE2218B04Dd6b"
  }
}
```

### Audit Logs
* `GET /api/audit` — Query audit logs with pagination and filters (`wallet`, `action`, `evidenceId`).
* `POST /api/audit` — Record an off-chain action event for real-time auditability.

### Evidence Records Index
* `GET /api/evidence` — Search cached metadata by `caseNumber`, `fileHash`, or `submitterAddress`.
* `POST /api/evidence` — Store an indexed reference to a newly confirmed on-chain evidence transaction.

### Forensic Incidents
* `GET /api/incidents` — List reported tamper incidents.
* `POST /api/incidents` — Report an evidence mismatch (expected vs actual hash) for judicial review.

### Officer Biometric Profile
* `GET /api/profile/:wallet` — Retrieve biometric vector and PIN hash backup.
* `POST /api/profile/:wallet` — Update officer biometric vector and PIN hash.
* `DELETE /api/profile/:wallet` — Revoke stored officer biometric enrollment.

---

## 🔒 Security & Threat Model

1. **Zero Secret Leakage:** Private keys, seed phrases, and case encryption keys are never stored on any backend server.
2. **Client-Side Hashing & Encryption:** Files are hashed and encrypted directly in the user's browser runtime before transmission.
3. **Decentralized Redundancy:** Even if the local backend server goes offline, client-side MetaMask interaction with the Sepolia blockchain and IPFS gateways remains 100% operational.
4. **Biometric Privacy:** Biometric face descriptors are represented as 128-dimensional mathematical floating-point vectors. Images, frames, and video streams are processed exclusively in RAM and discarded immediately.
5. **Tamper Detection:** Any alteration of even a single byte within an evidence file alters its `SHA-256` hash, causing the contract's `verifyIntegrity` method to fail and triggering an incident report.

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

<div align="center">
  <sub>Developed by <strong><a href="https://github.com/Jamal-Khan-I">Jamal Khan</a></strong>. Built for secure, transparent, and decentralized justice.</sub>
</div>
