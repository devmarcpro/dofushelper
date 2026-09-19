import { describe, expect, it } from 'vitest';
import { parseRoute, routeHref, type Route } from './router';

describe('router', () => {
  const routes: Exclude<Route, { t: 'notFound' }>[] = [
    { t: 'home' },
    { t: 'catalog' },
    { t: 'characters' },
    { t: 'about' },
    { t: 'plan', goal: { t: 'item', itemId: 9100001 }, tab: 'steps' },
    { t: 'plan', goal: { t: 'quest', id: 9000001 }, tab: 'gather' },
    { t: 'plan', goal: { t: 'achievement', id: 9000201 }, tab: 'choices' },
    { t: 'node', key: 'q:9000001' },
    { t: 'node', key: 'a:9000201' },
  ];

  it.each(routes.map((r) => [routeHref(r), r] as const))('round-trips %s', (href, route) => {
    expect(parseRoute(href)).toEqual(route);
  });

  it('treats an empty hash as home and tolerates trailing slashes', () => {
    expect(parseRoute('')).toEqual({ t: 'home' });
    expect(parseRoute('#')).toEqual({ t: 'home' });
    expect(parseRoute('#/objectifs/')).toEqual({ t: 'catalog' });
  });

  it('falls back to the first tab on an unknown tab', () => {
    expect(parseRoute('#/plan/item-9100001/nope')).toEqual({
      t: 'plan',
      goal: { t: 'item', itemId: 9100001 },
      tab: 'steps',
    });
  });

  it('reports unknown paths instead of guessing', () => {
    expect(parseRoute('#/plan/banana')).toEqual({ t: 'notFound', hash: '#/plan/banana' });
    expect(parseRoute('#/fiche/x-1')).toEqual({ t: 'notFound', hash: '#/fiche/x-1' });
    expect(parseRoute('#/nowhere')).toEqual({ t: 'notFound', hash: '#/nowhere' });
  });
});
