/** Minimal hash router (SPEC stack): pure parsing and formatting, the listener lives in the store. */
import type { Goal, NodeKey } from '../core/types';

export type PlanTab = 'steps' | 'gather' | 'conditions' | 'choices';

export type Route =
  | { t: 'home' }
  | { t: 'catalog' }
  | { t: 'characters' }
  | { t: 'about' }
  | { t: 'plan'; goal: Goal; tab: PlanTab }
  | { t: 'node'; key: NodeKey }
  | { t: 'notFound'; hash: string };

const TABS: readonly PlanTab[] = ['steps', 'gather', 'conditions', 'choices'];

export function goalSlug(goal: Goal): string {
  return goal.t === 'item' ? `item-${goal.itemId}` : `${goal.t}-${goal.id}`;
}

function parseGoal(slug: string | undefined): Goal | null {
  const match = /^(item|quest|achievement)-(\d+)$/.exec(slug ?? '');
  if (!match) return null;
  const id = Number(match[2]);
  if (match[1] === 'item') return { t: 'item', itemId: id };
  return match[1] === 'quest' ? { t: 'quest', id } : { t: 'achievement', id };
}

export function parseRoute(hash: string): Route {
  const path = hash.replace(/^#\/?/, '').replace(/\/+$/, '');
  const [head, second, third] = path.split('/');
  switch (head) {
    case '':
    case undefined:
      return { t: 'home' };
    case 'objectifs':
      return { t: 'catalog' };
    case 'personnages':
      return { t: 'characters' };
    case 'a-propos':
      return { t: 'about' };
    case 'plan': {
      const goal = parseGoal(second);
      const tab = TABS.find((t) => t === third) ?? 'steps';
      return goal ? { t: 'plan', goal, tab } : { t: 'notFound', hash };
    }
    case 'fiche': {
      const match = /^(q|a)-(\d+)$/.exec(second ?? '');
      return match
        ? { t: 'node', key: `${match[1] as 'q' | 'a'}:${Number(match[2])}` }
        : { t: 'notFound', hash };
    }
    default:
      return { t: 'notFound', hash };
  }
}

export function routeHref(route: Exclude<Route, { t: 'notFound' }>): string {
  switch (route.t) {
    case 'home':
      return '#/';
    case 'catalog':
      return '#/objectifs';
    case 'characters':
      return '#/personnages';
    case 'about':
      return '#/a-propos';
    case 'plan':
      return route.tab === 'steps'
        ? `#/plan/${goalSlug(route.goal)}`
        : `#/plan/${goalSlug(route.goal)}/${route.tab}`;
    case 'node':
      return `#/fiche/${route.key.replace(':', '-')}`;
  }
}
