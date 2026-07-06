import { validationResultToErrorMap } from '../../../main/validation';

describe('validationResultToErrorMap', () => {
  test('maps Joi error details into a field-message object', () => {
    const result = {
      value: {
        email: '',
      },
      error: {
        _original: {
          email: '',
          _csrf: 'x6N1gQBp-F7ZGGYnmSJjCxkgSr7LW2UjInUE',
        },
        details: [
          {
            message: 'Enter an email address',
            path: ['email'],
            type: 'string.empty',
            context: {
              label: 'email',
              value: '',
              key: 'email',
            },
          },
        ],
      },
    } as never;

    expect(validationResultToErrorMap(result)).toEqual({
      email: 'Enter an email address',
    });
  });

  test('returns undefined when validation passes', () => {
    expect(
      validationResultToErrorMap({
        value: {
          email: 'person@example.com',
        },
      } as never)
    ).toBeUndefined();
  });
});
