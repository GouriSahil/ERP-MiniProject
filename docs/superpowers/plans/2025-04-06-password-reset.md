# Password Reset API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement password reset functionality with two endpoints: forgot-password (initiates reset via email) and reset-password (completes reset with token)

**Architecture:** Separate PasswordResetToken collection for tokens, EmailService with configurable SMTP/console mode, 15-minute token expiry, bcrypt-hashed tokens

**Tech Stack:** Node.js/Express, Mongoose, bcrypt, nodemailer, Joi validation, Bun test runner

---

## File Structure

### New Files
- `apps/api/src/models/PasswordResetToken.ts` - Mongoose model for reset tokens
- `apps/api/src/services/email.service.ts` - Email sending service (SMTP/console)
- `apps/api/tests/integration/password-reset.integration.test.ts` - Integration tests

### Modified Files
- `apps/api/src/controllers/auth.controller.ts` - Add forgotPassword and resetPassword methods
- `apps/api/src/routes/auth.routes.ts` - Add new public routes
- `apps/api/src/utils/validation.utils.ts` - Add forgotPassword and resetPassword schemas
- `apps/api/package.json` - Add nodemailer dependency

---

## Task 1: Install nodemailer dependency

**Files:**
- Modify: `apps/api/package.json`

- [ ] **Step 1: Install nodemailer and @types/nodemailer**

```bash
cd apps/api && bun add nodemailer && bun add -d @types/nodemailer
```

Expected: nodemailer and @types/nodemailer added to package.json dependencies

- [ ] **Step 2: Verify installation**

```bash
cat apps/api/package.json | grep -A2 nodemailer
```

Expected: Should see nodemailer in dependencies and @types/nodemailer in devDependencies

- [ ] **Step 3: Commit**

```bash
git add apps/api/package.json bun.lock
git commit -m "deps: add nodemailer for password reset emails"
```

---

## Task 2: Create PasswordResetToken model

**Files:**
- Create: `apps/api/src/models/PasswordResetToken.ts`

- [ ] **Step 1: Create the model file**

```typescript
import mongoose, { Schema, Document, Model } from 'mongoose';

// Password Reset Token interface
interface IPasswordResetToken extends Document {
  userId: mongoose.Types.ObjectId;
  token: string;
  expiresAt: Date;
  used: boolean;
  createdAt: Date;
}

// Password Reset Token schema
const PasswordResetTokenSchema: Schema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required']
    },
    token: {
      type: String,
      required: [true, 'Token is required']
    },
    expiresAt: {
      type: Date,
      required: [true, 'Expiration date is required'],
      index: { expireAfterSeconds: 0 } // MongoDB TTL index for auto-cleanup
    },
    used: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true,
    collection: 'password_reset_tokens'
  }
);

// Indexes
PasswordResetTokenSchema.index({ userId: 1 });
PasswordResetTokenSchema.index({ token: 1 });
PasswordResetTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Export PasswordResetToken model
export const PasswordResetToken: Model<IPasswordResetToken> = mongoose.model<IPasswordResetToken>('PasswordResetToken', PasswordResetTokenSchema);

// Type-only exports
export type { IPasswordResetToken };
```

- [ ] **Step 2: Run TypeScript check**

```bash
cd apps/api && bun run build
```

Expected: No TypeScript errors

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/models/PasswordResetToken.ts
git commit -m "feat: add PasswordResetToken model"
```

---

## Task 3: Create EmailService

**Files:**
- Create: `apps/api/src/services/email.service.ts`

- [ ] **Step 1: Create the email service file**

```typescript
import nodemailer from 'nodemailer';

/**
 * Email configuration
 */
interface EmailConfig {
  mode: 'console' | 'smtp';
  host?: string;
  port?: number;
  user?: string;
  pass?: string;
  from?: string;
}

/**
 * Email service for sending password reset emails
 * Supports console mode (development) and SMTP mode (production)
 */
