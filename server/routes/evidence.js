const express = require('express');
const router = express.Router();
const db = require('../db/database');

// GET /api/evidence - List or search evidence
router.get('/', (req, res, next) => {
  try {
    const { caseNumber, hash, submitter, limit = 50, offset = 0 } = req.query;
    let sql = 'SELECT * FROM evidence_records WHERE 1=1';
    const params = [];

    if (caseNumber) {
      sql += ' AND case_number LIKE ?';
      params.push(`%${caseNumber}%`);
    }
    if (hash) {
      sql += ' AND file_hash = ?';
      params.push(hash);
    }
    if (submitter) {
      sql += ' AND LOWER(submitter_address) = ?';
      params.push(submitter.toLowerCase());
    }

    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(Math.min(parseInt(limit, 10), 100), parseInt(offset, 10));

    const records = db.all(sql, params);
    res.json({ success: true, count: records.length, data: records });
  } catch (err) {
    next(err);
  }
});

// GET /api/evidence/:id - Single evidence record
router.get('/:id', (req, res, next) => {
  try {
    const record = db.get('SELECT * FROM evidence_records WHERE id = ?', [req.params.id]);
    if (!record) {
      return res.status(404).json({ success: false, error: 'Evidence record not found' });
    }
    res.json({ success: true, data: record });
  } catch (err) {
    next(err);
  }
});

// POST /api/evidence - Index registered evidence
router.post('/', (req, res, next) => {
  try {
    const {
      id,
      caseNumber,
      fileName,
      fileHash,
      fileSize,
      mimeType,
      description,
      submitterAddress,
      currentCustodian,
      txHash,
      blockNumber
    } = req.body;

    if (!id || !caseNumber || !fileHash) {
      return res.status(400).json({
        success: false,
        error: 'id, caseNumber, and fileHash are required'
      });
    }

    db.run(
      `INSERT INTO evidence_records 
       (id, case_number, file_name, file_hash, file_size, mime_type, description, submitter_address, current_custodian, tx_hash, block_number)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         case_number = excluded.case_number,
         file_name = excluded.file_name,
         file_hash = excluded.file_hash,
         file_size = excluded.file_size,
         mime_type = excluded.mime_type,
         description = excluded.description,
         current_custodian = excluded.current_custodian,
         tx_hash = excluded.tx_hash,
         block_number = excluded.block_number`,
      [
        id,
        caseNumber,
        fileName || null,
        fileHash,
        fileSize || null,
        mimeType || null,
        description || null,
        submitterAddress ? submitterAddress.toLowerCase() : null,
        currentCustodian ? currentCustodian.toLowerCase() : (submitterAddress ? submitterAddress.toLowerCase() : null),
        txHash || null,
        blockNumber || null
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Evidence record indexed successfully',
      id
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
