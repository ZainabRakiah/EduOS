import Joi from 'joi';

export const paginationSchema = {
  query: Joi.object({
    page: Joi.number().integer().min(1).optional(),
    limit: Joi.number().integer().min(1).max(100).optional(),
    sortBy: Joi.string().optional(),
    sortOrder: Joi.string().valid('asc', 'desc').optional(),
    search: Joi.string().optional(),
  }),
};

export const idParamSchema = {
  params: Joi.object({
    id: Joi.string().required(),
  }),
};
