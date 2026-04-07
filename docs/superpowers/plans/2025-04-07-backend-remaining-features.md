# College ERP Backend - Remaining Features Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement all remaining TODO features for the College ERP backend system

**Architecture:** Express.js + MongoDB + TypeScript with RESTful API design. Features follow existing controller/service/model patterns.

**Tech Stack:** Node.js, Express, Mongoose, TypeScript, Bun test runner, Nodemailer

---

## Discovery Notes

Many items are **already implemented**:
- ✅ User deactivate/reactivate/reset-password (`users.controller.ts:206-305`)
- ✅ Faculty teaching load (`faculty.controller.ts:237-292`)
- ✅ Faculty assigned offerings (`faculty.controller.ts:210-234`)
- ✅ Student list search/filter (partial - needs rollNumber search)
- ✅ User list search/filter (partial - needs full implementation)
- ✅ Faculty list search (partial - needs email/name search)

## Implementation Plan Structure

This plan is organized into **6 focused work packages**:

1. **Fix E2E Tests** - Prerequisite for all other work
2. **Enhanced Search/Filter/Sort** - Complete partial implementations
3. **Email Notifications** - Add approval/rejection emails
4. **Term Management APIs** - Activate/Deactivate, Get Current Active
5. **Course Schedule API** - Add schedule to offerings
6. **Advanced Attendance & Reporting** - Trends, CSV export, low attendance, charts

---

## Work Package 1: Fix Failing E2E Tests

**Problem**: Tests fail because login credentials don't exist in fresh in-memory database

**Files**:
- Modify: `apps/api/tests/e2e/api.e2e.test.ts`
- Create: `apps/api/tests/e2e/fixtures.ts`

### Task 1.1: Create Test Fixtures

- [ ] **Step 1: Create fixtures file**

Create `apps/api/tests/e2e/fixtures.ts`:

```typescript
import { E2EApiClient } from './helpers';

/**
 * Seed test data for E2E tests
 * Creates a super admin user for authenticated requests
 */
export async function seedTestFixtures(client: E2EApiClient): Promise<{
  adminUser: { id: string; email: string; password: string; accessToken: string };
}> {
  // Register super admin user
  const registerResponse = await client.post('/api/auth/register', {
    name: 'Test Super Admin',
    email: 'test@example.com',
    password: 'password123',
    role: 'super_admin',
  });

  // Verify registration succeeded
  if (registerResponse.status !== 201) {
    throw new Error(`Failed to register test user: ${JSON.stringify(registerResponse.data)}`);
  }

  // Login to get access token
  const loginResponse = await client.post('/api/auth/login', {
    email: 'test@example.com',
    password: 'password123',
  });

  if (loginResponse.status !== 200 || !loginResponse.data.data) {
    throw new Error(`Failed to login test user: ${JSON.stringify(loginResponse.data)}`);
  }

  const accessToken = loginResponse.data.data.accessToken;

  // Set token on client
  client.setAccessToken(accessToken);

  return {
    adminUser: {
      id: loginResponse.data.data.user?._id || 'unknown',
      email: 'test@example.com',
      password: 'password123',
      accessToken,
    },
  };
}
```

- [ ] **Step 2: Run test to verify fixtures compile**

Run: `bun test apps/api/tests/e2e/fixtures.ts --dry-run 2>&1 || true`
Expected: No syntax errors

- [ ] **Step 3: Commit**

```bash
git add apps/api/tests/e2e/fixtures.ts
git commit -m "test: add E2E test fixtures helper"
```

### Task 1.2: Update E2E Tests to Use Fixtures

- [ ] **Step 1: Update beforeEach to seed fixtures**

Modify `apps/api/tests/e2e/api.e2e.test.ts` (lines 26-38):

Replace:
```typescript
beforeEach(async () => {
  // Create a fresh client for each test and login
  client = new E2EApiClient(serverUrl);
  const loginResponse = await client.post('/api/auth/login', {
    email: 'test@example.com',
    password: 'password123',
  });

  if (loginResponse.status === 200 && loginResponse.data.data) {
    const accessToken = loginResponse.data.data.accessToken;
    client.setAccessToken(accessToken);
  }
});
```

With:
```typescript
import { seedTestFixtures } from './fixtures';

beforeEach(async () => {
  // Create a fresh client for each test
  client = new E2EApiClient(serverUrl);
  // Seed test fixtures and authenticate
  await seedTestFixtures(client);
});
```

- [ ] **Step 2: Run E2E tests**

Run: `bun test apps/api/tests/e2e/api.e2e.test.ts`
Expected: Tests pass (or different failures)

- [ ] **Step 3: Commit**

```bash
git add apps/api/tests/e2e/api.e2e.test.ts
git commit -m "test: use fixtures in E2E tests beforeEach"
```

### Task 1.3: Fix Student/Faculty Test Data Issues

- [ ] **Step 1: Update Students API tests**

The students tests create students with `userId` but should create users first. Update the test in lines 222-239:

```typescript
it('should create a new student', async () => {
  // First create a department
  const deptResponse = await client.post('/api/departments', {
    name: 'Engineering',
    code: 'ENG',
  });
  const departmentId = deptResponse.data.data._id;

  const response = await client.post('/api/students', {
    name: 'Jane Student',
    email: 'jane.student@example.com',
    password: 'password123',
    rollNumber: 'S2024001',
    departmentId,
  });

  expect([200, 201]).toContain(response.status);
  expect(response.data.success).toBe(true);

  if (response.data.data) {
    studentId = response.data.data._id || response.data.data.id;
  }
});
```