class EmailService {
  private config: EmailConfig;
  private transporter?: nodemailer.Transporter;

  constructor() {
    this.config = {
      mode: (process.env.EMAIL_MODE as 'console' | 'smtp') || 'console',
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587,
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
      from: process.env.EMAIL_FROM || 'noreply@erp-system.com'
    };

    if (this.config.mode === 'smtp') {
      this.initializeSmtpTransporter();
    }
  }

  /**
   * Initialize SMTP transporter
   */
  private initializeSmtpTransporter(): void {
    if (!this.config.host || !this.config.user || !this.config.pass) {
      console.warn('[EmailService] SMTP configuration incomplete, falling back to console mode');
      this.config.mode = 'console';
      return;
    }

    this.transporter = nodemailer.createTransport({
      host: this.config.host,
      port: this.config.port,
      secure: false, // true for 465, false for other ports
      auth: {
        user: this.config.user,
        pass: this.config.pass
      }
    });
  }

  /**
   * Send password reset email
   * @param to - Recipient email address
   * @param token - Reset token
   * @param name - Recipient name (optional)
   */
  async sendPasswordResetEmail(to: string, token: string, name?: string): Promise<void> {
    const baseUrl = process.env.BASE_URL || 'http://localhost:4200';
    const resetLink = `${baseUrl}/reset-password?token=${token}`;

    if (this.config.mode === 'console') {
      this.sendConsoleEmail(to, resetLink, name);
      return;
    }

    await this.sendSmtpEmail(to, resetLink, name);
  }

  /**
   * Console mode - log email to console (development)
   */
  private sendConsoleEmail(to: string, resetLink: string, name?: string): void {
    const greeting = name ? `Hello ${name},` : 'Hello,';

    console.log('\n╔═══════════════════════════════════════════════════════════════╗');
    console.log('║                   PASSWORD RESET EMAIL                        ║');
    console.log('╠═══════════════════════════════════════════════════════════════╣');
    console.log(`║ To: ${to.padEnd(58)}║`);
    console.log(`║ From: ${this.config.from?.padEnd(56) || ''}║`);
    console.log('╠═══════════════════════════════════════════════════════════════╣');
    console.log('║ Subject: Password Reset Request                              ║');
    console.log('╠═══════════════════════════════════════════════════════════════╣');
    console.log(`║ ${greeting.padEnd(62)}║`);
    console.log('║                                                               ║');
    console.log('║ You requested a password reset for your ERP account.         ║');
    console.log('║                                                               ║');
    console.log('║ Click the link below to reset your password (valid for 15    ║');
    console.log('║ minutes):                                                     ║');
    console.log('║                                                               ║');
    console.log('║ ' + resetLink.padEnd(62) + '║');
    console.log('║                                                               ║');
    console.log('║ If you didn\'t request this, please ignore this email.        ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');
  }

