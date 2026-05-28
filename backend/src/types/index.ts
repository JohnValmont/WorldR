export interface User {
  id: string;
  username: string;
  email: string;
  password_hash: string;
  role: 'user' | 'admin' | 'moderator';
  is_verified: boolean;
  display_name: string | null;
  reset_token: string | null;
  reset_token_expires: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface RefreshToken {
  token_hash: string;
  user_id: string;
  expires_at: Date;
  is_revoked: boolean;
  created_at: Date;
}

export interface EmailVerificationToken {
  id: string;
  user_id: string;
  token: string;
  expires_at: Date;
  is_used: boolean;
  resend_cooldown_until: Date | null;
  created_at: Date;
}
