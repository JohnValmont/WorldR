import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

// Load environment variables from .env file with highly robust path resolution
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.join(__dirname, '../../../../.env') });
dotenv.config({ path: path.join(__dirname, '../../../../../.env') });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().url(),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  BREVO_API_KEY: z.string().optional(),
  BREVO_SMTP_USER: z.string().optional(),
  BREVO_SMTP_PASS: z.string().optional(),
  EMAIL_FROM: z.string().default('no-reply@worldr.game'),
  FRONTEND_URL: z.string().url().default('http://localhost:3000'),
  // Comma-separated emails promoted to role='admin' in the database on every boot.
  // Admin rights live in users.role — never hard-code emails in source.
  ADMIN_EMAILS: z.string().optional(),
  // Comma-separated list of browser origins allowed to call the API (CORS).
  // When unset, FRONTEND_URL is the only allowed origin.
  CORS_ORIGINS: z.string().optional(),
  // Error tracking (Sentry). Optional — when unset, errors are only logged.
  SENTRY_DSN: z.string().url().optional(),
  // A tick counts as "overdue" on /health once it is this many minutes late.
  TICK_OVERDUE_GRACE_MINUTES: z.coerce.number().default(30),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables Configuration:', parsed.error.format());
  process.exit(1);
}

export const env = parsed.data;
export type Env = z.infer<typeof envSchema>;
