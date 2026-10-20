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
  gender TEXT,
  dob TEXT,
  age INTEGER,
  mobile TEXT,
  email TEXT,
  role TEXT,
  department_data TEXT,
  face_photo TEXT,
  aadhaar_status TEXT DEFAULT 'VERIFIED_UIDAI',
  updated_at TEXT NOT NULL DEFAULT (DATETIME('now'))
);

CREATE TABLE IF NOT EXISTS officer_registration_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  wallet_address TEXT UNIQUE NOT NULL,
  officer_name TEXT NOT NULL,
  gender TEXT NOT NULL,
  dob TEXT NOT NULL,
  age INTEGER NOT NULL,
  mobile TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL,
  department_data TEXT NOT NULL,
  face_photo TEXT NOT NULL,
  aadhaar_number TEXT,
  aadhaar_extracted_name TEXT,
  aadhaar_extracted_dob TEXT,
  aadhaar_extracted_gender TEXT,
  aadhaar_digital_signature_valid INTEGER DEFAULT 1,
  aadhaar_tamper_score REAL DEFAULT 1.0,
  cross_verification_status TEXT DEFAULT 'VERIFIED',
  status TEXT NOT NULL DEFAULT 'PENDING',
  rejection_reason TEXT,
  created_at TEXT NOT NULL DEFAULT (DATETIME('now')),
  reviewed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_reg_wallet ON officer_registration_requests(wallet_address);
CREATE INDEX IF NOT EXISTS idx_reg_status ON officer_registration_requests(status);

-- Cases Table
CREATE TABLE IF NOT EXISTS cases (
  case_number TEXT PRIMARY KEY,
  fir_number TEXT,
  police_station TEXT,
  law_sections TEXT,
  description TEXT,
  registered_by TEXT,
  officer_name TEXT,
  case_key TEXT,
  forensics_requested INTEGER DEFAULT 0,
  forensics_status TEXT DEFAULT 'NOT_REQUIRED',
  court_status TEXT DEFAULT 'PENDING',
  case_status TEXT DEFAULT 'OPEN',
  created_at TEXT NOT NULL DEFAULT (DATETIME('now')),
  closed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_cases_status ON cases(case_status);
CREATE INDEX IF NOT EXISTS idx_cases_forensics ON cases(forensics_status);

-- Forensic Reports Table
CREATE TABLE IF NOT EXISTS forensic_reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  case_number TEXT NOT NULL,
  report_title TEXT NOT NULL,
  lab_name TEXT,
  examiner_name TEXT,
  findings TEXT,
  file_name TEXT,
  file_hash TEXT,
  file_size INTEGER,
  ipfs_cid TEXT,
  submitter_address TEXT,
  created_at TEXT NOT NULL DEFAULT (DATETIME('now'))
);

CREATE INDEX IF NOT EXISTS idx_forensic_case ON forensic_reports(case_number);

-- Court Reports Table
CREATE TABLE IF NOT EXISTS court_reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  case_number TEXT NOT NULL,
  court_name TEXT NOT NULL,
  judge_name TEXT,
  verdict TEXT,
  orders_summary TEXT,
  file_name TEXT,
  file_hash TEXT,
  file_size INTEGER,
  ipfs_cid TEXT,
  submitter_address TEXT,
  created_at TEXT NOT NULL DEFAULT (DATETIME('now'))
);

CREATE INDEX IF NOT EXISTS idx_court_case ON court_reports(case_number);


