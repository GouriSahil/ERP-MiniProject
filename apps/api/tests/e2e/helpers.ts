/**
 * E2E API Test Helpers
 * This module provides utilities for E2E testing with a real HTTP server
 */

import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import type { Application } from 'express';
import { createServer, Server as HttpServer } from 'http';
import { AddressInfo } from 'net';

// Store server instances for cleanup
let mongoServer: MongoMemoryServer | null = null;
let app: Application | null = null;
let httpServer: HttpServer | null = null;
let serverUrl: string | null = null;

/**
 * Setup E2E test environment - starts MongoDB and Express server
 */
export async function setupE2ETest(): Promise<{
  serverUrl: string;
  mongoUri: string;
}> {
  // Start in-memory MongoDB
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();

  // Connect to MongoDB
  await mongoose.connect(mongoUri);
  console.log(`[E2E Test] Connected to in-memory MongoDB`);

  // Set environment variables for the server
  process.env.NODE_ENV = 'test';
  process.env.MONGODB_URI = mongoUri;
  process.env.JWT_SECRET = 'test-jwt-secret-for-e2e-tests';
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-for-e2e-tests';
  process.env.PORT = '0'; // Use random available port

  // Import and start the Express app
  // We need to import it here after setting env vars
  const serverModule = await import('../../src/server');
  app = serverModule.default;

  // Create HTTP server
  httpServer = createServer(app);

  // Start listening on random port
  await new Promise<void>((resolve) => {
    httpServer!.listen(0, () => resolve());
  });

  // Get the actual port
  const port = (httpServer.address() as AddressInfo).port;
  serverUrl = `http://localhost:${port}`;

  console.log(`[E2E Test] Server started at ${serverUrl}`);

  return { serverUrl, mongoUri };
}

/**
 * Cleanup E2E test environment - stops server and MongoDB
 */
export async function teardownE2ETest(): Promise<void> {
  if (httpServer) {
    await new Promise<void>((resolve) => {
      httpServer!.close(() => resolve());
    });
    console.log('[E2E Test] HTTP server closed');
  }

  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    console.log('[E2E Test] MongoDB connection closed');
  }

  if (mongoServer) {
    await mongoServer.stop();
    console.log('[E2E Test] MongoDB Memory Server stopped');
  }

  // Reset instances
  app = null;
  httpServer = null;
  serverUrl = null;
  mongoServer = null;
}

/**
 * Clear database between tests
 */
export async function clearDatabase(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.dropDatabase();
    console.log('[E2E Test] Database cleared');
  }
}

/**
 * Get the server URL (must be called after setupE2ETest)
 */
export function getServerUrl(): string {
  if (!serverUrl) {
    throw new Error('Server URL not available. Call setupE2ETest() first.');
  }
  return serverUrl;
}

/**
 * E2E API request helper - makes HTTP requests to the test server
 */
export class E2EApiClient {
  private baseUrl: string;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private csrfToken: string | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  /**
   * Make an HTTP request to the API
   */
  async request<T = any>(
    endpoint: string,
    options: {
      method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
      body?: any;
      headers?: Record<string, string>;
      query?: Record<string, string>;
    } = {}
  ): Promise<{
    status: number;
    data: T;
    headers: Headers;
  }> {
    const { method = 'GET', body, headers = {}, query } = options;

    // Build URL with query params
    let url = `${this.baseUrl}${endpoint}`;
    if (query && Object.keys(query).length > 0) {
      const searchParams = new URLSearchParams(query);
      url += `?${searchParams.toString()}`;
    }

    // Build request headers
    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...headers,
    };

    // Add auth token if available
    if (this.accessToken) {
      requestHeaders['Authorization'] = `Bearer ${this.accessToken}`;
    }

    // Add CSRF token if available
    if (this.csrfToken) {
      requestHeaders['X-CSRF-Token'] = this.csrfToken;
    }

    // Make the request
    const response = await fetch(url, {
      method,
      headers: requestHeaders,
      body: body ? JSON.stringify(body) : undefined,
    });