  /**
   * SMTP mode - send actual email (production)
   */
  private async sendSmtpEmail(to: string, resetLink: string, name?: string): Promise<void> {
    if (!this.transporter) {
      throw new Error('SMTP transporter not initialized');
    }

    const greeting = name ? `Hello ${name},` : 'Hello,';

    const mailOptions = {
      from: this.config.from,
      to,
      subject: 'Password Reset Request',
      text: `${greeting}

You requested a password reset for your ERP account.

Click the link below to reset your password (valid for 15 minutes):
${resetLink}

If you didn't request this, please ignore this email.`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .button { display: inline-block; padding: 12px 24px; background-color: #007bff;
              color: white; text-decoration: none; border-radius: 4px; }
    .footer { margin-top: 30px; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <h2>Password Reset Request</h2>
    <p>${greeting}</p>
    <p>You requested a password reset for your ERP account.</p>
    <p>Click the button below to reset your password (valid for 15 minutes):</p>
    <p><a href="${resetLink}" class="button">Reset Password</a></p>
    <p>Or copy this link to your browser:<br>${resetLink}</p>
    <p class="footer">If you didn't request this, please ignore this email.</p>
  </div>
</body>
</html>
      `
    };

    await this.transporter.sendMail(mailOptions);
    console.log(`[EmailService] Password reset email sent to ${to}`);
  }

  /**
   * Verify SMTP configuration (for health checks)
   */
  async verifySmtpConnection(): Promise<boolean> {
    if (this.config.mode !== 'smtp' || !this.transporter) {
      return false;
    }

    try {
      await this.transporter.verify();
      return true;
    } catch {
      return false;
    }
  }
}

// Export singleton instance
export const emailService = new EmailService();
```

- [ ] **Step 2: Run TypeScript check**

```bash
cd apps/api && bun run build
```

Expected: No TypeScript errors

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/services/email.service.ts
git commit -m "feat: add EmailService with console and SMTP modes"
```

---

## Task 4: Add validation schemas

**Files:**
- Modify: `apps/api/src/utils/validation.utils.ts`

- [ ] **Step 1: Add validation schemas for password reset**

Add these schemas after the `refreshTokenSchema` definition (after line 70):

```typescript
export const forgotPasswordSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    })
});

export const resetPasswordSchema = Joi.object({
  token: Joi.string()
    .required()
    .messages({
      'any.required': 'Reset token is required'
    }),
  newPassword: Joi.string()
    .min(8)
    .pattern(/^(?=.*[A-Za-z])(?=.*\d)/)
    .required()
    .messages({
      'string.min': 'Password must be at least 8 characters long',
      'string.pattern.base': 'Password must contain at least one letter and one number',
      'any.required': 'New password is required'
    })
});
```

- [ ] **Step 2: Run TypeScript check**

```bash
cd apps/api && bun run build
```

Expected: No TypeScript errors

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/utils/validation.utils.ts
git commit -m "feat: add validation schemas for password reset"
```

---

## Task 5: Add forgotPassword controller method

**Files:**
- Modify: `apps/api/src/controllers/auth.controller.ts`

- [ ] **Step 1: Add imports at top of file**

After line 6:
```typescript
import crypto from 'crypto';
import { User } from '../models/User';
import { PasswordResetToken } from '../models/PasswordResetToken';
import { emailService } from '../services/email.service';
import * as bcrypt from 'bcrypt';
```

Note: bcrypt is already imported on line 2, so just add the other three imports

- [ ] **Step 2: Add forgotPassword method before the closing brace of AuthController class**

Add this method before the final closing brace (line 322):

```typescript
  // Forgot Password - initiates password reset flow
  static async forgotPassword(req: Request, res: Response) {
    try {
      const { email } = req.body;

      if (!email) {
        return errorResponse(res, 'Email is required', 400);
      }

      // Find user by email
      const user = await User.findOne({ email });

      // Always return success to prevent email enumeration
      if (!user) {
        await saveAuditLog({
          actorUserId: null,
          actorRole: 'anonymous',
          action: 'forgot_password',
          targetType: 'auth',
          targetId: email,
          status: 'success',
          details: 'User not found (response hidden for security)',
          ipAddress: req.ip || 'unknown',
          userAgent: req.get('user-agent') || 'unknown'
        });
        return successResponse(res, null, 'If a user exists with this email, a password reset link has been sent.');
      }

      // Generate secure random token
      const resetToken = crypto.randomBytes(32).toString('hex');

      // Hash token before storing
      const hashedToken = await bcrypt.hash(resetToken, 12);

      // Set expiration to 15 minutes from now
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

      // Store reset token in database
      await PasswordResetToken.create({
        userId: user._id,
        token: hashedToken,
        expiresAt,
        used: false
      });

      // Send password reset email
      await emailService.sendPasswordResetEmail(user.email, resetToken, user.name);

      await saveAuditLog({
        actorUserId: user._id.toString(),
        actorRole: user.role,
        action: 'forgot_password',
        targetType: 'auth',
        targetId: user._id.toString(),
        status: 'success',
        ipAddress: req.ip || 'unknown',
        userAgent: req.get('user-agent') || 'unknown'
      });

      return successResponse(res, null, 'If a user exists with this email, a password reset link has been sent.');
    } catch (error: any) {
      console.error('[forgotPassword] Error:', error);
      return errorResponse(res, 'An error occurred while processing your request', 500);
    }
  }
```