- [ ] **Step 2: Update Faculty API tests**

Similar update for faculty tests (lines 287-303).

- [ ] **Step 3: Run E2E tests**

Run: `bun test apps/api/tests/e2e/api.e2e.test.ts`

- [ ] **Step 4: Commit**

```bash
git add apps/api/tests/e2e/api.e2e.test.ts
git commit -m "test: fix student/faculty E2E test data"
```

---

## Work Package 2: Enhanced Search/Filter/Sort

### Task 2.1: Add Status Filter to Users List

**Files**:
- Modify: `apps/api/src/controllers/users.controller.ts`

- [ ] **Step 1: Update users controller list method**

Add status filter to existing filter object (line 21):

```typescript
const { role, departmentId, status } = req.query;

// Build filter
const filter: any = {};
if (role) filter.role = role;
if (departmentId) filter.departmentId = departmentId;
if (status) filter.status = status;
```

- [ ] **Step 2: Run integration tests**

Run: `bun test apps/api/tests/integration/users.controller.test.ts`

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/controllers/users.controller.ts
git commit -m "feat: add status filter to users list"
```

### Task 2.2: Add Roll Number Search to Students List

- [ ] **Step 1: Update students controller to search roll numbers**

Modify `apps/api/src/controllers/students.controller.ts` (lines 32-42):

```typescript
// Add search filter for user fields and roll number
let searchFilter = {};
if (search) {
  // Search by roll number directly
  const rollNumberStudents = await Student.find({
    rollNumber: { $regex: search, $options: 'i' }
  }).select('_id');

  // Search by user name/email
  const users = await User.find({
    $or: [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } }
    ]
  }).select('_id');

  const studentIds = rollNumberStudents.map(s => s._id);
  const userIds = users.map(u => u._id);

  const studentsByUser = await Student.find({ userId: { $in: userIds } }).select('_id');
  const userIdStudentIds = studentsByUser.map(s => s._id);

  // Combine both sets of student IDs
  const allStudentIds = [...new Set([...studentIds, ...userIdStudentIds])];
  searchFilter = { _id: { $in: allStudentIds } };
}
```

- [ ] **Step 2: Run integration tests**

Run: `bun test apps/api/tests/integration/students.controller.test.ts`

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/controllers/students.controller.ts
git commit -m "feat: add roll number search to students list"
```

### Task 2.3: Add Name/Email Search to Faculty List

- [ ] **Step 1: Update faculty controller list method**

Modify `apps/api/src/controllers/faculty.controller.ts` (lines 11-39):

```typescript
static async list(req: AuthRequest, res: Response) {
  try {
    const { page, limit, search, sortBy, sortOrder } = getPaginationParams(req.query);
    const { departmentId } = req.query;

    const filter: any = {};
    if (departmentId) filter.departmentId = departmentId;

    // Add search filter for user fields
    let searchFilter = {};
    if (search) {
      const users = await User.find({
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ]
      }).select('_id');
      const userIds = users.map(u => u._id);
      searchFilter = { userId: { $in: userIds } };
    }

    const faculty = await Faculty.find({ ...filter, ...searchFilter })
      .populate('userId', 'name email')
      .populate('departmentId', 'name code')
      .sort({ [sortBy]: sortOrder })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const total = await Faculty.countDocuments({ ...filter, ...searchFilter });

    return res.status(200).json({
      success: true,
      data: faculty,
      pagination: buildPaginationMeta(page, limit, total)
    });
  } catch (error: any) {
    if (error instanceof AppError) {
      return errorResponse(res, error.message, error.statusCode);
    }
    return errorResponse(res, error.message, 500);
  }
}
```

- [ ] **Step 2: Run integration tests**

Run: `bun test apps/api/tests/integration/faculty.controller.test.ts`

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/controllers/faculty.controller.ts
git commit -m "feat: add name/email search to faculty list"
```

---

## Work Package 3: Email Notifications

### Task 3.1: Add User Approval Email

**Files**:
- Modify: `apps/api/src/services/email.service.ts`
- Modify: `apps/api/src/controllers/users.controller.ts`

- [ ] **Step 1: Add approval email method to email service**

Add to `apps/api/src/services/email.service.ts` (after `sendPasswordResetEmail` method):

```typescript
/**
 * Send user approval email
 * @param to - Recipient email address
 * @param name - Recipient name (optional)
 */
async sendUserApprovalEmail(to: string, name?: string): Promise<void> {
  const baseUrl = process.env.BASE_URL || 'http://localhost:4200';
  const loginLink = `${baseUrl}/login`;

  if (this.config.mode === 'console') {
    this.sendConsoleApprovalEmail(to, loginLink, name);
    return;
  }

  await this.sendSmtpApprovalEmail(to, loginLink, name);
}

/**
 * Console mode - log approval email to console (development)
 */
