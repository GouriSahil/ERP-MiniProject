import { test, expect } from '@playwright/test';

/**
 * Playwright tests for AngularJS ERP Frontend
 *
 * These tests demonstrate common patterns for testing AngularJS applications.
 */

test.describe('Landing Page', () => {
  test('should load the landing page', async ({ page }) => {
    await page.goto('/#!/');

    // Wait for AngularJS to render
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500); // Give AngularJS time to compile and render

    // Check that the page loads
    await expect(page.locator('body')).toBeVisible();
  });

  test('should display hero section', async ({ page }) => {
    await page.goto('/#!/');

    // Wait for AngularJS to render
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);

    // Check for hero title
    const heroTitle = page.getByText(/Transform Your Institution/i);
    await expect(heroTitle).toBeVisible();
  });

  test('should display start trial button', async ({ page }) => {
    await page.goto('/#!/');

    // Wait for AngularJS to render
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);

    // Check for the start trial button
    const trialButton = page.getByText(/Start Free Trial/i);
    await expect(trialButton.first()).toBeVisible();
  });
});

test.describe('Authentication - Login', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/#!/login');
    // Wait for AngularJS to render
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
  });

  test('should display login form', async ({ page }) => {
    // Check for welcome message
    await expect(page.getByText(/Welcome Back/i)).toBeVisible();

    // Check for email input with proper id
    const emailInput = page.locator('#email');
    await expect(emailInput).toBeVisible();

    // Check for password input
    const passwordInput = page.locator('#password');
    await expect(passwordInput).toBeVisible();
  });

  test('should have email and password labels', async ({ page }) => {
    // Check for email label
    await expect(page.getByText(/Email Address/i)).toBeVisible();

    // Check for password label
    await expect(page.getByText(/Password/i)).toBeVisible();
  });

  test('should have sign in button', async ({ page }) => {
    const submitButton = page.getByRole('button', { name: /Sign In/i });
    await expect(submitButton).toBeVisible();
  });

  test('should have create account link', async ({ page }) => {
    const createAccountLink = page.getByRole('link', { name: /Create Account/i });
    await expect(createAccountLink).toBeVisible();
  });

  test('should navigate to register page', async ({ page }) => {
    const createAccountLink = page.getByRole('link', { name: /Create Account/i });
    await createAccountLink.click();

    // Check that we're on the register page (URL should change)
    await page.waitForURL(/\/register/, { timeout: 5000 });
  });
});

test.describe('Form Interactions', () => {
  test('should fill email input', async ({ page }) => {
    await page.goto('/#!/login');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);

    const emailInput = page.locator('#email');
    await emailInput.fill('test@example.com');

    // Verify the value was set
    await expect(emailInput).toHaveValue('test@example.com');
  });

  test('should fill password input', async ({ page }) => {
    await page.goto('/#!/login');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);

    const passwordInput = page.locator('#password');
    await passwordInput.fill('password123');

    // Verify the value was set
    await expect(passwordInput).toHaveValue('password123');
  });
});

test.describe('AngularJS Specific', () => {
  /**
   * Test ng-click functionality
   */
  test('should handle ng-click on buttons', async ({ page }) => {
    await page.goto('/#!/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);

    // Find elements with ng-click
    const ngClickElements = page.locator('[ng-click]');
    const count = await ngClickElements.count();

    // There should be some elements with ng-click
    expect(count).toBeGreaterThan(0);
  });

  /**
   * Test ng-model bindings
   */
  test('should have ng-model bindings on form', async ({ page }) => {
    await page.goto('/#!/login');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);

    // Find elements with ng-model
    const ngModelElements = page.locator('[ng-model]');
    const count = await ngModelElements.count();

    // There should be form elements with ng-model
    expect(count).toBeGreaterThan(0);
  });
});
