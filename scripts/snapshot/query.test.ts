import { describe, expect, it } from 'vitest';
import { buildListUrl, chunkIds, pageCount } from './query';

const BASE = 'https://api.example';

describe('buildListUrl', () => {
  it('builds a paginated, sorted, selected list URL', () => {
    expect(buildListUrl(BASE, '/quests', { limit: 50, skip: 100, select: ['id', 'name'] })).toBe(
      'https://api.example/quests?$limit=50&$skip=100&$sort[id]=1&$select[]=id&$select[]=name',
    );
  });

  it('omits $skip on the first page', () => {
    expect(buildListUrl(BASE, '/jobs', { limit: 50, select: ['id'] })).toBe(
      'https://api.example/jobs?$limit=50&$sort[id]=1&$select[]=id',
    );
  });

  it('builds a count-only URL without sort nor select', () => {
    expect(
      buildListUrl(BASE, '/items', { filters: { typeId: 23 }, limit: 0, select: ['id'] }),
    ).toBe('https://api.example/items?typeId=23&$limit=0');
  });

  it('builds an id[$in][] batch', () => {
    expect(
      buildListUrl(BASE, '/items', { inField: 'id', inValues: [9000001, 9000002], limit: 50 }),
    ).toBe('https://api.example/items?id[$in][]=9000001&id[$in][]=9000002&$limit=50&$sort[id]=1');
  });

  it('encodes filter values', () => {
    expect(
      buildListUrl(BASE, '/item-types', { filters: { 'name.fr': 'FAKE & co' }, limit: 5 }),
    ).toBe('https://api.example/item-types?name.fr=FAKE%20%26%20co&$limit=5&$sort[id]=1');
  });
});

describe('pageCount', () => {
  it('rounds up', () => {
    expect(pageCount(0)).toBe(0);
    expect(pageCount(1)).toBe(1);
    expect(pageCount(50)).toBe(1);
    expect(pageCount(51)).toBe(2);
    expect(pageCount(1976)).toBe(40);
  });
});

describe('chunkIds', () => {
  it('sorts, de-duplicates and chunks', () => {
    expect(chunkIds([9000003, 9000001, 9000003, 9000002], 2)).toEqual([
      [9000001, 9000002],
      [9000003],
    ]);
    expect(chunkIds([])).toEqual([]);
  });
});
