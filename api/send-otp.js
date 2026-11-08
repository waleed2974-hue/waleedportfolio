import crypto from 'crypto';

const SECRET_SALT = process.env.SESSION_SECRET || 'sw_otp_session_secret_2026';

function signChallenge(email, otp, timestamp) {
  return crypto.createHmac('sha256', SECRET_SALT).update(`${email}:${otp}:${timestamp}`).digest('hex');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const { email } = body;
  const targetEmail = (email || 'syedwaleed.1990@outlook.com').trim().toLowerCase();

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const timestamp = Date.now();
  const signature = signChallenge(targetEmail, otp, timestamp);
  const challengeToken = `${signature}.${timestamp}`;

  let delivered = false;
  let deliveryNote = '';

  const resendApiKey = process.env.RESEND_API_KEY;
  const brevoApiKey = process.env.BREVO_API_KEY;

  const emailHtml = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0B0B0C; color: #F4F4F6; padding: 40px; border-radius: 12px; max-width: 560px; margin: 0 auto; border: 1px solid rgba(255,255,255,0.15);">
      <h2 style="font-size: 22px; font-weight: 700; margin: 0 0 12px; color: #F4F4F6;">Admin Login Verification Code</h2>
      <p style="color: #8E8E93; font-size: 15px; line-height: 1.6; margin: 0 0 24px;">Enter the one-time passcode below to verify your identity:</p>
      <div style="background: #16161A; border: 1px solid #E2FF32; border-radius: 8px; padding: 20px; text-align: center; margin-bottom: 24px;">
        <span style="font-family: monospace; font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #E2FF32;">${otp}</span>
      </div>
      <p style="color: #8E8E93; font-size: 13px; line-height: 1.5; margin: 0 0 12px;">• Valid for <strong>10 minutes</strong>.<br>• Destination: <strong>${targetEmail}</strong></p>
    </div>
  `;

  if (resendApiKey) {
    try {
      const resendRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey.trim()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: 'Syed Waleed Portfolio <onboarding@resend.dev>',
          to: [targetEmail],
          subject: `Your Admin Verification Code: ${otp}`,
          html: emailHtml
        })
      });
      if (resendRes.ok) {
        delivered = true;
        deliveryNote = `Dispatched directly to ${targetEmail} via Resend`;
      } else {
        const err = await resendRes.json().catch(() => ({}));
        deliveryNote = `Resend error: ${err.message || resendRes.statusText}`;
      }
    } catch (e) {
      deliveryNote = e.message;
    }
  } else if (brevoApiKey) {
    try {
      const sender = process.env.BREVO_SENDER || 'syedwaleed.1990@outlook.com';
      const brevoRes = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': brevoApiKey.trim(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sender: { name: 'Syed Waleed Security', email: sender },
          to: [{ email: targetEmail, name: 'Syed Waleed' }],
          subject: `Your Admin Verification Code: ${otp}`,
          htmlContent: emailHtml
        })
      });
      if (brevoRes.ok) {
        delivered = true;
        deliveryNote = `Dispatched directly to ${targetEmail} via Brevo`;
      } else {
        const err = await brevoRes.json().catch(() => ({}));
        deliveryNote = `Brevo error: ${err.message || brevoRes.statusText}`;
      }
    } catch (e) {
      deliveryNote = e.message;
    }
  } else {
    deliveryNote = 'No email provider configured in Vercel environment variables.';
  }

  return res.status(200).json({
    success: true,
    email: targetEmail,
    challengeToken,
    delivered,
    smtpError: delivered ? null : deliveryNote,
    message: delivered ? `Verification code sent to ${targetEmail}` : deliveryNote
  });
}

