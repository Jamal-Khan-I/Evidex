-- Evidence Protection System - SQLite Database Schema

CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  action TEXT NOT NULL,
  wallet_address TEXT,
  evidence_id TEXT,
  case_number TEXT,
  details TEXT,
  client_ip TEXT,
  created_at TEXT NOT NULL DEFAULT (DATETIME('now'))
);

CREATE INDEX IF NOT EXISTS idx_audit_wallet ON audit_logs(wallet_address);
CREATE INDEX IF NOT EXISTS idx_audit_evidence ON audit_logs(evidence_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);

CREATE TABLE IF NOT EXISTS evidence_records (
  id TEXT PRIMARY KEY,
  case_number TEXT NOT NULL,
  file_name TEXT,
  file_hash TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  description TEXT,
  submitter_address TEXT,
  current_custodian TEXT,
  tx_hash TEXT,
  block_number INTEGER,
  created_at TEXT NOT NULL DEFAULT (DATETIME('now'))
);

CREATE INDEX IF NOT EXISTS idx_evidence_case ON evidence_records(case_number);
CREATE INDEX IF NOT EXISTS idx_evidence_hash ON evidence_records(file_hash);

CREATE TABLE IF NOT EXISTS tamper_incidents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  evidence_id TEXT,
  case_number TEXT,
  expected_hash TEXT,
  actual_hash TEXT,
  verifier_address TEXT,
  incident_details TEXT,
  detected_at TEXT NOT NULL DEFAULT (DATETIME('now'))
);

CREATE INDEX IF NOT EXISTS idx_incidents_evidence ON tamper_incidents(evidence_id);

CREATE TABLE IF NOT EXISTS officer_profiles (
  wallet_address TEXT PRIMARY KEY,
  encrypted_face_descriptor TEXT,
  pin_hash TEXT,
  officer_name TEXT,
  badge_number TEXT,
  updated_at TEXT NOT NULL DEFAULT (DATETIME('now'))
);
