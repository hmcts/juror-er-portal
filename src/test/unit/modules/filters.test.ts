import filters from '../../../main/modules/filters';

describe('filters', () => {
  test('returns Not Found for a 404 HTTP status code', () => {
    expect(filters.HttpStatusCode(404)).toBe('Not Found');
  });
});
