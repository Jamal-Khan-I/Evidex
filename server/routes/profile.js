const express = require('express');
const router = express.Router();
const db = require('../db/database');

// GET /api/profile/:wallet - Fetch synced officer profile
router.get('/:wallet', (req, res, next) => {
  try {
    const wallet = req.params.wallet.toLowerCase();
    const profile = db.get('SELECT * FROM officer_profiles WHERE LOWER(wallet_address) = ?', [wallet]);

    if (!profile) {
      return res.json({ success: true, exists: false, profile: null });
    }

    res.json({
      success: true,
      exists: true,
      profile: {
        walletAddress: profile.wallet_address,
        faceDescriptor: profile.encrypted_face_descriptor ? JSON.parse(profile.encrypted_face_descriptor) : null,
        pinHash: profile.pin_hash,
        officerName: profile.officer_name,
        badgeNumber: profile.badge_number,
        updatedAt: profile.updated_at
      }
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/profile/:wallet - Backup or update officer profile
router.post('/:wallet', (req, res, next) => {
  try {
    const wallet = req.params.wallet.toLowerCase();
    const { faceDescriptor, pinHash, officerName, badgeNumber } = req.body;

    const descriptorStr = faceDescriptor ? JSON.stringify(faceDescriptor) : null;

    db.run(
      `INSERT INTO officer_profiles 
       (wallet_address, encrypted_face_descriptor, pin_hash, officer_name, badge_number, updated_at)
       VALUES (?, ?, ?, ?, ?, DATETIME('now'))
       ON CONFLICT(wallet_address) DO UPDATE SET
         encrypted_face_descriptor = COALESCE(excluded.encrypted_face_descriptor, officer_profiles.encrypted_face_descriptor),
         pin_hash = COALESCE(excluded.pin_hash, officer_profiles.pin_hash),
         officer_name = COALESCE(excluded.officer_name, officer_profiles.officer_name),
         badge_number = COALESCE(excluded.badge_number, officer_profiles.badge_number),
         updated_at = DATETIME('now')`,
      [wallet, descriptorStr, pinHash || null, officerName || null, badgeNumber || null]
    );

    res.json({
      success: true,
      message: 'Officer profile synced successfully'
    });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/profile/:wallet - Reset/delete synced profile
router.delete('/:wallet', (req, res, next) => {
  try {
    const wallet = req.params.wallet.toLowerCase();
    db.run('DELETE FROM officer_profiles WHERE LOWER(wallet_address) = ?', [wallet]);

    // Record audit log
    db.run(
      'INSERT INTO audit_logs (action, wallet_address, details) VALUES (?, ?, ?)',
      ['FACE_DATA_RESET', wallet, JSON.stringify({ source: 'api' })]
    );

    res.json({
      success: true,
      message: 'Officer profile deleted successfully'
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