    let data: T;
    const contentType = response.headers.get('content-type');

    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = (await response.text()) as T;
    }

    return {
      status: response.status,
      data,
      headers: response.headers,
    };
  }

  /**
   * Convenience method for GET requests
   */
  async get<T = any>(
    endpoint: string,
    query?: Record<string, string>,
    headers?: Record<string, string>
  ) {
    return this.request<T>(endpoint, { method: 'GET', query, headers });
  }

  /**
   * Convenience method for POST requests
   */
  async post<T = any>(
    endpoint: string,
    body?: any,
    headers?: Record<string, string>
  ) {
    return this.request<T>(endpoint, { method: 'POST', body, headers });
  }

  /**
   * Convenience method for PUT requests
   */
  async put<T = any>(
    endpoint: string,
    body?: any,
    headers?: Record<string, string>
  ) {
    return this.request<T>(endpoint, { method: 'PUT', body, headers });
  }

  /**
   * Convenience method for PATCH requests
   */
  async patch<T = any>(
    endpoint: string,
    body?: any,
    headers?: Record<string, string>
  ) {
    return this.request<T>(endpoint, { method: 'PATCH', body, headers });
  }

  /**
   * Convenience method for DELETE requests
   */
  async delete<T = any>(
    endpoint: string,
    headers?: Record<string, string>
  ) {
    return this.request<T>(endpoint, { method: 'DELETE', headers });
  }

  /**
   * Authenticate with the API and store tokens
   */
  async authenticate(email: string, password: string) {
    const response = await this.post<{
      success: boolean;
      data?: {
        accessToken: string;
        refreshToken: string;
        user: any;
      };
      error?: string;
    }>('/api/auth/login', {
      email,
      password,
    });

    if (response.status === 200 && response.data.success && response.data.data) {
      this.accessToken = response.data.data.accessToken;
      this.refreshToken = response.data.data.refreshToken;
      return response.data.data;
    }

    throw new Error(
      `Authentication failed: ${response.data.error || 'Unknown error'}`
    );
  }

  /**
   * Register a new user and authenticate
   */
  async registerAndAuthenticate(
    name: string,
    email: string,
    password: string,
    role: string = 'student'
  ) {
    const response = await this.post<{
      success: boolean;
      data?: any;
      error?: string;
    }>('/api/auth/register', {
      name,
      email,
      password,
      role,
    });

    if (response.status !== 201 || !response.data.success) {
      throw new Error(
        `Registration failed: ${response.data.error || 'Unknown error'}`
      );
    }

    // Now authenticate
    return this.authenticate(email, password);
  }

  /**
   * Set access token directly (useful for testing with pre-generated tokens)
   */
  setAccessToken(token: string) {
    this.accessToken = token;
  }

  /**
   * Get current access token
   */
  getAccessToken(): string | null {
    return this.accessToken;
  }

  /**
   * Clear all tokens
   */
  clearTokens() {
    this.accessToken = null;
    this.refreshToken = null;
    this.csrfToken = null;
  }

  /**
   * Refresh access token using stored refresh token
   */
  async refreshAccessToken() {
    if (!this.refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await this.post<{
      success: boolean;
      data?: { token: string };
      error?: string;
    }>('/api/auth/refresh');

    if (response.status === 200 && response.data.success && response.data.data) {
      this.accessToken = response.data.data.token;
      return response.data.data.token;
    }

    throw new Error(
      `Token refresh failed: ${response.data.error || 'Unknown error'}`
    );
  }

  /**
   * Logout and clear tokens
   */
  async logout() {
    const response = await this.post('/api/auth/logout');
    this.clearTokens();
    return response;
  }
}

/**
 * Create an E2E API client for testing
 */
export function createE2EClient(): E2EApiClient {
  const url = getServerUrl();
  return new E2EApiClient(url);
}

/**
 * E2E test helper - wraps a test with setup/teardown
 */
export function withE2ETest(
  testFn: (client: E2EApiClient) => Promise<void> | void
): () => Promise<void> {
  return async () => {
    const { serverUrl } = await setupE2ETest();
    try {
      const client = new E2EApiClient(serverUrl);
      await testFn(client);
    } finally {
      await teardownE2ETest();
    }
  };
}

/**
 * E2E test helper with authenticated client
 */
export async function createAuthenticatedClient(
  email: string,
  password: string
): Promise<E2EApiClient> {
  const client = createE2EClient();
  await client.authenticate(email, password);
  return client;
}

/**
 * E2E test helper for setup with authenticated user
 */
export async function setupE2EWithAuthenticatedUser(): Promise<{
  client: E2EApiClient;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}> {
  const { serverUrl } = await setupE2ETest();

  // Create a test user via the API
  const client = new E2EApiClient(serverUrl);
  const userData = await client.registerAndAuthenticate(
    'Test User',
    `test-user-${Date.now()}@example.com`,
    'TestPassword123!',
    'student'
  );

  return {
    client,
    user: userData.user,
  };
}
