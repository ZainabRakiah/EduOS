import Joi from 'joi';

export const analyzeSchema = {
  body: Joi.object({
    prompt: Joi.string().required().trim(),
  }),
};

export const chatSchema = {
  body: Joi.object({
    prompt: Joi.string().required().trim().messages({
      'any.required': 'Prompt is required.',
      'string.empty': 'Prompt cannot be empty.',
    }),
  }),
};

export const explainSchema = {
  body: Joi.object({
    resourceId: Joi.string().required().messages({
      'any.required': 'Resource ID is required.',
      'string.empty': 'Resource ID cannot be empty.',
    }),
    question: Joi.string().required().trim().messages({
      'any.required': 'Question is required.',
      'string.empty': 'Question cannot be empty.',
    }),
  }),
};

export default {
  analyzeSchema,
  chatSchema,
  explainSchema,
};
