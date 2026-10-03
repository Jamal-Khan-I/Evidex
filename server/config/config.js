// Evidence Protection System - Server Configuration
require('dotenv').config();
const path = require('path');

module.exports = {
  port: parseInt(process.env.PORT, 10) || 3000,
  env: process.env.NODE_ENV || 'development',
  contract: {
    defaultAddress: process.env.DEFAULT_CONTRACT_ADDRESS || '0x2d8830D1857ff9304aB754E4AcCDE2218B04Dd6b',
    networkName: process.env.DEFAULT_NETWORK_NAME || 'Sepolia',
    chainId: parseInt(process.env.DEFAULT_CHAIN_ID, 10) || 11155111,
    rpcUrl: process.env.RPC_URL || 'https://rpc.sepolia.org'
  },
  dbPath: process.env.DATABASE_PATH
    ? path.resolve(process.cwd(), process.env.DATABASE_PATH)
    : path.resolve(__dirname, '../../data/evidence_system.sqlite'),
  pinataJwt: process.env.PINATA_JWT || ''
};
