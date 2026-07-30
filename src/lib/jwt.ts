import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key-change-in-prod';
const REFRESH_SECRET = process.env.REFRESH_SECRET || 'fallback-refresh-secret-key-change-in-prod';

export interface UserJWTPayload {
  userId: string;
  email: string;
  role: string;
}

export interface RefreshJWTPayload {
  userId: string;
}

export function signAccessToken(payload: UserJWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '15m' });
}

export function verifyAccessToken(token: string): UserJWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as UserJWTPayload;
  } catch (error) {
    return null;
  }
}

export function signRefreshToken(payload: RefreshJWTPayload): string {
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn: '7d' });
}

export function verifyRefreshToken(token: string): RefreshJWTPayload | null {
  try {
    return jwt.verify(token, REFRESH_SECRET) as RefreshJWTPayload;
  } catch (error) {
    return null;
  }
}
