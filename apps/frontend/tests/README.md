# Playwright Tests for ERP Frontend

This directory contains end-to-end tests for the AngularJS ERP frontend using Playwright.

## Setup

Playwright is already installed. If you need to reinstall browsers:

```bash
bunx playwright install
```

## Running Tests

```bash
# Run all tests (headless)
bun run test

# Run tests in UI mode (interactive)
bun run test:ui

# Run tests in headed mode (see browser)
bun run test:headed

# Debug tests
bun run test:debug

# View HTML test report
bun run test:report
```

## Writing Tests for AngularJS

### Key Considerations

1. **Wait for AngularJS rendering**: Use `waitForTimeout(500)` after navigation to let AngularJS compile and render templates.

2. **Use correct URL format**: Routes use `#!/path` format (e.g., `/#!/login`).

3. **Select AngularJS elements**:
   - `page.locator('[ng-model]')` - Find elements with ng-model binding
   - `page.locator('[ng-click]')` - Find elements with ng-click handlers
   - `page.locator('[ng-if]')` - Find conditional elements

### Example Test

```typescript
import { test, expect } from '@playwright/test';

test.describe('Login', () => {
  test('should login successfully', async ({ page }) => {
    await page.goto('/#!/login');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500); // Wait for AngularJS

    await page.locator('#email').fill('user@example.com');
    await page.locator('#password').fill('password');

    await page.getByRole('button', { name: /Sign In/i }).click();
  });
});
```

## Test Structure

```
tests/
├── example.spec.ts       # Example tests demonstrating patterns
├── helpers/
│   └── angularjs.ts      # AngularJS-specific helper functions
└── README.md            # This file
```

## Configuration

Playwright configuration is in `playwright.config.ts` at the project root.

- Base URL: `http://localhost:4200`
- Browsers: Chromium, Firefox, WebKit
- Auto-starts web server using `http-server`
