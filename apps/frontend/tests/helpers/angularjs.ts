/**
 * AngularJS-specific helpers for Playwright testing
 *
 * These helpers provide utilities for testing AngularJS (v1.x) applications.
 */

import type { Page } from '@playwright/test';

/**
 * Wait for AngularJS to finish rendering and digest cycles
 */
export async function waitForAngularJS(page: Page): Promise<void> {
  await page.waitForLoadState('domcontentloaded');

  // Try using Angular's testability API if available
  try {
    await page.waitForFunction(() => {
      const testabilities = (window as any).getAllAngularTestabilities?.();
      if (testabilities) {
        return testabilities.some((t: any) => t.isStable());
      }
      // Fallback: check if angular exists and document is ready
      return !!(window as any).angular && document.readyState === 'complete';
    }, { timeout: 5000 });
  } catch {
    // If testability API isn't available, just wait a bit
    await page.waitForTimeout(500);
  }
}

/**
 * Navigate to a route and wait for AngularJS to render
 */
export async function gotoRoute(page: Page, route: string): Promise<void> {
  await page.goto(`/#!/${route}`);
  await waitForAngularJS(page);
}

/**
 * Fill an input bound to an ng-model
 * Triggers AngularJS digest cycle after filling
 */
export async function fillNgModel(page: Page, model: string, value: string): Promise<void> {
  const input = page.locator(`[ng-model="${model}"]`).first();
  await input.fill(value);

  // Trigger AngularJS digest cycle manually if needed
  await input.evaluate((el: HTMLInputElement) => {
    const angularEl = (window as any).angular.element(el);
    const ngModelController = angularEl.controller()?.ngModel;
    if (ngModelController) {
      ngModelController.$setViewValue(el.value);
      ngModelController.$render();
    }
  });
}

/**
 * Click an element with ng-click and wait for AngularJS
 */
export async function clickNgClick(page: Page, selector: string): Promise<void> {
  await page.locator(selector).click();
  await page.waitForTimeout(100); // Small delay for digest cycle
}

/**
 * Wait for an element to be visible (useful for ng-if/ng-show)
 */
export async function waitForNgIf(page: Page, selector: string): Promise<void> {
  await page.locator(selector).waitFor({ state: 'visible' });
}

/**
 * Check if element has AngularJS ng-class
 */
export async function hasNgClass(page: Page, selector: string, className: string): Promise<boolean> {
  const element = page.locator(selector).first();
  const classes = await element.getAttribute('class');
  return classes?.includes(className) ?? false;
}