private sendConsoleApprovalEmail(to: string, loginLink: string, name?: string): void {
  const greeting = name ? `Hello ${name},` : 'Hello,';

  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║                    USER APPROVAL EMAIL                       ║');
  console.log('╠═══════════════════════════════════════════════════════════════╣');
  console.log(`║ To: ${to.padEnd(58)}║`);
  console.log(`║ From: ${this.config.from?.padEnd(56) || ''}║`);
  console.log('╠═══════════════════════════════════════════════════════════════╣');
  console.log('║ Subject: Your Account Has Been Approved                     ║');
  console.log('╠═══════════════════════════════════════════════════════════════╣');
  console.log(`║ ${greeting.padEnd(62)}║`);
  console.log('║                                                               ║');
  console.log('║ Good news! Your ERP account has been approved.               ║');
  console.log('║                                                               ║');
  console.log('║ You can now log in to your account:                         ║');
  console.log('║                                                               ║');
  console.log('║ ' + loginLink.padEnd(62) + '║');
  console.log('║                                                               ║');
  console.log('║ Please log in and update your password if required.          ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');
}

/**
 * SMTP mode - send actual approval email (production)
 */
private async sendSmtpApprovalEmail(to: string, loginLink: string, name?: string): Promise<void> {
  if (!this.transporter) {
    throw new Error('SMTP transporter not initialized');
  }

  const greeting = name ? `Hello ${name},` : 'Hello,';

  const mailOptions = {
    from: this.config.from,
    to,
    subject: 'Your Account Has Been Approved',
    text: `${greeting}

Good news! Your ERP account has been approved.

You can now log in to your account:
${loginLink}

Please log in and update your password if required.`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .button { display: inline-block; padding: 12px 24px; background-color: #28a745;
              color: white; text-decoration: none; border-radius: 4px; }
    .footer { margin-top: 30px; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <h2>Your Account Has Been Approved</h2>
    <p>${greeting}</p>
    <p>Good news! Your ERP account has been approved.</p>
    <p>You can now log in to your account:</p>
    <p><a href="${loginLink}" class="button">Log In</a></p>
    <p>Or copy this link to your browser:<br>${loginLink}</p>
    <p class="footer">Please log in and update your password if required.</p>
  </div>
</body>
</html>
    `
  };

  await this.transporter.sendMail(mailOptions);
  console.log(`[EmailService] User approval email sent to ${to}`);
}
```

- [ ] **Step 2: Add rejection email method**

Add similarly for rejection:

```typescript
/**
 * Send user rejection email
 * @param to - Recipient email address
 * @param reason - Rejection reason
 * @param name - Recipient name (optional)
 */
async sendUserRejectionEmail(to: string, reason?: string, name?: string): Promise<void> {
  if (this.config.mode === 'console') {
    this.sendConsoleRejectionEmail(to, reason, name);
    return;
  }

  await this.sendSmtpRejectionEmail(to, reason, name);
}

private sendConsoleRejectionEmail(to: string, reason: string | undefined, name?: string): void {
  const greeting = name ? `Hello ${name},` : 'Hello,';
  const reasonText = reason ? `\n║ Reason: ${reason.padEnd(52)}║` : '';

  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║                    USER REJECTION EMAIL                      ║');
  console.log('╠═══════════════════════════════════════════════════════════════╣');
  console.log(`║ To: ${to.padEnd(58)}║`);
  console.log('╠═══════════════════════════════════════════════════════════════╣');
  console.log('║ Subject: Your Account Registration Status                   ║');
  console.log('╠═══════════════════════════════════════════════════════════════╣');
  console.log(`║ ${greeting.padEnd(62)}║`);
  console.log('║                                                               ║');
  console.log('║ We regret to inform you that your ERP account registration  ║');
  console.log('║ has been rejected.                                           ║');
  reasonText.split('\n').forEach(line => console.log(line));
  console.log('║                                                               ║');
  console.log('║ If you have questions, please contact the administrator.    ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');
}

private async sendSmtpRejectionEmail(to: string, reason: string | undefined, name?: string): Promise<void> {
  if (!this.transporter) {
    throw new Error('SMTP transporter not initialized');
  }

  const greeting = name ? `Hello ${name},` : 'Hello,';
  const reasonParagraph = reason ? `<p><strong>Reason:</strong> ${reason}</p>` : '';

  const mailOptions = {
    from: this.config.from,
    to,
    subject: 'Your Account Registration Status',
    text: `${greeting}

We regret to inform you that your ERP account registration has been rejected.
${reason || ''}

If you have questions, please contact the administrator.`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .footer { margin-top: 30px; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <h2>Your Account Registration Status</h2>
    <p>${greeting}</p>
    <p>We regret to inform you that your ERP account registration has been rejected.</p>
    ${reasonParagraph}
    <p>If you have questions, please contact the administrator.</p>
  </div>
</body>
</html>
    `
  };

  await this.transporter.sendMail(mailOptions);
  console.log(`[EmailService] User rejection email sent to ${to}`);
}
```

- [ ] **Step 3: Update users controller to send emails**

Modify `apps/api/src/controllers/users.controller.ts`:

1. Import email service at top:
```typescript
import { emailService } from '../services/email.service';
```

2. Replace TODO comment in `approveUser` (line 399):
```typescript
// Send approval email to user
try {
  const userDoc = await User.findById(id);
  if (userDoc) {
    await emailService.sendUserApprovalEmail(userDoc.email, userDoc.name);
  }
} catch (emailError) {
  console.error('[UsersController] Failed to send approval email:', emailError);
}
```

3. Replace TODO comment in `rejectUser` (line 454):
```typescript
// Send rejection email to user
try {
  const userDoc = await User.findById(id);
  if (userDoc) {
    await emailService.sendUserRejectionEmail(userDoc.email, reason, userDoc.name);
  }
} catch (emailError) {
  console.error('[UsersController] Failed to send rejection email:', emailError);
}
```

- [ ] **Step 4: Run tests**

Run: `bun test apps/api/tests/integration/users.controller.test.ts`

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/services/email.service.ts apps/api/src/controllers/users.controller.ts
git commit -m "feat: add approval/rejection email notifications"
```

---

## Work Package 4: Term Management APIs

### Task 4.1: Add Set Term Status Endpoint

**Files**:
- Modify: `apps/api/src/controllers/terms.controller.ts`
- Modify: `apps/api/src/routes/terms.routes.ts`

- [ ] **Step 1: Add setStatus method to terms controller**

Add to `apps/api/src/controllers/terms.controller.ts`:

```typescript
// Set term status (activate/deactivate/complete)
static async setStatus(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['active', 'inactive', 'completed'].includes(status)) {
      return errorResponse(res, 'Invalid status. Must be active, inactive, or completed', 400);
    }

    const term = await Term.findById(id);
    if (!term) {
      return notFoundResponse(res, 'Term');
    }

    // If setting to active, deactivate other active terms
    if (status === 'active') {
      await Term.updateMany(
        { _id: { $ne: id }, status: 'active' },
        { status: 'inactive' }
      );
    }

    // Check for active enrollments if trying to deactivate
    if (status === 'inactive' && term.status === 'active') {
      const { Enrollment } = await import('../models');
      const activeEnrollments = await Enrollment.countDocuments({
        status: 'active'
      });

      if (activeEnrollments > 0) {
        return errorResponse(
          res,
          'Cannot deactivate term with active enrollments',
          400
        );
      }
    }

    const updatedTerm = await Term.findByIdAndUpdate(
      id,
      { status },
      { new: true, runValidators: true }
    ).lean();

    await saveAuditLog({
      actorUserId: req.user!.userId,
      actorRole: req.user!.role,
      action: 'set_status',
      targetType: 'term',
      targetId: id,
      status: 'success',
      metadata: { previousStatus: term.status, newStatus: status },
      ipAddress: req.ip || 'unknown',
      userAgent: req.get('user-agent') || 'unknown'
    });

    return successResponse(res, updatedTerm, `Term status updated to ${status}`);
  } catch (error: any) {
    return errorResponse(res, error.message, 500);
  }
}
```

- [ ] **Step 2: Add getCurrentActive method**

```typescript
// Get current active term
static async getCurrentActive(req: AuthRequest, res: Response) {
  try {
    const term = await Term.findOne({ status: 'active' })
      .sort({ startDate: -1 })
      .lean();

    if (!term) {
      return notFoundResponse(res, 'Active term');
    }

    return successResponse(res, term);
  } catch (error: any) {
    return errorResponse(res, error.message, 500);
  }
}
```

- [ ] **Step 3: Add routes**

Add to `apps/api/src/routes/terms.routes.ts`:

```typescript
// Set term status
router.put(
  '/:id/status',
  authorize('super_admin', 'admin'),
  TermsController.setStatus
);

// Get current active term
router.get(
  '/current',
  authenticate,
  TermsController.getCurrentActive
);
```

- [ ] **Step 4: Run tests**

Run: `bun test apps/api/tests/integration/terms.controller.test.ts`

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/controllers/terms.controller.ts apps/api/src/routes/terms.routes.ts
git commit -m "feat: add term status management APIs"
```

---

## Work Package 5: Course Schedule API

### Task 5.1: Add Schedule Field to CourseOffering Model

**Files**:
- Modify: `apps/api/src/models/CourseOffering.ts`

- [ ] **Step 1: Update CourseOffering schema**

Modify `apps/api/src/models/CourseOffering.ts`:

Add schedule interface and schema field:

```typescript
export interface ICourseOfferingSchedule {
  days?: string[];
  startTime?: string;
  endTime?: string;
  location?: string;
}

export interface ICourseOffering extends Document {
  // ... existing fields ...
  schedule?: ICourseOfferingSchedule;
  // ... rest of fields ...
}
```

Add to schema:
```typescript
schedule: {
  days: { type: [String], enum: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] },
  startTime: { type: String, match: /^([01]\d|2[0-3]):([0-5]\d)$/ },
  endTime: { type: String, match: /^([01]\d|2[0-3]):([0-5]\d)$/ },
  location: { type: String, trim: true, maxlength: 100 }
}
```

- [ ] **Step 2: Run tests**

Run: `bun test apps/api/tests/models/`

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/models/CourseOffering.ts
git commit -m "feat: add schedule field to CourseOffering model"
```

