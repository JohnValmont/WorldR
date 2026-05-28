import { env } from '../config/env';
import { logger } from '../utils/logger';
import { AppError } from '../utils/errors';

logger.info(`[EmailService] Initializing Brevo API Email Service...`);
logger.info(`[EmailService] EMAIL_PROVIDER: brevo_api`);
logger.info(`[EmailService] EMAIL_FROM: ${process.env.EMAIL_FROM || env.EMAIL_FROM}`);

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
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800&family=JetBrains+Mono:wght@700&display=swap" rel="stylesheet" />
</head>
<body style="margin:0;padding:0;background-color:#050508;font-family:'Outfit','Segoe UI',system-ui,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(180deg, rgba(5, 5, 8, 0.94) 0%, rgba(9, 9, 11, 0.90) 100%), url('https://raw.githubusercontent.com/JohnValmont/WorldR/main/assets/branding/background.jpg') no-repeat center top / cover; background-color:#050508; min-height:100vh;">
    <tr>
      <td align="center" style="padding:60px 16px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">

          <!-- Logo / Brand header -->
          <tr>
            <td align="center" style="padding-bottom:32px;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding-right:12px;vertical-align:middle;">
                    <img src="https://raw.githubusercontent.com/JohnValmont/WorldR/main/assets/branding/logo.jpg" width="40" height="40" alt="W" style="display:block; border-radius:10px; border: 1px solid rgba(245, 158, 11, 0.3); box-shadow: 0 0 15px rgba(245, 158, 11, 0.4);" />
                  </td>
                  <td style="vertical-align:middle;">
                    <span style="font-size:24px;font-weight:800;color:#fafafa;letter-spacing:-0.5px;font-family:'Outfit',sans-serif;">WORLD<span style="color:#f59e0b;">r</span></span>
                  </td>
                </tr>
              </table>
              <p style="margin:10px 0 0;font-size:10px;color:#71717a;font-family:'JetBrains Mono',monospace;letter-spacing:0.3em;text-transform:uppercase;">Political Simulation Engine</p>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background-color:rgba(17, 17, 19, 0.90); border:1px solid rgba(245,158,11,0.25); border-radius:16px; overflow:hidden; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6), 0 0 30px rgba(245, 158, 11, 0.08);">

              <!-- Top glowing line -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="height:3px;background:linear-gradient(90deg,transparent 0%,#f59e0b 50%,transparent 100%);"></td>
                </tr>
              </table>

              <!-- Content wrapper -->
              <table width="100%" cellpadding="0" cellspacing="0" style="padding:44px 40px 40px;">
                <tr>
                  <td>
                    <!-- Status badge -->
                    <table cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                      <tr>
                        <td style="background-color:rgba(245,158,11,0.06);border:1px solid rgba(245,158,11,0.3);border-radius:4px;padding:5px 12px;box-shadow: 0 0 10px rgba(245,158,11,0.05);">
                          <span style="font-size:9px;color:#f59e0b;font-family:'JetBrains Mono',monospace;letter-spacing:0.25em;text-transform:uppercase;font-weight:700;">&#9679; Establish Faction</span>
                        </td>
                      </tr>
                    </table>

                    <!-- Heading -->
                    <h1 style="margin:0 0 10px;font-size:26px;font-weight:700;color:#fafafa;letter-spacing:-0.5px;font-family:'Outfit',sans-serif;line-height:1.2;">
                      Verify your identity
                    </h1>
                    <p style="margin:0 0 28px;font-size:15px;color:#a1a1aa;line-height:1.6;font-family:'Outfit',sans-serif;">
                      Welcome, <strong style="color:#ffffff;">${username}</strong>. Enter the code below to activate your account and claim your seat in the senate.
                    </p>

                    <!-- OTP Block -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                      <tr>
                        <td align="center" style="background-color:#070709;border:1px solid rgba(245,158,11,0.2);border-radius:12px;padding:36px 24px;box-shadow: inset 0 0 20px rgba(0,0,0,0.8);">
                          <p style="margin:0 0 10px;font-size:10px;color:#71717a;font-family:'JetBrains Mono',monospace;letter-spacing:0.3em;text-transform:uppercase;">Your verification code</p>
                          <p style="margin:0;font-size:52px;font-weight:800;color:#f59e0b;letter-spacing:10px;font-family:'JetBrains Mono',monospace;line-height:1;text-shadow: 0 0 12px rgba(245,158,11,0.45);padding-left:10px;">
                            ${otpFormatted}
                          </p>
                          <p style="margin:16px 0 0;font-size:12px;color:#52525b;font-family:'Outfit',sans-serif;">
                            Expires in <strong style="color:#a1a1aa;">10 minutes</strong>
                          </p>
                        </td>
                      </tr>
                    </table>

                    <!-- Instructions -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                      <tr>
                        <td style="background-color:rgba(245,158,11,0.02);border:1px solid rgba(245,158,11,0.15);border-radius:8px;padding:16px 20px;">
                          <table cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="padding-right:12px;vertical-align:top;padding-top:2px;">
                                <span style="font-size:16px;color:#f59e0b;line-height:1;">&#8594;</span>
                              </td>
                              <td>
                                <p style="margin:0;font-size:13px;color:#d4d4d8;line-height:1.5;font-family:'Outfit',sans-serif;">
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
                        <td style="height:1px;background:linear-gradient(90deg,transparent 0%,rgba(245,158,11,0.15) 50%,transparent 100%);"></td>
                      </tr>
                    </table>

                    <!-- Footer note -->
                    <p style="margin:0;font-size:12px;color:#71717a;line-height:1.6;font-family:'Outfit',sans-serif;">
                      This code was generated for the WORLDr political simulation engine. Do not share this code with anyone.
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
    const from = process.env.EMAIL_FROM || env.EMAIL_FROM;
    const apiKey = process.env.BREVO_API_KEY || env.BREVO_API_KEY;

    if (!apiKey) {
      if (env.NODE_ENV !== 'production') {
        logger.warn(`[EmailService] BREVO_API_KEY is not configured. Bypassing email sending in development mode. Check console/logs for OTP.`);
        return;
      }
      throw new AppError('BREVO_API_KEY is not configured. Please set BREVO_API_KEY.', 500, 'SMTP_NOT_CONFIGURED');
    }

    try {
      logger.info("[EmailService] Brevo API email send started");

      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sender: {
            email: from,
            name: "WORLDr",
          },
          to: [
            {
              email: to,
              name: username,
            },
          ],
          subject: "Your WORLDr verification code",
          htmlContent: html,
          textContent: text,
        }),
      });

      logger.info(`[EmailService] Brevo API response status: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        const errorBody = await response.text();
        logger.error(`[EmailService] Brevo API error body: ${errorBody}`);
        throw new Error(`HTTP error ${response.status}: ${errorBody}`);
      }

      logger.info(`[EmailService] Brevo API success: Email sent successfully to ${to}`);
    } catch (err: any) {
      logger.error(`[EmailService] Brevo API failure: Failed to send email:`, err);
      throw new AppError(`Email delivery failed: ${err.message || err}`, 500, 'EMAIL_DELIVERY_FAILED');
    }
  }
}

export const emailService = new EmailService();
