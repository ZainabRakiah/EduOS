import Joi from 'joi';

export const uploadSchema = {
  body: Joi.object({
    title: Joi.string().optional().allow('').max(100).trim(),
    class: Joi.string().optional().allow('').trim(),
    subject: Joi.string().optional().allow('').trim(),
    originalType: Joi.string().valid('PDF', 'Image', 'Text').required().messages({
      'any.required': 'Original type must be PDF, Image, or Text.',
      'any.only': 'Original type must be PDF, Image, or Text.',
    }),
    originalText: Joi.string()
      .when('originalType', {
        is: 'Text',
        then: Joi.required(),
        otherwise: Joi.optional().allow(null, ''),
      })
      .messages({
        'any.required': 'Chapter text is required when type is Text.',
      }),
  }),
};

export default {
  uploadSchema,
};
