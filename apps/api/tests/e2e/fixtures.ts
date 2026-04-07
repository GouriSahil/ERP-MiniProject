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
