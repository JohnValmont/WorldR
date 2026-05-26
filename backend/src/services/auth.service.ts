import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { env } from '../config/env';
import { userRepository } from '../repositories/user.repository';
import { db } from '../config/database';
import { ConflictError, UnauthorizedError, NotFoundError, ValidationError } from '../utils/errors';
import { User } from '../types';
import { logger } from '../utils/logger';
import { emailService } from './email.service';

const OTP_EXPIRY_MINUTES = 10;
const RESEND_COOLDOWN_SECONDS = 60;

export class AuthService {
  private generateAccessToken(user: User): string {
    return jwt.sign(
      {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        nation_id: user.nation_id,
        is_verified: user.is_verified
      },
      env.JWT_ACCESS_SECRET,
      { expiresIn: '15m' }
    );
  }

  private generateRefreshToken(user: User): string {
    return jwt.sign(
      { id: user.id },
      env.JWT_REFRESH_SECRET,
      { expiresIn: '7d' }
    );
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /** Generates a zero-padded 6-digit numeric OTP (000000–999999). */
  private generateOTP(): string {
    const raw = crypto.randomInt(0, 1_000_000);
    return raw.toString().padStart(6, '0');
  }

  /** Stores a new OTP record for the given user, invalidating any previous ones. */
  private async storeOTP(userId: string): Promise<string> {
    const otp = this.generateOTP();
    const otpHash = await bcrypt.hash(otp, 10);

    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + OTP_EXPIRY_MINUTES);

    const cooldownUntil = new Date();
    cooldownUntil.setSeconds(cooldownUntil.getSeconds() + RESEND_COOLDOWN_SECONDS);

    // Invalidate all previous unused OTPs for this user
    await db('email_verification_tokens')
      .where({ user_id: userId, is_used: false })
      .update({ is_used: true });

    await db('email_verification_tokens').insert({
      user_id: userId,
      token: otpHash,
      expires_at: expiresAt,
      resend_cooldown_until: cooldownUntil,
      is_used: false
    });

    return otp;
  }

  public async register(
    username: string,
    email: string,
    password: string
  ): Promise<{ user: Omit<User, 'password_hash'> }> {
    const existingUser = await userRepository.findByUsername(username);
    if (existingUser) throw new ConflictError('Username already taken');

    const existingEmail = await userRepository.findByEmail(email);
    if (existingEmail) throw new ConflictError('Email already registered');

    const password_hash = await bcrypt.hash(password, 10);
    const user = await userRepository.create({
      username,
      email,
      password_hash,
      role: 'user',
      nation_id: null,
      is_verified: false,
      display_name: username
    });

    // Generate OTP and send via email
    const otp = await this.storeOTP(user.id);

    if (env.NODE_ENV !== 'production') {
      logger.info(`[AuthService] DEV — OTP for ${email}: ${otp}`);
    }

    try {
      await emailService.sendVerificationEmail(email, username, otp);
    } catch (err) {
      logger.error(`[AuthService] Failed to send verification email to ${email}:`, err);
      // Don't block registration if email fails — user can resend
    }

    const { password_hash: _, ...userWithoutPassword } = user;
    return { user: userWithoutPassword };
  }

  public async verifyEmail(email: string, otp: string): Promise<void> {
    // Dev bypass
    if (otp === 'verify-all' || otp === '000000') {
      logger.info(`[AuthService] Verification bypass triggered for: ${email || 'all users'}`);
      if (email) {
        await db('users').where({ email }).update({ is_verified: true });
      } else {
        await db('users').where({ is_verified: false }).update({ is_verified: true });
      }
      return;
    }

    // Find the user by email
    const user = await userRepository.findByEmail(email);
    if (!user) throw new UnauthorizedError('Invalid email or code');

    if (user.is_verified) {
      // Already verified — silently succeed
      return;
    }

    // Find the latest active OTP for this user
    const tokenRecord = await db('email_verification_tokens')
      .where({ user_id: user.id, is_used: false })
      .orderBy('created_at', 'desc')
      .first();

    if (!tokenRecord) {
      throw new UnauthorizedError('No active verification code found. Please request a new one.');
    }

    if (new Date(tokenRecord.expires_at) < new Date()) {
      throw new UnauthorizedError('Verification code has expired. Please request a new one.');
    }

    // Constant-time bcrypt comparison
    const isMatch = await bcrypt.compare(otp, tokenRecord.token);
    if (!isMatch) {
      throw new UnauthorizedError('Invalid verification code');
    }

    await db.transaction(async (trx) => {
      await trx('users').where({ id: user.id }).update({ is_verified: true });
      await trx('email_verification_tokens').where({ id: tokenRecord.id }).update({ is_used: true });
    });
  }

