import Joi from 'joi';

export const queryLimitSchema = {
  query: Joi.object({
    limit: Joi.number().integer().min(1).max(100).optional(),
  }),
};

export const queryDaysSchema = {
  query: Joi.object({
    days: Joi.number().integer().min(1).max(365).optional(),
  }),
};
