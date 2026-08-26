import Joi from 'joi';

export const processResourceSchema = {
  params: Joi.object({
    resourceId: Joi.string().required().messages({
      'any.required': 'Resource ID is required.',
      'string.base': 'Resource ID must be a string.',
    }),
  }),
};

export const getProcessedDetailsSchema = {
  params: Joi.object({
    resourceId: Joi.string().required().messages({
      'any.required': 'Resource ID is required.',
      'string.base': 'Resource ID must be a string.',
    }),
  }),
};
