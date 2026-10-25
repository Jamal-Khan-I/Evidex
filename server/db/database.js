// Evidence Protection System - SQLite Database Module (Native Node.js DatabaseSync)
const { DatabaseSync } = require('node:sqlite');
const fs = require('fs');
const path = require('path');
const config = require('../config/config');

let db = null;

function initDatabase() {
  if (db) return db;

  const dbDir = path.dirname(config.dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  db = new DatabaseSync(config.dbPath);
  
  // Performance & safety pragmas
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA foreign_keys = ON;');

  // Load and execute schema
  const schemaPath = path.join(__dirname, 'schema.sql');
  if (fs.existsSync(schemaPath)) {
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    db.exec(schemaSql);
  }

  // Ensure system_settings table exists for admin API keys
  db.exec('CREATE TABLE IF NOT EXISTS system_settings (key TEXT PRIMARY KEY, value TEXT, updated_at TEXT);');

  // Safe migrations for preexisting tables
  try {
    const tableInfo = db.prepare("PRAGMA table_info(officer_profiles)").all();
    const existingCols = new Set(tableInfo.map(c => c.name));
    const newCols = [
      { name: 'gender', type: 'TEXT' },
      { name: 'dob', type: 'TEXT' },
      { name: 'age', type: 'INTEGER' },
      { name: 'mobile', type: 'TEXT' },
      { name: 'email', type: 'TEXT' },
      { name: 'role', type: 'TEXT' },
      { name: 'department_data', type: 'TEXT' },
      { name: 'face_photo', type: 'TEXT' },
      { name: 'aadhaar_status', type: "TEXT DEFAULT 'VERIFIED_UIDAI'" }
    ];
    for (const col of newCols) {
      if (!existingCols.has(col.name)) {
        db.exec(`ALTER TABLE officer_profiles ADD COLUMN ${col.name} ${col.type};`);
      }
    }
    // Sync any existing cases from evidence_records
    try {
      db.exec(`
        INSERT OR IGNORE INTO cases (case_number, description, registered_by, created_at)
        SELECT DISTINCT case_number, description, submitter_address, created_at 
        FROM evidence_records WHERE case_number IS NOT NULL AND case_number != '';
      `);
    } catch(e) {}

    // Seed authorized department roster for the 4 specific role addresses
    const authorizedRoster = [
      {
        wallet_address: '0x21815A6006830098c1aF1e8f1c2ce7793589CeEA',
        officer_name: 'State System Administrator',
        badge_number: 'HQ-ADMIN-001',
        gender: 'Male',
        mobile: '+91 94440 11001',
        email: 'admin.evidex@tn.gov.in',
        role: 'ADMIN',
        department_data: JSON.stringify({ unit: 'State Headquarters', jurisdiction: 'Statewide' })
      },
      {
        wallet_address: '0x40386f4eC88BF501a562d4552Ef9fF6eAdfA69Da',
        officer_name: 'Inspector K. Ramanathan',
        badge_number: 'TNP-INSP-4038',
        gender: 'Male',
        mobile: '+91 94440 22002',
        email: 'ramanathan.k@tnpolice.gov.in',
        role: 'POLICE',
        department_data: JSON.stringify({ policeStation: 'Tamil Nadu Police - Cyber Cell', district: 'Chennai City' })
      },
      {
        wallet_address: '0x49cE35eF0dD62AD68072b5Eb1A44007E2CB999e6',
        officer_name: 'Dr. S. Meenakshi',
        badge_number: 'FSL-ANL-49CE',
        gender: 'Female',
        mobile: '+91 94440 33003',
        email: 'meenakshi.s@fsl.tn.gov.in',
        role: 'FORENSICS',
        department_data: JSON.stringify({ labId: 'State Forensic Science Laboratory', division: 'Digital Forensics Division' })
      },
      {
        wallet_address: '0x1093aA4d7ff9eAdfBBf2AcFF370D1bd5dafF902d',
        officer_name: 'Hon. Judge R. Sundaram',
        badge_number: 'JUD-BENCH-1093',
        gender: 'Male',
        mobile: '+91 94440 44004',
        email: 'magistrate.sundaram@tncourts.gov.in',
        role: 'COURT',
        department_data: JSON.stringify({ courtName: 'Principal Sessions Court', bench: 'Special Cyber Court' })
      }
    ];

    for (const off of authorizedRoster) {
      try {
        db.prepare(`
          INSERT INTO officer_profiles (wallet_address, officer_name, badge_number, gender, mobile, email, role, department_data, aadhaar_status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'VERIFIED_UIDAI')
          ON CONFLICT(wallet_address) DO UPDATE SET
            role = excluded.role,
            officer_name = excluded.officer_name,
            badge_number = excluded.badge_number,
            department_data = excluded.department_data;
        `).run(off.wallet_address, off.officer_name, off.badge_number, off.gender, off.mobile, off.email, off.role, off.department_data);
      } catch (e) {}
    }

    // Permanently ensure CASE-2026-001 exists with evidence across all roles
    try {
      const caseNum = 'CASE-2026-001';
      const firNum = 'FIR No. 001/2026';
      const station = 'Central Cyber Police Station, New Delhi (Special Cell)';
      const sections = 'BNS Sec 318(4), 316(2), 336(3), 61(2) | IT Act Sec 43, 66C, 66D | BSA Sec 63';
      const desc = 'Transnational Cyber Crime Syndicate Virtual Custody / Digital Arrest extortion racket targeting senior citizens.';

      db.prepare(`
        INSERT OR IGNORE INTO cases 
        (case_number, fir_number, police_station, law_sections, description, registered_by, officer_name, case_key, forensics_requested, forensics_status, court_status, case_status, created_at) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 'PENDING', 'PENDING', 'OPEN', DATETIME('now'))
      `).run(
        caseNum,
        firNum,
        station,
        sections,
        desc,
        '0x40386f4ec88bf501a562d4552ef9ff6eadfa69da',
        'Inspector Vikramaditya Rathore',
        'E7qci6ybOpKWAN7xJJyRoL133lthzj'
      );

      const crypto = require('crypto');
      const testDir = path.resolve(__dirname, '../../test_case_files');
      if (fs.existsSync(testDir)) {
        const files = fs.readdirSync(testDir);
        files.forEach((f, idx) => {
          try {
            const fPath = path.join(testDir, f);
            const content = fs.readFileSync(fPath);
            const hash = '0x' + crypto.createHash('sha256').update(content).digest('hex');
            const stat = fs.statSync(fPath);
            const evId = `${caseNum}-EV${String(idx + 1).padStart(2, '0')}`;

            db.prepare(`
              INSERT OR IGNORE INTO evidence_records 
              (id, case_number, file_name, file_hash, file_size, mime_type, description, submitter_address, current_custodian, tx_hash, block_number, created_at) 
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, DATETIME('now'))
            `).run(
              evId,
              caseNum,
              f,
              hash,
              stat.size,
              f.endsWith('.pdf') ? 'application/pdf' : (f.endsWith('.csv') ? 'text/csv' : 'text/plain'),
              `Seized Exhibit ${idx + 1}: ${f}`,
              '0x40386f4ec88bf501a562d4552ef9ff6eadfa69da',
              '0x40386f4ec88bf501a562d4552ef9ff6eadfa69da',
              '0x58f79d1a3c749921b0e5672abf8812c3098d667104b998cf1e809314ac618df2',
              7894561
            );
          } catch (fileErr) {}
        });
      }
    } catch (seedCaseErr) {
      console.warn('[Database] Case seed notice:', seedCaseErr.message);
    }
  } catch (migErr) {
    console.warn('[Database] Migration notice:', migErr.message);
  }

  console.log(`[Database] SQLite initialized successfully at: ${config.dbPath}`);
  return db;
}

function getDb() {
  if (!db) {
    return initDatabase();
  }
  return db;
}

// Helper methods
const dbHelpers = {
  getDb,
  
  // Insert or update with returned changes
  run(sql, params = []) {
    const stmt = getDb().prepare(sql);
    return stmt.run(...params);
  },

  // Fetch single record
  get(sql, params = []) {
    const stmt = getDb().prepare(sql);
    return stmt.get(...params);
  },

  // Fetch all records
  all(sql, params = []) {
    const stmt = getDb().prepare(sql);
    return stmt.all(...params);
  }
};

module.exports = dbHelpers;
