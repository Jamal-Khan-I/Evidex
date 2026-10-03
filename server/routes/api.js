const express = require('express');
const router = express.Router();
const config = require('../config/config');
const db = require('../db/database');

// Child routers
const auditRoutes = require('./audit');
const evidenceRoutes = require('./evidence');
const incidentRoutes = require('./incidents');
const profileRoutes = require('./profile');

// GET /api/health - Server health & system telemetry
router.get('/health', (req, res) => {
  let dbStatus = 'healthy';
  let totalLogs = 0;
  let totalEvidence = 0;
  let totalIncidents = 0;

  try {
    const logRow = db.get('SELECT COUNT(*) as count FROM audit_logs');
    totalLogs = logRow ? logRow.count : 0;

    const eviRow = db.get('SELECT COUNT(*) as count FROM evidence_records');
    totalEvidence = eviRow ? eviRow.count : 0;

    const incRow = db.get('SELECT COUNT(*) as count FROM tamper_incidents');
    totalIncidents = incRow ? incRow.count : 0;
  } catch (err) {
    dbStatus = 'degraded: ' + err.message;
  }

  res.json({
    status: 'online',
    system: 'Evidence Protection System (EPS) Full-Stack Server',
    version: '2.0.0',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    database: {
      status: dbStatus,
      totalAuditLogs: totalLogs,
      totalEvidenceRecords: totalEvidence,
      totalTamperIncidents: totalIncidents
    },
    blockchain: {
      network: config.contract.networkName,
      chainId: config.contract.chainId,
      defaultContractAddress: config.contract.defaultAddress,
      rpcUrl: config.contract.rpcUrl
    }
  });
});

// GET /api/config - Public configuration
router.get('/config', (req, res) => {
  res.json({
    defaultContractAddress: config.contract.defaultAddress,
    networkName: config.contract.networkName,
    chainId: config.contract.chainId,
    rpcUrl: config.contract.rpcUrl,
    pinataJwt: config.pinataJwt || ''
  });
});

// Mount resource routers
router.use('/audit', auditRoutes);
router.use('/evidence', evidenceRoutes);
router.use('/incidents', incidentRoutes);
router.use('/profile', profileRoutes);

module.exports = router;
