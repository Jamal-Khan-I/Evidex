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
    }
  };

  window.epsApi = epsApi;
})(window);
