import Joi from 'joi';

export type ValidationErrorMap = Record<string, string>;

const validationOptions: Joi.ValidationOptions = {
  abortEarly: false,
  allowUnknown: true,
  stripUnknown: true,
};

export const validationResultToErrorMap = (validationResult: Joi.ValidationResult): ValidationErrorMap | undefined => {
  if (!validationResult.error) {
    return undefined;
  }

  return validationResult.error.details.reduce<ValidationErrorMap>((errors, detail) => {
    const key = detail.path.join('.') || detail.context?.label || 'form';

    if (!errors[key]) {
      errors[key] = detail.message;
    }

    return errors;
  }, {});
};

export const validateJoiSchema = <T>(schema: Joi.Schema<T>, body: unknown): ValidationErrorMap | undefined => {
  const validationResult = schema.validate(body, validationOptions);

  return validationResultToErrorMap(validationResult);
};
