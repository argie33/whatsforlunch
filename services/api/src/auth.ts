import jwt from 'jsonwebtoken';
import { Request } from 'express';

const JWT_SECRET = process.env.JWT_SECRET || 'local-dev-secret-not-secure';
const TOKEN_TTL = parseInt(process.env.TOKEN_TTL || '3600', 10);

export interface TokenPayload {
  sub: string;         // userId
  email: string;
  households: string[];
}

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_TTL });
}

export function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, JWT_SECRET) as TokenPayload;
}

export function extractToken(req: Request): string | null {
  const auth = req.headers.authorization;
  if (!auth) return null;
  const [type, token] = auth.split(' ');
  return type === 'Bearer' ? token : null;
}

export function getUserIdFromRequest(req: Request): string {
  const token = extractToken(req);
  if (!token) throw new Error('Unauthorized: missing token');
  try {
    const payload = verifyToken(token);
    return payload.sub;
  } catch {
    throw new Error('Unauthorized: invalid token');
  }
}

// Convenience: generate a dev token for a known user
export function devToken(userId = 'dev-user-001', email = 'dev@example.com'): string {
  return signToken({ sub: userId, email, households: ['dev-household-001'] });
}
