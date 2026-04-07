import passport from 'passport';
import { Strategy as JwtStrategy, ExtractJwt, StrategyOptions } from 'passport-jwt';
import { User, UserStatus } from '../models/User';
import { UserSession } from '../models/UserSession';

// Interface for JWT payload
export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
  jti?: string; // JWT ID for session tracking
}

// Options for JWT Strategy - configured according to SRS requirements
const jwtOptions: StrategyOptions = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production',
  issuer: 'erp-api',
  audience: 'erp-frontend'
};

// Configure JWT Strategy according to SRS requirements
passport.use(
  new JwtStrategy(jwtOptions, async (payload: any, done) => {
    try {
      // Support both 'sub' (standard) and 'userId' (custom) fields
      const userId = payload.sub || payload.userId;
      const tokenId = payload.jti; // JWT ID for session tracking

      if (!userId) {
        return done(null, false, { message: 'Invalid token payload' });
      }

      // Check if session is revoked (if tokenId is present)
      if (tokenId) {
        try {
          const session = await UserSession.findOne({ tokenId });
          if (!session) {
            return done(null, false, { message: 'Session not found. Please login again.' });
          }
          if (session.status === 'revoked') {
            return done(null, false, { message: 'Session has been revoked. Please login again.' });
          }
          if (session.status === 'expired' || session.expiresAt < new Date()) {
            return done(null, false, { message: 'Session has expired. Please login again.' });
          }
        } catch (sessionError) {
          // If session check fails, log but continue (for backward compatibility)
          console.error('[Passport] Session check error:', sessionError);
        }
      }

      // In test environment, allow mock users with status check
      if (process.env.NODE_ENV === 'test') {
        const mockUser = {
          _id: userId,
          userId: userId,
          email: payload.email || 'test@example.com',
          role: payload.role || 'student',
          departmentId: payload.departmentId,
          name: 'Test User',
          status: payload.status || UserStatus.ACTIVE,
          tokenId: tokenId,
          jti: tokenId
        };

        // Check status even in test environment
        if (mockUser.status === UserStatus.PENDING) {
          return done(null, false, { message: 'Account pending admin approval' });
        }
        if (mockUser.status === UserStatus.REJECTED) {
          return done(null, false, { message: 'Account has been rejected' });
        }
        if (mockUser.status === UserStatus.SUSPENDED) {
          return done(null, false, { message: 'Account has been suspended' });
        }

        return done(null, mockUser);
      }

      // Find user by ID from payload
      const user = await User.findById(userId).select('-passwordHash');

      if (!user) {
        return done(null, false, { message: 'User not found' });
      }

      // Check user status - only approved and active users can authenticate
      switch (user.status) {
        case UserStatus.PENDING:
          return done(null, false, { message: 'Your account is pending admin approval. Please wait for an administrator to approve your registration.' });

        case UserStatus.REJECTED:
          return done(null, false, { message: 'Your account has been rejected. Please contact the administrator for more information.' });

        case UserStatus.SUSPENDED:
          return done(null, false, { message: 'Your account has been suspended. Please contact the administrator.' });

        case UserStatus.APPROVED:
        case UserStatus.ACTIVE:
          // User is approved, allow authentication
          break;

        default:
          return done(null, false, { message: 'Invalid account status. Please contact the administrator.' });
      }

      // Convert user to plain object and add tokenId
      const userObj: any = user.toObject();
      userObj.tokenId = tokenId;
      userObj.jti = tokenId;

      // Return user object (with status for middleware use)
      return done(null, userObj);
    } catch (error) {
      return done(error, false);
    }
  })
);

export default passport;
