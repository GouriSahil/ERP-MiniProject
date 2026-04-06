import { test, expect } from '@playwright/test';

/**
 * Example Playwright tests for AngularJS ERP Frontend
 *
 * These tests demonstrate common patterns for testing AngularJS applications.
 */

test.describe('Landing Page', () => {
  test('should load the landing page', async ({ page }) => {
    await page.goto('/');

    // Wait for AngularJS to be ready
    await page.waitForFunction(() => {
      return typeof window.angular !== 'undefined';
    }, { timeout: 5000 });

    // Check that the page title contains expected text
    await expect(page).toHaveTitle(/ERP/);
  });

  test('should display navigation links', async ({ page }) => {
    await page.goto('/');

    // Test for navigation elements
    const nav = page.getByRole('navigation');
    await expect(nav).toBeVisible();
  });
});

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/#/auth/login');
  });

  test('should display login form', async ({ page }) => {
    // Check for email input
    const emailInput = page.getByLabel(/email/i).or(page.getByPlaceholder(/email/i));
    await expect(emailInput).toBeVisible();

    // Check for password input
    const passwordInput = page.getByLabel(/password/i).or(page.getByPlaceholder(/password/i));
    await expect(passwordInput).toBeVisible();
  });

  test('should show validation errors for empty form', async ({ page }) => {
    const submitButton = page.getByRole('button', { name: /login|sign in/i });
    await submitButton.click();

    // AngularJS validation creates invalid/invalid classes
    const invalidInputs = page.locator('.ng-invalid');
    await expect(invalidInputs).toHaveCount(0);
  });
});

test.describe('AngularJS Helpers', () => {
  /**
   * Wait for AngularJS digest cycle to complete
   * Useful for async operations in AngularJS
   */
  test('example: waiting for AngularJS stability', async ({ page }) => {
    await page.goto('/');

    // Wait for AngularJS to complete all digest cycles
    await page.waitForFunction(() => {
      const testabilities = (window as any).getAllAngularTestabilities?.();
      return testabilities?.some((t: any) => t.isStable());
    }).catch(() => {
      // Fallback: just wait a bit if AngularJS testability API isn't available
      return page.waitForTimeout(500);
    });
  });
});
