import jwt from 'jsonwebtoken';

const SECRET = process.env['JWT_SECRET'] ?? 'wfl-local-dev-secret';
const TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

export interface JwtPayload {
  sub: string;
  email: string;
  householdId: string;
  iat?: number;
  exp?: number;
}

export function signToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, SECRET, { expiresIn: TTL_SECONDS });
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, SECRET) as JwtPayload;
  } catch {
    return null;
  }
}

export function extractUser(authHeader: string | null | undefined): JwtPayload | null {
  if (!authHeader) return null;
  const [type, token] = authHeader.split(' ');
  if (type !== 'Bearer' || !token) return null;
  return verifyToken(token);
}
