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
