import nodemailer from 'nodemailer';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { AppError } from '../utils/errors';

logger.info(`[EmailService] Initializing Email Service...`);
logger.info(`[EmailService] EMAIL_FROM: ${process.env.EMAIL_FROM || env.EMAIL_FROM}`);

// ─── SMTP transport (Brevo SMTP — no IP restrictions) ─────────────────────────
// Brevo SMTP does NOT block dynamic IPs (unlike the HTTP API which requires IP
// whitelisting). This is the correct approach for dynamic hosting like Render.
// SMTP credentials: Login = your Brevo account email, Password = SMTP key from
// https://app.brevo.com/settings/keys/smtp
function createSmtpTransport() {
  const smtpUser = process.env.BREVO_SMTP_USER || env.BREVO_SMTP_USER;
  const smtpPass = process.env.BREVO_SMTP_PASS || env.BREVO_SMTP_PASS;

  if (!smtpUser || !smtpPass) return null;

  return nodemailer.createTransport({
    host: 'smtp-relay.brevo.com',
    port: 587,
    secure: false, // STARTTLS
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });
}

/**
 * Generates the branded WORLDr HTML email template for OTP verification.
 */
function buildVerificationEmail(displayName: string, otp: string): { html: string; text: string } {
  const otpFormatted = `${otp.slice(0, 3)} ${otp.slice(3)}`;
  const frontendVerifyUrl = `${env.FRONTEND_URL.replace(/\/$/, '')}/verify`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Your WORLDr Verification Code</title>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800&family=JetBrains+Mono:wght@700&display=swap" rel="stylesheet" />
</head>
<body style="margin:0;padding:0;background-color:#050508;font-family:'Outfit','Segoe UI',system-ui,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#050508; min-height:100vh;">
    <tr>
      <td align="center" style="padding:60px 16px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">

          <!-- Logo / Brand header -->
          <tr>
            <td align="center" style="padding-bottom:32px;">
              <span style="font-size:24px;font-weight:800;color:#fafafa;letter-spacing:-0.5px;font-family:'Outfit',sans-serif;">WORLD<span style="color:#f59e0b;">r</span></span>
              <p style="margin:10px 0 0;font-size:10px;color:#71717a;font-family:'JetBrains Mono',monospace;letter-spacing:0.3em;text-transform:uppercase;">Secure Gateway</p>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background-color:rgba(17, 17, 19, 0.90); border:1px solid rgba(245,158,11,0.25); border-radius:16px; overflow:hidden; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6);">
              <!-- Top glowing line -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="height:3px;background:linear-gradient(90deg,transparent 0%,#f59e0b 50%,transparent 100%);"></td>
                </tr>
              </table>

              <!-- Content -->
              <table width="100%" cellpadding="0" cellspacing="0" style="padding:44px 40px 40px;">
                <tr>
                  <td>
                    <table cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                      <tr>
                        <td style="background-color:rgba(245,158,11,0.06);border:1px solid rgba(245,158,11,0.3);border-radius:4px;padding:5px 12px;">
                          <span style="font-size:9px;color:#f59e0b;font-family:'JetBrains Mono',monospace;letter-spacing:0.25em;text-transform:uppercase;font-weight:700;">&#9679; Secure Registration</span>
                        </td>
                      </tr>
                    </table>

                    <h1 style="margin:0 0 10px;font-size:26px;font-weight:700;color:#fafafa;letter-spacing:-0.5px;font-family:'Outfit',sans-serif;line-height:1.2;">
                      Verify your identity
                    </h1>
                    <p style="margin:0 0 28px;font-size:15px;color:#a1a1aa;line-height:1.6;font-family:'Outfit',sans-serif;">
                      Welcome, <strong style="color:#ffffff;">${displayName}</strong>. Enter the code below to activate your account and verify your identity.
                    </p>

                    <!-- OTP Block -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                      <tr>
                        <td align="center" style="background-color:#070709;border:1px solid rgba(245,158,11,0.2);border-radius:12px;padding:36px 24px;">
                          <p style="margin:0 0 10px;font-size:10px;color:#71717a;font-family:'JetBrains Mono',monospace;letter-spacing:0.3em;text-transform:uppercase;">Your verification code</p>
                          <p style="margin:0;font-size:52px;font-weight:800;color:#f59e0b;letter-spacing:10px;font-family:'JetBrains Mono',monospace;line-height:1;padding-left:10px;">
                            ${otpFormatted}
                          </p>
                          <p style="margin:16px 0 0;font-size:12px;color:#52525b;font-family:'Outfit',sans-serif;">
                            Expires in <strong style="color:#a1a1aa;">10 minutes</strong>
                          </p>
                        </td>
                      </tr>
                    </table>

                    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                      <tr>
                        <td style="background-color:rgba(245,158,11,0.02);border:1px solid rgba(245,158,11,0.15);border-radius:8px;padding:16px 20px;">
                          <p style="margin:0;font-size:13px;color:#d4d4d8;line-height:1.5;font-family:'Outfit',sans-serif;">
                            &#8594; Go to <strong>${frontendVerifyUrl}</strong> and enter this 6-digit code. If you did not request this, you can safely ignore this email.
                          </p>
                        </td>
                      </tr>
                    </table>

                    <p style="margin:0;font-size:12px;color:#71717a;line-height:1.6;font-family:'Outfit',sans-serif;">
                      This code was generated for WORLDr secure authentication. Do not share this code with anyone.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top:28px;">
              <p style="margin:0;font-size:11px;color:#52525b;font-family:'JetBrains Mono',monospace;letter-spacing:0.1em;text-transform:uppercase;">
                &copy; ${new Date().getFullYear()} WORLDr &mdash; Secure Gateway
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = `WORLDr — Verify your account\n\nHello ${displayName},\n\nYour verification code is: ${otp}\n\nThis code expires in 10 minutes.\n\nEnter it at: ${frontendVerifyUrl}\n\nIf you did not create an account, ignore this email.\n\n— WORLDr Team`;

  return { html, text };
}

