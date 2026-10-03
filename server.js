#!/usr/bin/env node
const http = require('http');
const app = require('./server/index');
const config = require('./server/config/config');
const db = require('./server/db/database');

// Ensure database is initialized
db.getDb();

const server = http.createServer(app);

server.listen(config.port, '0.0.0.0', () => {
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║       EVIDENCE PROTECTION SYSTEM — FULL STACK SERVER          ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝');
  console.log(`[Server]   Running at:  http://localhost:${config.port}`);
  console.log(`[API]      Health check: http://localhost:${config.port}/api/health`);
  console.log(`[Database] SQLite file: ${config.dbPath}`);
  console.log(`[Network]  Blockchain:  ${config.contract.networkName} (Chain ID: ${config.contract.chainId})`);
  console.log(`[Contract] Address:     ${config.contract.defaultAddress}`);
  console.log('─────────────────────────────────────────────────────────────────');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[Server] SIGTERM received. Closing HTTP server...');
  server.close(() => {
    console.log('[Server] HTTP server closed.');
    process.exit(0);
  });
});
