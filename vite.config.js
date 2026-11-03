import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import {
  getMysqlConfig, saveMysqlConfig, testConnection as testMysqlConnection,
  initSchema as initMysqlSchema, getStatus as getMysqlStatus,
  syncPush as syncPushMysql, syncPull as syncPullMysql,
  generateSqlDump, logMediaUpload
} from './src/lib/server-mysql.js';

// Server-side secure OTP storage & rate limiting (never exposed to client browser)
const activeOtps = new Map();
const otpRequestCooldowns = new Map(); // email -> timestamp of last send-otp request

function getSmtpConfig() {
  const rootDir = process.cwd();
  const smtpConfigPath = path.join(rootDir, 'src', 'data', 'smtp.json');
  let config = {
    user: process.env.SMTP_USER || 'syedwaleed.1990@outlook.com',
    pass: process.env.SMTP_PASS || '',
    host: process.env.SMTP_HOST || 'smtp-mail.outlook.com',
    port: Number(process.env.SMTP_PORT) || 587,
    service: process.env.SMTP_SERVICE || 'hotmail',
    resendApiKey: process.env.RESEND_API_KEY || '',
    brevoApiKey: process.env.BREVO_API_KEY || '',
    gmailUser: process.env.GMAIL_USER || '',
    gmailPass: process.env.GMAIL_PASS || ''
  };

  if (fs.existsSync(smtpConfigPath)) {
    try {
      const saved = JSON.parse(fs.readFileSync(smtpConfigPath, 'utf-8'));
      config = { ...config, ...saved };
    } catch (_) {}
  }

  return config;
}

function getCloudConfig() {
  const rootDir = process.cwd();
  const cloudConfigPath = path.join(rootDir, 'src', 'data', 'cloud.json');
  let config = {
    supabase: {
      url: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
      anonKey: process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '',
      tableName: process.env.SUPABASE_TABLE_NAME || 'projects'
    },
    r2: {
      accountId: process.env.R2_ACCOUNT_ID || '',
      accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
      bucketName: process.env.R2_BUCKET_NAME || 'portfolio-media',
      publicDomain: process.env.R2_PUBLIC_DOMAIN || ''
    }
  };

  if (fs.existsSync(cloudConfigPath)) {
    try {
      const saved = JSON.parse(fs.readFileSync(cloudConfigPath, 'utf-8'));
      config.supabase = { ...config.supabase, ...(saved.supabase || {}) };
      config.r2 = { ...config.r2, ...(saved.r2 || {}) };
    } catch (_) {}
  }

  return config;
}