### Task 5.2: Add Set Schedule Endpoint

**Files**:
- Modify: `apps/api/src/controllers/offerings.controller.ts`
- Modify: `apps/api/src/routes/offerings.routes.ts`

- [ ] **Step 1: Add setSchedule method**

Add to `apps/api/src/controllers/offerings.controller.ts`:

```typescript
// Set schedule for offering
static async setSchedule(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const { days, startTime, endTime, location } = req.body;

    // Validate time format
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    if (startTime && !timeRegex.test(startTime)) {
      return errorResponse(res, 'Invalid startTime format. Use HH:mm', 400);
    }
    if (endTime && !timeRegex.test(endTime)) {
      return errorResponse(res, 'Invalid endTime format. Use HH:mm', 400);
    }

    // Validate days
    const validDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    if (days) {
      const invalidDays = days.filter((d: string) => !validDays.includes(d));
      if (invalidDays.length > 0) {
        return errorResponse(res, `Invalid days: ${invalidDays.join(', ')}`, 400);
      }
    }

    const offering = await CourseOffering.findById(id);
    if (!offering) {
      return notFoundResponse(res, 'Course offering');
    }

    const updatedOffering = await CourseOffering.findByIdAndUpdate(
      id,
      {
        schedule: {
          days,
          startTime,
          endTime,
          location
        }
      },
      { new: true, runValidators: true }
    ).populate('courseId').populate('termId').lean();

    await saveAuditLog({
      actorUserId: req.user!.userId,
      actorRole: req.user!.role,
      action: 'set_schedule',
      targetType: 'offering',
      targetId: id,
      status: 'success',
      metadata: { schedule: { days, startTime, endTime, location } },
      ipAddress: req.ip || 'unknown',
      userAgent: req.get('user-agent') || 'unknown'
    });

    return successResponse(res, updatedOffering, 'Schedule updated successfully');
  } catch (error: any) {
    return errorResponse(res, error.message, 500);
  }
}
```

