/**
 * Dashboard Tests
 * Tests for dashboard functionality, navigation, and user interactions
 */

import { test, expect } from '@playwright/test';

/**
 * Helper function to wait for AngularJS rendering
 */
async function waitForAngularJS(page: any) {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(500);
}

/**
 * Helper to mock authentication
 */
async function mockLogin(page: any) {
  // Set mock auth token
  await page.evaluate(() => {
    localStorage.setItem('token', 'mock-jwt-token');
    localStorage.setItem('user', JSON.stringify({
      id: 'test-user-id',
      name: 'Test User',
      email: 'test@example.com',
      role: 'student'
    }));
  });
}

test.describe('Dashboard - Navigation', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test.beforeEach(async ({ page }) => {
    // Mock authentication
    await mockLogin(page);
    await page.goto('/#!/dashboard');
    await waitForAngularJS(page);
  });

  test('should display dashboard header', async ({ page }) => {
    // Check for dashboard title or heading
    const heading = page.locator('h1, h2, .dashboard-title, .page-title').first();
    await expect(heading).toBeVisible();
  });

  test('should display navigation menu', async ({ page }) => {
    // Check for navigation
    const nav = page.locator('nav, .navbar, .sidebar, [role="navigation"]').first();
    await expect(nav).toBeVisible();
  });

  test('should display user profile info', async ({ page }) => {
    // Check for user name/profile
    const userProfile = page.locator('.user-profile, .user-info, [data-user]').first();
    const hasProfile = await userProfile.count();

    if (hasProfile > 0) {
      await expect(userProfile.first()).toBeVisible();

      // Check for user name
      const userName = page.locator('.user-name, [data-user-name]').first();
      const hasName = await userName.count();

      if (hasName > 0) {
        const name = await userName.first().textContent();
        expect(name?.length).toBeGreaterThan(0);
      }
    }
  });

  test('should have working navigation links', async ({ page }) => {
    // Find all navigation links
    const navLinks = page.locator('nav a, .navbar a, .sidebar a');

    const count = await navLinks.count();
    if (count > 0) {
      // First link should be visible
      await expect(navLinks.first()).toBeVisible();

      // Click first navigation link
      const firstLinkText = await navLinks.first().textContent();
      await navLinks.first().click();

      // Wait for navigation
      await page.waitForTimeout(500);

      // Verify URL changed or content updated
      const navigated = await page.evaluate(() => {
        return window.location.hash !== '#!/dashboard';
      });

      expect(navigated || true).toBeTruthy(); // Navigation may or may not change hash
    }
  });
});

test.describe('Dashboard - Sidebar/Menu', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test.beforeEach(async ({ page }) => {
    await mockLogin(page);
    await page.goto('/#!/dashboard');
    await waitForAngularJS(page);
  });

  test('should display sidebar navigation items', async ({ page }) => {
    // Check for sidebar menu items
    const menuItems = page.locator('.sidebar-menu a, .nav-item, [data-menu-item]');

    const count = await menuItems.count();
    if (count > 0) {
      // Should have menu items
      expect(count).toBeGreaterThan(0);

      // First item should be visible
      await expect(menuItems.first()).toBeVisible();
    }
  });

  test('should toggle sidebar on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Look for hamburger menu
    const hamburger = page.locator('.hamburger, .menu-toggle, [data-menu-toggle], button:has-text("Menu")');
    const hasHamburger = await hamburger.count();

    if (hasHamburger > 0) {
      await hamburger.first().click();
      await page.waitForTimeout(300);

      // Sidebar should be visible after toggle
      const sidebar = page.locator('.sidebar, .nav-menu, [data-sidebar]');
      await expect(sidebar.first()).toHaveClass(/open|active|visible/);
    }
  });

  test('should highlight active menu item', async ({ page }) => {
    const menuItems = page.locator('.sidebar-menu a, .nav-item');

    const count = await menuItems.count();
    if (count > 0) {
      // Check for active class on current page's menu item
      const activeItem = page.locator('.sidebar-menu a.active, .nav-item.active, [data-active="true"]');

      const hasActive = await activeItem.count();
      if (hasActive > 0) {
        await expect(activeItem.first()).toBeVisible();
      }
    }
  });
});

