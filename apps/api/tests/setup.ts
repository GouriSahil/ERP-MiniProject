/**
 * Test setup file for Bun test runner
 * This file runs before all tests
 */

// Set test environment
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key';
process.env.MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/erp-test';

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: console.log,
  error: () => {}, // Silence error logs in tests
  warn: () => {},  // Silence warn logs in tests
  info: () => {},  // Silence info logs in tests
};

export {};