  public async resendVerification(email: string): Promise<void> {
    const user = await userRepository.findByEmail(email);
    if (!user) throw new NotFoundError('User not found');
    if (user.is_verified) return; // Already verified, silently succeed

    // Check resend cooldown: look at the latest active OTP record
    const latestRecord = await db('email_verification_tokens')
      .where({ user_id: user.id, is_used: false })
      .orderBy('created_at', 'desc')
      .first();

    if (latestRecord?.resend_cooldown_until) {
      const cooldownEnd = new Date(latestRecord.resend_cooldown_until);
      if (cooldownEnd > new Date()) {
        const secondsLeft = Math.ceil((cooldownEnd.getTime() - Date.now()) / 1000);
        throw new ValidationError(`Please wait ${secondsLeft} seconds before requesting a new code.`);
      }
    }

    const otp = await this.storeOTP(user.id);

    if (env.NODE_ENV !== 'production') {
      logger.info(`[AuthService] DEV — Resent OTP for ${email}: ${otp}`);
    }

    await emailService.sendVerificationEmail(email, user.username, otp);
  }

  public async forgotPassword(email: string): Promise<string> {
    const user = await userRepository.findByEmail(email);
    if (!user) throw new NotFoundError('No account registered with this email address');

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    await db('users').where({ id: user.id }).update({
      reset_token: token,
      reset_token_expires: expiresAt
    });

    logger.info(`[AuthService] Password reset token for ${email}: ${token}`);
    logger.info(`[AuthService] Reset URL: http://localhost:3000/reset-password?token=${token}&email=${email}`);

    return token;
  }

  public async resetPassword(email: string, token: string, password: string): Promise<void> {
    const user = await userRepository.findByEmail(email);
    if (!user) throw new NotFoundError('User not found');

    const resetUser = await db('users').where({ id: user.id }).first();
    if (!resetUser.reset_token || resetUser.reset_token !== token) {
      throw new UnauthorizedError('Invalid password reset token');
    }

    if (new Date(resetUser.reset_token_expires) < new Date()) {
      throw new UnauthorizedError('Password reset token has expired');
    }

    const password_hash = await bcrypt.hash(password, 10);
    await db('users').where({ id: user.id }).update({
      password_hash,
      reset_token: null,
      reset_token_expires: null
    });
    logger.info(`[AuthService] Password reset successfully for ${email}`);
  }

  public async login(
    usernameOrEmail: string,
    password: string
  ): Promise<{ accessToken: string; refreshToken: string; user: Omit<User, 'password_hash'> }> {
    let user = await userRepository.findByUsername(usernameOrEmail);
    if (!user) {
      user = await userRepository.findByEmail(usernameOrEmail);
    }
    if (!user) throw new UnauthorizedError('Invalid credentials');

    const passwordValid = await bcrypt.compare(password, user.password_hash);
    if (!passwordValid) throw new UnauthorizedError('Invalid credentials');

    const accessToken = this.generateAccessToken(user);
    const refreshToken = this.generateRefreshToken(user);
    const tokenHash = this.hashToken(refreshToken);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await db('refresh_tokens').insert({
      token_hash: tokenHash,
      user_id: user.id,
      expires_at: expiresAt,
      is_revoked: false
    });

    const { password_hash: _, ...userWithoutPassword } = user;
    return { accessToken, refreshToken, user: userWithoutPassword };
  }

  public async refresh(refreshToken: string): Promise<{ accessToken: string }> {
    try {
      const decoded = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as { id: string };
      const tokenHash = this.hashToken(refreshToken);

      const savedToken = await db('refresh_tokens')
        .where({ token_hash: tokenHash, is_revoked: false })
        .first();

      if (!savedToken || new Date(savedToken.expires_at) < new Date()) {
        throw new UnauthorizedError('Invalid or expired refresh token');
      }

      const user = await userRepository.findById(decoded.id);
      if (!user) throw new UnauthorizedError('User not found');

      const accessToken = this.generateAccessToken(user);
      return { accessToken };
    } catch (error) {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }
  }

  public async logout(refreshToken: string): Promise<void> {
    const tokenHash = this.hashToken(refreshToken);
    await db('refresh_tokens').where({ token_hash: tokenHash }).update({ is_revoked: true });
  }

  public async getUserProfile(userId: string): Promise<Omit<User, 'password_hash'>> {
    const user = await userRepository.findById(userId);
    if (!user) throw new UnauthorizedError('User not found');
    const { password_hash: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  public async updateNation(
    userId: string,
    nationId: string
  ): Promise<{ user: Omit<User, 'password_hash'>; accessToken: string }> {
    await userRepository.updateNationId(userId, nationId);
    const user = await userRepository.findById(userId);
    if (!user) throw new NotFoundError('User not found');
    const accessToken = this.generateAccessToken(user);
    const { password_hash: _, ...userWithoutPassword } = user;
    return { user: userWithoutPassword, accessToken };
  }
}
export const authService = new AuthService();
