/**
 * Test helper utilities for API testing
 */

export interface MockUser {
  userId: string;
  email: string;
  role: string;
  departmentId?: string;
}

export interface MockRequest {
  user?: MockUser;
  params: Record<string, any>;
  query: Record<string, any>;
  body: Record<string, any>;
  ip: string;
  get(header: string): string | undefined;
}

export interface MockResponse {
  status(code: number): MockResponse;
  json(data: any): MockResponse;
  send(data: any): MockResponse;
  _status?: number;
  _json?: any;
  _send?: any;
}

/**
 * Generate a valid JWT token for testing (simplified)
 */
export function generateTestToken(user: Partial<MockUser>): string {
  const payload = {
    userId: user.userId || '507f1f77bcf86cd799439011',
    email: user.email || 'test@example.com',
    role: user.role || 'student',
    departmentId: user.departmentId
  };

  return Buffer.from(
    JSON.stringify({
      header: { alg: 'HS256', typ: 'JWT' },
      payload: { ...payload, iat: Date.now() / 1000 }
    })
  ).toString('base64');
}

/**
 * Create mock request object with user
 */
export function createMockRequest(user: Partial<MockUser> = {}): MockRequest {
  return {
    user: {
      userId: user.userId || '507f1f77bcf86cd799439011',
      email: user.email || 'test@example.com',
      role: user.role || 'student',
      departmentId: user.departmentId
    },
    params: {},
    query: {},
    body: {},
    ip: '127.0.0.1',
    get: (header: string) => {
      const headers: Record<string, string> = {
        'user-agent': 'test-agent',
        'authorization': `Bearer ${generateTestToken(user)}`
      };
      return headers[header.toLowerCase()];
    }
  };
}

/**
 * Create mock response object
 */
export function createMockResponse(): MockResponse {
  const res: MockResponse = {
    _status: undefined,
    _json: undefined,
    _send: undefined,
    status: function(code: number) {
      this._status = code;
      return this;
    },
    json: function(data: any) {
      this._json = data;
      return this;
    },
    send: function(data: any) {
      this._send = data;
      return this;
    }
  };
  return res;
}

/**
 * Wait for async operations
 */
export function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Generate a random ObjectId string
 */
export function generateObjectId(): string {
  const timestamp = Math.floor(Date.now() / 1000).toString(16);
  const randomBytes = Array.from({ length: 16 }, () =>
    Math.floor(Math.random() * 256).toString(16).padStart(2, '0')
  ).join('');

  return timestamp + randomBytes;
}

/**
 * Test user fixtures
 */
export const testUsers = {
  superAdmin: {
    userId: generateObjectId(),
    email: 'superadmin@test.com',
    role: 'super_admin',
    name: 'Super Admin'
  },
  admin: {
    userId: generateObjectId(),
    email: 'admin@test.com',
    role: 'admin',
    name: 'College Admin'
  },
  deptHead: {
    userId: generateObjectId(),
    email: 'depthead@test.com',
    role: 'dept_head',
    name: 'Department Head',
    departmentId: generateObjectId()
  },
  faculty: {
    userId: generateObjectId(),
    email: 'faculty@test.com',
    role: 'faculty',
    name: 'Faculty Member',
    departmentId: generateObjectId()
  },
  student: {
    userId: generateObjectId(),
    email: 'student@test.com',
    role: 'student',
    name: 'Student User',
    departmentId: generateObjectId()
  }
};

/**
 * Test department fixtures
 */
export const testDepartments = {
  cs: {
    name: 'Computer Science',
    code: 'CS'
  },
  math: {
    name: 'Mathematics',
    code: 'MATH'
  },
  physics: {
    name: 'Physics',
    code: 'PHYS'
  }
};

/**
 * Test course fixtures
 */
export const testCourses = {
  introToProgramming: {
    name: 'Introduction to Programming',
    code: 'CS101',
    credits: 3,
    description: 'Basic programming concepts'
  },
  dataStructures: {
    name: 'Data Structures',
    code: 'CS201',
    credits: 4,
    description: 'Advanced data structures',
    prerequisites: []
  },
  algorithms: {
    name: 'Algorithms',
    code: 'CS301',
    credits: 4,
    description: 'Algorithm design and analysis'
  }
};

/**
 * Test term fixtures
 */
export const testTerms = {
  fall2024: {
    name: 'Fall 2024',
    startDate: '2024-09-01',
    endDate: '2024-12-31',
    status: 'active'
  },
  spring2025: {
    name: 'Spring 2025',
    startDate: '2025-01-15',
    endDate: '2025-05-15',
    status: 'upcoming'
  }
};
