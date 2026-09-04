import filters from '../../../main/modules/filters';

describe('filters', () => {
  it('maps HTTP 404 to Not Found', () => {
    expect(filters.HttpStatusCode(404)).toBe('Not Found');
  });
});
