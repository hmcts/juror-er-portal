import { validateDevSignInBody, validateLocalAuthoritySelectionBody } from '../../../main/validation/authentication';

describe('validation/authentication', () => {
  describe('validateDevSignInBody', () => {
    test('returns a field-message map when email is missing', () => {
      expect(validateDevSignInBody({ email: '' }, { EMAIL_REQUIRED: 'Enter an email address' })).toEqual({
        email: 'Enter an email address',
      });
    });

    test('returns undefined when the payload is valid', () => {
      expect(
        validateDevSignInBody({ email: 'person@example.com' }, { EMAIL_REQUIRED: 'Enter an email address' })
      ).toBeUndefined();
    });
  });

  describe('validateLocalAuthoritySelectionBody', () => {
    test('returns a field-message map when la is missing', () => {
      expect(
        validateLocalAuthoritySelectionBody(
          { laCode: '' },
          { LOCAL_AUTHORITY_REQUIRED: 'Select the local authority you want to manage' }
        )
      ).toEqual({
        laCode: 'Select the local authority you want to manage',
      });
    });

    test('returns an empty object when the payload is valid', () => {
      expect(
        validateLocalAuthoritySelectionBody(
          { laCode: 'la-123' },
          { LOCAL_AUTHORITY_REQUIRED: 'Select the local authority you want to manage' }
        )
      ).toBeUndefined();
    });
  });
});