- [ ] **Step 2: Add route**

Add to `apps/api/src/routes/offerings.routes.ts`:

```typescript
router.put(
  '/:id/schedule',
  authorize('super_admin', 'admin', 'dept_head'),
  OfferingsController.setSchedule
);
```

- [ ] **Step 3: Run tests**

Run: `bun test apps/api/tests/integration/offerings.controller.test.ts`

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/controllers/offerings.controller.ts apps/api/src/routes/offerings.routes.ts
git commit -m "feat: add schedule API for course offerings"
```

---

## Work Package 6: Advanced Attendance & Reporting

### Task 6.1: Add Attendance Percentage Endpoint

**Files**:
- Modify: `apps/api/src/controllers/attendance.controller.ts`
- Modify: `apps/api/src/routes/attendance.routes.ts`

- [ ] **Step 1: Add getPercentage method**

Add to `apps/api/src/controllers/attendance.controller.ts`:

```typescript
// Get attendance percentage for a student
static async getPercentage(req: AuthRequest, res: Response) {
  try {
    const { studentId } = req.params;
    const { offeringId, termId, startDate, endDate } = req.query;

    // Verify student exists
    const student = await Student.findById(studentId);
    if (!student) {
      return notFoundResponse(res, 'Student');
    }

    // Build enrollment filter
    const enrollmentFilter: any = { studentId };
    let enrollments = await Enrollment.find(enrollmentFilter).lean();

    // Filter by offering if provided
    if (offeringId) {
      enrollments = enrollments.filter((e: any) => e.offeringId.toString() === offeringId.toString());
    }

    const offeringIds = enrollments.map((e: any) => e.offeringId);

    // Get offerings for term filtering
    let filteredOfferingIds = offeringIds;
    if (termId) {
      const termOfferings = await CourseOffering.find({
        _id: { $in: offeringIds },
        termId
      }).distinct('_id');
      filteredOfferingIds = termOfferings;
    }

    // Get sessions
    const sessionFilter: any = { offeringId: { $in: filteredOfferingIds } };
    if (startDate || endDate) {
      sessionFilter.date = {};
      if (startDate) sessionFilter.date.$gte = new Date(startDate as string);
      if (endDate) sessionFilter.date.$lte = new Date(endDate as string);
    }

    const sessions = await Session.find(sessionFilter).lean();
    const sessionIds = sessions.map(s => s._id);

    // Get attendance records
    const attendanceRecords = await AttendanceRecord.find({
      studentId,
      sessionId: { $in: sessionIds }
    }).lean();

    // Calculate percentage
    const totalSessions = sessionIds.length;
    const present = attendanceRecords.filter(r => r.status === 'present').length;
    const absent = attendanceRecords.filter(r => r.status === 'absent').length;
    const late = attendanceRecords.filter(r => r.status === 'late').length;
    const excused = attendanceRecords.filter(r => r.status === 'excused').length;

    // Count present + late as attended
    const attended = present + late;
    const percentage = totalSessions > 0 ? Math.round((attended / totalSessions) * 100) : 0;

    return successResponse(res, {
      studentId,
      totalSessions,
      present,
      absent,
      late,
      excused,
      attended,
      percentage
    });
  } catch (error: any) {
    return errorResponse(res, error.message, 500);
  }
}
```

- [ ] **Step 2: Add route**

```typescript
router.get(
  '/student/:studentId/percentage',
  authenticate,
  AttendanceController.getPercentage
);
```

- [ ] **Step 3: Run tests**

Run: `bun test apps/api/tests/integration/attendance.controller.test.ts`

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/controllers/attendance.controller.ts apps/api/src/routes/attendance.routes.ts
git commit -m "feat: add attendance percentage endpoint"
```

### Task 6.2: Add Attendance Trends Endpoint

- [ ] **Step 1: Add getTrends method**

Add to `apps/api/src/controllers/attendance.controller.ts`:

