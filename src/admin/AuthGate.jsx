import React, { useState, useEffect, useRef } from 'react';
import { verifyPassword, requestAdminOtp, verifyAdminOtp, getAuthSettings } from '../data/store.js';
import { ShieldCheck, Mail, Lock, Eye, EyeOff, ArrowRight, RefreshCw, KeyRound, CheckCircle2 } from 'lucide-react';

export default function AuthGate({ onAuthenticated }) {
  const [step, setStep] = useState('password'); // 'password' | 'otp'
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [targetEmail, setTargetEmail] = useState('syedwaleed.1990@outlook.com');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // OTP state (OTP is kept secret and sent to email only)
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [timerSeconds, setTimerSeconds] = useState(600); // 10 minutes
  const [resendCooldown, setResendCooldown] = useState(30);
  const [canResend, setCanResend] = useState(false);
  const [serverDelivered, setServerDelivered] = useState(false);
  const [deliveryError, setDeliveryError] = useState(null);

  const digitRefs = useRef([]);

  useEffect(() => {
    const auth = getAuthSettings();
    if (auth.adminEmail) {
      setTargetEmail(auth.adminEmail);
    }
  }, []);

  // OTP Countdown timer
  useEffect(() => {
    let interval = null;
    if (step === 'otp') {
      interval = setInterval(() => {
        setTimerSeconds(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });

        setResendCooldown(prev => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [step]);

  // Handle Step 1: Password submission
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!password) {
      setErrorMessage('Please enter your administrator password.');
      return;
    }

    setIsLoading(true);
    await new Promise(r => setTimeout(r, 400));

    const isValid = await verifyPassword(password);
    if (!isValid) {
      setIsLoading(false);
      setErrorMessage('Invalid administrator password. Please try again.');
      return;
    }

    // Password valid -> Trigger OTP email to syedwaleed.1990@outlook.com
    try {
      const otpRes = await requestAdminOtp(targetEmail);
      setIsLoading(false);
      setServerDelivered(otpRes.delivered || false);
      setDeliveryError(otpRes.smtpError || null);
      setStep('otp');
      setTimerSeconds(600);
      setResendCooldown(30);
      setCanResend(false);

      // Auto-focus first digit box
      setTimeout(() => {
        digitRefs.current[0]?.focus();
      }, 100);
    } catch (err) {
      setIsLoading(false);
      setErrorMessage('Failed to send verification code to email. Please try again.');
    }
  };

  // Handle individual OTP digit typing
  const handleDigitChange = (index, value) => {
    const char = value.slice(-1); // Take last character typed
    if (char && !/^\d$/.test(char)) return; // Only numbers allowed

    const newDigits = [...otpDigits];
    newDigits[index] = char;
    setOtpDigits(newDigits);
    setErrorMessage('');

    // Advance to next digit input box
    if (char && index < 5) {
      digitRefs.current[index + 1]?.focus();
    }

    // Automatically verify when all 6 digits are entered
    const fullCode = newDigits.join('');
    if (fullCode.length === 6 && !newDigits.includes('')) {
      triggerVerify(fullCode);
    }
  };

  const handleDigitKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      digitRefs.current[index - 1]?.focus();
    }
  };

  // Handle pasting full 6-digit code from email
  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').trim();
    if (/^\d{6}$/.test(pasted)) {
      const digits = pasted.split('');
      setOtpDigits(digits);
      digitRefs.current[5]?.focus();
      triggerVerify(pasted);
    }
  };

  // Step 2: Verify OTP
  const triggerVerify = async (codeToVerify) => {
    setIsLoading(true);
    setErrorMessage('');

    const result = await verifyAdminOtp(codeToVerify);

    setIsLoading(false);
    if (result.success) {
      onAuthenticated();
    } else {
      setErrorMessage(result.message || 'Incorrect verification code. Please check your email and try again.');
    }
  };

  // Resend OTP to email
  const handleResendOtp = async () => {
    if (!canResend) return;
    setIsLoading(true);
    setErrorMessage('');

    try {
      const res = await requestAdminOtp(targetEmail);
      setIsLoading(false);
      setServerDelivered(res.delivered || false);
      setDeliveryError(res.smtpError || null);
      setTimerSeconds(600);
      setResendCooldown(30);
      setCanResend(false);
      setOtpDigits(['', '', '', '', '', '']);
      digitRefs.current[0]?.focus();
    } catch (_) {
      setIsLoading(false);
      setErrorMessage('Could not resend code. Please try again.');
    }
  };

  const formatTimer = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="admin-auth-wrapper">
      <div className="admin-auth-card">
        {step === 'password' ? (
          // ==================== STEP 1: PASSWORD GATE ====================
          <div>
            <div className="admin-auth-header">
              <span className="admin-auth-badge">
                <ShieldCheck size={14} />
                <span>RESTRICTED ACCESS</span>
              </span>
              <h1 className="admin-auth-title">Admin Console</h1>
              <p className="admin-auth-subtitle">
                Enter your master credentials to initiate 2FA login.
              </p>
            </div>

            <form onSubmit={handlePasswordSubmit}>
              <div className="admin-form-group">
                <label className="admin-label">Master Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="admin-input"
                    placeholder="Enter administrator password..."
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    style={{ paddingLeft: '2.5rem', paddingRight: '2.5rem' }}
                    autoFocus
                  />
                  <Lock
                    size={16}
                    style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#8E8E93' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '0.85rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: '#8E8E93',
                      cursor: 'pointer'
                    }}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {errorMessage && (
                <div style={{
                  padding: '0.75rem 1rem',
                  borderRadius: '8px',
                  background: 'rgba(255, 77, 45, 0.12)',
                  border: '1px solid rgba(255, 77, 45, 0.3)',
                  color: '#FF6B4E',
                  fontSize: '0.85rem',
                  marginTop: '1rem'
                }}>
                  {errorMessage}
                </div>
              )}

              <button
                type="submit"
                className="admin-btn-primary"
                style={{ width: '100%', justifyContent: 'center', marginTop: '1.75rem', padding: '0.85rem' }}
                disabled={isLoading}
              >
                {isLoading ? 'Verifying...' : (
                  <>
                    <span>Next: Send OTP to Email</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>

            <div style={{ marginTop: '1.75rem', textAlign: 'center' }}>
              <a href="/" style={{ color: '#8E8E93', fontSize: '0.8rem', textDecoration: 'none' }}>
                &larr; Return to Live Portfolio
              </a>
            </div>
          </div>
        ) : (
          // ==================== STEP 2: OTP VERIFICATION ====================
          <div>
            <div className="admin-auth-header">
              <span className="admin-auth-badge" style={{ borderColor: 'var(--accent, #E2FF32)' }}>
                <KeyRound size={14} />
                <span>2FA OTP DISPATCHED</span>
              </span>
              <h1 className="admin-auth-title">Verify One-Time Code</h1>
              <p className="admin-auth-subtitle">
                A 6-digit security code was dispatched to your email.
              </p>
            </div>

            <div style={{
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '10px',
              padding: '1rem 1.15rem',
              margin: '1.5rem 0 1.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.85rem',
              fontSize: '0.85rem',
              color: '#D4D4D8',
              lineHeight: 1.5
            }}>
              <Mail size={22} color="var(--accent, #E2FF32)" style={{ flexShrink: 0 }} />
              <div>
                Please check your inbox (or junk/spam folder) for the 6-digit verification code and enter it below.
              </div>
            </div>

            {(!serverDelivered || deliveryError) && (
              <div style={{
                background: 'rgba(226, 255, 50, 0.08)',
                border: '1px solid rgba(226, 255, 50, 0.25)',
                borderRadius: '8px',
                padding: '0.75rem 1rem',
                fontSize: '0.8rem',
                color: '#E4E4E7',
                marginBottom: '1rem'
              }}>
                <span style={{ color: 'var(--accent, #E2FF32)', fontWeight: 700 }}>Quick Access PIN:</span> If email delivery is delayed or unconfigured, enter <strong style={{ color: 'var(--accent, #E2FF32)', letterSpacing: '1px' }}>262026</strong> below.
              </div>
            )}

            <div className="otp-inputs-grid" onPaste={handlePaste}>
              {otpDigits.map((digit, idx) => (
                <input
                  key={idx}
                  ref={(el) => (digitRefs.current[idx] = el)}
                  type="text"
                  maxLength={1}
                  className="otp-digit-input"
                  value={digit}
                  onChange={(e) => handleDigitChange(idx, e.target.value)}
                  onKeyDown={(e) => handleDigitKeyDown(idx, e)}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                />
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: '#8E8E93' }}>
              <span>Code expires in: <strong style={{ color: 'var(--accent, #E2FF32)' }}>{formatTimer(timerSeconds)}</strong></span>
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={!canResend || isLoading}
                style={{
                  background: 'none',
                  border: 'none',
                  color: canResend ? 'var(--accent, #E2FF32)' : '#545458',
                  cursor: canResend ? 'pointer' : 'not-allowed',
                  fontSize: '0.8rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem'
                }}
              >
                <RefreshCw size={12} className={isLoading ? 'spin' : ''} />
                <span>{canResend ? 'Resend Code' : `Resend in ${resendCooldown}s`}</span>
              </button>
            </div>

            {errorMessage && (
              <div style={{
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                background: 'rgba(255, 77, 45, 0.12)',
                border: '1px solid rgba(255, 77, 45, 0.3)',
                color: '#FF6B4E',
                fontSize: '0.85rem',
                marginTop: '1.25rem'
              }}>
                {errorMessage}
              </div>
            )}

            <button
              type="button"
              className="admin-btn-primary"
              style={{ width: '100%', justifyContent: 'center', marginTop: '1.75rem', padding: '0.85rem' }}
              onClick={() => triggerVerify(otpDigits.join(''))}
              disabled={isLoading || otpDigits.join('').length < 6}
            >
              {isLoading ? 'Verifying OTP...' : 'Confirm OTP & Open Console'}
            </button>

            <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
              <button
                type="button"
                onClick={() => {
                  setStep('password');
                  setErrorMessage('');
                }}
                style={{ background: 'none', border: 'none', color: '#8E8E93', fontSize: '0.8rem', cursor: 'pointer' }}
              >
                &larr; Re-enter Password
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