- [ ] **Step 3: Run TypeScript check**

```bash
cd apps/api && bun run build
```

Expected: No TypeScript errors

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/controllers/auth.controller.ts
git commit -m "feat: add forgotPassword controller method"
```

---

## Task 6: Add resetPassword controller method

**Files:**
- Modify: `apps/api/src/controllers/auth.controller.ts`

- [ ] **Step 1: Add resetPassword method before the closing brace of AuthController class**

Add this method after forgotPassword (before line 322):

```typescript
  // Reset Password - completes password reset with token
  static async resetPassword(req: Request, res: Response) {
    try {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        return errorResponse(res, 'Token and new password are required', 400);
      }

      // Find all reset tokens for this user and check each one
      // We need to find the token by comparing the hashed values
      const allTokens = await PasswordResetToken.find({
        used: false,
        expiresAt: { $gt: new Date() }
      }).sort({ createdAt: -1 });

      let validToken = null;
      let userId = null;

      // Check each token to find a match
      for (const resetToken of allTokens) {
        const isValid = await bcrypt.compare(token, resetToken.token);
        if (isValid) {
          validToken = resetToken;
          userId = resetToken.userId;
          break;
        }
      }

      if (!validToken || !userId) {
        await saveAuditLog({
          actorUserId: null,
          actorRole: 'anonymous',
          action: 'reset_password',
          targetType: 'auth',
          targetId: 'unknown',
          status: 'failure',
          errorMessage: 'Invalid or expired reset token',
          ipAddress: req.ip || 'unknown',
          userAgent: req.get('user-agent') || 'unknown'
        });
        return errorResponse(res, 'Invalid or expired reset token', 400);
      }

      // Find user by ID
      const user = await User.findById(userId);

      if (!user) {
        return errorResponse(res, 'User not found', 404);
      }

      // Hash new password
      const passwordHash = await bcrypt.hash(newPassword, 12);

      // Update user password
      await User.findByIdAndUpdate(userId, {
        passwordHash,
        mustChangePassword: false
      });

      // Mark token as used
      await PasswordResetToken.findByIdAndUpdate(validToken._id, {
        used: true
      });

      await saveAuditLog({
        actorUserId: user._id.toString(),
        actorRole: user.role,
        action: 'reset_password',
        targetType: 'user',
        targetId: user._id.toString(),
        status: 'success',
        ipAddress: req.ip || 'unknown',
        userAgent: req.get('user-agent') || 'unknown'
      });

      return successResponse(res, null, 'Password has been reset successfully.');
    } catch (error: any) {
      console.error('[resetPassword] Error:', error);
      return errorResponse(res, 'An error occurred while resetting your password', 500);
    }
  }
```

- [ ] **Step 2: Run TypeScript check**

```bash
cd apps/api && bun run build
```

Expected: No TypeScript errors

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/controllers/auth.controller.ts
git commit -m "feat: add resetPassword controller method"
```

---

## Task 7: Add routes for password reset

**Files:**
- Modify: `apps/api/src/routes/auth.routes.ts`

- [ ] **Step 1: Update imports to include new schemas**

Replace line 4 with:
```typescript
import { registerSchema, loginSchema, refreshTokenSchema, forgotPasswordSchema, resetPasswordSchema } from '../utils/validation.utils';
```

- [ ] **Step 2: Add new public routes after refresh route (after line 26)**

