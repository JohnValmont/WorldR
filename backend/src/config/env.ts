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
  REDIS_ENABLED: z.preprocess((val) => val !== 'false', z.boolean()).default(true),
  REDIS_URL: z.string().optional(),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  // 1 in-game month = 8 real hours = 28,800,000 ms. Override for testing (e.g. 60000 = 1 min)
  TICK_INTERVAL_MS: z.coerce.number().default(28800000),
  EMAIL_PROVIDER: z.string().default('smtp'),
  SMTP_EMAIL: z.string().optional(),
  SMTP_APP_PASSWORD: z.string().optional(),
  EMAIL_FROM: z.string().default('no-reply@worldr.game'),
  FRONTEND_URL: z.string().url().default('http://localhost:3000'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables Configuration:', parsed.error.format());
  process.exit(1);
}

export const env = parsed.data;
export type Env = z.infer<typeof envSchema>;
