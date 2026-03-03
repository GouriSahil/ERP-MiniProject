import Joi from 'joi';

// Validation schemas
export const registerSchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(2)
    .max(100)
    .required()
    .messages({
      'string.min': 'Name must be at least 2 characters',
      'string.max': 'Name cannot exceed 100 characters',
      'any.required': 'Name is required'
    }),
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    }),
  password: Joi.string()
    .min(8)
    .required()
    .messages({
      'string.min': 'Password must be at least 8 characters long',
      'any.required': 'Password is required'
    }),
  role: Joi.string()
    .valid('student', 'faculty', 'admin', 'super_admin', 'dept_head', 'staff')
    .optional()
    .default('student')
    .messages({
      'any.only': 'Role must be one of: student, faculty, admin, super_admin, dept_head, staff'
    }),
  departmentId: Joi.string()
    .optional()
    .messages({
      'string.guid': 'Department ID must be a valid UUID'
    })
});

export const loginSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    }),
  password: Joi.string()
    .required()
    .messages({
      'any.required': 'Password is required'
    }),
  rememberMe: Joi.boolean()
    .optional()
    .default(false)
    .messages({
      'boolean.base': 'Remember me must be a boolean'
    })
});

export const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string()
    .required()
    .messages({
      'any.required': 'Refresh token is required'
    })
});

// Validation middleware factory
export const validate = (schema: Joi.ObjectSchema) => {
  return (req: any, res: any, next: any) => {
    console.log('Validating request body:', req.body);
    const { error, value } = schema.validate(req.body, { abortEarly: false });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      console.log('Validation errors:', errors);

      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors
      });
    }

    // Replace req.body with validated value
    req.body = value;
    next();
  };
};