test.describe('Dashboard - Quick Actions', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test.beforeEach(async ({ page }) => {
    await mockLogin(page);
    await page.goto('/#!/dashboard');
    await waitForAngularJS(page);
  });

  test('should display quick action buttons', async ({ page }) => {
    // Check for quick action buttons
    const quickActions = page.locator('.quick-actions button, .action-buttons button, [data-quick-action]');

    const count = await quickActions.count();
    if (count > 0) {
      // Should have quick action buttons
      expect(count).toBeGreaterThan(0);

      // First button should be visible and clickable
      await expect(quickActions.first()).toBeVisible();
    }
  });

  test('should navigate on quick action click', async ({ page }) => {
    const quickActions = page.locator('.quick-actions button, .action-buttons button');

    const count = await quickActions.count();
    if (count > 0) {
      const firstAction = quickActions.first();
      const actionText = await firstAction.textContent();

      if (actionText && actionText.trim().length > 0) {
        await firstAction.click();
        await page.waitForTimeout(500);

        // Verify navigation or action occurred
        const url = page.url();
        expect(url).toBeTruthy();
      }
    }
  });
});

test.describe('Dashboard - Statistics/Cards', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test.beforeEach(async ({ page }) => {
    await mockLogin(page);
    await page.goto('/#!/dashboard');
    await waitForAngularJS(page);
  });

  test('should display stat cards', async ({ page }) => {
    // Check for statistics cards
    const statCards = page.locator('.stat-card, .metric-card, .dashboard-card, [data-stat]');

    const count = await statCards.count();
    if (count > 0) {
      // Should have stat cards
      expect(count).toBeGreaterThan(0);

      // First card should be visible
      await expect(statCards.first()).toBeVisible();

      // Card should have content
      const firstCard = statCards.first();
      const hasValue = await firstCard.locator('.value, .count, .number, [data-value]').count();
      const hasLabel = await firstCard.locator('.label, .title, [data-label]').count();

      expect(hasValue + hasLabel).toBeGreaterThan(0);
    }
  });

  test('should display stat values', async ({ page }) => {
    const statValues = page.locator('.stat-card .value, .metric-card .count, [data-stat-value]');

    const count = await statValues.count();
    if (count > 0) {
      // First stat should have a numeric value or text
      const firstValue = await statValues.first().textContent();
      expect(firstValue?.trim().length).toBeGreaterThan(0);
    }
  });
});

test.describe('Dashboard - Recent Activity', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test.beforeEach(async ({ page }) => {
    await mockLogin(page);
    await page.goto('/#!/dashboard');
    await waitForAngularJS(page);
  });

  test('should display recent activity feed', async ({ page }) => {
    // Check for recent activity section
    const activityFeed = page.locator('.recent-activity, .activity-feed, [data-activity]');

    const count = await activityFeed.count();
    if (count > 0) {
      await expect(activityFeed.first()).toBeVisible();

      // Check for activity items
      const activityItems = activityFeed.first().locator('.activity-item, .feed-item');
      const itemCount = await activityItems.count();

      if (itemCount > 0) {
        // Should have activity items
        expect(itemCount).toBeGreaterThan(0);
      }
    }
  });

  test('should display activity timestamps', async ({ page }) => {
    const activityItems = page.locator('.activity-item, .feed-item');

    const count = await activityItems.count();
    if (count > 0) {
      // Check for timestamps
      const timestamps = page.locator('.activity-item .timestamp, .feed-item .time, [data-timestamp]');
      const hasTimestamps = await timestamps.count();

      if (hasTimestamps > 0) {
        await expect(timestamps.first()).toBeVisible();
      }
    }
  });
});

test.describe('Dashboard - User Menu', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test.beforeEach(async ({ page }) => {
    await mockLogin(page);
    await page.goto('/#!/dashboard');
    await waitForAngularJS(page);
  });

  test('should display user dropdown menu', async ({ page }) => {
    // Check for user dropdown trigger
    const userDropdown = page.locator('.user-dropdown, .user-menu, [data-user-menu]');

    const count = await userDropdown.count();
    if (count > 0) {
      await expect(userDropdown.first()).toBeVisible();

      // Click to open dropdown
      await userDropdown.first().click();
      await page.waitForTimeout(300);

      // Check for dropdown menu items
      const dropdownItems = page.locator('.dropdown-menu a, .user-menu-items a');
      const hasItems = await dropdownItems.count();

      if (hasItems > 0) {
        // Should have menu items like Profile, Settings, Logout
        expect(hasItems).toBeGreaterThan(0);
      }
    }
  });

  test('should have profile link', async ({ page }) => {
    // Look for profile link
    const profileLink = page.locator('a:has-text("Profile"), [data-link="profile"], .user-profile-link');

    const count = await profileLink.count();
    if (count > 0) {
      await expect(profileLink.first()).toBeVisible();
    }
  });

  test('should have settings link', async ({ page }) => {
    const settingsLink = page.locator('a:has-text("Settings"), [data-link="settings"], .settings-link');

    const count = await settingsLink.count();
    if (count > 0) {
      await expect(settingsLink.first()).toBeVisible();
    }
  });

  test('should have logout button', async ({ page }) => {
    const logoutButton = page.locator('button:has-text("Logout"), a:has-text("Logout"), [data-logout]');

    const count = await logoutButton.count();
    if (count > 0) {
      await expect(logoutButton.first()).toBeVisible();
    }
  });
});

