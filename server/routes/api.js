const express = require('express');
const router = express.Router();
const config = require('../config/config');
const db = require('../db/database');
const { pcmToWav } = require('../services/pcmToWav');

// Child routers
const auditRoutes = require('./audit');
const evidenceRoutes = require('./evidence');
const incidentRoutes = require('./incidents');
const profileRoutes = require('./profile');
const authRoutes = require('./auth');
const casesRoutes = require('./cases');

// GET /api/health - Server health & system telemetry
router.get('/health', (req, res) => {
  let dbStatus = 'healthy';
  let totalLogs = 0;
  let totalEvidence = 0;
  let totalIncidents = 0;

  try {
    const logRow = db.get('SELECT COUNT(*) as count FROM audit_logs');
    totalLogs = logRow ? logRow.count : 0;

    const eviRow = db.get('SELECT COUNT(*) as count FROM evidence_records');
    totalEvidence = eviRow ? eviRow.count : 0;

    const incRow = db.get('SELECT COUNT(*) as count FROM tamper_incidents');
    totalIncidents = incRow ? incRow.count : 0;
  } catch (err) {
    dbStatus = 'degraded: ' + err.message;
  }

  res.json({
    status: 'online',
    system: 'Evidence Protection System (EPS) Full-Stack Server',
    version: '2.0.0',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    database: {
      status: dbStatus,
      totalAuditLogs: totalLogs,
      totalEvidenceRecords: totalEvidence,
      totalTamperIncidents: totalIncidents
    },
    blockchain: {
      network: config.contract.networkName,
      chainId: config.contract.chainId,
      defaultContractAddress: config.contract.defaultAddress,
      rpcUrl: config.contract.rpcUrl
    }
  });
});

// GET /api/config - Public configuration
router.get('/config', (req, res) => {
  res.json({
    defaultContractAddress: config.contract.defaultAddress,
    networkName: config.contract.networkName,
    chainId: config.contract.chainId,
    rpcUrl: config.contract.rpcUrl,
    pinataJwt: config.pinataJwt || ''
  });
});

// Mount resource routers
router.use('/audit', auditRoutes);
router.use('/evidence', evidenceRoutes);
router.use('/incidents', incidentRoutes);
router.use('/profile', profileRoutes);
router.use('/auth', authRoutes);
router.use('/cases', casesRoutes);

const emailService = require('../services/emailService');

