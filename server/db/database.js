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
