import passport from 'passport';
import { Strategy as JwtStrategy, ExtractJwt, StrategyOptions } from 'passport-jwt';
import { User } from '../models/User';

// Interface for JWT payload
export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
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
  new JwtStrategy(jwtOptions, async (payload: JwtPayload, done) => {
    try {
      // Find user by ID from payload (sub = user ID)
      const user = await User.findById(payload.sub).select('-passwordHash');

      if (!user) {
        return done(null, false, { message: 'User not found' });
      }

      // Return user object
      return done(null, user);
    } catch (error) {
      return done(error, false);
    }
  })
);

export default passport;
