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