```typescript
// Get attendance trends over time
static async getTrends(req: AuthRequest, res: Response) {
  try {
    const { studentId, offeringId, termId, startDate, endDate, groupBy = 'day' } = req.query;

    // Build filter
    const filter: any = {};

    if (studentId) {
      filter.studentId = studentId;
    } else if (offeringId) {
      const sessions = await Session.find({ offeringId }).distinct('_id');
      filter.sessionId = { $in: sessions };
    } else if (termId) {
      const offerings = await CourseOffering.find({ termId }).distinct('_id');
      const sessions = await Session.find({ offeringId: { $in: offerings } }).distinct('_id');
      filter.sessionId = { $in: sessions };
    }

    // Get attendance records with session data
    const attendanceRecords = await AttendanceRecord.find(filter)
      .populate('sessionId')
      .lean();

    // Group by date based on groupBy parameter
    const groupedData: Record<string, { present: number; absent: number; late: number; total: number }> = {};

    for (const record of attendanceRecords) {
      const session: any = record.sessionId;
      if (!session || !session.date) continue;

      const date = new Date(session.date);
      let key: string;

      switch (groupBy) {
        case 'week':
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          key = weekStart.toISOString().split('T')[0];
          break;
        case 'month':
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          break;
        default: // day
          key = date.toISOString().split('T')[0];
      }

      if (!groupedData[key]) {
        groupedData[key] = { present: 0, absent: 0, late: 0, total: 0 };
      }

      groupedData[key].total++;
      if (record.status === 'present') groupedData[key].present++;
      else if (record.status === 'absent') groupedData[key].absent++;
      else if (record.status === 'late') groupedData[key].late++;
    }

    // Convert to array and sort by date
    const trends = Object.entries(groupedData)
      .map(([date, stats]) => ({
        date,
        ...stats,
        percentage: stats.total > 0 ? Math.round(((stats.present + stats.late) / stats.total) * 100) : 0
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return successResponse(res, {
      groupBy,
      trends
    });
  } catch (error: any) {
    return errorResponse(res, error.message, 500);
  }
}
```

- [ ] **Step 2: Add route**

```typescript
router.get(
  '/trends',
  authenticate,
  AttendanceController.getTrends
);
```

- [ ] **Step 3: Run tests**

