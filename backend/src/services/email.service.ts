import nodemailer from 'nodemailer';
import { env } from '../config/env';
import { logger } from '../utils/logger';

// Create Nodemailer Transporter using Gmail SMTP config with robust timeouts
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: env.SMTP_EMAIL,
    pass: env.SMTP_APP_PASSWORD,
  },
  connectionTimeout: 10000, // 10 seconds timeout for establishing connection
  greetingTimeout: 10000,   // 10 seconds timeout for greeting response
  socketTimeout: 15000,     // 15 seconds socket inactivity timeout
});

/**
 * Generates the branded WORLDr HTML email template for OTP verification.
 */
function buildVerificationEmail(username: string, otp: string): { html: string; text: string } {
  // Format OTP with a gap: e.g. "123 456"
  const otpFormatted = `${otp.slice(0, 3)} ${otp.slice(3)}`;
  const frontendVerifyUrl = `${env.FRONTEND_URL.replace(/\/$/, '')}/verify`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Your WORLDr Verification Code</title>
</head>
<body style="margin:0;padding:0;background-color:#09090b;font-family:'Segoe UI',system-ui,-apple-system,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#09090b;min-height:100vh;">
    <tr>
      <td align="center" style="padding:48px 16px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

          <!-- Logo / Brand header -->
          <tr>
            <td align="center" style="padding-bottom:32px;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding-right:12px;vertical-align:middle;">
                    <div style="width:36px;height:36px;background:linear-gradient(135deg,#f59e0b,#d97706);border-radius:8px;display:inline-flex;align-items:center;justify-content:center;">
                      <span style="font-size:18px;font-weight:900;color:#09090b;letter-spacing:-1px;">W</span>
                    </div>
                  </td>
                  <td style="vertical-align:middle;">
                    <span style="font-size:22px;font-weight:800;color:#fafafa;letter-spacing:-0.5px;">WORLD<span style="color:#f59e0b;">r</span></span>
                  </td>
                </tr>
              </table>
              <p style="margin:8px 0 0;font-size:11px;color:#52525b;font-family:monospace;letter-spacing:0.25em;text-transform:uppercase;">Political Simulation Engine</p>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background-color:#111113;border:1px solid #27272a;border-radius:12px;overflow:hidden;">

              <!-- Top accent bar -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="height:3px;background:linear-gradient(90deg,#f59e0b,#d97706,transparent);"></td>
                </tr>
              </table>

              <!-- Content -->
              <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 40px 36px;">
                <tr>
                  <td>
                    <!-- Status badge -->
                    <table cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                      <tr>
                        <td style="background-color:#1c1204;border:1px solid #78350f;border-radius:4px;padding:4px 10px;">
                          <span style="font-size:9px;color:#f59e0b;font-family:monospace;letter-spacing:0.3em;text-transform:uppercase;">&#9679; Verification Required</span>
                        </td>
                      </tr>
                    </table>

                    <!-- Heading -->
                    <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#fafafa;letter-spacing:-0.5px;">
                      Verify your identity
                    </h1>
                    <p style="margin:0 0 28px;font-size:15px;color:#71717a;line-height:1.6;">
                      Welcome, <strong style="color:#a1a1aa;">${username}</strong>. Enter the code below to activate your WORLDr account and begin governing your nation.
                    </p>

                    <!-- OTP Block -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                      <tr>
                        <td align="center" style="background-color:#0d0d0f;border:1px solid #3f3f46;border-radius:10px;padding:32px 24px;">
                          <p style="margin:0 0 8px;font-size:10px;color:#52525b;font-family:monospace;letter-spacing:0.3em;text-transform:uppercase;">Your verification code</p>
                          <p style="margin:0;font-size:52px;font-weight:800;color:#f59e0b;letter-spacing:12px;font-family:'Courier New',monospace;line-height:1;">
                            ${otpFormatted}
                          </p>
                          <p style="margin:12px 0 0;font-size:12px;color:#52525b;">
                            Expires in <strong style="color:#a1a1aa;">10 minutes</strong>
                          </p>
                        </td>
                      </tr>
                    </table>

                    <!-- Instructions -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                      <tr>
                        <td style="background-color:#0c1a0c;border:1px solid #14532d;border-radius:8px;padding:16px 20px;">
                          <table cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="padding-right:12px;vertical-align:top;padding-top:2px;">
                                <span style="font-size:14px;">&#8594;</span>
                              </td>
                              <td>
                                <p style="margin:0;font-size:13px;color:#86efac;line-height:1.5;">
                                  Go to <strong>${frontendVerifyUrl}</strong> and enter this 6-digit code. If you did not request this, you can safely ignore this email.
                                </p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>

                    <!-- Divider -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                      <tr>
                        <td style="height:1px;background-color:#27272a;"></td>
                      </tr>
                    </table>

                    <!-- Footer note -->
                    <p style="margin:0;font-size:12px;color:#52525b;line-height:1.6;">
                      This code was generated for the WORLDr political simulation platform. If you have questions, contact support. Do not share this code with anyone.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top:24px;">
              <p style="margin:0;font-size:11px;color:#3f3f46;font-family:monospace;">
                &copy; ${new Date().getFullYear()} WORLDr &mdash; Political Simulation Engine
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = `WORLDr — Verify your account

Hello ${username},

Your verification code is: ${otp}

This code expires in 10 minutes.

Enter it at: ${frontendVerifyUrl}

If you did not create an account, ignore this email.

— WORLDr Team`;

  return { html, text };
}

export class EmailService {
  async sendVerificationEmail(to: string, username: string, otp: string): Promise<void> {
    const { html, text } = buildVerificationEmail(username, otp);
    const from = env.EMAIL_FROM;

    try {
      if (env.EMAIL_PROVIDER === 'resend' && env.RESEND_API_KEY) {
        // Keep Resend as legacy option if explicitly configured in env
        const { Resend } = require('resend');
        const resendInstance = new Resend(env.RESEND_API_KEY);
        const { error } = await resendInstance.emails.send({
          from: env.RESEND_FROM_EMAIL || from,
          to,
          subject: 'Your WORLDr verification code',
          html,
          text
        });

        if (error) {
          logger.error(`[EmailService] Resend API error sending to ${to}:`, error);
          throw new Error(`Email delivery failed: ${error.message}`);
        }
      } else {
        // Check if SMTP is configured. If not and we're in development, bypass email sending.
        if (!env.SMTP_EMAIL || !env.SMTP_APP_PASSWORD) {
          if (env.NODE_ENV !== 'production') {
            logger.warn(`[EmailService] SMTP credentials are not configured. Bypassing email sending in development mode. Check console/logs for OTP.`);
            return;
          }
          throw new Error('SMTP credentials are not configured. Please set SMTP_EMAIL and SMTP_APP_PASSWORD.');
        }

        // Gmail SMTP using Nodemailer
        await transporter.sendMail({
          from,
          to,
          subject: 'Your WORLDr verification code',
          html,
          text
        });
      }

      logger.info(`[EmailService] Verification email sent successfully to ${to}`);
    } catch (err: any) {
      logger.error(`[EmailService] Failed to send verification email to ${to}:`, err);
      throw new Error(`Email delivery failed: ${err.message || err}`);
    }
  }
}

export const emailService = new EmailService();
