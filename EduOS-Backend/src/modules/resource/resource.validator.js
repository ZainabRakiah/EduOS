import Joi from 'joi';

export const getResourceByIdSchema = {
  params: Joi.object({
    id: Joi.string().required().messages({
      'any.required': 'Resource ID is required.',
      'string.base': 'Resource ID must be a string.',
    }),
  }),
};

export const deleteResourceSchema = {
  params: Joi.object({
    id: Joi.string().required().messages({
      'any.required': 'Resource ID is required.',
      'string.base': 'Resource ID must be a string.',
    }),
  }),
};
