import Joi from 'joi';

const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*\d).{8,}$/;

export const registerSchema = {
  body: Joi.object({
    firstName: Joi.string().trim().min(2).max(50).required().messages({
      'string.base': 'First name must be a string.',
      'string.min': 'First name must be at least 2 characters.',
      'string.max': 'First name must be 50 characters or less.',
      'any.required': 'First name is required.',
    }),
    lastName: Joi.string().trim().min(2).max(50).required().messages({
      'string.base': 'Last name must be a string.',
      'string.min': 'Last name must be at least 2 characters.',
      'string.max': 'Last name must be 50 characters or less.',
      'any.required': 'Last name is required.',
    }),
    className: Joi.string().trim().min(1).max(20).required().messages({
      'any.required': 'Class is required.',
    }),
    email: Joi.string()
      .trim()
      .email({ tlds: { allow: false } })
      .lowercase()
      .required()
      .messages({
        'string.email': 'Please enter a valid email address.',
        'any.required': 'Email is required.',
      }),
    password: Joi.string().regex(PASSWORD_REGEX).required().messages({
      'string.pattern.base':
        'Password must be at least 8 characters with 1 uppercase letter and 1 number.',
      'any.required': 'Password is required.',
    }),
    confirmPassword: Joi.any().valid(Joi.ref('password')).required().messages({
      'any.only': 'Passwords do not match.',
      'any.required': 'Please confirm your password.',
    }),
    terms: Joi.boolean().valid(true).required().messages({
      'any.only': 'You must agree to the Terms of Service and Privacy Policy.',
      'any.required': 'You must agree to the Terms of Service and Privacy Policy.',
    }),
    plan: Joi.string().valid('FREE', 'PREMIUM').default('FREE').messages({
      'any.only': 'Plan must be either FREE or PREMIUM.',
    }),
  }),
};

export const loginSchema = {
  body: Joi.object({
    email: Joi.string()
      .trim()
      .email({ tlds: { allow: false } })
      .lowercase()
      .required()
      .messages({
        'string.email': 'Please enter a valid email address.',
        'any.required': 'Email is required.',
      }),
    password: Joi.string().required().messages({
      'any.required': 'Password is required.',
    }),
    remember: Joi.boolean().optional(),
  }),
};

export const refreshSchema = {
  body: Joi.object({
    refreshToken: Joi.string().required().messages({
      'any.required': 'Refresh token is required.',
    }),
  }),
};
