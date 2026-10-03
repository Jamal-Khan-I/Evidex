const express = require('express');
const router = express.Router();
const db = require('../db/database');

// GET /api/incidents - List tamper incidents
router.get('/', (req, res, next) => {
  try {
    const { evidenceId, limit = 50, offset = 0 } = req.query;
    let sql = 'SELECT * FROM tamper_incidents WHERE 1=1';
    const params = [];

    if (evidenceId) {
      sql += ' AND evidence_id = ?';
      params.push(evidenceId);
    }

    sql += ' ORDER BY id DESC LIMIT ? OFFSET ?';
    params.push(Math.min(parseInt(limit, 10), 100), parseInt(offset, 10));

    const rows = db.all(sql, params);
    res.json({ success: true, count: rows.length, data: rows });
  } catch (err) {
    next(err);
  }
});

// POST /api/incidents - Report a tamper detection incident
router.post('/', (req, res, next) => {
  try {
    const {
      evidenceId,
      caseNumber,
      expectedHash,
      actualHash,
      verifierAddress,
      incidentDetails
    } = req.body;

    if (!expectedHash || !actualHash) {
      return res.status(400).json({
        success: false,
        error: 'expectedHash and actualHash are required'
      });
    }

    const detailsStr = typeof incidentDetails === 'object'
      ? JSON.stringify(incidentDetails)
      : (incidentDetails || 'Integrity check failed: File hash mismatch detected');

    const result = db.run(
      `INSERT INTO tamper_incidents 
       (evidence_id, case_number, expected_hash, actual_hash, verifier_address, incident_details)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        evidenceId || null,
        caseNumber || null,
        expectedHash,
        actualHash,
        verifierAddress ? verifierAddress.toLowerCase() : null,
        detailsStr
      ]
    );

    // Also auto-log to audit_logs for unified chain-of-custody tracking
    db.run(
      `INSERT INTO audit_logs (action, wallet_address, evidence_id, case_number, details)
       VALUES (?, ?, ?, ?, ?)`,
      [
        'TAMPER_INCIDENT_REPORTED',
        verifierAddress ? verifierAddress.toLowerCase() : null,
        evidenceId || null,
        caseNumber || null,
        JSON.stringify({ expectedHash, actualHash, incidentId: Number(result.lastInsertRowid) })
      ]
    );

    res.status(201).json({
      success: true,
      incidentId: Number(result.lastInsertRowid),
      message: 'Tamper incident recorded for security forensics'
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
