import filters from '../../../main/modules/filters';

describe('filters', () => {
  test('returns Unknown for an unmapped HTTP status code', () => {
    expect(filters.HttpStatusCode(418)).toBe('Unknown');
  });
});
