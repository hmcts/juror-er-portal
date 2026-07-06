/* eslint-disable @typescript-eslint/no-explicit-any */
import Joi from 'joi';

import { ValidationErrorMap, validateJoiSchema } from '.';

const validationOptions = {
  abortEarly: false,
  allowUnknown: true,
  stripUnknown: true,
};

const createDevSignInBodySchema = (validationMessages: any) =>
  Joi.object({
    email: Joi.string().trim().required().messages({
      'any.required': validationMessages.EMAIL_REQUIRED,
      'string.empty': validationMessages.EMAIL_REQUIRED,
    }),
  });

const localAuthoritySelectionBodySchema = (validationMessages: any) =>
  Joi.object({
    laCode: Joi.string().trim().min(1).required().messages({
      'any.required': validationMessages.LOCAL_AUTHORITY_REQUIRED,
      'string.empty': validationMessages.LOCAL_AUTHORITY_REQUIRED,
      'string.min': validationMessages.LOCAL_AUTHORITY_REQUIRED,
    }),
  });

export const validateDevSignInBody = (body: unknown, validationMessages: unknown): ValidationErrorMap | undefined =>
  validateJoiSchema(createDevSignInBodySchema(validationMessages), body, validationOptions);

export const validateLocalAuthoritySelectionBody = (
  body: unknown,
  validationMessages: unknown
): ValidationErrorMap | undefined =>
  validateJoiSchema(localAuthoritySelectionBodySchema(validationMessages), body, validationOptions);
