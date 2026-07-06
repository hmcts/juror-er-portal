/* eslint-disable @typescript-eslint/no-explicit-any */
import Joi from 'joi';

const validationOptions = {
  abortEarly: false,
  allowUnknown: true,
  stripUnknown: true,
};

const createDevSignInBodySchema = (validationMessages: any) =>
  Joi.object({
    email: Joi.string().trim().required().messages({
      'any.required': validationMessages.LOGIN.EMAIL_REQUIRED,
      'string.empty': validationMessages.LOGIN.EMAIL_REQUIRED,
    }),
  });

export const localAuthoritySelectionBodySchema = Joi.object({
  la: Joi.string().trim().min(1).required(),
});

export const validateDevSignInBody = (body: unknown, validationMessages: unknown): Joi.ValidationResult =>
  createDevSignInBodySchema(validationMessages).validate(body, validationOptions);

export const validateLocalAuthoritySelectionBody = (body: unknown): Joi.ValidationResult =>
  localAuthoritySelectionBodySchema.validate(body, validationOptions);