export class EmailService {
  async sendVerificationEmail(to: string, displayName: string, otp: string): Promise<void> {
    const { html, text } = buildVerificationEmail(displayName, otp);
    const from = process.env.EMAIL_FROM || env.EMAIL_FROM;
    const apiKey = process.env.BREVO_API_KEY || env.BREVO_API_KEY;
    const smtpTransport = createSmtpTransport();

    // ── Strategy 1: Brevo SMTP (preferred — no IP restrictions) ───────────────
    if (smtpTransport) {
      try {
        logger.info('[EmailService] Sending via Brevo SMTP...');
        await smtpTransport.sendMail({
          from: `"WORLDr" <${from}>`,
          to,
          subject: 'Your WORLDr verification code',
          html,
          text,
        });
        logger.info(`[EmailService] SMTP success: email sent to ${to}`);
        return;
      } catch (err: any) {
        logger.error('[EmailService] SMTP failed, falling back to API:', err.message);
        // fall through to API fallback
      }
    }

    // ── Strategy 2: Brevo HTTP API (fallback) ─────────────────────────────────
    if (!apiKey) {
      if (env.NODE_ENV !== 'production') {
        logger.warn(`[EmailService] No BREVO credentials configured. Dev mode: OTP is ${otp}`);
        return;
      }
      throw new AppError(
        'Email service is not configured. Please contact support.',
        500,
        'SMTP_NOT_CONFIGURED'
      );
    }

    try {
      logger.info('[EmailService] Sending via Brevo HTTP API...');
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sender: { email: from, name: 'WORLDr' },
          to: [{ email: to, name: displayName }],
          subject: 'Your WORLDr verification code',
          htmlContent: html,
          textContent: text,
        }),
      });

      logger.info(`[EmailService] Brevo API response: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        const errorBody = await response.text();
        logger.error(`[EmailService] Brevo API error: ${errorBody}`);
        // User-friendly error — don't expose raw Brevo error
        throw new Error(`Email delivery failed (status ${response.status}). Please try again or contact support.`);
      }

      logger.info(`[EmailService] API success: email sent to ${to}`);
    } catch (err: any) {
      logger.error('[EmailService] All email strategies failed:', err);
      throw new AppError(
        err.message?.includes('status') ? err.message : 'Failed to send verification email. Please try again.',
        500,
        'EMAIL_DELIVERY_FAILED'
      );
    }
  }

  async sendPasswordResetEmail(to: string, displayName: string, token: string): Promise<void> {
    const resetUrl = `${env.FRONTEND_URL.replace(/\/$/, '')}/reset-password?token=${token}&email=${encodeURIComponent(to)}`;
    const from = process.env.EMAIL_FROM || env.EMAIL_FROM;
    const apiKey = process.env.BREVO_API_KEY || env.BREVO_API_KEY;
    const smtpTransport = createSmtpTransport();

    const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"/><title>Reset Your WORLDr Password</title></head>
<body style="margin:0;padding:0;background:#050508;font-family:system-ui,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#050508;min-height:100vh;">
    <tr><td align="center" style="padding:60px 16px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
        <tr><td align="center" style="padding-bottom:28px;">
          <span style="font-size:22px;font-weight:800;color:#fafafa;">WORLD<span style="color:#f59e0b;">r</span></span>
        </td></tr>
        <tr><td style="background:rgba(17,17,19,0.9);border:1px solid rgba(245,158,11,0.25);border-radius:16px;padding:40px;">
          <p style="margin:0 0 8px;font-size:11px;color:#71717a;letter-spacing:0.2em;text-transform:uppercase;">Password Recovery</p>
          <h1 style="margin:0 0 16px;font-size:24px;font-weight:700;color:#fafafa;">Reset your password</h1>
          <p style="margin:0 0 24px;font-size:14px;color:#a1a1aa;line-height:1.6;">Hi ${displayName}, we received a request to reset your WORLDr password. Click the button below within 1 hour.</p>
          <a href="${resetUrl}" style="display:block;text-align:center;background:#f59e0b;color:#000;font-weight:700;padding:14px 24px;border-radius:8px;text-decoration:none;font-size:15px;margin-bottom:24px;">Reset Password</a>
          <p style="margin:0;font-size:12px;color:#52525b;">If you didn't request this, you can safely ignore this email. Your password won't change.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

    const text = `Hi ${displayName},\n\nReset your WORLDr password here:\n${resetUrl}\n\nThis link expires in 1 hour.\n\nIf you didn't request a reset, ignore this email.\n\n— WORLDr Team`;

    // ── Strategy 1: SMTP ────────────────────────────────────────────────────────
    if (smtpTransport) {
      try {
        await smtpTransport.sendMail({
          from: `"WORLDr" <${from}>`,
          to,
          subject: 'Reset your WORLDr password',
          html,
          text,
        });
        logger.info(`[EmailService] Password reset email sent via SMTP to ${to}`);
        return;
      } catch (err: any) {
        logger.error('[EmailService] SMTP failed for password reset:', err.message);
      }
    }

    // ── Strategy 2: HTTP API ────────────────────────────────────────────────────
    if (!apiKey) {
      logger.warn(`[EmailService] No BREVO credentials — skipping password reset. Reset URL: ${resetUrl}`);
      if (env.NODE_ENV === 'production') {
        throw new AppError('Email service not configured.', 500, 'SMTP_NOT_CONFIGURED');
      }
      return;
    }

    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sender: { email: from, name: 'WORLDr' },
        to: [{ email: to, name: displayName }],
        subject: 'Reset your WORLDr password',
        htmlContent: html,
        textContent: text,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new AppError(
        `Failed to send password reset email. Please try again.`,
        500,
        'EMAIL_DELIVERY_FAILED'
      );
    }
    logger.info(`[EmailService] Password reset email sent via API to ${to}`);
  }
}

export const emailService = new EmailService();