```typescript
// Password reset routes (public)
router.post(
  '/forgot-password',
  validate(forgotPasswordSchema),
  AuthController.forgotPassword
);

router.post(
  '/reset-password',
  validate(resetPasswordSchema),
  AuthController.resetPassword
);
```

- [ ] **Step 3: Run TypeScript check**

```bash
cd apps/api && bun run build
```

Expected: No TypeScript errors

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/routes/auth.routes.ts
git commit -m "feat: add password reset routes"
```

---

## Task 8: Update server.ts to list new endpoints

**Files:**
- Modify: `apps/api/src/server.ts`

- [ ] **Step 1: Update the endpoints list in the startup banner**

Replace lines 74-79 with:
```typescript
      ║   Available endpoints:                                    ║
      ║   - GET  /api/health                                      ║
      ║   - POST /api/auth/register                               ║
      ║   - POST /api/auth/login                                  ║
      ║   - POST /api/auth/forgot-password                        ║
      ║   - POST /api/auth/reset-password                         ║
      ║   - POST /api/auth/refresh                                ║
      ║   - POST /api/auth/logout                                 ║
      ║   - GET  /api/auth/me                                     ║
```

- [ ] **Step 2: Commit**

```bash
git add apps/api/src/server.ts
git commit -m "docs: update server startup banner with password reset endpoints"
```

---

## Task 9: Write integration tests - forgot-password

**Files:**
- Create: `apps/api/tests/integration/password-reset.integration.test.ts`

- [ ] **Step 1: Create integration test file**

```typescript
/**
 * Password Reset Integration Tests
 * Tests password reset endpoints with real database
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { setupTestDatabase, clearTestDatabase, teardownTestDatabase, testFixtures } from './setup';
import { User, UserRole } from '../../src/models/User';
import { PasswordResetToken } from '../../src/models/PasswordResetToken';
import { AuthController } from '../../src/controllers/auth.controller';
import { createMockRequest, createMockResponse } from '../utils/test-helpers';
import * as bcrypt from 'bcrypt';

describe('Password Reset Integration Tests', () => {
  beforeEach(async () => {
    await setupTestDatabase();
  });

  afterEach(async () => {
    await clearTestDatabase();
  });

  describe('POST /api/auth/forgot-password', () => {
    it('should create a reset token for existing user', async () => {
      // Create a test user
      const user = await testFixtures.createUser({
        name: 'Test User',
        email: 'test@example.com',
        password: 'OldPassword123!',
        role: UserRole.STUDENT,
      });

      const req = createMockRequest();
      req.body = { email: user.email };
      const res = createMockResponse();

      await AuthController.forgotPassword(req, res);

      expect(res._status).toBe(200);
      expect(res._json?.success).toBe(true);
      expect(res._json?.message).toContain('password reset link');

      // Verify token was created in database
      const tokens = await PasswordResetToken.find({ userId: user.id });
      expect(tokens.length).toBeGreaterThan(0);

      const token = tokens[0];
      expect(token.used).toBe(false);
      expect(token.expiresAt).toBeInstanceOf(Date);
    });

    it('should return same response for non-existent email (security)', async () => {
      const req = createMockRequest();
      req.body = { email: 'nonexistent@example.com' };
      const res = createMockResponse();

      await AuthController.forgotPassword(req, res);

      expect(res._status).toBe(200);
      expect(res._json?.success).toBe(true);
      // Should not reveal whether email exists
      expect(res._json?.message).toContain('password reset link');
    });

    it('should return error for invalid email format', async () => {
      const req = createMockRequest();
      req.body = { email: 'invalid-email' };
      const res = createMockResponse();

      await AuthController.forgotPassword(req, res);

      expect(res._status).toBe(400);
      expect(res._json?.success).toBe(false);
    });

    it('should create token with 15 minute expiration', async () => {
      const user = await testFixtures.createUser({
        name: 'Test User',
        email: 'test@example.com',
        password: 'OldPassword123!',
        role: UserRole.STUDENT,
      });

      const req = createMockRequest();
      req.body = { email: user.email };
      const res = createMockResponse();

      await AuthController.forgotPassword(req, res);

      const tokens = await PasswordResetToken.find({ userId: user.id });
      const token = tokens[0];

      const now = new Date();
      const fifteenMinutesFromNow = new Date(now.getTime() + 15 * 60 * 1000);

      // Token should expire approximately 15 minutes from now
      const timeUntilExpiry = token.expiresAt.getTime() - now.getTime();
      expect(timeUntilExpiry).toBeGreaterThan(14 * 60 * 1000); // At least 14 minutes
      expect(timeUntilExpiry).toBeLessThan(16 * 60 * 1000); // At most 16 minutes
    });

    it('should hash the token before storing', async () => {
      const user = await testFixtures.createUser({
        name: 'Test User',
        email: 'test@example.com',
        password: 'OldPassword123!',
        role: UserRole.STUDENT,
      });

      const req = createMockRequest();
      req.body = { email: user.email };
      const res = createMockResponse();

      // Capture console.log to get the plaintext token
      const consoleLogs: string[] = [];
      const originalLog = console.log;
      console.log = (...args) => {
        consoleLogs.push(args.join(' '));
        originalLog(...args);
      };

      await AuthController.forgotPassword(req, res);

      console.log = originalLog;

      const tokens = await PasswordResetToken.find({ userId: user.id });
      const token = tokens[0];

      // Extract token from console log
      const logOutput = consoleLogs.join(' ');
      const tokenMatch = logOutput.match(/token=([a-f0-9]{64})/);
      expect(tokenMatch).toBeTruthy();

      const plaintextToken = tokenMatch?.[1];

      // The stored token should be hashed (not equal to plaintext)
      expect(token.token).not.toContain(plaintextToken || '');

      // Verify the stored token is a bcrypt hash
      expect(token.token).toMatch(/^\$2[aby]\$/);
    });

    it('should create multiple tokens if requested multiple times', async () => {
      const user = await testFixtures.createUser({
        name: 'Test User',
        email: 'test@example.com',
        password: 'OldPassword123!',
        role: UserRole.STUDENT,
      });

      // Request password reset twice
      const req1 = createMockRequest();
      req1.body = { email: user.email };
      const res1 = createMockResponse();

      const req2 = createMockRequest();
      req2.body = { email: user.email };
      const res2 = createMockResponse();

      await AuthController.forgotPassword(req1, res1);
      await AuthController.forgotPassword(req2, res2);

      const tokens = await PasswordResetToken.find({ userId: user.id });
      expect(tokens.length).toBe(2);
      expect(tokens.every(t => t.used === false)).toBe(true);
    });
  });

  describe('POST /api/auth/reset-password', () => {
    let resetToken: string;
    let user: any;

    beforeEach(async () => {
      // Create a test user
      user = await testFixtures.createUser({
        name: 'Test User',
        email: 'reset@example.com',
        password: 'OldPassword123!',
        role: UserRole.STUDENT,
      });

      // Create a reset token manually
      const crypto = await import('crypto');
      resetToken = crypto.randomBytes(32).toString('hex');
      const hashedToken = await bcrypt.hash(resetToken, 12);
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

      await PasswordResetToken.create({
        userId: user.id,
        token: hashedToken,
        expiresAt,
        used: false
      });
    });

    it('should reset password with valid token', async () => {
      const req = createMockRequest();
      req.body = {
        token: resetToken,
        newPassword: 'NewPassword456!'
      };
      const res = createMockResponse();

      await AuthController.resetPassword(req, res);

      expect(res._status).toBe(200);
      expect(res._json?.success).toBe(true);
      expect(res._json?.message).toContain('reset successfully');

      // Verify password was updated in database
      const updatedUser = await User.findById(user.id).select('+passwordHash');
      expect(updatedUser).toBeTruthy();

      const isNewPasswordValid = await bcrypt.compare('NewPassword456!', updatedUser?.passwordHash || '');
      expect(isNewPasswordValid).toBe(true);

      const isOldPasswordValid = await bcrypt.compare('OldPassword123!', updatedUser?.passwordHash || '');
      expect(isOldPasswordValid).toBe(false);
    });

    it('should mark token as used after successful reset', async () => {
      const req = createMockRequest();
      req.body = {
        token: resetToken,
        newPassword: 'NewPassword456!'
      };
      const res = createMockResponse();

      await AuthController.resetPassword(req, res);

      const tokens = await PasswordResetToken.find({ userId: user.id });
      expect(tokens.length).toBe(1);
      expect(tokens[0].used).toBe(true);
    });

    it('should reject invalid token', async () => {
      const req = createMockRequest();
      req.body = {
        token: 'invalidtoken1234567890123456789012345678901234567890123456789012345678',
        newPassword: 'NewPassword456!'
      };
      const res = createMockResponse();

      await AuthController.resetPassword(req, res);

      expect(res._status).toBe(400);
      expect(res._json?.success).toBe(false);
      expect(res._json?.error).toContain('Invalid or expired');
    });

    it('should reject expired token', async () => {
      // Create an expired token
      const crypto = await import('crypto');
      const expiredToken = crypto.randomBytes(32).toString('hex');
      const hashedToken = await bcrypt.hash(expiredToken, 12);
      const expiresAt = new Date(Date.now() - 1000); // Expired 1 second ago

      await PasswordResetToken.create({
        userId: user.id,
        token: hashedToken,
        expiresAt,
        used: false
      });

      const req = createMockRequest();
      req.body = {
        token: expiredToken,
        newPassword: 'NewPassword456!'
      };
      const res = createMockResponse();

      await AuthController.resetPassword(req, res);

      expect(res._status).toBe(400);
      expect(res._json?.success).toBe(false);
      expect(res._json?.error).toContain('Invalid or expired');
    });

    it('should reject already used token', async () => {
      // Mark the existing token as used
      const tokens = await PasswordResetToken.find({ userId: user.id });
      await PasswordResetToken.findByIdAndUpdate(tokens[0]._id, { used: true });

      const req = createMockRequest();
      req.body = {
        token: resetToken,
        newPassword: 'NewPassword456!'
      };
      const res = createMockResponse();

      await AuthController.resetPassword(req, res);

      expect(res._status).toBe(400);
      expect(res._json?.success).toBe(false);
    });

    it('should reject weak password', async () => {
      const req = createMockRequest();
      req.body = {
        token: resetToken,
        newPassword: 'weak'
      };
      const res = createMockResponse();

      await AuthController.resetPassword(req, res);

      expect(res._status).toBe(400);
      expect(res._json?.success).toBe(false);
    });

    it('should reject password without number', async () => {
      const req = createMockRequest();
      req.body = {
        token: resetToken,
        newPassword: 'passwordonly'
      };
      const res = createMockResponse();

      await AuthController.resetPassword(req, res);

      expect(res._status).toBe(400);
      expect(res._json?.success).toBe(false);
    });

    it('should clear mustChangePassword flag', async () => {
      // Set mustChangePassword to true
      await User.findByIdAndUpdate(user.id, { mustChangePassword: true });

      const req = createMockRequest();
      req.body = {
        token: resetToken,
        newPassword: 'NewPassword456!'
      };
      const res = createMockResponse();

      await AuthController.resetPassword(req, res);

      const updatedUser = await User.findById(user.id);
      expect(updatedUser?.mustChangePassword).toBe(false);
    });

    it('should reject request without token', async () => {
      const req = createMockRequest();
      req.body = {
        newPassword: 'NewPassword456!'
      };
      const res = createMockResponse();

      await AuthController.resetPassword(req, res);

      expect(res._status).toBe(400);
      expect(res._json?.success).toBe(false);
    });

    it('should reject request without password', async () => {
      const req = createMockRequest();
      req.body = {
        token: resetToken
      };
      const res = createMockResponse();

      await AuthController.resetPassword(req, res);

      expect(res._status).toBe(400);
      expect(res._json?.success).toBe(false);
    });
  });

  describe('Full password reset flow', () => {
    it('should complete full forgot-password → reset-password flow', async () => {
      const user = await testFixtures.createUser({
        name: 'Flow Test User',
        email: 'flow@example.com',
        password: 'InitialPassword123!',
        role: UserRole.STUDENT,
      });

      // Step 1: Request password reset
      const forgotReq = createMockRequest();
      forgotReq.body = { email: user.email };
      const forgotRes = createMockResponse();

      // Capture console.log to get the token
      const consoleLogs: string[] = [];
      const originalLog = console.log;
      console.log = (...args) => {
        consoleLogs.push(args.join(' '));
        originalLog(...args);
      };

      await AuthController.forgotPassword(forgotReq, forgotRes);

      console.log = originalLog;

      expect(forgotRes._status).toBe(200);

      // Extract token from console log
      const logOutput = consoleLogs.join(' ');
      const tokenMatch = logOutput.match(/token=([a-f0-9]{64})/);
      expect(tokenMatch).toBeTruthy();

      const resetToken = tokenMatch?.[1];

      // Step 2: Reset password with the token
      const resetReq = createMockRequest();
      resetReq.body = {
        token: resetToken,
        newPassword: 'NewPassword456!'
      };
      const resetRes = createMockResponse();

      await AuthController.resetPassword(resetReq, resetRes);

      expect(resetRes._status).toBe(200);
      expect(resetRes._json?.success).toBe(true);

      // Step 3: Verify new password works
      const updatedUser = await User.findById(user.id).select('+passwordHash');
      const isNewPasswordValid = await bcrypt.compare('NewPassword456!', updatedUser?.passwordHash || '');
      expect(isNewPasswordValid).toBe(true);
    });
  });
});

// Clean up after all tests
afterAll(async () => {
  await teardownTestDatabase();
});
```

- [ ] **Step 2: Run integration tests**

```bash
cd apps/api && bun test tests/integration/password-reset.integration.test.ts
```

Expected: All tests pass

- [ ] **Step 3: Commit**

```bash
git add apps/api/tests/integration/password-reset.integration.test.ts
git commit -m "test: add password reset integration tests"
```

---

## Task 10: Run all tests and verify

**Files:**
- All

- [ ] **Step 1: Run integration tests**

```bash
cd apps/api && bun test tests/integration
```

Expected: All integration tests pass, including new password reset tests

- [ ] **Step 2: Run all tests**

```bash
cd apps/api && bun test
```

Expected: All tests pass

- [ ] **Step 3: Verify TypeScript compilation**

```bash
cd apps/api && bun run build
```

Expected: No TypeScript errors

- [ ] **Step 4: Final commit for completed implementation**

```bash
git add -A
git commit -m "feat: complete password reset API implementation

- Implement POST /api/auth/forgot-password endpoint
- Implement POST /api/auth/reset-password endpoint
- Add PasswordResetToken model with 15-minute expiry
- Add EmailService with console and SMTP modes
- Add comprehensive integration tests
- Update validation schemas and routes"
```

---

## Summary

This plan implements:
1. **PasswordResetToken model** with MongoDB TTL index for auto-cleanup
2. **EmailService** supporting console logging (dev) and SMTP (production)
3. **forgot-password endpoint** that creates tokens and sends emails
4. **reset-password endpoint** that validates tokens and updates passwords
5. **Comprehensive tests** covering all scenarios
6. **Security features**: email enumeration prevention, token hashing, 15-minute expiry

Total tasks: 10
Estimated checkpoints: After tasks 3, 6, 8, 10
