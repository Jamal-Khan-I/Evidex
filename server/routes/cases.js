const express = require('express');
const router = express.Router();
const db = require('../db/database');

// GET /api/cases - List cases with role-specific and status filtering
router.get('/', (req, res, next) => {
  try {
    const { role = 'POLICE', filter = 'all', search = '', limit = 100, offset = 0 } = req.query;
    const cleanRole = role.toUpperCase();
    
    let sql = 'SELECT * FROM cases WHERE 1=1';
    const params = [];

    // Pending filter per role
    if (filter === 'pending') {
      if (cleanRole === 'FORENSICS' || cleanRole === 'LAB') {
        // Forensics pending: cases where police asked for forensic report and it is not submitted yet
        sql += " AND forensics_requested = 1 AND forensics_status = 'PENDING' AND case_status = 'OPEN'";
      } else if (cleanRole === 'COURT') {
        // Court pending: cases where evidence is registered, forensics is done (or not requested), awaiting court action
        sql += " AND (forensics_requested = 0 OR forensics_status = 'SUBMITTED') AND court_status != 'CLOSED' AND case_status = 'OPEN'";
      } else {
        // Police / Admin pending: all open cases
        sql += " AND case_status = 'OPEN'";
      }
    }

    // Search filter across case number, FIR, police station, description
    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      sql += ' AND (case_number LIKE ? OR fir_number LIKE ? OR police_station LIKE ? OR description LIKE ? OR officer_name LIKE ?)';
      params.push(term, term, term, term, term);
    }

    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(Math.min(parseInt(limit, 10), 200), parseInt(offset, 10));

    const cases = db.all(sql, params);

    // Attach counts of evidence, forensic reports, and court orders
    const enriched = cases.map(c => {
      const eviCount = db.get('SELECT COUNT(*) as count FROM evidence_records WHERE case_number = ?', [c.case_number])?.count || 0;
      const fReports = db.get('SELECT COUNT(*) as count FROM forensic_reports WHERE case_number = ?', [c.case_number])?.count || 0;
      const cReports = db.get('SELECT COUNT(*) as count FROM court_reports WHERE case_number = ?', [c.case_number])?.count || 0;
      return {
        ...c,
        evidenceCount: eviCount,
        forensicReportsCount: fReports,
        courtReportsCount: cReports
      };
    });

    res.json({
      success: true,
      count: enriched.length,
      cases: enriched
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/cases/:caseNumber - Full dossier for a single case
router.get('/:caseNumber', (req, res, next) => {
  try {
    const { caseNumber } = req.params;
    const caseRec = db.get('SELECT * FROM cases WHERE case_number = ?', [caseNumber]);
    if (!caseRec) {
      return res.status(404).json({ success: false, error: 'Case not found' });
    }

    const evidence = db.all('SELECT * FROM evidence_records WHERE case_number = ? ORDER BY created_at ASC', [caseNumber]);
    const forensicReports = db.all('SELECT * FROM forensic_reports WHERE case_number = ? ORDER BY created_at ASC', [caseNumber]);
    const courtReports = db.all('SELECT * FROM court_reports WHERE case_number = ? ORDER BY created_at ASC', [caseNumber]);

    res.json({
      success: true,
      case: caseRec,
      evidence,
      forensicReports,
      courtReports
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/cases - Register or update case metadata (Police)
router.post('/', (req, res, next) => {
  try {
    const {
      caseNumber,
      firNumber,
      policeStation,
      lawSections,
      description,
      registeredBy,
      officerName,
      caseKey,
      forensicsRequested
    } = req.body;

    if (!caseNumber) {
      return res.status(400).json({ success: false, error: 'caseNumber is required' });
    }

    const isForensicsReq = forensicsRequested ? 1 : 0;
    const forensicsStatus = isForensicsReq ? 'PENDING' : 'NOT_REQUIRED';

    db.run(
      `INSERT INTO cases 
       (case_number, fir_number, police_station, law_sections, description, registered_by, officer_name, case_key, forensics_requested, forensics_status, court_status, case_status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', 'OPEN', DATETIME('now'))
       ON CONFLICT(case_number) DO UPDATE SET
         fir_number = COALESCE(excluded.fir_number, cases.fir_number),
         police_station = COALESCE(excluded.police_station, cases.police_station),
         law_sections = COALESCE(excluded.law_sections, cases.law_sections),
         description = COALESCE(excluded.description, cases.description),
         registered_by = COALESCE(excluded.registered_by, cases.registered_by),
         officer_name = COALESCE(excluded.officer_name, cases.officer_name),
         case_key = COALESCE(excluded.case_key, cases.case_key),
         forensics_requested = excluded.forensics_requested,
         forensics_status = CASE 
           WHEN cases.forensics_status = 'SUBMITTED' THEN 'SUBMITTED'
           ELSE excluded.forensics_status
         END`,
      [
        caseNumber,
        firNumber || null,
        policeStation || null,
        lawSections || null,
        description || null,
        registeredBy ? registeredBy.toLowerCase() : null,
        officerName || null,
        caseKey || null,
        isForensicsReq,
        forensicsStatus
      ]
    );

    // Audit log
    db.run(
      'INSERT INTO audit_logs (action, wallet_address, case_number, details) VALUES (?, ?, ?, ?)',
      [
        'CASE_REGISTERED',
        registeredBy ? registeredBy.toLowerCase() : null,
        caseNumber,
        JSON.stringify({ firNumber, forensicsRequested: isForensicsReq })
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Case registered successfully',
      caseNumber,
      forensicsRequested: isForensicsReq,
      forensicsStatus
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/cases/:caseNumber/forensic-report - Submit Forensic Examination Report
router.post('/:caseNumber/forensic-report', (req, res, next) => {
  try {
    const { caseNumber } = req.params;
    const {
      reportTitle,
      labName,
      examinerName,
      findings,
      fileName,
      fileHash,
      fileSize,
      ipfsCid,
      submitterAddress
    } = req.body;

    if (!reportTitle) {
      return res.status(400).json({ success: false, error: 'reportTitle is required' });
    }

    // Ensure case exists
    db.run(
      `INSERT OR IGNORE INTO cases (case_number, forensics_requested, forensics_status, case_status, created_at)
       VALUES (?, 1, 'PENDING', 'OPEN', DATETIME('now'))`,
      [caseNumber]
    );

    // Insert forensic report
    const reportRes = db.run(
      `INSERT INTO forensic_reports 
       (case_number, report_title, lab_name, examiner_name, findings, file_name, file_hash, file_size, ipfs_cid, submitter_address, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, DATETIME('now'))`,
      [
        caseNumber,
        reportTitle,
        labName || 'Forensic Science Department, Tamil Nadu',
        examinerName || 'Forensic Analyst',
        findings || '',
        fileName || null,
        fileHash || null,
        fileSize || null,
        ipfsCid || null,
        submitterAddress ? submitterAddress.toLowerCase() : null
      ]
    );

    // Automatically transition forensics status to SUBMITTED
    db.run(
      "UPDATE cases SET forensics_status = 'SUBMITTED' WHERE case_number = ?",
      [caseNumber]
    );

    // Audit log
    db.run(
      'INSERT INTO audit_logs (action, wallet_address, case_number, details) VALUES (?, ?, ?, ?)',
      [
        'FORENSIC_REPORT_SUBMITTED',
        submitterAddress ? submitterAddress.toLowerCase() : null,
        caseNumber,
        JSON.stringify({ reportTitle, labName, fileHash })
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Forensic report submitted and anchored to case dossier',
      reportId: reportRes.lastInsertRowid,
      caseNumber,
      forensicsStatus: 'SUBMITTED'
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/cases/:caseNumber/court-report - Generate Court Order / Judicial Ruling
router.post('/:caseNumber/court-report', (req, res, next) => {
  try {
    const { caseNumber } = req.params;
    const {
      courtName,
      judgeName,
      verdict,
      ordersSummary,
      fileName,
      fileHash,
      fileSize,
      ipfsCid,
      submitterAddress,
      closeCase
    } = req.body;

    // Ensure case exists
    db.run(
      `INSERT OR IGNORE INTO cases (case_number, case_status, created_at)
       VALUES (?, 'OPEN', DATETIME('now'))`,
      [caseNumber]
    );

    // Insert court report
    const courtRes = db.run(
      `INSERT INTO court_reports 
       (case_number, court_name, judge_name, verdict, orders_summary, file_name, file_hash, file_size, ipfs_cid, submitter_address, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, DATETIME('now'))`,
      [
        caseNumber,
        courtName || 'Judicial Magistrate Court',
        judgeName || 'Honourable Magistrate',
        verdict || 'TRIAL_ORDER',
        ordersSummary || '',
        fileName || null,
        fileHash || null,
        fileSize || null,
        ipfsCid || null,
        submitterAddress ? submitterAddress.toLowerCase() : null
      ]
    );

    const isClosed = closeCase || ['CONVICTION', 'ACQUITTAL', 'CLOSED', 'CASE_DISMISSED'].includes(verdict);
    if (isClosed) {
      db.run(
        "UPDATE cases SET court_status = 'CLOSED', case_status = 'CLOSED', closed_at = DATETIME('now') WHERE case_number = ?",
        [caseNumber]
      );
    } else {
      db.run(
        "UPDATE cases SET court_status = 'IN_PROCEEDINGS' WHERE case_number = ?",
        [caseNumber]
      );
    }

    // Audit log
    db.run(
      'INSERT INTO audit_logs (action, wallet_address, case_number, details) VALUES (?, ?, ?, ?)',
      [
        'COURT_REPORT_GENERATED',
        submitterAddress ? submitterAddress.toLowerCase() : null,
        caseNumber,
        JSON.stringify({ courtName, verdict, isClosed })
      ]
    );

    res.status(201).json({
      success: true,
      message: isClosed ? 'Court ruling filed. Case officially marked as CLOSED.' : 'Court ruling recorded in case dossier.',
      reportId: courtRes.lastInsertRowid,
      caseNumber,
      caseStatus: isClosed ? 'CLOSED' : 'OPEN'
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/cases/:caseNumber/bundle - Metadata and links for ZIP bundle download
router.get('/:caseNumber/bundle', (req, res, next) => {
  try {
    const { caseNumber } = req.params;
    const caseRec = db.get('SELECT * FROM cases WHERE case_number = ?', [caseNumber]);
    const evidence = db.all('SELECT * FROM evidence_records WHERE case_number = ?', [caseNumber]);
    const forensicReports = db.all('SELECT * FROM forensic_reports WHERE case_number = ?', [caseNumber]);
    const courtReports = db.all('SELECT * FROM court_reports WHERE case_number = ?', [caseNumber]);

    res.json({
      success: true,
      case: caseRec || { case_number: caseNumber },
      files: {
        evidence,
        forensicReports,
        courtReports
      }
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
