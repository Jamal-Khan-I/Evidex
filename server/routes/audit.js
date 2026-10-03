const express = require('express');
const router = express.Router();
const db = require('../db/database');

// GET /api/audit - List audit logs
router.get('/', (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
    const offset = parseInt(req.query.offset, 10) || 0;
    const wallet = req.query.wallet ? req.query.wallet.toLowerCase() : null;
    const action = req.query.action || null;
    const evidenceId = req.query.evidenceId || null;

    let sql = 'SELECT * FROM audit_logs WHERE 1=1';
    const params = [];

    if (wallet) {
      sql += ' AND LOWER(wallet_address) = ?';
      params.push(wallet);
    }
    if (action) {
      sql += ' AND action = ?';
      params.push(action);
    }
    if (evidenceId) {
      sql += ' AND evidence_id = ?';
      params.push(evidenceId);
    }

    sql += ' ORDER BY id DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const rows = db.all(sql, params);
    res.json({
      success: true,
      count: rows.length,
      data: rows.map(r => {
        let details = null;
        try { details = r.details ? JSON.parse(r.details) : null; } catch (e) { details = r.details; }
        return { ...r, details };
      })
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/audit - Create audit log entry
router.post('/', (req, res, next) => {
  try {
    const { action, walletAddress, evidenceId, caseNumber, details } = req.body;
    if (!action) {
      return res.status(400).json({ success: false, error: 'action is required' });
    }

    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
    const detailsStr = typeof details === 'object' ? JSON.stringify(details) : (details || null);

    const result = db.run(
      `INSERT INTO audit_logs (action, wallet_address, evidence_id, case_number, details, client_ip)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        action,
        walletAddress ? walletAddress.toLowerCase() : null,
        evidenceId || null,
        caseNumber || null,
        detailsStr,
        clientIp
      ]
    );

    res.status(201).json({
      success: true,
      id: Number(result.lastInsertRowid),
      message: 'Audit log recorded successfully'
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