Run: `bun test apps/api/tests/integration/attendance.controller.test.ts`

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/controllers/attendance.controller.ts apps/api/src/routes/attendance.routes.ts
git commit -m "feat: add attendance trends endpoint"
```

### Task 6.3: Add CSV Export Endpoint

- [ ] **Step 1: Add exportToCSV method**

Add to `apps/api/src/controllers/attendance.controller.ts`:

```typescript
// Export attendance to CSV
static async exportToCSV(req: AuthRequest, res: Response) {
  try {
    const { offeringId, sessionId, startDate, endDate } = req.query;

    // Build filter
    const filter: any = {};

    if (sessionId) {
      filter.sessionId = sessionId;
    } else if (offeringId) {
      const sessions = await Session.find({ offeringId }).distinct('_id');
      filter.sessionId = { $in: sessions };
    }

    // Apply date range if provided
    if (startDate || endDate) {
      const sessions = await Session.find({
        _id: filter.sessionId || { $ne: null },
        date: {
          ...(startDate && { $gte: new Date(startDate as string) }),
          ...(endDate && { $lte: new Date(endDate as string) })
        }
      }).distinct('_id');
      filter.sessionId = { $in: sessions };
    }

    const attendanceRecords = await AttendanceRecord.find(filter)
      .populate('sessionId')
      .populate({
        path: 'studentId',
        populate: ['userId', 'departmentId']
      })
      .lean();

    // Generate CSV
    const csvHeaders = ['Date', 'Student Name', 'Roll Number', 'Department', 'Status', 'Remarks'];
    const csvRows = attendanceRecords.map((record: any) => {
      const session: any = record.sessionId || {};
      const student: any = record.studentId || {};
      const user: any = student.userId || {};
      const department: any = student.departmentId || {};

      return [
        session.date ? new Date(session.date).toISOString().split('T')[0] : '',
        user.name || '',
        student.rollNumber || '',
        department.name || '',
        record.status || '',
        record.remarks || ''
      ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(',');
    });

    const csv = [csvHeaders.join(','), ...csvRows].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=attendance-${Date.now()}.csv`);

    return res.send(csv);
  } catch (error: any) {
    return errorResponse(res, error.message, 500);
  }
}
```

- [ ] **Step 2: Add route**

```typescript
router.get(
  '/export',
  authorize('super_admin', 'admin', 'faculty', 'staff'),
  AttendanceController.exportToCSV
);
```

- [ ] **Step 3: Run tests**

Run: `bun test apps/api/tests/integration/attendance.controller.test.ts`

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/controllers/attendance.controller.ts apps/api/src/routes/attendance.routes.ts
git commit -m "feat: add attendance CSV export endpoint"
```

### Task 6.4: Add Low Attendance Report

**Files**:
- Modify: `apps/api/src/controllers/reports.controller.ts`

- [ ] **Step 1: Add getLowAttendance method**

Add to `apps/api/src/controllers/reports.controller.ts`:

```typescript
// Get low attendance students report
static async getLowAttendance(req: AuthRequest, res: Response) {
  try {
    const threshold = parseInt(req.query.threshold as string) || 75;
    const { termId, courseId, departmentId } = req.query;

    // Build filters
    const offeringFilter: any = {};
    if (termId) offeringFilter.termId = termId;
    if (courseId) offeringFilter.courseId = courseId;

    const offerings = await CourseOffering.find(offeringFilter).distinct('_id');

    // Get all enrollments for filtered offerings
    const enrollments = await Enrollment.find({
      offeringId: { $in: offerings },
      status: 'active'
    }).lean();

    // Filter by department if specified
    let studentIds = enrollments.map((e: any) => e.studentId);
    if (departmentId) {
      const deptStudents = await Student.find({ departmentId }).distinct('_id');
      studentIds = studentIds.filter((id: any) => deptStudents.includes(id));
    }

    // Calculate attendance for each student
    const students = await Student.find({ _id: { $in: studentIds } })
      .populate('userId', 'name email')
      .populate('departmentId', 'name code')
      .lean();

    const result = [];

    for (const student of students) {
      const studentEnrollments = enrollments.filter((e: any) =>
        e.studentId.toString() === student._id.toString()
      );
      const studentOfferingIds = studentEnrollments.map((e: any) => e.offeringId);

      const sessions = await Session.find({
        offeringId: { $in: studentOfferingIds }
      }).distinct('_id');

      const attendanceRecords = await AttendanceRecord.find({
        studentId: student._id,
        sessionId: { $in: sessions }
      });

      const totalSessions = sessions.length;
      const present = attendanceRecords.filter(r => r.status === 'present').length;
      const late = attendanceRecords.filter(r => r.status === 'late').length;
      const percentage = totalSessions > 0
        ? Math.round(((present + late) / totalSessions) * 100)
        : 0;

      if (percentage < threshold) {
        result.push({
          studentId: student._id,
          name: (student as any).userId?.name || 'Unknown',
          email: (student as any).userId?.email || '',
          rollNumber: student.rollNumber,
          department: (student as any).departmentId?.name || 'N/A',
          totalSessions,
          present,
          late,
          percentage
        });
      }
    }

    // Sort by percentage ascending
    result.sort((a, b) => a.percentage - b.percentage);

    return successResponse(res, {
      threshold,
      count: result.length,
      students: result
    });
  } catch (error: any) {
    return errorResponse(res, error.message, 500);
  }
}
```

- [ ] **Step 2: Add route**

```typescript
router.get(
  '/low-attendance',
  authenticate,
  ReportsController.getLowAttendance
);
```

- [ ] **Step 3: Run tests**

Run: `bun test apps/api/tests/integration/reports.controller.test.ts`

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/controllers/reports.controller.ts apps/api/src/routes/reports.routes.ts
git commit -m "feat: add low attendance report endpoint"
```

### Task 6.5: Add Student Attendance Dashboard

- [ ] **Step 1: Add getDashboard method to attendance controller**

```typescript
// Get student attendance dashboard
static async getStudentDashboard(req: AuthRequest, res: Response) {
  try {
    const { studentId } = req.params;
    const { termId } = req.query;

    // Verify student exists
    const student = await Student.findById(studentId)
      .populate('userId', 'name email')
      .populate('departmentId', 'name code')
      .lean();

    if (!student) {
      return notFoundResponse(res, 'Student');
    }

    // Get enrollments
    const enrollmentFilter: any = { studentId };
    let enrollments = await Enrollment.find(enrollmentFilter).lean();

    // Filter by term if provided
    if (termId) {
      const termOfferings = await CourseOffering.find({ termId }).distinct('_id');
      enrollments = enrollments.filter((e: any) => termOfferings.includes(e.offeringId));
    }

    const offeringIds = enrollments.map((e: any) => e.offeringId);

    // Get sessions and attendance
    const sessions = await Session.find({ offeringId: { $in: offeringIds } }).lean();
    const sessionIds = sessions.map(s => s._id);

    const attendanceRecords = await AttendanceRecord.find({
      studentId,
      sessionId: { $in: sessionIds }
    })
      .populate('sessionId')
      .sort({ markedAt: -1 })
      .limit(10)
      .lean();

    // Calculate overall stats
    const totalSessions = sessionIds.length;
    const present = attendanceRecords.filter(r => r.status === 'present').length;
    const absent = attendanceRecords.filter(r => r.status === 'absent').length;
    const late = attendanceRecords.filter(r => r.status === 'late').length;
    const excused = attendanceRecords.filter(r => r.status === 'excused').length;
    const percentage = totalSessions > 0 ? Math.round((present / totalSessions) * 100) : 0;

    // Course-wise breakdown
    const courseBreakdown = [];
    for (const enrollment of enrollments) {
      const offering = await CourseOffering.findById(enrollment.offeringId)
        .populate('courseId')
        .lean();

      if (!offering) continue;

      const offeringSessions = sessions.filter(s =>
        s.offeringId.toString() === offering._id.toString()
      );
      const offeringSessionIds = offeringSessions.map(s => s._id);

      const offeringAttendance = await AttendanceRecord.find({
        studentId,
        sessionId: { $in: offeringSessionIds }
      });

      const coursePresent = offeringAttendance.filter(r => r.status === 'present').length;
      const courseLate = offeringAttendance.filter(r => r.status === 'late').length;
      const coursePercentage = offeringSessions.length > 0
        ? Math.round(((coursePresent + courseLate) / offeringSessions.length) * 100)
        : 0;

      courseBreakdown.push({
        courseId: (offering as any).courseId._id,
        courseName: (offering as any).courseId.name,
        courseCode: (offering as any).courseId.code,
        totalSessions: offeringSessions.length,
        present: coursePresent,
        late: courseLate,
        percentage: coursePercentage
      });
    }

    return successResponse(res, {
      student: {
        id: student._id,
        name: (student as any).userId?.name,
        email: (student as any).userId?.email,
        rollNumber: student.rollNumber,
        department: (student as any).departmentId?.name
      },
      overall: {
        totalSessions,
        present,
        absent,
        late,
        excused,
        percentage
      },
      courseBreakdown,
      recentAttendance: attendanceRecords.map(r => ({
        date: (r as any).sessionId?.date,
        status: r.status,
        remarks: r.remarks
      })),
      warnings: percentage < 75 ? ['Attendance below 75% threshold'] : []
    });
  } catch (error: any) {
    return errorResponse(res, error.message, 500);
  }
}
```

- [ ] **Step 2: Add route**

```typescript
router.get(
  '/student/:studentId/dashboard',
  authenticate,
  AttendanceController.getStudentDashboard
);
```

- [ ] **Step 3: Run tests**

Run: `bun test apps/api/tests/integration/attendance.controller.test.ts`

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/controllers/attendance.controller.ts apps/api/src/routes/attendance.routes.ts
git commit -m "feat: add student attendance dashboard endpoint"
```

### Task 6.6: Add Charts Data API

- [ ] **Step 1: Add getChartsData method to reports controller**

```typescript
// Get charts data for analytics
static async getChartsData(req: AuthRequest, res: Response) {
  try {
    const { chartType } = req.params;
    const { termId } = req.query;

    let data: any = {};

    switch (chartType) {
      case 'enrollment-trends':
        // Enrollment by term
        const terms = await Term.find().sort({ startDate: -1 }).limit(10).lean();
        data = await Promise.all(terms.map(async (term) => {
          const offerings = await CourseOffering.find({ termId: term._id }).distinct('_id');
          const enrollmentCount = await Enrollment.countDocuments({
            offeringId: { $in: offerings }
          });
          return {
            label: term.name,
            value: enrollmentCount
          };
        }));
        break;

      case 'attendance-stats':
        // Attendance by course
        const offerings = await CourseOffering.find(
          termId ? { termId } : {}
        ).lean();

        data = await Promise.all(offerings.map(async (offering) => {
          const sessions = await Session.find({ offeringId: offering._id }).distinct('_id');
          const attendanceRecords = await AttendanceRecord.find({
            sessionId: { $in: sessions }
          });

          const present = attendanceRecords.filter(r => r.status === 'present').length;
          const total = attendanceRecords.length;
          const percentage = total > 0 ? Math.round((present / total) * 100) : 0;

          const course = await Course.findById(offering.courseId).lean();

          return {
            label: (course as any)?.name || 'Unknown',
            present,
            absent: total - present,
            percentage
          };
        }));
        break;

      case 'course-popularity':
        // Most enrolled courses
        const popularOfferings = await CourseOffering.find(
          termId ? { termId } : {}
        ).lean();

        const courseEnrollments = new Map();

        for (const offering of popularOfferings) {
          const count = await Enrollment.countDocuments({ offeringId: offering._id });
          const existing = courseEnrollments.get(offering.courseId.toString()) || 0;
          courseEnrollments.set(offering.courseId.toString(), existing + count);
        }

        data = await Promise.all(
          Array.from(courseEnrollments.entries()).slice(0, 10).map(async ([courseId, count]) => {
            const course = await Course.findById(courseId).lean();
            return {
              label: (course as any)?.name || 'Unknown',
              value: count
            };
          })
        );
        break;

      case 'faculty-load':
        // Teaching load distribution
        const allOfferings = await CourseOffering.find(
          termId ? { termId } : {}
        ).distinct('_id');

        const facultyLoads = await OfferingFaculty.aggregate([
          { $match: { offeringId: { $in: allOfferings } } },
          {
            $group: {
              _id: '$facultyId',
              count: { $sum: 1 }
            }
          },
          { $sort: { count: -1 } },
          { $limit: 20 }
        ]);

        data = await Promise.all(
          facultyLoads.map(async (item) => {
            const faculty = await Faculty.findById(item._id)
              .populate('userId', 'name')
              .lean();
            return {
              label: (faculty as any)?.userId?.name || 'Unknown',
              value: item.count
            };
          })
        );
        break;

      default:
        return errorResponse(res, `Unknown chart type: ${chartType}`, 400);
    }

    return successResponse(res, {
      chartType,
      data
    });
  } catch (error: any) {
    return errorResponse(res, error.message, 500);
  }
}
```

- [ ] **Step 2: Add route**

```typescript
router.get(
  '/charts/:chartType',
  authenticate,
  ReportsController.getChartsData
);
```

- [ ] **Step 3: Run tests**

Run: `bun test apps/api/tests/integration/reports.controller.test.ts`

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/controllers/reports.controller.ts apps/api/src/routes/reports.routes.ts
git commit -m "feat: add charts data API endpoint"
```

---

## Final Steps

### Task 7.1: Update TODO File

- [ ] **Step 1: Mark all items complete**

Update `TODO.backend.todo` - change all `[ ]` to `[x]` for implemented items.

- [ ] **Step 2: Run full test suite**

Run: `bun test apps/api/tests/`

- [ ] **Step 3: Commit**

```bash
git add TODO.backend.todo
git commit -m "docs: update TODO - all remaining features implemented"
```

---

## Success Criteria

- All E2E tests passing (27/27)
- All TODO items marked complete
- New features follow existing code patterns
- Full test coverage for new endpoints
- Email notifications working (console mode)