// ── ADMIN API KEYS CONFIGURATION (GROQ AI ENGINE) ──
router.get('/admin/api-keys', (req, res) => {
  try {
    const groqRow = db.get("SELECT value FROM system_settings WHERE key = 'groq_api_key'");
    const groqKey = (groqRow ? groqRow.value : '') || process.env.GROQ_API_KEY || '';
    res.json({
      success: true,
      groqApiKey: groqKey,
      hasGroq: !!groqKey,
      apiKey: groqKey,
      geminiApiKey: groqKey // Backward compatibility
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/admin/api-keys', (req, res) => {
  try {
    const { groqApiKey, apiKey, geminiApiKey } = req.body;
    const targetKey = (groqApiKey !== undefined ? groqApiKey : (apiKey !== undefined ? apiKey : geminiApiKey)) || '';
    const now = new Date().toISOString();
    
    // Store Groq key in SQLite system_settings
    db.run("INSERT OR REPLACE INTO system_settings (key, value, updated_at) VALUES ('groq_api_key', ?, ?)", [targetKey.trim(), now]);
    process.env.GROQ_API_KEY = targetKey.trim();

    // Clean up any deprecated keys
    try {
      db.run("DELETE FROM system_settings WHERE key = 'gemini_api_key'");
    } catch (e) {}

    res.json({ success: true, message: 'Groq API key saved successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── ADMIN EMAIL DISPATCHER CONFIGURATION (SMTP / GMAIL) ──
router.get('/admin/email-config', (req, res) => {
  try {
    const row = db.get("SELECT value FROM system_settings WHERE key = 'smtp_config'");
    let cfg = {};
    if (row && row.value) {
      try { cfg = JSON.parse(row.value); } catch (e) {}
    } else if (process.env.SMTP_USER) {
      cfg = {
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: process.env.SMTP_PORT || '465',
        secure: process.env.SMTP_SECURE === 'true' || process.env.SMTP_PORT === '465',
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
        from: process.env.SMTP_FROM || '',
        service: process.env.SMTP_SERVICE || ''
      };
    }

    const hasPass = Boolean(cfg.pass);
    res.json({
      success: true,
      config: {
        host: cfg.host || 'smtp.gmail.com',
        port: cfg.port || '465',
        secure: cfg.secure !== undefined ? Boolean(cfg.secure) : true,
        user: cfg.user || '',
        from: cfg.from || '',
        service: cfg.service || 'gmail',
        hasPass: hasPass,
        passMasked: hasPass ? '••••••••' : ''
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/admin/email-config', (req, res) => {
  try {
    const { host, port, secure, user, pass, from, service } = req.body;

    // Retrieve previous config to preserve existing password if masked
    const row = db.get("SELECT value FROM system_settings WHERE key = 'smtp_config'");
    let prevCfg = {};
    if (row && row.value) {
      try { prevCfg = JSON.parse(row.value); } catch (e) {}
    }

    let effectivePass = (pass || '').trim();
    if (!effectivePass || effectivePass === '••••••••') {
      effectivePass = prevCfg.pass || '';
    }

    const newCfg = {
      host: (host || 'smtp.gmail.com').trim(),
      port: (port || '465').toString().trim(),
      secure: secure !== undefined ? Boolean(secure) : true,
      user: (user || '').trim(),
      pass: effectivePass,
      from: (from || '').trim(),
      service: (service || '').trim()
    };

    const now = new Date().toISOString();
    db.run(
      "INSERT OR REPLACE INTO system_settings (key, value, updated_at) VALUES ('smtp_config', ?, ?)",
      [JSON.stringify(newCfg), now]
    );

    // Refresh emailService transporter cache
    emailService.clearTransporterCache();

    res.json({
      success: true,
      message: 'Email dispatcher settings saved successfully.',
      hasConfig: Boolean(newCfg.user && newCfg.pass)
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/admin/test-email', async (req, res) => {
  try {
    const { targetEmail } = req.body;
    if (!targetEmail || !targetEmail.includes('@')) {
      return res.status(400).json({ success: false, error: 'Please enter a valid recipient email address for testing.' });
    }

    const result = await emailService.testSmtpConnection(targetEmail.trim());
    res.json({
      success: true,
      message: `Test email successfully dispatched to ${targetEmail}! Please check your inbox (and spam/junk folder).`,
      result
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err.message || 'SMTP connection failed. Check host, port, username and App Password.'
    });
  }
});

function getGroqApiKey() {
  try {
    const row = db.get("SELECT value FROM system_settings WHERE key = 'groq_api_key'");
    if (row && row.value && row.value.trim()) return row.value.trim();
  } catch (e) {}
  return (process.env.GROQ_API_KEY || '').trim();
}

// Backward-compatible alias
const getGeminiApiKey = getGroqApiKey;

function generateLocalContextualAnswer(prompt, liveCases, liveEvidence, liveAudit, role) {
  const q = (prompt || '').toLowerCase().trim();

  // 0. NATURAL CONVERSATIONAL & CASUAL CHAT (Greetings, wellbeing, identity, appreciation)
  if (
    q === 'how are you' ||
    q.includes('how are you') ||
    q.includes("how're you") ||
    q.includes('how do you do') ||
    q.includes('how is it going') ||
    q.includes('hows it going')
  ) {
    const p = `I'm doing great, Officer! Thank you for asking. I am standing by, fully active and ready to assist you with case dossiers, digital evidence verification, chain of custody tracking, or any questions you have today. How can I help you right now?`;
    const h = `I'm doing great, Officer! Thank you for asking.<br><br>I am <strong>EVIDEX AI</strong>, standing by, fully active and ready to assist you with case dossiers, digital evidence verification, chain of custody tracking, or any questions you have today.<br><br>How can I help you right now?`;
    return { plain: p, html: h };
  }

  if (
    q === 'hi' ||
    q === 'hello' ||
    q === 'hey' ||
    q.startsWith('hello') ||
    q.startsWith('hi ') ||
    q.startsWith('hey ') ||
    q.includes('good morning') ||
    q.includes('good afternoon') ||
    q.includes('good evening')
  ) {
    const p = `Hello, Officer! I am EVIDEX AI, your decentralized legal intelligence assistant and cyber-forensic investigator. How can I assist your investigation or answer your questions today?`;
    const h = `Hello, Officer! I am <strong>EVIDEX AI</strong>, your decentralized legal intelligence assistant.<br><br>How can I assist your investigation or answer your questions today?`;
    return { plain: p, html: h };
  }

  if (
    q.includes('who are you') ||
    q.includes('what are you') ||
    q.includes('your name')
  ) {
    const p = `I am EVIDEX AI, an intelligent legal and cyber-forensics assistant powered by Groq ultra-fast neural inference. I monitor the Ethereum Sepolia chain of custody, verify cryptographic SHA-256 evidence integrity, narrate investigative case stories, and can answer questions on any topic.`;
    const h = `I am <strong>EVIDEX AI</strong>, an intelligent legal and cyber-forensics assistant powered by <strong>Groq ultra-fast neural inference</strong>.<br><br>&bull; <strong>Blockchain Monitor:</strong> Ethereum Sepolia smart contract ledger<br>&bull; <strong>Forensics:</strong> Cryptographic SHA-256 evidence integrity<br>&bull; <strong>Jurisprudence:</strong> Bharatiya Nyaya Sanhita (BNS) &amp; IT Act 2000<br>&bull; <strong>Versatile Intelligence:</strong> Ready to answer whatever questions you have on any topic.`;
    return { plain: p, html: h };
  }

  if (
    q.includes('thank you') ||
    q.includes('thanks') ||
    q.includes('appreciate it')
  ) {
    const p = `You're very welcome, Officer! It's my pleasure to assist. Feel free to ask anytime if you need case analysis, forensic integrity verification, or answers to any other questions.`;
    const h = `You're very welcome, Officer! It's my pleasure to assist.<br><br>Feel free to ask anytime if you need case analysis, forensic integrity verification, or answers to any other questions.`;
    return { plain: p, html: h };
  }

  let casesCount = liveCases.length;
  try {
    const cRow = db.get("SELECT COUNT(*) as c FROM cases");
    if (cRow && cRow.c !== undefined) casesCount = cRow.c;
  } catch (e) {}

  let evidenceCount = liveEvidence.length;
  try {
    const eRow = db.get("SELECT COUNT(*) as c FROM evidence_records");
    if (eRow && eRow.c !== undefined) evidenceCount = eRow.c;
  } catch (e) {}

  let auditCount = liveAudit.length;
  try {
    const aRow = db.get("SELECT COUNT(*) as c FROM audit_logs");
    if (aRow && aRow.c !== undefined) auditCount = aRow.c;
  } catch (e) {}

  const latestCase = liveCases.length > 0 ? liveCases[0] : null;

  // 1. HOW TO REGISTER / FILE A CASE IN EVIDEX
  if (
    q.includes('register') ||
    q.includes('file a case') ||
    q.includes('file case') ||
    q.includes('create case') ||
    q.includes('add case') ||
    q.includes('new case') ||
    q.includes('how to file') ||
    q.includes('how to register') ||
    q.includes('lodg')
  ) {
    const p = `Officer, here is the standardized step-by-step procedure to register a case in Evidex:

1. Connect MetaMask: Ensure your authorized Police Officer wallet is connected in the top header.
2. Open 'Register Case': Click the 'Register Case' tab in the navigation bar.
3. Enter FIR Details: Fill in the FIR Number (e.g. FIR-2024-CH01), Police Station jurisdiction, incident description, and statutory sections under Bharatiya Nyaya Sanhita (BNS) & IT Act 2000.
4. Attach Digital Evidence: Upload CCTV footage, CDR records, digital photos, or disk images. Evidex automatically calculates the client-side cryptographic SHA-256 hash for each file.
5. Seal on Blockchain: Click 'Seal Evidence & Register on Blockchain' and approve the MetaMask transaction. The case details and evidence hashes are immutably anchored on the Ethereum Sepolia smart contract.`;

    const h = `Officer, here is the step-by-step procedure to <strong>register a case in Evidex</strong>:<br><br>
1. <strong>Connect Wallet:</strong> Connect your authorized Police Officer MetaMask wallet in the top header.<br>
2. <strong>Navigate:</strong> Click the <span style="color:#2563eb; font-weight:700;">'Register Case'</span> tab in the main navigation.<br>
3. <strong>Enter FIR Dossier:</strong> Provide the <strong>FIR Number</strong>, Police Station jurisdiction, incident report, and penal provisions under the <em>Bharatiya Nyaya Sanhita (BNS)</em> &amp; <em>IT Act 2000</em>.<br>
4. <strong>Attach Evidence:</strong> Upload digital files (CCTV, audio, CDRs, disk dumps). Evidex instantly computes their <strong>client-side SHA-256 cryptographic hashes</strong>.<br>
5. <strong>Blockchain Sealing:</strong> Click <strong>'Seal Evidence &amp; Register on Blockchain'</strong> and confirm the transaction in MetaMask. The case and evidence fingerprints are permanently anchored on the Ethereum Sepolia ledger for judicial admissibility.`;
    return { plain: p, html: h };
  }

  // 2. HOW TO VERIFY EVIDENCE / HASH INTEGRITY / TAMPER DETECTION
  if (
    q.includes('verify') ||
    q.includes('tamper') ||
    q.includes('check hash') ||
    q.includes('integrity') ||
    q.includes('how to check') ||
    q.includes('admissib')
  ) {
    const p = `Officer, to verify evidence integrity and check for tampering in Evidex:

1. Navigate to the 'Verify Custody' tab on the top menu.
2. Select or drag-and-drop the digital evidence file you wish to inspect (or paste its 64-character SHA-256 hash).
3. Evidex calculates the live hash and cross-references it against the Ethereum Sepolia smart contract registry.
4. If the hash matches the on-chain anchor, Evidex issues a green 'Cryptographically Verified' certificate compliant with Section 65B of the Indian Evidence Act. If altered by even a single bit, a red 'Tamper Incident Detected' alert is triggered.`;

    const h = `Officer, here is how to <strong>verify evidence &amp; detect tampering</strong> in Evidex:<br><br>
1. <strong>Open Verification Tab:</strong> Click on <span style="color:#2563eb; font-weight:700;">'Verify Custody'</span> in the navigation bar.<br>
2. <strong>Inspect File:</strong> Drag-and-drop the evidence file or paste its <strong>64-character SHA-256 hash</strong>.<br>
3. <strong>Smart Contract Audit:</strong> Evidex queries the live Ethereum Sepolia ledger in real time.<br>
4. <strong>Result:</strong> If identical, a verified <em>Section 65B Electronic Certificate</em> is displayed. If modified, a critical <strong>Tamper Alert</strong> is logged immediately on the audit trail.`;
    return { plain: p, html: h };
  }

  // 3. HOW TO TRANSFER CUSTODY (POLICE -> FSL -> COURT)
  if (
    q.includes('transfer') ||
    q.includes('handoff') ||
    q.includes('send to') ||
    q.includes('how to transfer') ||
    q.includes('custody transfer')
  ) {
    const p = `Officer, custody transfers in Evidex follow strict digital handoff protocols:

1. Go to 'Active Cases' or 'Chain of Custody'.
2. Locate the specific case and select the evidence item.
3. Click 'Transfer Custody' and select the destination: Police Station, State Forensic Science Laboratory (FSL), or Sessions Court.
4. Enter the recipient officer's verified Ethereum wallet address and purpose of transfer.
5. Sign the transfer transaction with MetaMask. The immutable custody ledger updates with the transfer timestamp and cryptographic signature.`;

    const h = `Officer, here is the procedure for <strong>Chain of Custody transfer</strong>:<br><br>
1. <strong>Select Evidence:</strong> Open <span style="color:#2563eb; font-weight:700;">'Active Cases'</span> or <em>'Chain of Custody'</em> and pick the evidence item.<br>
2. <strong>Specify Custodian:</strong> Select destination (e.g. <strong>State Forensic Science Laboratory (FSL)</strong> or <strong>Sessions Court</strong>).<br>
3. <strong>Recipient Address:</strong> Enter the authorized officer's Ethereum wallet address.<br>
4. <strong>Cryptographic Sign-off:</strong> Approve via MetaMask to write the handover timestamp and digital signature permanently into the smart contract.`;
    return { plain: p, html: h };
  }

  // 4. WHAT IS EVIDEX / HOW DOES EVIDEX WORK
  if (
    q.includes('what is evidex') ||
    q.includes('how does evidex work') ||
    q.includes('about evidex') ||
    q.includes('overview') ||
    q.includes('explain evidex') ||
    q.includes('how it works')
  ) {
    const p = `Evidex is a decentralized Digital Evidence Protection & Chain of Custody System designed for Indian law enforcement, forensic laboratories, and the judiciary.

Key Capabilities:
• Immutable Ledger: Anchors case FIRs and evidence SHA-256 hashes onto the Ethereum Sepolia blockchain.
• Anti-Tamper Security: Automatically flags any retroactive alteration or file corruption.
• FSL & Forensics: Tracks electronic evidence handoffs between Police, Forensic Science Laboratories (FSL), and the Court.
• Legal Admissibility: Meets evidentiary standards under the Bharatiya Nyaya Sanhita (BNS), Bharatiya Sakshya Adhiniyam, and IT Act 2000.`;

    const h = `<strong>Evidex Decentralized Evidence Protection System</strong> is a blockchain-anchored platform for law enforcement and the judiciary:<br><br>
&bull; <strong>Blockchain Anchor:</strong> Ethereum Sepolia smart contracts record immutable case FIRs and SHA-256 hashes.<br>
&bull; <strong>Anti-Tamper Guarantee:</strong> Cryptographic mathematical proof prevents unauthorized modification or evidence fabrication.<br>
&bull; <strong>Chain of Custody:</strong> Logs hand-to-hand custodial transfers across Police, FSL Forensics, and Court trial benches.<br>
&bull; <strong>Statutory Compliance:</strong> Fully conforms to Section 65B electronic evidence certification under the Bharatiya Sakshya Adhiniyam &amp; IT Act 2000.`;
    return { plain: p, html: h };
  }

  // 5. ROLES & PERMISSIONS
  if (
    q.includes('role') ||
    q.includes('permission') ||
    q.includes('who can') ||
    q.includes('access') ||
    q.includes('login') ||
    q.includes('officer role')
  ) {
    const p = `Evidex supports role-based access governed by smart contract permissions:

• Administrator: Manages officer onboarding, approves wallet addresses, and oversees system telemetry.
• Police Officer: Registers FIR cases, attaches evidence files, and initiates custody transfers.
• Forensic Examiner (FSL): Analyzes disk images, submits forensic analysis reports, and logs examination findings.
• Court / Judge: Verifies evidence authenticity, reviews the immutable custody trail, and admits evidence into trial.`;

    const h = `<strong>Evidex Role-Based Governance:</strong><br><br>
&bull; <strong>Administrator:</strong> Authorizes police/FSL/court wallet addresses and manages system nodes.<br>
&bull; <strong>Police Officer:</strong> Registers FIRs, calculates client-side SHA-256 hashes, and seals evidence.<br>
&bull; <strong>Forensic Science Lab (FSL):</strong> Conducts write-blocked digital forensic analysis and generates examination reports.<br>
&bull; <strong>Judiciary / Court:</strong> Validates smart contract audit trails and admits exhibits during trial hearings.`;
    return { plain: p, html: h };
  }

  // 6. Case specific query (Latest / Recent case / Story)
  if (
    q.includes('last case') ||
    q.includes('recent case') ||
    q.includes('latest case') ||
    q.includes('story') ||
    q.includes('registered case') ||
    q.includes('explain the case') ||
    q.includes('explain about the last case')
  ) {
    if (latestCase) {
      const p = `Officer, the latest dossier on record is Case #${latestCase.case_number}, filed under ${latestCase.fir_number || 'FIR'}. Incident description: "${latestCase.description || 'Active electronic investigation'}". Status: ${latestCase.case_status || 'Open'}. Evidence items secured: ${liveEvidence.filter(e => e.case_number === latestCase.case_number).length}. All records are immutably logged on the blockchain.`;
      const h = `Officer, the latest registered case is <strong>#${latestCase.case_number}</strong> (${latestCase.fir_number || 'FIR'}).<br><br>&bull; <strong>Station / Jurisdiction:</strong> ${latestCase.police_station || 'Tamil Nadu Police'}<br>&bull; <strong>Status:</strong> <span style="color:#2563eb; font-weight:700;">${latestCase.case_status || 'Open'}</span><br>&bull; <strong>Incident:</strong> ${latestCase.description || 'Digital investigation'}<br>&bull; <strong>Applicable Law:</strong> ${latestCase.law_sections || 'Bharatiya Nyaya Sanhita (BNS)'}`;
      return { plain: p, html: h };
    }
  }

  // 7. Summary of all cases
  if (q.includes('all cases') || q.includes('summarize') || q.includes('list cases') || q.includes('show cases')) {
    if (casesCount > 0 && liveCases.length > 0) {
      const p = `Officer, there are currently ${casesCount} active case(s) registered on the Evidex decentralized ledger:\n` +
        liveCases.map(c => `• Case #${c.case_number} (${c.fir_number || 'FIR'}): ${c.description || 'Investigation'} [${c.case_status || 'Open'}]`).join('\n');
      const h = `Officer, there are currently <strong>${casesCount} active case(s)</strong> on the decentralized ledger:<br><br>` +
        liveCases.map(c => `&bull; <strong>Case #${c.case_number}</strong> (${c.fir_number || 'FIR'}): ${c.description || 'Investigation'} (<em>${c.case_status || 'Open'}</em>)`).join('<br>');
      return { plain: p, html: h };
    }
  }

  // 8. Evidence / Hash query
  if (q.includes('evidence') || q.includes('hash') || q.includes('sha') || q.includes('file')) {
    if (evidenceCount > 0 && liveEvidence.length > 0) {
      const p = `Officer, ${evidenceCount} digital evidence file(s) are sealed with SHA-256 hashes on Ethereum Sepolia. Latest file: ${liveEvidence[0].file_name} under Case #${liveEvidence[0].case_number}, held by ${liveEvidence[0].current_custodian || 'Authorized Police Custody'}. Cryptographic integrity is verified.`;
      const h = `Officer, <strong>${evidenceCount} digital evidence file(s)</strong> are sealed on the blockchain ledger.<br><br>&bull; <strong>Latest Evidence:</strong> ${liveEvidence[0].file_name}<br>&bull; <strong>Associated Case:</strong> #${liveEvidence[0].case_number}<br>&bull; <strong>Integrity Anchor:</strong> SHA-256 cryptographic hash<br>&bull; <strong>Custodian:</strong> ${liveEvidence[0].current_custodian || 'Police'}`;
      return { plain: p, html: h };
    }
  }

  // 9. Custody / Blockchain query
  if (q.includes('custody') || q.includes('chain') || q.includes('blockchain')) {
    const p = `Evidex uses Ethereum Sepolia smart contracts to record every evidence transfer, FSL analysis, and court submission. A tamper incident triggers immediate cryptographic mismatch flags against the on-chain SHA-256 root.`;
    const h = `Evidex enforces an <strong>immutable digital chain of custody</strong> on the Ethereum blockchain.<br><br>&bull; <strong>Integrity Verification:</strong> Continuous SHA-256 matching against smart contract state.<br>&bull; <strong>Custodial Handoffs:</strong> Cryptographically signed by Police, FSL Forensics, and Judiciary.<br>&bull; <strong>Admissibility:</strong> Complies with Section 65B electronic evidence certification.`;
    return { plain: p, html: h };
  }

  // 10. Forensic query
  if (q.includes('forensic') || q.includes('fsl') || q.includes('lab') || q.includes('report')) {
    const p = `Digital evidence is transferred to the State Forensic Science Laboratory under tamper-evident blockchain custody. FSL examiners generate verified forensic hash certificates before court presentation.`;
    const h = `<strong>Forensic Science Laboratory (FSL) Protocol:</strong><br><br>&bull; <strong>Acquisition:</strong> Bitstream forensic disk image with dual SHA-256 checksums.<br>&bull; <strong>Analysis:</strong> Performed in write-blocked forensic workstations.<br>&bull; <strong>Chain of Custody:</strong> Every lab analyst transfer is permanently logged on-chain.`;
    return { plain: p, html: h };
  }

  // 11. Law / BNS / Legal sections query
  if (q.includes('law') || q.includes('bns') || q.includes('section') || q.includes('fir') || q.includes('act')) {
    const p = `Under Indian criminal jurisprudence, electronic evidence must satisfy Section 65B of the Indian Evidence Act (Bharatiya Sakshya Adhiniyam) and the IT Act 2000. Evidex timestamps every FIR and evidence hash on-chain to guarantee strict legal admissibility.`;
    const h = `<strong>Indian Legal Admissibility Standards:</strong><br><br>&bull; <strong>Statutory Mandate:</strong> Bharatiya Nyaya Sanhita (BNS) &amp; IT Act 2000.<br>&bull; <strong>Electronic Admissibility:</strong> Cryptographic chain satisfies Section 65B certification requirements.<br>&bull; <strong>Integrity Guarantee:</strong> Mathematical proof against retroactive file alteration or tampering.`;
    return { plain: p, html: h };
  }

  // 12. Default intelligent greeting & interactive prompts
  const p = `Greetings, Officer. I am EVIDEX AI, your digital forensic and legal intelligence assistant. Currently monitoring ${casesCount} active case(s), ${evidenceCount} sealed evidence item(s), and ${auditCount} custodial actions on Ethereum Sepolia.

You can ask me:
• How to register a case and seal evidence
• How to verify file integrity and detect tampering
• How custody transfers work between Police, FSL, and Court
• Explain the latest registered case dossier`;

  const h = `Greetings, Officer. I am <strong>EVIDEX AI</strong>, standing by with live case intelligence.<br><br>
&bull; <strong>Active Cases:</strong> ${casesCount}<br>
&bull; <strong>Sealed Evidence Items:</strong> ${evidenceCount}<br>
&bull; <strong>Chain of Custody Actions:</strong> ${auditCount}<br><br>
<strong>You can ask me:</strong><br>
&bull; <em>"How to register a case in Evidex"</em><br>
&bull; <em>"How to verify evidence integrity"</em><br>
&bull; <em>"How to transfer custody to FSL or Court"</em><br>
&bull; <em>"Explain the latest registered case"</em>`;

  return { plain: p, html: h };
}

// ── GROQ DYNAMIC MODEL DISCOVERY & LPU INFERENCE ──
async function getAvailableGroqModels(apiKey) {
  const cleanKey = (apiKey || '').trim();
  if (!cleanKey) return { success: false, error: 'Groq API key is empty' };

  try {
    const res = await fetch('https://api.groq.com/openai/v1/models', {
      headers: {
        'Authorization': `Bearer ${cleanKey}`,
        'Content-Type': 'application/json'
      },
      signal: AbortSignal.timeout(7000)
    });
    const data = await res.json();

    if (!res.ok) {
      return {
        success: false,
        error: data.error?.message || `HTTP ${res.status}: Invalid Groq API key or unauthorized`
      };
    }

    if (data && data.data && Array.isArray(data.data)) {
      const allIds = data.data.map(m => m.id);
      const chatPriority = [
        'openai/gpt-oss-120b',
        'openai/gpt-oss-20b',
        'llama-3.3-70b-versatile',
        'llama-3.1-70b-versatile',
        'llama-3.1-8b-instant',
        'qwen/qwen3.8-27b',
        'allam-2-7b',
        'mixtral-8x7b-32768',
        'gemma2-9b-it'
      ];

      const available = chatPriority.filter(m => allIds.includes(m));
      const others = allIds.filter(id => !available.includes(id) && !id.includes('whisper') && !id.includes('guard'));
      const finalModels = [...available, ...others];

      if (finalModels.length > 0) {
        return {
          success: true,
          models: finalModels,
          bestModel: finalModels[0]
        };
      }
    }
    return { success: false, error: 'No chat-compatible models found for this Groq key' };
  } catch (e) {
    return { success: false, error: e.message || 'Unable to connect to Groq API. Please check your network or key.' };
  }
}

// ── TEST GROQ API KEY ──
router.post('/ai/test-key', async (req, res) => {
  try {
    const { key } = req.body;
    if (!key) return res.status(400).json({ success: false, error: 'Groq API key is required' });

    const discovery = await getAvailableGroqModels(key);
    if (!discovery.success) {
      return res.status(400).json({
        success: false,
        error: discovery.error || 'Invalid Groq API key or connection failed'
      });
    }

    const modelsToTry = discovery.models.slice(0, 3);
    let lastError = null;

    for (const model of modelsToTry) {
      try {
        const testRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${key.trim()}`,
            'Content-Type': 'application/json'
          },
          signal: AbortSignal.timeout(8000),
          body: JSON.stringify({
            model,
            messages: [
              { role: 'user', content: 'Respond with OK' }
            ],
            max_tokens: 15
          })
        });

        const data = await testRes.json();
        if (testRes.ok && data.choices && data.choices.length > 0) {
          return res.json({
            success: true,
            message: `Groq AI verified successfully! (Ultra-Fast LPU Engine active: ${model})`,
            model
          });
        } else {
          lastError = data.error?.message || 'Chat generation test failed';
        }
      } catch (e) {
        lastError = e.message;
      }
    }

    return res.status(400).json({
      success: false,
      error: lastError || 'Failed to complete test inference on Groq'
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── AI CASE STORY ANALYSIS (POWERED BY GROQ) ──
router.post('/ai/analyze-case', async (req, res) => {
  try {
    const { caseNumber } = req.body;
    let targetCase = null;
    if (caseNumber) {
      targetCase = db.get("SELECT * FROM cases WHERE case_number = ? OR fir_number = ?", [caseNumber, caseNumber]);
    }
    if (!targetCase) {
      targetCase = db.get("SELECT * FROM cases ORDER BY rowid DESC LIMIT 1");
    }
    if (!targetCase) {
      return res.json({
        success: false,
        storyHtml: "No cases are currently registered in the Evidex decentralized ledger. Once an officer files an FIR and seals digital evidence, I can narrate the complete investigative dossier from start to end.",
        storyPlain: "No cases are currently registered in the Evidex decentralized ledger."
      });
    }

    const evidenceList = db.all("SELECT * FROM evidence_records WHERE case_number = ?", [targetCase.case_number]) || [];
    const auditLogs = db.all("SELECT * FROM audit_logs WHERE case_number = ? ORDER BY id ASC", [targetCase.case_number]) || [];

    const apiKey = getGroqApiKey();

    if (apiKey) {
      try {
        const prompt = `You are Evidex AI, an elite legal intelligence assistant and criminal forensic investigator.
Explain and analyze the following case as a compelling, professional investigative story from start to end, detailing what happened, how digital evidence was seized, its cryptographic verification on the Ethereum blockchain, custody transfers, and the current legal status.

CASE DOSSIER:
- Case Number: ${targetCase.case_number}
- FIR Number: ${targetCase.fir_number || 'N/A'}
- Title: ${targetCase.title || 'Official Evidence Dossier'}
- Incident / Description: ${targetCase.description || 'Digital evidence seizure and investigation'}
- Police Station: ${targetCase.police_station || 'Tamil Nadu Police'}
- Acts / Sections: ${targetCase.law_sections || 'BNS / IT Act'}
- Registered By: ${targetCase.registered_by}
- Registration Date: ${targetCase.created_at}
- Status: ${targetCase.case_status || targetCase.status || 'Active'}
- Evidence Items Seized (${evidenceList.length} items):
${evidenceList.map((e, idx) => `  ${idx + 1}. ${e.file_name} (Hash: ${e.file_hash}, Size: ${e.file_size}B)`).join('\n') || '  No digital files attached.'}
- Custody Trail:
${auditLogs.map((a, idx) => `  ${idx + 1}. [${a.created_at}] Action: ${a.action}, Officer: ${a.wallet_address}`).join('\n') || '  Seizure recorded.'}

REQUIREMENTS:
1. Narrate the case like a captivating investigative story from start to end with clear chapter titles:
   Chapter I: The Incident & Crime Report
   Chapter II: Digital Evidence & Cryptographic Sealing
   Chapter III: Chain of Custody & Forensic Trail
   Chapter IV: Judicial Standing & Court Readiness
2. Narrate the investigative story with a clear, articulate, professional Indian legal narrative voice, addressing the officer respectfully ('Officer' or 'Sir').
3. Keep the narration concise (~250-320 words) so it is perfect for voice narration.`;

        const candidateModels = ['openai/gpt-oss-120b', 'openai/gpt-oss-20b', 'llama-3.3-70b-versatile'];

        for (const model of candidateModels) {
          try {
            const aiRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${apiKey.trim()}`,
                'Content-Type': 'application/json'
              },
              signal: AbortSignal.timeout(20000),
              body: JSON.stringify({
                model,
                messages: [
                  { role: 'system', content: 'You are Evidex AI, an elite legal intelligence assistant and criminal forensic investigator. Narrate compelling, professional, accurate case stories.' },
                  { role: 'user', content: prompt }
                ],
                temperature: 0.7,
                max_tokens: 1000
              })
            });
            const aiData = await aiRes.json();
            if (aiRes.ok && aiData.choices && aiData.choices[0]?.message?.content) {
              const rawStory = aiData.choices[0].message.content;
              const formattedHtml = rawStory
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/\*(.*?)\*/g, '<em>$1</em>')
                .replace(/\n\n/g, '<br><br>')
                .replace(/\n/g, '<br>');

              return res.json({
                success: true,
                isAiGenerated: true,
                modelUsed: model,
                caseNumber: targetCase.case_number,
                title: targetCase.title || targetCase.description,
                storyHtml: formattedHtml,
                storyPlain: rawStory.replace(/[*#_]/g, '')
              });
            }
          } catch (mErr) {
            console.warn(`Groq model ${model} failed for story, trying next candidate:`, mErr.message);
          }
        }
      } catch (groqErr) {
        console.warn('Groq API call failed, falling back to local story engine:', groqErr);
      }
    }

    // Local Storytelling Engine Fallback
    const caseState = targetCase.case_status || targetCase.status || 'Active';
    const isFslReq = targetCase.forensics_requested || targetCase.has_forensics_report;
    const storyPlain = `Here is the investigative story of Case ${targetCase.case_number}, recorded under ${targetCase.fir_number || 'FIR'}.\n\nChapter I: The Incident and Crime Report.\nThe investigation officially commenced at ${targetCase.police_station || 'the police station'} under ${targetCase.law_sections || 'applicable penal provisions'}. The case was formally registered documenting: "${targetCase.description || 'Electronic evidence seized during active investigation.'}"\n\nChapter II: Digital Evidence and Cryptographic Sealing.\nLaw enforcement officers seized ${evidenceList.length} electronic evidence item(s). Every file was immediately computed for its cryptographic SHA-256 fingerprint on-device before upload. The primary hash was permanently written to the Ethereum Sepolia smart contract, rendering any future tampering mathematically impossible.\n\nChapter III: Chain of Custody and Forensic Examination.\nCustody of the evidence was transferred under digital signature to ${isFslReq ? 'the Forensic Science Laboratory for disk imaging and electronic analysis' : 'authorized departmental custody'}. All hand-to-hand transactions were timestamped and verified across ${auditLogs.length} logged blockchain actions.\n\nChapter IV: Judicial Standing and Court Presentation.\nThe case dossier currently holds status "${caseState}". With its cryptographic chain intact, it stands fully admissible under electronic evidence standards, prepared for judicial review.`;

    const storyHtml = `📖 <strong>Investigative Story: Case ${targetCase.case_number}</strong><br>
<span style="color:#64748b; font-size:11.5px;">Registered under ${targetCase.fir_number || 'FIR'} &bull; ${targetCase.police_station || 'Jurisdiction'}</span><br><br>

<strong>Chapter I: The Incident & Crime Report</strong><br>
The investigation formally opened with the filing of <strong>${targetCase.fir_number || 'FIR'}</strong> invoking <em>${targetCase.law_sections || 'BNS / IT Act'}</em>. The reported incident records: "${targetCase.description || 'Digital evidence seizure and criminal investigation.'}".<br><br>

<strong>Chapter II: Digital Evidence & Cryptographic Sealing</strong><br>
Officers impounded <strong>${evidenceList.length} electronic evidence item(s)</strong>. Every byte was hashed locally with SHA-256 and sealed on the Ethereum Sepolia blockchain ledger, preventing any retroactive tampering.<br><br>

<strong>Chapter III: Chain of Custody & Forensic Trail</strong><br>
The evidence trail records <strong>${auditLogs.length} verified custodial actions</strong>. Current standing: <span style="color:#2563eb; font-weight:600;">${caseState}</span>.<br><br>

<strong>Chapter IV: Judicial Readiness</strong><br>
The complete cryptographic dossier is locked and admissible under electronic judicial guidelines.`;

    return res.json({
      success: true,
      isAiGenerated: false,
      caseNumber: targetCase.case_number,
      title: targetCase.title,
      storyHtml,
      storyPlain
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── CONVERSATIONAL AI CHAT (POWERED BY GROQ ULTRA-FAST LPU ENGINE) ──
router.post('/ai/chat', async (req, res) => {
  try {
    const { prompt, role } = req.body;
    if (!prompt || !prompt.trim()) {
      return res.status(400).json({ success: false, error: 'Prompt is required' });
    }

    const apiKey = getGroqApiKey();

    // Fetch live system context from SQLite
    let liveCases = [];
    try {
      liveCases = db.all("SELECT case_number, fir_number, police_station, law_sections, description, registered_by, case_status, created_at FROM cases ORDER BY rowid DESC LIMIT 8") || [];
    } catch (e) {}

    let liveEvidence = [];
    try {
      liveEvidence = db.all("SELECT case_number, file_name, file_hash, file_size, current_custodian, created_at FROM evidence_records ORDER BY rowid DESC LIMIT 10") || [];
    } catch (e) {}

    let liveAudit = [];
    try {
      liveAudit = db.all("SELECT action, wallet_address, case_number, details, created_at FROM audit_logs ORDER BY id DESC LIMIT 6") || [];
    } catch (e) {}

    if (apiKey) {
      try {
        const systemPrompt = `You are EVIDEX AI, a versatile, articulate, and brilliant conversational AI assistant. You have full conversational intelligence like ChatGPT, Claude, and Gemini.

CRITICAL INSTRUCTION - ANSWER ANY TOPIC FREELY:
1. You can answer ANY question on ANY subject without restriction — whether it is general conversation ('how are you', 'tell me a joke', 'who are you', 'how's your day'), science, programming, mathematics, physics, biology, history, geography, arts, pop culture, life advice, or everyday general knowledge.
2. NEVER give canned, scripted, or robotic replies. Do not force every conversation into an Evidex lecture. Converse naturally, fluently, and warmly like a real AI assistant.
3. If the user asks about the Evidex Decentralized Evidence Protection & Chain of Custody System, Indian Law (Bharatiya Nyaya Sanhita - BNS, Bharatiya Sakshya Adhiniyam - BSA Section 65B, IT Act 2000, Police Station evidence custody), or active registered cases, seamlessly incorporate the live ledger context provided below.

EVIDEX SYSTEM ARCHITECTURE & USER WORKFLOWS (FOR EVIDEX QUERIES):
- Register a Case: Connect Police Officer MetaMask wallet -> Click 'Register Case' -> Fill FIR Number & BNS / IT Act sections -> Attach digital files (CCTV, CDRs, photos) -> Client-side SHA-256 computed -> 'Seal Evidence & Register on Blockchain' immutably writes hashes onto Ethereum Sepolia smart contract.
- Verify Evidence: 'Verify Custody' tab -> Upload evidence file or paste 64-character SHA-256 hash -> Cross-referenced on Ethereum Sepolia -> Matching returns Section 65B Certificate; mismatch triggers Tamper Incident Alert.
- Transfer Custody: 'Active Cases' / 'Chain of Custody' -> 'Transfer Custody' -> Select Police, FSL (Forensic Science Lab), or Court -> Sign with recipient wallet on MetaMask.
- Roles: Admin (onboards officers), Police Officer (registers FIRs & seals exhibits), Forensic Analyst FSL (analyzes disk images), Court/Judiciary (validates immutable audit trail).

User Role: ${role || 'Officer'}

LIVE BLOCKCHAIN & CASE CONTEXT FROM EVIDEX LEDGER (REFERENCE WHEN ASKED):
- Registered Cases (${liveCases.length} total):
${liveCases.map((c, i) => `  ${i+1}. Case #${c.case_number} | FIR: ${c.fir_number || 'N/A'} | Station: ${c.police_station || 'TN Police'} | Sections: ${c.law_sections || 'BNS'} | Status: ${c.case_status || 'Open'} | Incident: "${c.description || 'Digital evidence investigation'}"`).join('\n') || '  No cases registered yet.'}

- Sealed Digital Evidence (${liveEvidence.length} items):
${liveEvidence.map((e, i) => `  ${i+1}. ${e.file_name} (Case: ${e.case_number}, SHA-256: ${e.file_hash.substring(0, 16)}..., Custodian: ${e.current_custodian || 'Police'})`).join('\n') || '  No evidence files attached yet.'}

- Recent Custody Trail & Audit Logs:
${liveAudit.map((a, i) => `  ${i+1}. [${a.created_at}] Action: ${a.action} (Case: ${a.case_number || 'Global'})`).join('\n') || '  No custody transfers yet.'}

TONE & STYLE:
- Articulate, knowledgeable, engaging, and polite.
- Address the user respectfully ('Officer' or 'Sir') when discussing law enforcement/cases, or speak warmly and naturally during general conversation.
- Never use 'Namaste'.
- Structure answers clearly with bold text and bullet points when explaining complex topics.`;

        const candidateModels = ['openai/gpt-oss-120b', 'openai/gpt-oss-20b', 'llama-3.3-70b-versatile'];

        for (const model of candidateModels) {
          try {
            const aiRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${apiKey.trim()}`,
                'Content-Type': 'application/json'
              },
              signal: AbortSignal.timeout(12000),
              body: JSON.stringify({
                model,
                messages: [
                  { role: 'system', content: systemPrompt },
                  { role: 'user', content: prompt.trim() }
                ],
                temperature: 0.7,
                max_tokens: 1200
              })
            });
            const aiData = await aiRes.json();
            if (aiRes.ok && aiData.choices && aiData.choices[0]?.message?.content) {
              const rawReply = aiData.choices[0].message.content;
              const formattedHtml = rawReply
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/\*(.*?)\*/g, '<em>$1</em>')
                .replace(/\n\n/g, '<br><br>')
                .replace(/\n/g, '<br>');

              return res.json({
                success: true,
                isAiGenerated: true,
                modelUsed: model,
                replyHtml: formattedHtml,
                replyPlain: rawReply.replace(/[*#_]/g, '')
              });
            }
          } catch (mErr) {
            console.warn(`Groq model ${model} failed for chat, trying next candidate:`, mErr.message);
          }
        }
      } catch (groqErr) {
        console.warn('Groq chat failed, using local reasoning fallback:', groqErr);
      }
    }

    // Dynamic contextual reasoning fallback grounded in live database state
    const localAnswer = generateLocalContextualAnswer(prompt, liveCases, liveEvidence, liveAudit, role);
    return res.json({
      success: true,
      isAiGenerated: false,
      replyHtml: localAnswer.html,
      replyPlain: localAnswer.plain
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── EVIDEX AI VOICE TTS FALLBACK ──
router.post('/ai/tts', async (req, res) => {
  // Voice synthesis handled by browser speech synthesis for immediate, natural speech
  return res.json({
    success: false,
    fallback: true,
    error: 'Speech synthesis handled directly via browser engine'
  });
});

module.exports = router;