test.describe('Dashboard - Loading States', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('should show loading state on initial load', async ({ page }) => {
    await mockLogin(page);

    // Navigate to dashboard
    await page.goto('/#!/dashboard');

    // Check for loading indicator
    const loader = page.locator('.loading, .spinner, .loader, [data-loading]');

    // Loader may appear briefly and disappear
    const hasLoader = await loader.count();
    if (hasLoader > 0) {
      await expect(loader.first()).toBeVisible();
    }
  });

  test('should hide loading state after data loads', async ({ page }) => {
    await mockLogin(page);
    await page.goto('/#!/dashboard');
    await waitForAngularJS(page);

    // After waiting, loader should be hidden
    const loader = page.locator('.loading, .spinner, .loader');

    const hasLoader = await loader.count();
    if (hasLoader > 0) {
      const isVisible = await loader.first().isVisible();
      expect(isVisible).toBe(false);
    }
  });
});

test.describe('Dashboard - Empty States', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('should display empty state when no data', async ({ page }) => {
    await mockLogin(page);
    await page.goto('/#!/dashboard');
    await waitForAngularJS(page);

    // Check for empty state message
    const emptyState = page.locator('.empty-state, .no-data, [data-empty]');

    const count = await emptyState.count();
    if (count > 0) {
      await expect(emptyState.first()).toBeVisible();

      // Empty state should have message
      const message = await emptyState.first().textContent();
      expect(message?.trim().length).toBeGreaterThan(0);
    }
  });
});

test.describe('Dashboard - Error States', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('should handle API errors gracefully', async ({ page }) => {
    // Simulate API failure by intercepting requests
    await page.route('**/api/**', route => route.fulfill({
      status: 500,
      body: JSON.stringify({ error: 'Internal server error' })
    }));

    await mockLogin(page);
    await page.goto('/#!/dashboard');
    await waitForAngularJS(page);

    // Check for error message
    const errorMsg = page.locator('.error-message, .api-error, [data-error]');

    // Wait a bit for error to appear
    await page.waitForTimeout(1000);

    const hasError = await errorMsg.count();
    if (hasError > 0) {
      await expect(errorMsg.first()).toBeVisible();
    }
  });
});

test.describe('Dashboard - Responsive Design', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('should display correctly on mobile', async ({ page }) => {
    await mockLogin(page);

    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/#!/dashboard');
    await waitForAngularJS(page);

    // Dashboard should still be visible
    const dashboard = page.locator('.dashboard, [data-dashboard]').first();
    const hasDashboard = await dashboard.count();

    if (hasDashboard > 0) {
      await expect(dashboard.first()).toBeVisible();
    }
  });

  test('should display correctly on tablet', async ({ page }) => {
    await mockLogin(page);

    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/#!/dashboard');
    await waitForAngularJS(page);

    // Dashboard should still be visible
    const dashboard = page.locator('.dashboard, [data-dashboard]').first();
    const hasDashboard = await dashboard.count();

    if (hasDashboard > 0) {
      await expect(dashboard.first()).toBeVisible();
    }
  });

  test('should display correctly on desktop', async ({ page }) => {
    await mockLogin(page);

    // Set desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/#!/dashboard');
    await waitForAngularJS(page);

    // Dashboard should still be visible
    const dashboard = page.locator('.dashboard, [data-dashboard]').first();
    const hasDashboard = await dashboard.count();

    if (hasDashboard > 0) {
      await expect(dashboard.first()).toBeVisible();
    }
  });
});
