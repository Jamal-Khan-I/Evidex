// Evidex - Law Enforcement Email Dispatcher (Node.js / Nodemailer)
const nodemailer = require('nodemailer');
const db = require('../db/database');

let transporter = null;

function getSmtpConfig() {
  try {
    const row = db.get("SELECT value FROM system_settings WHERE key = 'smtp_config'");
    if (row && row.value) {
      const cfg = JSON.parse(row.value);
      if (cfg && cfg.user && cfg.pass) {
        return cfg;
      }
    }
  } catch (e) {
    console.warn('[EmailService] Notice reading smtp_config from database:', e.message);
  }

  // Fallback to process.env
  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    return {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT, 10) || 465,
      secure: process.env.SMTP_SECURE === 'true' || process.env.SMTP_PORT === '465',
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
      from: process.env.SMTP_FROM || `Evidex Police Authority <${process.env.SMTP_USER}>`,
      service: process.env.SMTP_SERVICE || ''
    };
  }

  return null;
}

function clearTransporterCache() {
  transporter = null;
}

async function getTransporter() {
  if (transporter) return transporter;

  const cfg = getSmtpConfig();

  if (cfg && cfg.user && cfg.pass) {
    const cleanPass = cfg.pass.replace(/\s+/g, '');
    const isGmail = (cfg.service === 'gmail') || (cfg.host && cfg.host.includes('gmail.com'));

    if (isGmail) {
      transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: cfg.user,
          pass: cleanPass
        }
      });
      console.log(`[EmailService] Live Gmail SMTP active for account: ${cfg.user}`);
    } else {
      transporter = nodemailer.createTransport({
        host: cfg.host,
        port: parseInt(cfg.port, 10) || (cfg.secure ? 465 : 587),
        secure: Boolean(cfg.secure),
        auth: {
          user: cfg.user,
          pass: cleanPass
        },
        tls: {
          rejectUnauthorized: false
        }
      });
      console.log(`[EmailService] Live SMTP transport active for host: ${cfg.host}:${cfg.port}`);
    }
    transporter._isLive = true;
    transporter._configuredUser = cfg.user;
  } else {
    // Fallback: simulated dispatcher with clear console logging
    transporter = {
      _isLive: false,
      sendMail: async (opts) => {
        console.log('\n╔═════════════════════════ SIMULATED EMAIL DISPATCH (NO SMTP CONFIGURED) ═════════════════════════╗');
        console.log(`║ TO:      ${opts.to}`);
        console.log(`║ SUBJECT: ${opts.subject}`);
        console.log('║ NOTICE:  Live SMTP is not configured in Admin Settings. Email was NOT sent to external inbox.     ║');
        console.log('╚════════════════════════════════════════════════════════════════════════════════════════════════════╝\n');
        return { messageId: 'simulated-' + Date.now(), simulated: true };
      }
    };
  }

  return transporter;
}

/**
 * Verify SMTP credentials and optionally send a test email
 */
