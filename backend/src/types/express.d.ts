export {};

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        username: string;
        email: string;
        role: 'user' | 'admin' | 'moderator';
        nation_id: string | null;
        is_verified: boolean;
      };
    }
  }
}
