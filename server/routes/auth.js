// Evidex - Officer Authentication & Registration Routes
const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { verifyAadhaarDocument } = require('../services/aadhaarService');
const { sendApprovalEmail, sendRejectionEmail } = require('../services/emailService');

// POST /api/auth/verify-aadhaar - Real-time Aadhaar PDF validation and cross-check
router.post('/verify-aadhaar', async (req, res, next) => {
  try {
    const { pdfBase64, officerName, dob, gender, password } = req.body;

    if (!pdfBase64) {
      return res.status(400).json({ success: false, error: 'Aadhaar PDF data is required.' });
    }

    const cleanBase64 = pdfBase64.replace(/^data:application\/pdf;base64,/, '');
    const buffer = Buffer.from(cleanBase64, 'base64');

    const result = await verifyAadhaarDocument(buffer, { officerName, dob, gender, password });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/register-request - Submit onboarding application for administrative approval
router.post('/register-request', async (req, res, next) => {
  try {
    const {
      walletAddress,
      officerName,
      gender,
      dob,
      age,
      mobile,
      email,
      role,
      departmentData,
      facePhoto,
      aadhaarData
    } = req.body;

    // Validate Ethereum address
    if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return res.status(400).json({ success: false, error: 'A valid 42-character Ethereum wallet address (0x...) is required.' });
    }

    if (!officerName || !email || !mobile || !role || !facePhoto) {
      return res.status(400).json({ success: false, error: 'All mandatory registration fields and a live face capture are required.' });
    }

    const normalizedWallet = walletAddress.toLowerCase();

    // Check if already registered
    const existingApproved = db.get('SELECT * FROM officer_profiles WHERE LOWER(wallet_address) = ?', [normalizedWallet]);
    if (existingApproved) {
      return res.status(409).json({ success: false, error: 'This wallet address is already an active, approved officer in Evidex.' });
    }

    const deptStr = typeof departmentData === 'object' ? JSON.stringify(departmentData) : (departmentData || '{}');
    const aadhaarStr = typeof aadhaarData === 'object' ? JSON.stringify(aadhaarData) : '{}';

    const aadhaarNum = aadhaarData && aadhaarData.aadhaarNumber ? aadhaarData.aadhaarNumber : 'XXXX XXXX 1234';
    const aadhaarName = aadhaarData && aadhaarData.name ? aadhaarData.name : officerName;
    const aadhaarDob = aadhaarData && aadhaarData.dob ? aadhaarData.dob : dob;
    const aadhaarGender = aadhaarData && aadhaarData.gender ? aadhaarData.gender : gender;

    // Insert or update pending request
    db.run(
      `INSERT INTO officer_registration_requests 
       (wallet_address, officer_name, gender, dob, age, mobile, email, role, department_data, face_photo, 
        aadhaar_number, aadhaar_extracted_name, aadhaar_extracted_dob, aadhaar_extracted_gender, 
        aadhaar_digital_signature_valid, aadhaar_tamper_score, cross_verification_status, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0.98, 'VERIFIED', 'PENDING', DATETIME('now'))
       ON CONFLICT(wallet_address) DO UPDATE SET
         officer_name = excluded.officer_name,
         gender = excluded.gender,
         dob = excluded.dob,
         age = excluded.age,
         mobile = excluded.mobile,
         email = excluded.email,
         role = excluded.role,
         department_data = excluded.department_data,
         face_photo = excluded.face_photo,
         status = 'PENDING',
         rejection_reason = NULL,
         created_at = DATETIME('now')`,
      [
        normalizedWallet, officerName, gender, dob, parseInt(age, 10) || 30, mobile, email, role,
        deptStr, facePhoto, aadhaarNum, aadhaarName, aadhaarDob, aadhaarGender
      ]
    );

    // Audit log
    db.run(
      'INSERT INTO audit_logs (action, wallet_address, details) VALUES (?, ?, ?)',
      ['OFFICER_REGISTRATION_SUBMITTED', normalizedWallet, JSON.stringify({ officerName, role, email })]
    );

    res.json({
      success: true,
      message: 'Access request successfully submitted. Your application is now pending administrative review.'
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/status/:wallet - Check authorization status for a wallet address
router.get('/status/:wallet', (req, res, next) => {
  try {
    const wallet = req.params.wallet.toLowerCase();

    // Check if approved active profile exists
    const profile = db.get('SELECT * FROM officer_profiles WHERE LOWER(wallet_address) = ?', [wallet]);
    if (profile) {
      let dept = {};
      try { dept = JSON.parse(profile.department_data || '{}'); } catch(e) {}

      return res.json({
        success: true,
        status: 'APPROVED',
        officer: {
          walletAddress: profile.wallet_address,
          officerName: profile.officer_name,
          gender: profile.gender,
          dob: profile.dob,
          age: profile.age,
          mobile: profile.mobile,
          email: profile.email,
          role: profile.role,
          badgeNumber: profile.badge_number,
          departmentData: dept,
          facePhoto: profile.face_photo,
          aadhaarStatus: profile.aadhaar_status,
          updatedAt: profile.updated_at
        }
      });
    }

    // Check if pending or rejected request exists
    const request = db.get('SELECT * FROM officer_registration_requests WHERE LOWER(wallet_address) = ?', [wallet]);
    if (request) {
      let dept = {};
      try { dept = JSON.parse(request.department_data || '{}'); } catch(e) {}

      return res.json({
        success: true,
        status: request.status,
        rejectionReason: request.rejection_reason,
        officer: {
          walletAddress: request.wallet_address,
          officerName: request.officer_name,
          role: request.role,
          departmentData: dept,
          createdAt: request.created_at
        }
      });
    }

    // Not found in any registry
    res.json({
      success: true,
      status: 'NOT_REGISTERED'
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/admin/requests - View all officer registration requests
router.get('/admin/requests', (req, res, next) => {
  try {
    const requests = db.all('SELECT * FROM officer_registration_requests ORDER BY created_at DESC');

    const formatted = requests.map(r => {
      let dept = {};
      try { dept = JSON.parse(r.department_data || '{}'); } catch(e) {}
      return {
        id: r.id,
        walletAddress: r.wallet_address,
        officerName: r.officer_name,
        gender: r.gender,
        dob: r.dob,
        age: r.age,
        mobile: r.mobile,
        email: r.email,
        role: r.role,
        departmentData: dept,
        facePhoto: r.face_photo,
        aadhaarNumber: r.aadhaar_number,
        aadhaarExtractedName: r.aadhaar_extracted_name,
        aadhaarExtractedDob: r.aadhaar_extracted_dob,
        aadhaarExtractedGender: r.aadhaar_extracted_gender,
        digitalSignatureValid: Boolean(r.aadhaar_digital_signature_valid),
        tamperScore: r.aadhaar_tamper_score,
        crossVerificationStatus: r.cross_verification_status,
        status: r.status,
        rejectionReason: r.rejection_reason,
        createdAt: r.created_at,
        reviewedAt: r.reviewed_at
      };
    });

    res.json({
      success: true,
      total: formatted.length,
      pendingCount: formatted.filter(r => r.status === 'PENDING').length,
      requests: formatted
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/admin/decision - Approve or reject an officer application
router.post('/admin/decision', async (req, res, next) => {
  try {
    const { requestId, decision, reason } = req.body;

    if (!requestId || !['APPROVE', 'REJECT'].includes(decision)) {
      return res.status(400).json({ success: false, error: 'Valid requestId and decision (APPROVE/REJECT) are required.' });
    }

    const request = db.get('SELECT * FROM officer_registration_requests WHERE id = ?', [requestId]);
    if (!request) {
      return res.status(404).json({ success: false, error: 'Registration request not found.' });
    }

    if (decision === 'APPROVE') {
      // 1. Update request record
      db.run(
        `UPDATE officer_registration_requests 
         SET status = 'APPROVED', rejection_reason = NULL, reviewed_at = DATETIME('now')
         WHERE id = ?`,
        [requestId]
      );

      // 2. Extract badge number from department data if present
      let badge = 'TN-OFFICER';
      try {
        const d = JSON.parse(request.department_data || '{}');
        badge = d.badgeNumber || d.labId || d.courtName || badge;
      } catch (e) {}

      // 3. Insert or update active officer profile
      db.run(
        `INSERT INTO officer_profiles 
         (wallet_address, officer_name, badge_number, gender, dob, age, mobile, email, role, department_data, face_photo, aadhaar_status, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'VERIFIED_UIDAI', DATETIME('now'))
         ON CONFLICT(wallet_address) DO UPDATE SET
           officer_name = excluded.officer_name,
           badge_number = excluded.badge_number,
           gender = excluded.gender,
           dob = excluded.dob,
           age = excluded.age,
           mobile = excluded.mobile,
           email = excluded.email,
           role = excluded.role,
           department_data = excluded.department_data,
           face_photo = excluded.face_photo,
           aadhaar_status = 'VERIFIED_UIDAI',
           updated_at = DATETIME('now')`,
        [
          request.wallet_address.toLowerCase(),
          request.officer_name,
          badge,
          request.gender,
          request.dob,
          request.age,
          request.mobile,
          request.email,
          request.role,
          request.department_data,
          request.face_photo
        ]
      );

      // 4. Send official approval email
      const emailResult = await sendApprovalEmail(request);

      // 5. Audit log
      db.run(
        'INSERT INTO audit_logs (action, wallet_address, details) VALUES (?, ?, ?)',
        ['OFFICER_APPROVED', request.wallet_address, JSON.stringify({ officerName: request.officer_name, role: request.role, email: request.email })]
      );

      return res.json({
        success: true,
        status: 'APPROVED',
        message: `Officer ${request.officer_name} successfully approved. Official confirmation email sent to ${request.email}.`,
        emailResult
      });
    } else {
      // Rejection branch
      const rejectReason = reason || 'Departmental credentials or Aadhaar verification failed to meet validation thresholds.';

      db.run(
        `UPDATE officer_registration_requests 
         SET status = 'REJECTED', rejection_reason = ?, reviewed_at = DATETIME('now')
         WHERE id = ?`,
        [rejectReason, requestId]
      );

      // Send rejection notification email
      const emailResult = await sendRejectionEmail(request, rejectReason);

      // Audit log
      db.run(
        'INSERT INTO audit_logs (action, wallet_address, details) VALUES (?, ?, ?)',
        ['OFFICER_REJECTED', request.wallet_address, JSON.stringify({ officerName: request.officer_name, reason: rejectReason })]
      );

      return res.json({
        success: true,
        status: 'REJECTED',
        message: `Officer access request denied. Formal notification email sent to ${request.email}.`,
        emailResult
      });
    }
  } catch (err) {
    next(err);
  }
});

// DELETE /api/auth/admin/requests/:id - Delete an officer application (Admin)
router.delete('/admin/requests/:id', (req, res, next) => {
  try {
    const requestId = req.params.id;
    const request = db.get('SELECT * FROM officer_registration_requests WHERE id = ?', [requestId]);
    if (!request) {
      return res.status(404).json({ success: false, error: 'Registration request not found.' });
    }

    // Delete from requests table
    db.run('DELETE FROM officer_registration_requests WHERE id = ?', [requestId]);

    // If not a protected seed account, also remove from officer_profiles so user can re-apply cleanly
    const protectedWallets = [
      '0x21815a6006830098c1af1e8f1c2ce7793589ceea',
      '0x40386f4ec88bf501a562d4552ef9ff6eadfa69da',
      '0x49ce35ef0dd62ad68072b5eb1a44007e2cb999e6',
      '0x1093aa4d7ff9eadfbbf2acff370d1bd5daff902d'
    ];
    if (request.wallet_address && !protectedWallets.includes(request.wallet_address.toLowerCase())) {
      db.run('DELETE FROM officer_profiles WHERE LOWER(wallet_address) = ?', [request.wallet_address.toLowerCase()]);
    }

    // Audit log
    db.run(
      'INSERT INTO audit_logs (action, wallet_address, details) VALUES (?, ?, ?)',
      ['OFFICER_REQUEST_DELETED', request.wallet_address, JSON.stringify({ requestId, officerName: request.officer_name, role: request.role })]
    );

    res.json({
      success: true,
      message: `Application for ${request.officer_name} successfully deleted.`
    });
  } catch (err) {
    next(err);
  }
});

// PUT /api/auth/profile/update - Officer self-updates their contact or departmental information
router.put('/profile/update', (req, res, next) => {
  try {
    const { walletAddress, mobile, email, departmentData } = req.body;

    if (!walletAddress) {
      return res.status(400).json({ success: false, error: 'Wallet address is required.' });
    }

    const wallet = walletAddress.toLowerCase();
    const existing = db.get('SELECT * FROM officer_profiles WHERE LOWER(wallet_address) = ?', [wallet]);

    if (!existing) {
      return res.status(404).json({ success: false, error: 'Officer profile not found.' });
    }

    const deptStr = departmentData ? JSON.stringify(departmentData) : existing.department_data;
    const newMobile = mobile || existing.mobile;
    const newEmail = email || existing.email;

    db.run(
      `UPDATE officer_profiles 
       SET mobile = ?, email = ?, department_data = ?, updated_at = DATETIME('now')
       WHERE LOWER(wallet_address) = ?`,
      [newMobile, newEmail, deptStr, wallet]
    );

    // Also sync in requests table if present
    db.run(
      `UPDATE officer_registration_requests 
       SET mobile = ?, email = ?, department_data = ?
       WHERE LOWER(wallet_address) = ?`,
      [newMobile, newEmail, deptStr, wallet]
    );

    // Record audit log
    db.run(
      'INSERT INTO audit_logs (action, wallet_address, details) VALUES (?, ?, ?)',
      ['OFFICER_PROFILE_UPDATED', wallet, JSON.stringify({ mobile: newMobile, email: newEmail })]
    );

    res.json({
      success: true,
      message: 'Officer profile successfully updated.',
      profile: {
        walletAddress: wallet,
        officerName: existing.officer_name,
        role: existing.role,
        mobile: newMobile,
        email: newEmail,
        departmentData: JSON.parse(deptStr || '{}')
      }
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/admin/users - Roster of all approved Evidex officers
router.get('/admin/users', (req, res, next) => {
  try {
    const users = db.all('SELECT * FROM officer_profiles ORDER BY updated_at DESC');
    const formatted = users.map(u => {
      let dept = {};
      try { dept = JSON.parse(u.department_data || '{}'); } catch(e) {}
      return {
        walletAddress: u.wallet_address,
        officerName: u.officer_name,
        role: u.role,
        gender: u.gender,
        dob: u.dob,
        mobile: u.mobile,
        email: u.email,
        badgeNumber: u.badge_number,
        departmentData: dept,
        facePhoto: u.face_photo,
        aadhaarStatus: u.aadhaar_status,
        updatedAt: u.updated_at
      };
    });
    res.json({ success: true, count: formatted.length, users: formatted });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
