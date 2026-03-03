import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { JwtPayload } from '../config/passport';

// Token configuration according to SRS
const ACCESS_TOKEN_EXPIRY = '1h'; // SRS requirement: 1 hour
const REFRESH_TOKEN_EXPIRY = '7d'; // Refresh tokens valid for 7 days
const BCRYPT_ROUNDS = 12; // SRS requirement: 12 rounds

// Interface for token payload
export interface TokenPayload {
  sub: string;
  email: string;
  role: string;
  type: 'access' | 'refresh';
}

// Interface for generated tokens
export interface GeneratedTokens {
  accessToken: string;
  refreshToken: string;
}

/**
 * Hash password using bcrypt with 12 rounds (SRS requirement)
 */
export const hashPassword = async (password: string): Promise<string> => {
  return await bcrypt.hash(password, BCRYPT_ROUNDS);
};

/**
 * Compare password with hash
 */
export const comparePassword = async (
  password: string,
  hash: string
): Promise<boolean> => {
  return await bcrypt.compare(password, hash);
};

/**
 * Generate access token (1 hour expiry as per SRS)
 */
export const generateAccessToken = (payload: Omit<TokenPayload, 'type'>): string => {
  return jwt.sign(
    { ...payload, type: 'access' },
    process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production',
    {
      expiresIn: ACCESS_TOKEN_EXPIRY,
      issuer: 'erp-api',
      audience: 'erp-frontend'
    }
  );
};

/**
 * Generate refresh token (7 days expiry)
 */
export const generateRefreshToken = (payload: Omit<TokenPayload, 'type'>): string => {
  return jwt.sign(
    { ...payload, type: 'refresh' },
    process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production',
    {
      expiresIn: REFRESH_TOKEN_EXPIRY,
      issuer: 'erp-api',
      audience: 'erp-frontend'
    }
  );
};

/**
 * Generate both access and refresh tokens
 */
export const generateTokens = (user: { _id: string; email: string; role: string }): GeneratedTokens => {
  const payload: Omit<TokenPayload, 'type'> = {
    sub: user._id.toString(),
    email: user.email,
    role: user.role
  };

  return {
    accessToken: generateAccessToken(payload),
    refreshToken: generateRefreshToken(payload)
  };
};

/**
 * Verify access token
 */
export const verifyAccessToken = (token: string): TokenPayload => {
  return jwt.verify(
    token,
    process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production',
    {
      issuer: 'erp-api',
      audience: 'erp-frontend'
    }
  ) as TokenPayload;
};

/**
 * Verify refresh token
 */
export const verifyRefreshToken = (token: string): TokenPayload => {
  const decoded = jwt.verify(
    token,
    process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production',
    {
      issuer: 'erp-api',
      audience: 'erp-frontend'
    }
  ) as TokenPayload;

  if (decoded.type !== 'refresh') {
    throw new Error('Invalid token type');
  }

  return decoded;
};

/**
 * Decode token without verification (for getting expiration date)
 */
export const decodeToken = (token: string): jwt.Jwt | null => {
  return jwt.decode(token);
};
