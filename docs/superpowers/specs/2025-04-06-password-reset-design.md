# Password Reset API Design

**Date:** 2025-04-06
**Status:** Approved

## Overview

Implement password reset functionality with two endpoints:
1. `POST /api/auth/forgot-password` - Initiates reset by email
2. `POST /api/auth/reset-password` - Completes reset with token

## Architecture

### Components

| Component | Description |
|-----------|-------------|
| PasswordResetToken Model | New Mongoose model storing reset tokens with expiry |
| EmailService | New service for sending emails (configurable SMTP/console) |
| AuthController | Two new methods: forgotPassword and resetPassword |
| Integration Tests | Tests for password reset flows |
| E2E Tests | HTTP-level tests for the API |

### Data Flow

#### Forgot Password Flow

```
Client → POST /api/auth/forgot-password {email}
  ↓
  Validate email format
  ↓
  Find user by email (always returns success to prevent enumeration)
  ↓
  Generate secure random token (crypto.randomBytes)
  ↓
  Hash token with bcrypt
  ↓
  Store in PasswordResetToken collection (userId, hashedToken, expiresAt)
  ↓
  Send email with reset link (or log to console in dev mode)
  ↓
  Return 200 OK
```

#### Reset Password Flow

```
Client → POST /api/auth/reset-password {token, newPassword}
  ↓
  Find valid token by hashed value (not expired, not used)
  ↓
  Validate new password against requirements
  ↓
  Hash new password with bcrypt
  ↓
  Update User passwordHash
  ↓
  Mark token as used
  ↓
  Return 200 OK
```

## Security Features

1. **Timing-safe responses** - Same response regardless of whether email exists (prevents email enumeration)
2. **Token hashing** - Tokens are hashed before storage using bcrypt
3. **15-minute expiry** - Tokens expire quickly after generation
4. **Single-use tokens** - Marked as used after successful reset
5. **Secure random generation** - Using crypto.randomBytes(32)
6. **Rate limiting ready** - Structure supports future rate limiting implementation

## Email Service

### Environment Variables

```bash
EMAIL_MODE=console|smtp
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=noreply@example.com
SMTP_PASS=password
EMAIL_FROM=noreply@erp-system.com
BASE_URL=http://localhost:3000
```

### Modes

| Mode | Description |
|------|-------------|
| console | Logs reset link with token to console (development) |
| smtp | Sends actual email via Nodemailer (production) |

### Email Template

```
Subject: Password Reset Request

You requested a password reset for your ERP account.

Click the link below to reset your password (valid for 15 minutes:
http://localhost:4200/reset-password?token=<token>

If you didn't request this, please ignore this email.
```

## Database Schema

### PasswordResetToken Model

```typescript
{
  userId: ObjectId,      // Reference to User
  token: string,         // Hashed token
  expiresAt: Date,       // Token expiration (15 minutes)
  used: boolean,         // Token usage status
  createdAt: Date,       // Creation timestamp
}
```

**Indexes:**
- userId (for finding user tokens)
- expiresAt (for cleanup of expired tokens)
- token (for token lookup)

## API Specification

### POST /api/auth/forgot-password

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Response (200 OK):**
```json
{
  "message": "If a user exists with this email, a password reset link has been sent."
}
```

**Error Responses:**

| Status | Error |
|--------|-------|
| 400 | Invalid email format |

### POST /api/auth/reset-password

**Request:**
```json
{
  "token": "reset-token-here",
  "newPassword": "newSecurePassword123"
}
```

**Response (200 OK):**
```json
{
  "message": "Password has been reset successfully."
}
```

**Error Responses:**

| Status | Error |
|--------|-------|
| 400 | Invalid or expired reset token |
| 400 | Password does not meet requirements |

## Validation Rules

- **Email:** Standard email format validation
- **New Password:** Min 8 characters, at least one letter and one number
- **Token:** Required, must exist in database, not expired, not used

## Testing Strategy

### Integration Tests

- forgot-password with existing email
- forgot-password with non-existing email (same response - security)
- reset-password with valid token
- reset-password with expired token
- reset-password with already used token
- reset-password with invalid token
- Password validation (weak passwords rejected)
- Token expiry validation

### E2E Tests

- Full forgot-password → reset-password flow
- Console output verification in dev mode
- Error scenarios at HTTP level

## File Changes

### New Files

1. `apps/api/src/models/PasswordResetToken.ts` - Token model
2. `apps/api/src/services/email.service.ts` - Email service
3. `apps/api/tests/integration/password-reset.integration.test.ts` - Integration tests
4. `apps/api/tests/e2e/password-reset.e2e.test.ts` - E2E tests

### Modified Files

1. `apps/api/src/controllers/auth.controller.ts` - Add forgotPassword and resetPassword methods
2. `apps/api/src/routes/auth.routes.ts` - Add new routes (if exists)
3. `apps/api/src/server.ts` - Add routes if not using separate router file
4. `apps/api/.env.example` - Add email configuration variables

## Dependencies

**New npm packages:**
- `nodemailer` - Email sending
- `@types/nodemailer` - TypeScript types

## Implementation Order

1. Create PasswordResetToken model
2. Create EmailService
3. Add controller methods
4. Add routes
5. Write integration tests
6. Write E2E tests
7. Run and verify all tests
