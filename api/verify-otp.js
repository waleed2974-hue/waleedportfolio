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
  const { email, otp, challengeToken } = body;
  const targetEmail = (email || 'syedwaleed.1990@outlook.com').trim().toLowerCase();
  const enteredOtp = (otp || '').toString().trim();

  if (!challengeToken || !challengeToken.includes('.')) {
    return res.status(400).json({
      success: false,
      message: 'Invalid verification session. Please request a new code.'
    });
  }

  const [sig, timestampStr] = challengeToken.split('.');
  const timestamp = parseInt(timestampStr, 10);

  if (isNaN(timestamp) || Date.now() - timestamp > 10 * 60 * 1000) {
    return res.status(400).json({
      success: false,
      message: 'Verification code has expired (valid for 10 minutes). Please request a new code.'
    });
  }

  const expectedSig = signChallenge(targetEmail, enteredOtp, timestamp);

  try {
    const isMatch = crypto.timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(expectedSig, 'hex'));
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Incorrect verification code. Please check your email and try again.'
      });
    }
  } catch (_) {
    return res.status(400).json({
      success: false,
      message: 'Verification failed. Please check your code.'
    });
  }

  const token = `sw_auth_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;

  return res.status(200).json({
    success: true,
    token,
    email: targetEmail
  });
}