async function testSmtpConnection(targetEmail) {
  const cfg = getSmtpConfig();
  if (!cfg || !cfg.user || !cfg.pass) {
    throw new Error('SMTP credentials are not saved in Admin Settings. Please enter and save your Email and App Password first.');
  }

  let mailer;
  const cleanPass = cfg.pass.replace(/\s+/g, '');
  const isGmail = (cfg.service === 'gmail') || (cfg.host && cfg.host.includes('gmail.com'));

  if (isGmail) {
    mailer = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: cfg.user, pass: cleanPass }
    });
  } else {
    mailer = nodemailer.createTransport({
      host: cfg.host,
      port: parseInt(cfg.port, 10) || (cfg.secure ? 465 : 587),
      secure: Boolean(cfg.secure),
      auth: { user: cfg.user, pass: cleanPass },
      tls: { rejectUnauthorized: false }
    });
  }

  // Verify connection with mail server
  await mailer.verify();

  if (targetEmail) {
    const from = cfg.from || `Evidex Police Authority <${cfg.user}>`;
    const info = await mailer.sendMail({
      from,
      to: targetEmail,
      subject: '[TEST] Evidex Official Email Dispatcher Verified',
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 10px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
          <div style="background: linear-gradient(135deg, #090d16 0%, #1e293b 100%); padding: 24px; color: #ffffff; border-bottom: 3px solid #38bdf8;">
            <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #38bdf8; margin-bottom: 6px;">Tamil Nadu Police &middot; Evidex System</div>
            <h2 style="margin: 0; font-size: 19px; color: #ffffff;">Email Dispatcher Test Connection Verified</h2>
          </div>
          <div style="padding: 24px; color: #1e293b; font-size: 14px; line-height: 1.6;">
            <p style="margin: 0 0 16px 0;">This official test dispatch confirms that your <strong>Evidex Email Dispatcher</strong> is properly connected and delivering live emails.</p>
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; margin-bottom: 16px; font-size: 13px;">
              <div><strong>Sender Account:</strong> ${cfg.user}</div>
              <div><strong>Dispatcher Mode:</strong> ${isGmail ? 'Google Mail Service (SSL 465)' : cfg.host + ':' + cfg.port}</div>
              <div><strong>Verification Time:</strong> ${new Date().toUTCString()}</div>
            </div>
            <p style="font-size: 13px; color: #64748b; margin: 0;">Applicant approval and rejection notices will now be delivered automatically to officers' inboxes.</p>
          </div>
          <div style="background: #f1f5f9; padding: 14px 24px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0;">
            Evidex Forensic Evidence Protection System &middot; Confidential Automated Notification
          </div>
        </div>
      `
    });
    return { success: true, messageId: info.messageId, recipient: targetEmail };
  }

  return { success: true, verified: true };
}

/**
 * Send an official Approval Email to the officer
 */
async function sendApprovalEmail(officer) {
  if (!officer || !officer.email) {
    console.warn('[EmailService] Cannot send approval email: No recipient email provided.');
    return { success: false, error: 'Officer does not have an email address specified.' };
  }

  const mailer = await getTransporter();
  const cfg = getSmtpConfig();
  const from = (cfg && cfg.from) || (cfg && cfg.user ? `Evidex Police Authority <${cfg.user}>` : (process.env.SMTP_FROM || '"Evidex Police Authority" <noreply@evidex.tnpolice.gov.in>'));
  const portalUrl = process.env.APP_URL || 'https://evidex-1gj7.onrender.com';

  const roleTitle = officer.role === 'POLICE'
    ? 'Police Investigating Officer'
    : officer.role === 'FORENSICS'
    ? 'Forensic Laboratory Specialist'
    : 'Court Judicial Authority';

  let deptDetails = '';
  try {
    const dept = typeof officer.department_data === 'string'
      ? JSON.parse(officer.department_data)
      : (officer.department_data || {});

    if (officer.role === 'POLICE') {
      deptDetails = `
        <tr><td style="padding: 8px 0; color: #64748b; font-size: 13px;">Police Station:</td><td style="padding: 8px 0; font-weight: 600; color: #0f172a; font-size: 13px;">${dept.policeStation || 'N/A'}</td></tr>
        <tr><td style="padding: 8px 0; color: #64748b; font-size: 13px;">District / Zone:</td><td style="padding: 8px 0; font-weight: 600; color: #0f172a; font-size: 13px;">${dept.district || 'N/A'}</td></tr>
        <tr><td style="padding: 8px 0; color: #64748b; font-size: 13px;">Badge / Constabulary No:</td><td style="padding: 8px 0; font-weight: 600; color: #0f172a; font-size: 13px;">${dept.badgeNumber || 'N/A'}</td></tr>
        <tr><td style="padding: 8px 0; color: #64748b; font-size: 13px;">Rank / Designation:</td><td style="padding: 8px 0; font-weight: 600; color: #0f172a; font-size: 13px;">${dept.rank || 'Inspector'}</td></tr>
      `;
    } else if (officer.role === 'FORENSICS') {
      deptDetails = `
        <tr><td style="padding: 8px 0; color: #64748b; font-size: 13px;">Forensic Lab ID:</td><td style="padding: 8px 0; font-weight: 600; color: #0f172a; font-size: 13px;">${dept.labId || 'N/A'}</td></tr>
        <tr><td style="padding: 8px 0; color: #64748b; font-size: 13px;">Accreditation No:</td><td style="padding: 8px 0; font-weight: 600; color: #0f172a; font-size: 13px;">${dept.accreditationNumber || 'N/A'}</td></tr>
        <tr><td style="padding: 8px 0; color: #64748b; font-size: 13px;">Division Specialization:</td><td style="padding: 8px 0; font-weight: 600; color: #0f172a; font-size: 13px;">${dept.specialization || 'Cyber Forensics'}</td></tr>
      `;
    } else {
      deptDetails = `
        <tr><td style="padding: 8px 0; color: #64748b; font-size: 13px;">Court / Jurisdiction:</td><td style="padding: 8px 0; font-weight: 600; color: #0f172a; font-size: 13px;">${dept.courtName || 'District Court'}</td></tr>
        <tr><td style="padding: 8px 0; color: #64748b; font-size: 13px;">Designation:</td><td style="padding: 8px 0; font-weight: 600; color: #0f172a; font-size: 13px;">${dept.courtDesignation || 'Judicial Magistrate'}</td></tr>
      `;
    }
  } catch (e) {
    deptDetails = '<tr><td colspan="2" style="padding: 8px 0; color: #64748b;">Departmental profile synchronized.</td></tr>';
  }

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Evidex Officer Access Approval</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 24px; color: #1e293b;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04); border: 1px solid #e2e8f0;">
    
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #090d16 0%, #1e293b 100%); padding: 32px 28px; text-align: left; border-bottom: 3px solid #3b82f6;">
      <div style="display: inline-block; padding: 6px 12px; background: rgba(59, 130, 246, 0.18); border: 1px solid rgba(59, 130, 246, 0.4); border-radius: 6px; color: #60a5fa; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 12px;">
        Tamil Nadu Police &middot; Forensic Division
      </div>
      <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 700; letter-spacing: -0.02em;">
        Evidex Ledger Access Approved
      </h1>
      <p style="color: #94a3b8; font-size: 13px; margin: 6px 0 0 0;">
        Decentralized Digital Evidence Protection &amp; Chain-of-Custody System
      </p>
    </div>

    <!-- Body -->
    <div style="padding: 32px 28px;">
      <p style="font-size: 15px; line-height: 1.6; margin: 0 0 16px 0;">
        Dear <strong>${officer.officer_name}</strong>,
      </p>

      <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 24px 0;">
        Your identity and departmental credentials have been verified by the System Administrator. Your officer registration request has been <strong>officially approved</strong>. Your designated MetaMask wallet address is now authorized to log in to the Evidex forensic ledger on the Sepolia network.
      </p>

      <!-- Status Badge Box -->
      <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 14px 18px; margin-bottom: 24px;">
        <div style="color: #166534; font-weight: 700; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; display: flex; align-items: center;">
          &#10003; Verification Status: ACTIVE &amp; AUTHENTICATED
        </div>
        <div style="color: #15803d; font-size: 12px; margin-top: 4px;">
          Cryptographic UIDAI e-Aadhaar Authenticity check: Passed &bull; Live Biometric Match: Approved
        </div>
      </div>

      <!-- Dossier Summary Table -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; background: #f8fafc; border-radius: 8px; padding: 12px; border: 1px solid #e2e8f0;">
        <tr>
          <td style="padding: 8px 12px; color: #64748b; font-size: 13px; width: 40%;">Assigned Role:</td>
          <td style="padding: 8px 12px; font-weight: 700; color: #0284c7; font-size: 13px;">${roleTitle}</td>
        </tr>
        <tr>
          <td style="padding: 8px 12px; color: #64748b; font-size: 13px;">Registered Wallet:</td>
          <td style="padding: 8px 12px; font-family: monospace; font-size: 12px; color: #0f172a; word-break: break-all;">${officer.wallet_address}</td>
        </tr>
        ${deptDetails}
      </table>

      <!-- Next Steps -->
      <div style="background: #eff6ff; border-left: 4px solid #3b82f6; padding: 14px 18px; margin-bottom: 28px; border-radius: 0 8px 8px 0;">
        <h4 style="margin: 0 0 6px 0; color: #1e40af; font-size: 13px; font-weight: 700;">How to Access Evidex:</h4>
        <ol style="margin: 0; padding-left: 20px; font-size: 13px; color: #1e3a8a; line-height: 1.5;">
          <li>Visit the official Evidex portal.</li>
          <li>Ensure MetaMask is unlocked and switched to the <strong>Sepolia Testnet</strong>.</li>
          <li>Click <strong>"Connect Wallet"</strong>. The system will recognize your authorized address and grant immediate access.</li>
          <li>Click your <strong>Profile Icon</strong> in the top navigation bar to inspect and update your service profile anytime.</li>
        </ol>
      </div>

      <!-- CTA Button -->
      <div style="text-align: center; margin: 32px 0 24px 0;">
        <a href="${portalUrl}" style="display: inline-block; background: #0f172a; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 14px; letter-spacing: -0.01em; box-shadow: 0 4px 12px rgba(15, 23, 42, 0.2);">
          Open Evidex Portal &rarr;
        </a>
      </div>

      <!-- Legal Warning -->
      <p style="font-size: 11px; line-height: 1.5; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 20px; margin-top: 24px;">
        <strong>NOTICE UNDER SECTION 65B (INDIAN EVIDENCE ACT &amp; IT ACT 2000):</strong> All actions, evidence seals, integrity verifications, and custody transfers conducted via this portal are cryptographically signed and permanently logged on an immutable public ledger. Unauthorized access or fraudulent manipulation constitutes a non-bailable offense under the Information Technology Act.
      </p>
    </div>

    <!-- Footer -->
    <div style="background: #f8fafc; padding: 18px 28px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0;">
      Evidex Decentralized Forensic Ledger &middot; State Police Cyber Crime Division &middot; Confidential
    </div>
  </div>
</body>
</html>
  `;

  try {
    console.log(`[EmailService] Attempting to dispatch approval email to: ${officer.email}...`);
    const info = await mailer.sendMail({
      from,
      to: officer.email,
      subject: `[OFFICIAL] Evidex Access Approved — ${officer.officer_name} (${roleTitle})`,
      html
    });

    if (info.simulated || !mailer._isLive) {
      console.warn(`[EmailService] Approval email was simulated (live SMTP not configured).`);
      return {
        success: false,
        notConfigured: true,
        messageId: info.messageId,
        error: 'Email dispatcher is not configured with live SMTP/Gmail credentials. Please configure Gmail/SMTP in Admin Settings.'
      };
    }

    console.log(`[EmailService] Approval email delivered successfully to ${officer.email} (MessageId: ${info.messageId})`);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error(`[EmailService] Failed to send approval email to ${officer.email}:`, err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Send a respectful Rejection / Modification Notice Email
 */
async function sendRejectionEmail(officer, reason) {
  if (!officer || !officer.email) {
    console.warn('[EmailService] Cannot send rejection email: No recipient email provided.');
    return { success: false, error: 'Officer does not have an email address specified.' };
  }

  const mailer = await getTransporter();
  const cfg = getSmtpConfig();
  const from = (cfg && cfg.from) || (cfg && cfg.user ? `Evidex Police Authority <${cfg.user}>` : (process.env.SMTP_FROM || '"Evidex Police Authority" <noreply@evidex.tnpolice.gov.in>'));
  const portalUrl = process.env.APP_URL || 'https://evidex-1gj7.onrender.com';

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Evidex Access Request Status</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 24px; color: #1e293b;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.08); border: 1px solid #e2e8f0;">
    
    <!-- Header -->
    <div style="background: #0f172a; padding: 28px; text-align: left; border-bottom: 3px solid #ef4444;">
      <div style="color: #f87171; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 8px;">
        Tamil Nadu Police &middot; Departmental Verification Notice
      </div>
      <h1 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 700;">
        Evidex Ledger Access Application Status
      </h1>
    </div>

    <!-- Body -->
    <div style="padding: 28px;">
      <p style="font-size: 15px; line-height: 1.6; margin: 0 0 16px 0;">
        Dear <strong>${officer.officer_name}</strong>,
      </p>

      <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 20px 0;">
        Thank you for submitting your credential verification for the Evidex Digital Evidence Protection System. Following administrative review, your application could not be approved at this time.
      </p>

      <!-- Reason Box -->
      <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
        <div style="color: #991b1b; font-weight: 700; font-size: 12px; text-transform: uppercase; margin-bottom: 6px;">
          Reason for Decision:
        </div>
        <div style="color: #b91c1c; font-size: 14px; line-height: 1.5;">
          ${reason || 'Document cross-verification mismatch or incomplete departmental credentials.'}
        </div>
      </div>

      <p style="font-size: 13px; color: #475569; line-height: 1.6; margin: 0 0 24px 0;">
        If you believe this decision was made in error or wish to re-submit with updated e-Aadhaar documentation or valid badge numbers, please visit the portal to re-apply, or contact your district superintendent.
      </p>

      <div style="text-align: center; margin: 24px 0;">
        <a href="${portalUrl}" style="display: inline-block; background: #0f172a; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600; font-size: 13px;">
          Return to Evidex Portal
        </a>
      </div>
    </div>

    <div style="background: #f8fafc; padding: 16px 28px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
      Evidex Forensic Ledger Authority &middot; State Police Headquarters &middot; Automated Service Notification
    </div>
  </div>
</body>
</html>
  `;

  try {
    console.log(`[EmailService] Attempting to dispatch rejection email to: ${officer.email}...`);
    const info = await mailer.sendMail({
      from,
      to: officer.email,
      subject: `[NOTICE] Evidex Access Application Status — ${officer.officer_name}`,
      html
    });

    if (info.simulated || !mailer._isLive) {
      console.warn(`[EmailService] Rejection email was simulated (live SMTP not configured).`);
      return {
        success: false,
        notConfigured: true,
        messageId: info.messageId,
        error: 'Email dispatcher is not configured with live SMTP/Gmail credentials. Please configure Gmail/SMTP in Admin Settings.'
      };
    }

    console.log(`[EmailService] Rejection email delivered successfully to ${officer.email} (MessageId: ${info.messageId})`);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error(`[EmailService] Failed to send rejection email to ${officer.email}:`, err.message);
    return { success: false, error: err.message };
  }
}

module.exports = {
  sendApprovalEmail,
  sendRejectionEmail,
  getSmtpConfig,
  clearTransporterCache,
  testSmtpConnection
};
