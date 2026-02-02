import { fail } from 'assert';

import axios, { AxiosResponse } from 'axios';
import { expect } from 'chai';

const testUrl = process.env.TEST_URL || 'http://localhost:3000';

describe('Smoke Test', () => {
  describe('Login page loads', () => {
    test('with correct content', async () => {
      try {
        const response: AxiosResponse = await axios.get(testUrl, {
          headers: {
            'Accept-Encoding': 'gzip',
          },
        });
        expect(response.data).includes('<h1 class="govuk-heading-l">Sign in to the electoral register data portal</h1>');
      } catch {
        fail('Heading not present and/or correct');
      }
    });
  });
});