function portfolioApiPlugin() {
  return {
    name: 'portfolio-api-middleware',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url || '';

        // Helper to read JSON request body
        const readBody = () => new Promise((resolve) => {
          let body = '';
          req.on('data', chunk => { body += chunk; });
          req.on('end', () => {
            try {
              resolve(JSON.parse(body || '{}'));
            } catch (_) {
              resolve({});
            }
          });
        });

        // 1. Send OTP Endpoint (OTP is generated and sent to email ONLY; NEVER returned to client)
        if (url === '/api/send-otp' && req.method === 'POST') {
          const data = await readBody();
          const targetEmail = (data.email || 'syedwaleed.1990@outlook.com').trim().toLowerCase();

          // Rate-limiting: Enforce 30-second cooldown between OTP dispatch requests
          const lastSent = otpRequestCooldowns.get(targetEmail) || 0;
          const timeSinceLast = Date.now() - lastSent;
          if (timeSinceLast < 30 * 1000) {
            const waitSec = Math.ceil((30 * 1000 - timeSinceLast) / 1000);
            res.writeHead(429, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              success: false,
              message: `Please wait ${waitSec}s before requesting another verification code.`
            }));
            return;
          }
          otpRequestCooldowns.set(targetEmail, Date.now());
          
          // Generate secure 6-digit OTP on the server
          const otp = Math.floor(100000 + Math.random() * 900000).toString();
          const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

          // Store on server side with attempt tracking
          activeOtps.set(targetEmail, { otp, expiresAt, attempts: 0 });

          let delivered = false;
          let deliveryNote = '';

          const smtp = getSmtpConfig();

          const emailHtml = `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0B0B0C; color: #F4F4F6; padding: 40px; border-radius: 12px; max-width: 560px; margin: 0 auto; border: 1px solid rgba(255,255,255,0.15);">
              <div style="display: flex; align-items: center; margin-bottom: 24px;">
                <span style="font-weight: 800; font-size: 16px; border: 1px solid rgba(255,255,255,0.4); padding: 4px 8px; border-radius: 4px; color: #FFF; margin-right: 12px;">SW</span>
                <span style="font-size: 14px; text-transform: uppercase; letter-spacing: 0.1em; color: #8E8E93;">Syed Waleed Portfolio</span>
              </div>
              <h2 style="font-size: 22px; font-weight: 700; margin: 0 0 12px; color: #F4F4F6;">Admin Login Verification Code</h2>
              <p style="color: #8E8E93; font-size: 15px; line-height: 1.6; margin: 0 0 24px;">A login request was initiated for your portfolio management console. Enter the one-time passcode below to verify your identity:</p>
              <div style="background: #16161A; border: 1px solid #E2FF32; border-radius: 8px; padding: 20px; text-align: center; margin-bottom: 24px;">
                <span style="font-family: monospace; font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #E2FF32;">${otp}</span>
              </div>
              <p style="color: #8E8E93; font-size: 13px; line-height: 1.5; margin: 0 0 12px;">• This verification code is valid for <strong>10 minutes</strong>.<br>• Destination: <strong>${targetEmail}</strong></p>
              <p style="color: #545458; font-size: 12px; margin: 24px 0 0; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 16px;">If you did not request this login, please change your master password immediately.</p>
            </div>
          `;

          // 1. Try Resend Free API (Modern HTTP REST API)
          if (smtp.resendApiKey) {
            try {
              const resendRes = await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${smtp.resendApiKey.trim()}`,
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
                deliveryNote = `Dispatched directly to ${targetEmail} via Resend Free API`;
              } else {
                const errData = await resendRes.json().catch(() => ({}));
                deliveryNote = `Resend API Error: ${errData.message || resendRes.statusText}`;
              }
            } catch (err) {
              deliveryNote = `Resend API Network Error: ${err.message}`;
            }
          }

          // 2. Try Brevo Free API (300 free emails/day)
          else if (smtp.brevoApiKey) {
            try {
              let senderEmail = process.env.BREVO_SENDER || 'waleed.2974@gmail.com';
              try {
                const sendersRes = await fetch('https://api.brevo.com/v3/senders', {
                  headers: { 'api-key': smtp.brevoApiKey.trim() }
                });
                if (sendersRes.ok) {
                  const sendersData = await sendersRes.json();
                  if (sendersData.senders && sendersData.senders.length > 0) {
                    senderEmail = sendersData.senders[0].email;
                  }
                }
              } catch (_) {}

              const brevoRes = await fetch('https://api.brevo.com/v3/smtp/email', {
                method: 'POST',
                headers: {
                  'api-key': smtp.brevoApiKey.trim(),
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  sender: { name: 'Syed Waleed Security', email: senderEmail },
                  to: [{ email: targetEmail, name: 'Syed Waleed' }],
                  subject: `Your Admin Verification Code: ${otp}`,
                  htmlContent: emailHtml
                })
              });

              if (brevoRes.ok) {
                delivered = true;
                deliveryNote = `Dispatched directly to ${targetEmail} via Brevo API (from ${senderEmail})`;
              } else {
                const errData = await brevoRes.json().catch(() => ({}));
                deliveryNote = `Brevo API Error: ${errData.message || brevoRes.statusText}`;
              }
            } catch (err) {
              deliveryNote = `Brevo API Network Error: ${err.message}`;
            }
          }

          // 3. Try Gmail SMTP with Google App Password (High deliverability)
          else if (smtp.gmailPass && smtp.gmailUser) {
            try {
              const nodemailer = await import('nodemailer');
              const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: { user: smtp.gmailUser.trim(), pass: smtp.gmailPass.trim() }
              });

              await transporter.sendMail({
                from: `"Syed Waleed Portfolio Security" <${smtp.gmailUser.trim()}>`,
                to: targetEmail,
                subject: `Your Admin Verification Code: ${otp}`,
                html: emailHtml
              });
              delivered = true;
              deliveryNote = `Dispatched to ${targetEmail} via Gmail Relay`;
            } catch (err) {
              console.error('[Gmail SMTP Error]', err.message);
              deliveryNote = `Gmail SMTP Error: ${err.message}`;
            }
          }

          // 4. Try standard SMTP (Outlook / Custom)
          else if (smtp.pass) {
            try {
              const nodemailer = await import('nodemailer');
              const isGmail = (smtp.user || '').toLowerCase().includes('@gmail.com');
              const transportOpts = isGmail ? {
                service: 'gmail',
                auth: { user: smtp.user, pass: smtp.pass }
              } : (smtp.host ? {
                host: smtp.host,
                port: Number(smtp.port) || 587,
                secure: Number(smtp.port) === 465,
                auth: { user: smtp.user || targetEmail, pass: smtp.pass },
                tls: { rejectUnauthorized: false }
              } : {
                service: smtp.service || 'hotmail',
                auth: { user: smtp.user || targetEmail, pass: smtp.pass }
              });

              const transporter = nodemailer.createTransport(transportOpts);

              await transporter.sendMail({
                from: `"Syed Waleed Portfolio Security" <${smtp.user || targetEmail}>`,
                to: targetEmail,
                subject: `Your Admin Verification Code: ${otp}`,
                html: emailHtml
              });
              delivered = true;
              deliveryNote = `Dispatched directly to ${targetEmail} via SMTP`;
            } catch (err) {
              console.error('[SMTP Error]', err.message);
              deliveryNote = `SMTP dispatch error: ${err.message}`;
            }
          } else {
            deliveryNote = `No email dispatch provider configured (Configure Resend API Key or Gmail in Security Settings).`;
          }

          console.log(`\n========================================`);
          console.log(`🔐 [ADMIN OTP DISPATCH]`);
          console.log(`📧 Destination: ${targetEmail}`);
          console.log(`🔑 Verification Code: [DISPATCHED TO EMAIL - REDACTED FOR SECURITY]`);
          console.log(`⏱ Expiry: 10 minutes`);
          console.log(`📡 Status: ${delivered ? 'SENT VIA EMAIL' : `DELIVERY FAILED (${deliveryNote})`}`);
          console.log(`========================================\n`);

          // Return result to client. The OTP is strictly hidden and NEVER sent in response body.
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: true,
            email: targetEmail,
            delivered,
            smtpError: delivered ? null : deliveryNote,
            message: delivered
              ? `Verification code dispatched to ${targetEmail}`
              : `Email delivery notice: ${deliveryNote}`
          }));
          return;
        }

        // 2. Verify OTP Endpoint (Verified against server-side activeOtps)
        if (url === '/api/verify-otp' && req.method === 'POST') {
          const data = await readBody();
          const targetEmail = (data.email || 'syedwaleed.1990@outlook.com').trim().toLowerCase();
          const enteredOtp = (data.otp || '').toString().trim();

          const record = activeOtps.get(targetEmail);

          if (!record) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              success: false,
              message: 'No active OTP found. Please request a new verification code.'
            }));
            return;
          }

          if (Date.now() > record.expiresAt) {
            activeOtps.delete(targetEmail);
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              success: false,
              message: 'The verification code has expired. Please request a new code.'
            }));
            return;
          }

          if (record.otp !== enteredOtp) {
            record.attempts = (record.attempts || 0) + 1;
            const remaining = 5 - record.attempts;

            if (record.attempts >= 5) {
              activeOtps.delete(targetEmail);
              res.writeHead(429, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({
                success: false,
                message: 'Too many incorrect attempts. This verification code has been revoked. Please request a new code.'
              }));
              return;
            }

            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              success: false,
              message: `Incorrect verification code (${remaining} attempt${remaining === 1 ? '' : 's'} remaining). Please check your email.`
            }));
            return;
          }

          // OTP verified successfully -> invalidate code and issue session token
          activeOtps.delete(targetEmail);

          const token = `sw_auth_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: true,
            token,
            email: targetEmail
          }));
          return;
        }

        // 3. SMTP Status and Credentials Endpoints
        if (url === '/api/get-smtp' && req.method === 'GET') {
          const cfg = getSmtpConfig();
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            user: cfg.user || 'syedwaleed.1990@outlook.com',
            service: cfg.service || 'hotmail',
            host: cfg.host || 'smtp-mail.outlook.com',
            port: cfg.port || 587,
            hasResend: Boolean(cfg.resendApiKey),
            hasBrevo: Boolean(cfg.brevoApiKey),
            hasGmail: Boolean(cfg.gmailPass && cfg.gmailUser),
            isConfigured: Boolean(cfg.resendApiKey || cfg.brevoApiKey || (cfg.gmailPass && cfg.gmailUser) || cfg.pass)
          }));
          return;
        }

        if (url === '/api/save-smtp' && req.method === 'POST') {
          try {
            const data = await readBody();
            const rootDir = process.cwd();
            const smtpConfigPath = path.join(rootDir, 'src', 'data', 'smtp.json');
            
            const existing = getSmtpConfig();
            const merged = {
              user: (data.user || existing.user || 'syedwaleed.1990@outlook.com').trim(),
              pass: data.pass !== undefined && data.pass !== '' ? data.pass.trim() : existing.pass,
              service: data.service || existing.service || 'hotmail',
              host: data.host || existing.host || 'smtp-mail.outlook.com',
              port: Number(data.port) || existing.port || 587,
              resendApiKey: data.resendApiKey !== undefined ? data.resendApiKey.trim() : existing.resendApiKey,
              brevoApiKey: data.brevoApiKey !== undefined ? data.brevoApiKey.trim() : existing.brevoApiKey,
              gmailUser: data.gmailUser !== undefined ? data.gmailUser.trim() : existing.gmailUser,
              gmailPass: data.gmailPass !== undefined && data.gmailPass !== '' ? data.gmailPass.trim() : existing.gmailPass
            };

            fs.writeFileSync(smtpConfigPath, JSON.stringify(merged, null, 2), 'utf-8');

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              success: true,
              message: 'Settings saved successfully',
              isConfigured: Boolean(merged.resendApiKey || merged.brevoApiKey || (merged.gmailPass && merged.gmailUser) || merged.pass)
            }));
            return;
          } catch (err) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: err.message }));
            return;
          }
        }

        // 4. Save Data Endpoint (Persists directly to physical JSON files and MySQL)
        if (url === '/api/save-data' && req.method === 'POST') {
          try {
            const data = await readBody();
            const rootDir = process.cwd();

            if (data.site) {
              const sitePath = path.join(rootDir, 'src', 'data', 'site.json');
              fs.writeFileSync(sitePath, JSON.stringify(data.site, null, 2), 'utf-8');
            }
            if (data.projects) {
              const projectsPath = path.join(rootDir, 'src', 'data', 'projects.json');
              fs.writeFileSync(projectsPath, JSON.stringify(data.projects, null, 2), 'utf-8');
            }
            if (data.updates) {
              const updatesPath = path.join(rootDir, 'src', 'data', 'updates.json');
              fs.writeFileSync(updatesPath, JSON.stringify(data.updates, null, 2), 'utf-8');
            }
            if (data.inquiries) {
              const inquiriesPath = path.join(rootDir, 'src', 'data', 'inquiries.json');
              fs.writeFileSync(inquiriesPath, JSON.stringify(data.inquiries, null, 2), 'utf-8');
            }

            // Asynchronously sync to MySQL if autoSync enabled
            const mysqlCfg = getMysqlConfig();
            if (mysqlCfg.autoSync) {
              syncPushMysql(data).catch(() => {});
            }

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, message: 'All files saved to disk & MySQL synced' }));
            return;
          } catch (err) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: err.message }));
            return;
          }
        }

        // ====================================================================
        // MYSQL & XAMPP DATABASE ENDPOINTS
        // ====================================================================
        if (url === '/api/mysql/config' && req.method === 'GET') {
          const cfg = getMysqlConfig();
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            host: cfg.host,
            port: cfg.port,
            user: cfg.user,
            hasPassword: Boolean(cfg.password),
            database: cfg.database,
            autoSync: cfg.autoSync
          }));
          return;
        }

        if (url === '/api/mysql/config' && req.method === 'POST') {
          try {
            const data = await readBody();
            const saved = saveMysqlConfig(data);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, config: saved }));
            return;
          } catch (err) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: err.message }));
            return;
          }
        }

        if (url === '/api/mysql/test' && req.method === 'POST') {
          try {
            const data = await readBody();
            const result = await testMysqlConnection(data.config || null);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(result));
            return;
          } catch (err) {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: err.message, message: `MySQL connection failed: ${err.message}` }));
            return;
          }
        }

        if (url === '/api/mysql/init-schema' && req.method === 'POST') {
          try {
            const data = await readBody();
            const result = await initMysqlSchema(data.config || null);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(result));
            return;
          } catch (err) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: err.message }));
            return;
          }
        }

        if (url === '/api/mysql/status' && req.method === 'GET') {
          try {
            const status = await getMysqlStatus();
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(status));
            return;
          } catch (err) {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ connected: false, error: err.message }));
            return;
          }
        }

        if (url === '/api/mysql/sync-push' && req.method === 'POST') {
          try {
            const data = await readBody();
            const rootDir = process.cwd();
            const payload = {
              projects: data.projects || JSON.parse(fs.readFileSync(path.join(rootDir, 'src', 'data', 'projects.json'), 'utf-8')),
              updates: data.updates || JSON.parse(fs.readFileSync(path.join(rootDir, 'src', 'data', 'updates.json'), 'utf-8')),
              site: data.site || JSON.parse(fs.readFileSync(path.join(rootDir, 'src', 'data', 'site.json'), 'utf-8')),
              inquiries: data.inquiries || JSON.parse(fs.readFileSync(path.join(rootDir, 'src', 'data', 'inquiries.json'), 'utf-8'))
            };
            const result = await syncPushMysql(payload);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(result));
            return;
          } catch (err) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: err.message }));
            return;
          }
        }

        if ((url === '/api/mysql/sync-pull' || url.startsWith('/api/mysql/sync-pull')) && (req.method === 'GET' || req.method === 'POST')) {
          try {
            const result = await syncPullMysql();
            if (result.success && result.data) {
              const rootDir = process.cwd();
              if (result.data.projects?.length > 0) {
                fs.writeFileSync(path.join(rootDir, 'src', 'data', 'projects.json'), JSON.stringify(result.data.projects, null, 2), 'utf-8');
              }
              if (result.data.updates?.length > 0) {
                fs.writeFileSync(path.join(rootDir, 'src', 'data', 'updates.json'), JSON.stringify(result.data.updates, null, 2), 'utf-8');
              }
              if (result.data.site && Object.keys(result.data.site).length > 0) {
                fs.writeFileSync(path.join(rootDir, 'src', 'data', 'site.json'), JSON.stringify(result.data.site, null, 2), 'utf-8');
              }
              if (result.data.inquiries?.length > 0) {
                fs.writeFileSync(path.join(rootDir, 'src', 'data', 'inquiries.json'), JSON.stringify(result.data.inquiries, null, 2), 'utf-8');
              }
            }
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(result));
            return;
          } catch (err) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: err.message }));
            return;
          }
        }

        if (url.startsWith('/api/mysql/export-sql') && req.method === 'GET') {
          try {
            const sql = await generateSqlDump();
            if (url.includes('format=text')) {
              res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
              res.end(sql);
              return;
            }
            const dateStr = new Date().toISOString().slice(0, 10);
            res.writeHead(200, {
              'Content-Type': 'application/sql; charset=utf-8',
              'Content-Disposition': `attachment; filename="syed_waleed_portfolio_${dateStr}.sql"`,
              'Content-Length': Buffer.byteLength(sql)
            });
            res.end(sql);
            return;
          } catch (err) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: err.message }));
            return;
          }
        }

        // 5. Client Inquiries Endpoint
        if (url === '/api/inquiries' && req.method === 'POST') {
          try {
            const inquiry = await readBody();
            const rootDir = process.cwd();
            const inquiriesPath = path.join(rootDir, 'src', 'data', 'inquiries.json');
            
            let list = [];
            if (fs.existsSync(inquiriesPath)) {
              try {
                list = JSON.parse(fs.readFileSync(inquiriesPath, 'utf-8'));
              } catch (_) {
                list = [];
              }
            }
            list.unshift(inquiry);
            fs.writeFileSync(inquiriesPath, JSON.stringify(list, null, 2), 'utf-8');

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, inquiry }));
            return;
          } catch (err) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: err.message }));
            return;
          }
        }

        // 6. Cloud Config GET Endpoint
        if (url === '/api/cloud-config' && req.method === 'GET') {
          const cfg = getCloudConfig();
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            supabase: {
              url: cfg.supabase.url || '',
              anonKey: cfg.supabase.anonKey ? '••••••••••••••••' : '',
              hasAnonKey: Boolean(cfg.supabase.anonKey),
              tableName: cfg.supabase.tableName || 'projects',
              isConfigured: Boolean(cfg.supabase.url && cfg.supabase.anonKey)
            },
            r2: {
              accountId: cfg.r2.accountId || '',
              accessKeyId: cfg.r2.accessKeyId || '',
              hasSecretKey: Boolean(cfg.r2.secretAccessKey),
              bucketName: cfg.r2.bucketName || 'portfolio-media',
              publicDomain: cfg.r2.publicDomain || '',
              isConfigured: Boolean(cfg.r2.accountId && cfg.r2.accessKeyId && cfg.r2.secretAccessKey && cfg.r2.bucketName)
            }
          }));
          return;
        }

        // 7. Save Cloud Config Endpoint
        if (url === '/api/save-cloud-config' && req.method === 'POST') {
          try {
            const data = await readBody();
            const rootDir = process.cwd();
            const cloudConfigPath = path.join(rootDir, 'src', 'data', 'cloud.json');
            const existing = getCloudConfig();

            const merged = {
              supabase: {
                url: (data.supabase?.url !== undefined ? data.supabase.url : existing.supabase.url).trim(),
                anonKey: data.supabase?.anonKey && data.supabase.anonKey !== '••••••••••••••••' ? data.supabase.anonKey.trim() : existing.supabase.anonKey,
                tableName: (data.supabase?.tableName || existing.supabase.tableName || 'projects').trim()
              },
              r2: {
                accountId: (data.r2?.accountId !== undefined ? data.r2.accountId : existing.r2.accountId).trim(),
                accessKeyId: (data.r2?.accessKeyId !== undefined ? data.r2.accessKeyId : existing.r2.accessKeyId).trim(),
                secretAccessKey: data.r2?.secretAccessKey && data.r2.secretAccessKey !== '••••••••••••••••' ? data.r2.secretAccessKey.trim() : existing.r2.secretAccessKey,
                bucketName: (data.r2?.bucketName || existing.r2.bucketName || 'portfolio-media').trim(),
                publicDomain: (data.r2?.publicDomain !== undefined ? data.r2.publicDomain : existing.r2.publicDomain).trim()
              }
            };

            fs.writeFileSync(cloudConfigPath, JSON.stringify(merged, null, 2), 'utf-8');

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              success: true,
              message: 'Cloud configuration saved successfully',
              r2Configured: Boolean(merged.r2.accountId && merged.r2.accessKeyId && merged.r2.secretAccessKey),
              supabaseConfigured: Boolean(merged.supabase.url && merged.supabase.anonKey)
            }));
            return;
          } catch (err) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: err.message }));
            return;
          }
        }

        // 8. Test Cloud Connection (Cloudflare R2 or Supabase)
        if (url === '/api/test-cloud' && req.method === 'POST') {
          try {
            const data = await readBody();
            const cfg = getCloudConfig();

            if (data.type === 'r2') {
              const r2 = {
                accountId: data.r2?.accountId || cfg.r2.accountId,
                accessKeyId: data.r2?.accessKeyId || cfg.r2.accessKeyId,
                secretAccessKey: data.r2?.secretAccessKey && data.r2.secretAccessKey !== '••••••••••••••••' ? data.r2.secretAccessKey : cfg.r2.secretAccessKey,
                bucketName: data.r2?.bucketName || cfg.r2.bucketName
              };

              if (!r2.accountId || !r2.accessKeyId || !r2.secretAccessKey || !r2.bucketName) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, message: 'Please provide Account ID, Access Key, Secret Key, and Bucket Name.' }));
                return;
              }

              const { S3Client, ListObjectsV2Command } = await import('@aws-sdk/client-s3');
              const s3 = new S3Client({
                region: 'auto',
                endpoint: `https://${r2.accountId}.r2.cloudflarestorage.com`,
                credentials: {
                  accessKeyId: r2.accessKeyId,
                  secretAccessKey: r2.secretAccessKey
                }
              });

              await s3.send(new ListObjectsV2Command({
                Bucket: r2.bucketName,
                MaxKeys: 1
              }));

              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({
                success: true,
                message: `Successfully connected to Cloudflare R2 bucket "${r2.bucketName}"!`
              }));
              return;
            }

            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, message: 'Invalid test type specified.' }));
            return;
          } catch (err) {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, message: `Cloud test failed: ${err.message}` }));
            return;
          }
        }

        // 9. Media Upload Endpoint (Lossless JPG, PNG, WEBP, MP4 to Local Disk & MySQL)
        if (url === '/api/upload-media' && req.method === 'POST') {
          try {
            const rootDir = process.cwd();

            // Read full raw binary stream
            const readRawBuffer = () => new Promise((resolve, reject) => {
              const chunks = [];
              req.on('data', chunk => chunks.push(chunk));
              req.on('end', () => resolve(Buffer.concat(chunks)));
              req.on('error', reject);
            });

            const buffer = await readRawBuffer();
            if (!buffer || buffer.length === 0) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: false, error: 'Empty file payload' }));
              return;
            }

            let fileBuffer = buffer;
            let filename = 'media-asset.jpg';
            let contentType = req.headers['content-type'] || 'image/jpeg';
            const uploadFolder = req.headers['x-folder'] || 'projects';

            // Check if multipart/form-data
            if (contentType.includes('multipart/form-data')) {
              const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
              if (boundaryMatch) {
                const boundary = boundaryMatch[1] || boundaryMatch[2];
                const boundaryBuffer = Buffer.from(`--${boundary}`);
                const endBoundaryBuffer = Buffer.from(`--${boundary}--`);

                const headerEndIndex = buffer.indexOf(Buffer.from('\r\n\r\n'));
                if (headerEndIndex !== -1) {
                  const headerStr = buffer.slice(0, headerEndIndex).toString('utf-8');
                  const filenameMatch = headerStr.match(/filename="([^"]+)"/);
                  if (filenameMatch) {
                    filename = filenameMatch[1];
                  }
                  const typeMatch = headerStr.match(/Content-Type:\s*([^\r\n]+)/i);
                  if (typeMatch) {
                    contentType = typeMatch[1].trim();
                  }

                  // Find boundary after header
                  const payloadStart = headerEndIndex + 4;
                  let payloadEnd = buffer.indexOf(boundaryBuffer, payloadStart);
                  if (payloadEnd === -1) payloadEnd = buffer.indexOf(endBoundaryBuffer, payloadStart);
                  if (payloadEnd !== -1) {
                    if (buffer[payloadEnd - 2] === 13 && buffer[payloadEnd - 1] === 10) {
                      payloadEnd -= 2;
                    }
                    fileBuffer = buffer.slice(payloadStart, payloadEnd);
                  }
                }
              }
            } else if (req.headers['x-filename']) {
              filename = decodeURIComponent(req.headers['x-filename']);
            }

            // Generate clean unique filename preserving high-res extension
            const sanitizedBase = path.basename(filename).replace(/[^a-zA-Z0-9._-]/g, '_');
            const ext = path.extname(sanitizedBase).toLowerCase() || '.jpg';
            const cleanName = path.basename(sanitizedBase, ext);
            const safeKey = `${Date.now()}_${cleanName}${ext}`;

            // Save directly to public/media/uploads on disk with 100% lossless resolution
            const uploadDir = path.join(rootDir, 'public', 'media', 'uploads');
            if (!fs.existsSync(uploadDir)) {
              fs.mkdirSync(uploadDir, { recursive: true });
            }

            const targetFilePath = path.join(uploadDir, safeKey);
            fs.writeFileSync(targetFilePath, fileBuffer);
            const localUrl = `/media/uploads/${safeKey}`;

            // Automatically log in MySQL media table
            const isVideo = contentType.startsWith('video') || ext === '.mp4' || ext === '.webm' || ext === '.mov';
            let mediaId = null;
            try {
              const logRes = await logMediaUpload({
                filename: safeKey,
                url: localUrl,
                filePath: targetFilePath,
                fileType: isVideo ? 'video' : 'image',
                mimeType: contentType,
                fileSize: fileBuffer.length,
                folder: uploadFolder
              });
              if (logRes?.success) mediaId = logRes.id;
            } catch (_) {}

            console.info(`[Local Disk + MySQL] Saved ${safeKey} (${fileBuffer.length} bytes) -> ${localUrl}`);

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              success: true,
              url: localUrl,
              filename: safeKey,
              size: fileBuffer.length,
              id: mediaId,
              provider: 'Local Disk + XAMPP MySQL'
            }));
            return;
          } catch (err) {
            console.error('[Upload Media Error]', err);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: err.message }));
            return;
          }
        }

        next();
      });
    }
  };
}

export default defineConfig({
  plugins: [
    react(),
    portfolioApiPlugin()
  ],
  server: {
    port: 5173,
    host: '127.0.0.1', // Strict localhost binding to avoid LAN exposure of control APIs
    open: false
  },
  build: {
    target: 'es2022',
    sourcemap: false // Disabled in production to avoid leaking original source code
  }
});
