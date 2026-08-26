import Joi from 'joi';

const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*\d).{8,}$/;

export const updateProfileSchema = {
  body: Joi.object({
    firstName: Joi.string().trim().min(2).max(50).optional(),
    lastName: Joi.string().trim().min(2).max(50).optional(),
    className: Joi.string().trim().min(1).max(20).optional(),
    school: Joi.string().trim().min(1).max(100).optional(),
    avatar: Joi.string().trim().uri().optional(),
  }),
};

export const changePasswordSchema = {
  body: Joi.object({
    currentPassword: Joi.string().required().messages({
      'any.required': 'Current password is required.',
    }),
    newPassword: Joi.string().regex(PASSWORD_REGEX).required().messages({
      'string.pattern.base':
        'New password must be at least 8 characters with 1 uppercase letter and 1 number.',
      'any.required': 'New password is required.',
    }),
  }),
};
