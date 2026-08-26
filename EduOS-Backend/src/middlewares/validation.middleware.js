import { BadRequestError } from '../shared/errors/AppError.js';

export function validate(schema) {
  return (req, res, next) => {
    const validationSources = ['body', 'params', 'query'];
    const validationData = {};

    for (const source of validationSources) {
      if (schema[source]) {
        validationData[source] = req[source];
      }
    }

    if (Object.keys(validationData).length === 0) {
      return next();
    }

    try {
      for (const source of validationSources) {
        if (schema[source]) {
          const { error, value } = schema[source].validate(validationData[source], {
            abortEarly: false,
            allowUnknown: false,
            stripUnknown: true,
          });

          if (error) {
            const details = error.details.map((d) => ({
              field: d.path.join('.'),
              message: d.message,
            }));
            throw new BadRequestError('Validation failed', details);
          }

          req[source] = value;
        }
      }
      next();
    } catch (error) {
      next(error);
    }
  };
}
