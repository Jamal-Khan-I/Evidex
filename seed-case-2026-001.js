const db = require('./server/db/database');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const testDir = path.join(__dirname, 'test_case_files');
const files = fs.readdirSync(testDir);
const caseNum = 'CASE-2026-001';
const firNum = 'FIR No. 001/2026';
const station = 'Central Cyber Police Station, New Delhi (Special Cell)';
const sections = 'BNS Sec 318(4), 316(2), 336(3), 61(2) | IT Act Sec 43, 66C, 66D | BSA Sec 63';
const desc = 'Transnational Cyber Crime Syndicate Virtual Custody / Digital Arrest extortion racket targeting senior citizens.';

db.run(
  `INSERT OR REPLACE INTO cases 
   (case_number, fir_number, police_station, law_sections, description, registered_by, officer_name, case_key, forensics_requested, forensics_status, court_status, case_status, created_at) 
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 'PENDING', 'PENDING', 'OPEN', DATETIME('now'))`,
  [
    caseNum,
    firNum,
    station,
    sections,
    desc,
    '0x40386f4ec88bf501a562d4552ef9ff6eadfa69da',
    'Inspector Vikramaditya Rathore',
    'E7qci6ybOpKWAN7xJJyRoL133lthzj'
  ]
);

files.forEach((f, idx) => {
  const fPath = path.join(testDir, f);
  const content = fs.readFileSync(fPath);
  const hash = '0x' + crypto.createHash('sha256').update(content).digest('hex');
  const stat = fs.statSync(fPath);
  const evId = `${caseNum}-EV${String(idx + 1).padStart(2, '0')}`;
  
  db.run(
    `INSERT OR REPLACE INTO evidence_records 
     (id, case_number, file_name, file_hash, file_size, mime_type, description, submitter_address, current_custodian, tx_hash, block_number, created_at) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, DATETIME('now'))`,
    [
      evId,
      caseNum,
      f,
      hash,
      stat.size,
      'text/plain',
      `Seized Exhibit ${idx + 1}: ${f}`,
      '0x40386f4ec88bf501a562d4552ef9ff6eadfa69da',
      '0x40386f4ec88bf501a562d4552ef9ff6eadfa69da',
      '0x58f79d1a3c749921b0e5672abf8812c3098d667104b998cf1e809314ac618df2',
      7894561
    ]
  );
});

console.log('Seeded CASE-2026-001 with', files.length, 'evidence files into SQLite.');
