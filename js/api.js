// ═══════════════════════════════════════════════════════════════════
// EVIDENCE PROTECTION SYSTEM (EPS) — BACKEND API CLIENT
// Lightweight, non-blocking bridge for off-chain persistence,
// audit trails, incident forensics, and multi-device profile sync.
// ═══════════════════════════════════════════════════════════════════

(function(window) {
  'use strict';

  const API_BASE = '/api';

  const epsApi = {
    // Check if backend API server is reachable
    async checkHealth() {
      try {
        const res = await fetch(`${API_BASE}/health`, { method: 'GET', headers: { 'Accept': 'application/json' } });
        if (!res.ok) return null;
        return await res.json();
      } catch {
        return null;
      }
    },

    // Record an audit log event
    async logAudit(action, walletAddress, details = {}, evidenceId = null, caseNumber = null) {
      try {
        await fetch(`${API_BASE}/audit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action,
            walletAddress,
            evidenceId,
            caseNumber,
            details
          }),
          keepalive: true
        });
      } catch (err) {
        // Non-blocking fallback: ignore network failure in client UI
      }
    },

    // Index registered evidence metadata off-chain for fast search and forensics
    async indexEvidence(evidenceData) {
      try {
        const res = await fetch(`${API_BASE}/evidence`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(evidenceData)
        });
        if (!res.ok) return null;
        return await res.json();
      } catch (err) {
        return null;
      }
    },

    // Report a tamper detection event for security forensics
    async reportTamperIncident(incidentData) {
      try {
        const res = await fetch(`${API_BASE}/incidents`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(incidentData)
        });
        if (!res.ok) return null;
        return await res.json();
      } catch (err) {
        return null;
      }
    },

    // Backup face biometric profile and PIN hash off-chain
    async backupProfile(walletAddress, profileData) {
      if (!walletAddress) return null;
      try {
        const res = await fetch(`${API_BASE}/profile/${encodeURIComponent(walletAddress)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(profileData)
        });
        if (!res.ok) return null;
        return await res.json();
      } catch (err) {
        return null;
      }
    },

    // Fetch backed up face profile
    async getProfile(walletAddress) {
      if (!walletAddress) return null;
      try {
        const res = await fetch(`${API_BASE}/profile/${encodeURIComponent(walletAddress)}`);
        if (!res.ok) return null;
        return await res.json();
      } catch (err) {
        return null;
      }
    },

    // Delete synced profile on face data reset
    async deleteProfile(walletAddress) {
      if (!walletAddress) return null;
      try {
        await fetch(`${API_BASE}/profile/${encodeURIComponent(walletAddress)}`, { method: 'DELETE' });
      } catch (err) {
        // Non-blocking
      }
    },

    // Verify Aadhaar PDF authenticity & cross-check with form details (supports encrypted and unlocked PDFs)
    async verifyAadhaar(pdfBase64, officerName, dob, gender, password = '') {
      try {
        const res = await fetch(`${API_BASE}/auth/verify-aadhaar`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pdfBase64, officerName, dob, gender, password })
        });
        return await res.json();
      } catch (err) {
        return { success: false, error: err.message };
      }
    },

    // Submit new officer access request
    async submitRegistrationRequest(payload) {
      try {
        const res = await fetch(`${API_BASE}/auth/register-request`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        return await res.json();
      } catch (err) {
        return { success: false, error: err.message };
      }
    },

    // Check authorization status of a wallet address
    async getAuthStatus(walletAddress) {
      if (!walletAddress) return null;
      try {
        const res = await fetch(`${API_BASE}/auth/status/${encodeURIComponent(walletAddress)}`);
        return await res.json();
      } catch (err) {
        return null;
      }
    },

    // Fetch pending and reviewed officer registration requests (Admin)
    async getAdminRequests() {
      try {
        const res = await fetch(`${API_BASE}/auth/admin/requests`);
        return await res.json();
      } catch (err) {
        return { success: false, requests: [], total: 0, pendingCount: 0 };
      }
    },

    // Approve or reject an officer application (Admin)
    async submitAdminDecision(requestId, decision, reason = '') {
      try {
        const res = await fetch(`${API_BASE}/auth/admin/decision`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ requestId, decision, reason })
        });
        return await res.json();
      } catch (err) {
        return { success: false, error: err.message };
      }
    },

    // Officer self-updates contact or departmental profile
    async updateOfficerProfile(payload) {
      try {
        const res = await fetch(`${API_BASE}/auth/profile/update`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        return await res.json();
      } catch (err) {
        return { success: false, error: err.message };
      }
    },

    // ── ROLE-BASED CASE WORKFLOW APIS ──
    async getCaseStats() {
      try {
        const res = await fetch(`${API_BASE}/cases/stats`);
        return await res.json();
      } catch (err) {
        return { success: false, totalCases: 0, pendingCases: 0, verifiedCount: 0, error: err.message };
      }
    },

    async getCases(role = 'POLICE', filter = 'all', search = '') {
      try {
        const res = await fetch(`${API_BASE}/cases?role=${encodeURIComponent(role)}&filter=${encodeURIComponent(filter)}&search=${encodeURIComponent(search)}`);
        return await res.json();
      } catch (err) {
        return { success: false, cases: [], count: 0, error: err.message };
      }
    },

    async getCaseDetails(caseNumber) {
      try {
        const res = await fetch(`${API_BASE}/cases/${encodeURIComponent(caseNumber)}`);
        return await res.json();
      } catch (err) {
        return { success: false, error: err.message };
      }
    },

    async registerCase(payload) {
      try {
        const res = await fetch(`${API_BASE}/cases`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        return await res.json();
      } catch (err) {
        return { success: false, error: err.message };
      }
    },

    async submitForensicReport(caseNumber, payload) {
      try {
        const res = await fetch(`${API_BASE}/cases/${encodeURIComponent(caseNumber)}/forensic-report`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        return await res.json();
      } catch (err) {
        return { success: false, error: err.message };
      }
    },

    async submitCourtReport(caseNumber, payload) {
      try {
        const res = await fetch(`${API_BASE}/cases/${encodeURIComponent(caseNumber)}/court-report`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        return await res.json();
      } catch (err) {
        return { success: false, error: err.message };
      }
    },

    async getCaseBundle(caseNumber) {
      try {
        const res = await fetch(`${API_BASE}/cases/${encodeURIComponent(caseNumber)}/bundle`);
        return await res.json();
      } catch (err) {
        return { success: false, error: err.message };
      }
    },

    // Fetch approved Evidex officer roster (Admin User Information)
    async getAdminUsers() {
      try {
        const res = await fetch(`${API_BASE}/auth/admin/users`);
        return await res.json();
      } catch (err) {
        return { success: false, users: [], count: 0, error: err.message };
      }
    },

    // Admin API Keys configuration
    async getAdminApiKeys() {
      try {
        const res = await fetch(`${API_BASE}/admin/api-keys`);
        return await res.json();
      } catch (err) {
        return { success: false, error: err.message };
      }
    },

    async saveAdminApiKeys(payload) {
      try {
        const res = await fetch(`${API_BASE}/admin/api-keys`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        return await res.json();
      } catch (err) {
        return { success: false, error: err.message };
      }
    },

    async testApiKey(key, provider = 'groq') {
      try {
        const res = await fetch(`${API_BASE}/ai/test-key`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key, provider })
        });
        return await res.json();
      } catch (err) {
        return { success: false, error: err.message };
      }
    },

    // AI Case Story analysis & generation (Powered by Groq)
    async analyzeCaseStory(caseNumber) {
      try {
        const res = await fetch(`${API_BASE}/ai/analyze-case`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ caseNumber })
        });
        return await res.json();
      } catch (err) {
        return { success: false, error: err.message };
      }
    },

    // Dynamic Conversational AI powered by Groq & Live Blockchain context
    async askEvidexAi(prompt, role = 'Officer', caseNumber = null) {
      try {
        const res = await fetch(`${API_BASE}/ai/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt, role, caseNumber })
        });
        return await res.json();
      } catch (err) {
        return { success: false, error: err.message };
      }
    },

    // Indian English AI Voice Audio Synthesis
    async generateIndianTts(text) {
      try {
        const res = await fetch(`${API_BASE}/ai/tts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text })
        });
        return await res.json();
      } catch (err) {
        return { success: false, fallback: true, error: err.message };
      }
    },

    // Backward compatibility alias
    async generateJarvisTts(text) {
      return this.generateIndianTts(text);
    }
  };

  window.epsApi = epsApi;
})(window);
