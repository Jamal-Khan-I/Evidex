const express = require('express');
const router = express.Router();
const config = require('../config/config');
const db = require('../db/database');

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

// ── ADMIN API KEYS CONFIGURATION ──
router.get('/admin/api-keys', (req, res) => {
  try {
    const geminiRow = db.get("SELECT value FROM system_settings WHERE key = 'gemini_api_key'");
    const geminiKey = (geminiRow ? geminiRow.value : '') || process.env.GEMINI_API_KEY || '';
    res.json({
      success: true,
      geminiApiKey: geminiKey,
      hasGemini: !!geminiKey
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/admin/api-keys', (req, res) => {
  try {
    const { geminiApiKey } = req.body;
    const now = new Date().toISOString();
    if (geminiApiKey !== undefined) {
      db.run("INSERT OR REPLACE INTO system_settings (key, value, updated_at) VALUES ('gemini_api_key', ?, ?)", [geminiApiKey.trim(), now]);
      process.env.GEMINI_API_KEY = geminiApiKey.trim();
    }
    res.json({ success: true, message: 'Gemini API key saved successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Dynamic Gemini Model Discovery (Queries Google ListModels directly for active models on caller's key)
async function getAvailableGeminiModels(apiKey) {
  const cleanKey = (apiKey || '').trim();
  if (!cleanKey) return { success: false, error: 'API key is empty' };

  const versions = ['v1beta', 'v1'];
  let lastError = null;

  for (const ver of versions) {
    try {
      const url = `https://generativelanguage.googleapis.com/${ver}/models?key=${encodeURIComponent(cleanKey)}`;
      const res = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': cleanKey
        },
        signal: AbortSignal.timeout(6000)
      });
      const data = await res.json();

      if (res.ok && data.models && Array.isArray(data.models) && data.models.length > 0) {
        // Filter models that support generateContent
        const supported = data.models.filter(m => 
          !m.supportedGenerationMethods || m.supportedGenerationMethods.includes('generateContent')
        );

        if (supported.length > 0) {
          // Sort to prioritize latest flash models
          const sorted = [...supported].sort((a, b) => {
            const aName = (a.name || '').toLowerCase();
            const bName = (b.name || '').toLowerCase();
            const aFlash = aName.includes('flash') ? 1 : 0;
            const bFlash = bName.includes('flash') ? 1 : 0;
            if (aFlash !== bFlash) return bFlash - aFlash;
            return bName.localeCompare(aName);
          });

          const modelNames = sorted.map(m => m.name.startsWith('models/') ? m.name.substring(7) : m.name);
          return {
            success: true,
            version: ver,
            models: modelNames,
            bestModel: modelNames[0],
            displayName: sorted[0].displayName || modelNames[0]
          };
        }
      } else if (!res.ok) {
        lastError = data.error?.message || `HTTP ${res.status}: Failed to query Google AI models`;
        if (data.error?.status === 'PERMISSION_DENIED' || data.error?.status === 'UNAUTHENTICATED' || (data.error?.code === 400 && data.error?.message?.includes('API key not valid'))) {
          return { success: false, error: data.error?.message || 'Invalid Gemini API key' };
        }
      }
    } catch (e) {
      lastError = e.message;
    }
  }

  return { success: false, error: lastError || 'Unable to connect to Google Gemini. Please check your API key.' };
}

router.post('/ai/test-key', async (req, res) => {
  try {
    const { key } = req.body;
    if (!key) return res.status(400).json({ success: false, error: 'API key is required' });

    const discovery = await getAvailableGeminiModels(key);
    if (!discovery.success) {
      return res.status(400).json({
        success: false,
        error: discovery.error || 'Invalid Gemini API key or connection failed'
      });
    }

    const ver = discovery.version || 'v1beta';
    let lastGenError = null;

    // Test top active models returned by Google for this key
    for (const model of discovery.models.slice(0, 5)) {
      try {
        const genUrl = `https://generativelanguage.googleapis.com/${ver}/models/${model}:generateContent?key=${encodeURIComponent(key.trim())}`;
        const genRes = await fetch(genUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': key.trim()
          },
          signal: AbortSignal.timeout(8000),
          body: JSON.stringify({
            contents: [{ parts: [{ text: 'Respond with OK' }] }]
          })
        });
        const genData = await genRes.json();
        if (genRes.ok) {
          return res.json({
            success: true,
            message: `Google Gemini verified successfully! (Active Model: ${model})`,
            model
          });
        } else {
          lastGenError = genData.error?.message || 'Generation failed';
        }
      } catch (e) {
        lastGenError = e.message;
      }
    }

    return res.status(400).json({
      success: false,
      error: lastGenError || 'Failed to generate response with available Gemini models'
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── AI CASE STORY ANALYSIS ──
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

    const geminiRow = db.get("SELECT value FROM system_settings WHERE key = 'gemini_api_key'");
    const apiKey = (geminiRow ? geminiRow.value : '') || process.env.GEMINI_API_KEY;

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
2. Keep it factual to the evidence while maintaining an engaging, articulate, professional storytelling tone.
3. Keep the narration concise (~250-320 words) so it is perfect for voice narration.`;

        const discovery = await getAvailableGeminiModels(apiKey);
        if (discovery.success && discovery.models.length > 0) {
          const ver = discovery.version || 'v1beta';
          for (const model of discovery.models.slice(0, 5)) {
            try {
              const url = `https://generativelanguage.googleapis.com/${ver}/models/${model}:generateContent?key=${encodeURIComponent(apiKey.trim())}`;
              const aiRes = await fetch(url, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'x-goog-api-key': apiKey.trim()
                },
                signal: AbortSignal.timeout(12000),
                body: JSON.stringify({
                  contents: [{ parts: [{ text: prompt }] }],
                  generationConfig: { maxOutputTokens: 800, temperature: 0.7 }
                })
              });
              const aiData = await aiRes.json();
              if (aiRes.ok && aiData.candidates && aiData.candidates[0]?.content?.parts[0]?.text) {
                const rawStory = aiData.candidates[0].content.parts[0].text;
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
              console.warn(`Model ${model} failed, trying next candidate:`, mErr.message);
            }
          }
        }
      } catch (geminiErr) {
        console.warn('Gemini API call failed, falling back to local story engine:', geminiErr);
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

// ── CONVERSATIONAL AI CHAT (POWERED BY GEMINI & LIVE BLOCKCHAIN CONTEXT) ──
router.post('/ai/chat', async (req, res) => {
  try {
    const { prompt, role } = req.body;
    if (!prompt || !prompt.trim()) {
      return res.status(400).json({ success: false, error: 'Prompt is required' });
    }

    const geminiRow = db.get("SELECT value FROM system_settings WHERE key = 'gemini_api_key'");
    const apiKey = (geminiRow ? geminiRow.value : '') || process.env.GEMINI_API_KEY;

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
        const systemPrompt = `You are EVIDEX AI, an elite legal intelligence assistant and cyber-forensic criminal investigator built into the Evidex Decentralized Evidence Protection & Chain of Custody System.
User Role: ${role || 'Law Enforcement Officer'}

LIVE BLOCKCHAIN & CASE CONTEXT FROM EVIDEX LEDGER:
- Registered Cases (${liveCases.length} total):
${liveCases.map((c, i) => `  ${i+1}. Case #${c.case_number} | FIR: ${c.fir_number || 'N/A'} | Station: ${c.police_station || 'TN Police'} | Sections: ${c.law_sections || 'BNS'} | Status: ${c.case_status || 'Open'} | Incident: "${c.description || 'Digital evidence investigation'}"`).join('\n') || '  No cases registered yet.'}

- Sealed Digital Evidence (${liveEvidence.length} items):
${liveEvidence.map((e, i) => `  ${i+1}. ${e.file_name} (Case: ${e.case_number}, SHA-256: ${e.file_hash.substring(0, 16)}..., Custodian: ${e.current_custodian || 'Police'})`).join('\n') || '  No evidence files attached yet.'}

- Recent Custody Trail & Audit Logs:
${liveAudit.map((a, i) => `  ${i+1}. [${a.created_at}] Action: ${a.action} (Case: ${a.case_number || 'Global'})`).join('\n') || '  No custody transfers yet.'}

CRITICAL INSTRUCTIONS:
1. Provide a sharp, direct, intelligent, and context-aware answer specifically addressing what the user is asking.
2. NEVER give repetitive, scripted, or canned template responses.
3. Ground your answer in the real cases, FIRs, evidence hashes, and chain of custody data provided above whenever relevant. If the user asks about a case, evidence, forensic procedure, or law, reason deeply and explain clearly.
4. Keep the answer concise, articulate, and natural (~60 to 140 words) so it can be read smoothly or narrated via voice.
5. Use clean formatting (bold key facts or use short bullet points) without excessive clutter.`;

        const discovery = await getAvailableGeminiModels(apiKey);
        if (discovery.success && discovery.models.length > 0) {
          const ver = discovery.version || 'v1beta';
          for (const model of discovery.models.slice(0, 5)) {
            try {
              const url = `https://generativelanguage.googleapis.com/${ver}/models/${model}:generateContent?key=${encodeURIComponent(apiKey.trim())}`;
              const aiRes = await fetch(url, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'x-goog-api-key': apiKey.trim()
                },
                signal: AbortSignal.timeout(8000),
                body: JSON.stringify({
                  contents: [
                    { role: 'user', parts: [{ text: `${systemPrompt}\n\nUser Question: ${prompt.trim()}` }] }
                  ],
                  generationConfig: { maxOutputTokens: 500, temperature: 0.7 }
                })
              });
              const aiData = await aiRes.json();
              if (aiRes.ok && aiData.candidates && aiData.candidates[0]?.content?.parts[0]?.text) {
                const rawReply = aiData.candidates[0].content.parts[0].text;
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
              console.warn(`Model ${model} failed for chat, trying next:`, mErr.message);
            }
          }
        }
      } catch (geminiErr) {
        console.warn('Gemini chat failed, using local reasoning fallback:', geminiErr);
      }
    }

    // Dynamic contextual fallback if no API key is saved yet
    let replyPlain = "";
    let replyHtml = "";

    if (liveCases.length > 0) {
      const latest = liveCases[0];
      replyPlain = `Found ${liveCases.length} case(s) in the ledger. Latest: Case #${latest.case_number} (${latest.fir_number || 'FIR'}), titled "${latest.description || 'Investigation'}" under status ${latest.case_status || 'Open'}. Add your free Gemini API Key in Admin for live AI reasoning.`;
      replyHtml = `Found <strong>${liveCases.length} case(s)</strong> in the decentralized ledger.<br><br>&bull; <strong>Latest Case:</strong> #${latest.case_number} (${latest.fir_number || 'FIR'})<br>&bull; <strong>Status:</strong> ${latest.case_status || 'Open'}<br>&bull; <strong>Incident:</strong> ${latest.description || 'Under active investigation'}<br><br>💡 <em>Tip:</em> Add your free Gemini API Key in the <strong>Admin &rarr; API Keys</strong> tab to activate real-time AI reasoning.`;
    } else {
      replyPlain = `Understood. Currently 0 cases are registered in the Evidex ledger. You can file an FIR and upload evidence via the Register Case option.`;
      replyHtml = `Understood. Currently <strong>0 cases</strong> are registered in the Evidex ledger.<br><br>Police officers can file a new FIR and seal evidence via the <strong>Register Case</strong> panel.<br><br>💡 <em>Tip:</em> Configure your free Google Gemini API key in <strong>Admin &rarr; API Keys</strong> to activate intelligent conversational responses.`;
    }

    return res.json({
      success: true,
      isAiGenerated: false,
      replyHtml,
      replyPlain
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
