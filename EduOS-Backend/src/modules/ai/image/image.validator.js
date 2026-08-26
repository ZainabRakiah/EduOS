import Joi from 'joi';

export const generateImageSchema = {
  body: Joi.object().keys({
    prompt: Joi.string().required().min(3).max(1000),
    aspectRatio: Joi.string().valid('1:1', '16:9', '9:16').default('16:9'),
    resolution: Joi.string().valid('1K', '2K', '4K').default('1K'),
  }),
};
