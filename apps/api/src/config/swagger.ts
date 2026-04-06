import swaggerJsdoc from 'swagger-jsdoc';
import * as swaggerUiModule from 'swagger-ui-express';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'ERP Mini Project API',
      version: '1.0.0',
      description: `API documentation for ERP Mini Project - A comprehensive University ERP system.

## Authentication
Most endpoints require a valid JWT token. Include it in the Authorization header:
\`Authorization: Bearer <your-token>\`

## Roles
- **super_admin**: Full system access
- **college_admin**: College-level management
- **department_admin**: Department-level management
- **faculty**: Faculty members
- **student**: Students`,
      contact: {
        name: 'API Support',
      },
      license: {
        name: 'MIT',
      },
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server',
      },
      {
        url: 'http://localhost:3000/api',
        description: 'Development API base path',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT authentication token. Use /api/auth/login to obtain a token.',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: { type: 'string' },
            message: { type: 'string' },
          },
        },
        ApiResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string' },
            data: { type: 'object' },
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ['./src/routes/*.ts', './src/controllers/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
export const swaggerUi = swaggerUiModule;
