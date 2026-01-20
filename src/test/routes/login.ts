import { expect } from 'chai';
import request from 'supertest';

import { app } from '../../main/app';

// TODO: replace this sample test with proper route tests for your application
/* eslint-disable jest/expect-expect */
describe('Login page', () => {
  describe('on GET', () => {
    test('should return login page', async () => {
      await request(app)
        .get('/')
        .expect(res => expect(res.status).to.equal(200));
    });
  });
});
