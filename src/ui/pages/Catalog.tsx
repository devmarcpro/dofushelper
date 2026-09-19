import { useSignal } from '@preact/signals';
import type { Goal } from '../../core/types';
import { addGoal, removeGoal, sameGoal } from '../../state/actions';
import { routeHref } from '../router';
import { search, type SearchEntry, type SearchKind } from '../search';
import { fr } from '../strings.fr';
import { character, dispatch, engine, labels, planFor, searchIndex } from '../store';

const TABS: readonly SearchKind[] = ['goal', 'achievement', 'quest'];
const LIMIT = 40;

function goalOf(entry: SearchEntry): Goal {
  if (entry.kind === 'goal') return { t: 'item', itemId: entry.id };
  return entry.kind === 'quest' ? { t: 'quest', id: entry.id } : { t: 'achievement', id: entry.id };
}

function Badges({ entry }: { entry: SearchEntry }) {
  const quest = entry.kind === 'quest' ? labels.value?.quest(entry.id) : undefined;
  if (!quest) return null;
  const badges: string[] = [];
  if (quest.isDungeonQuest) badges.push(fr.plan.badges.dungeon);
  if (quest.isPartyQuest) badges.push(fr.plan.badges.party);
  if (quest.isEvent) badges.push(fr.plan.badges.event);
  if (quest.repeatType !== null && quest.repeatType !== 0) badges.push(fr.plan.badges.repeatable);
  return (
    <span class="badges">
      {badges.map((badge) => (
        <span class="badge" key={badge}>
          {badge}
        </span>
      ))}
    </span>
  );
}

export function Catalog() {
  const tab = useSignal<SearchKind>('goal');
  const query = useSignal('');
  const who = character.value;
  const currentEngine = engine.value;
  if (!currentEngine) return null;

  const index = searchIndex.value;
  const typed = query.value.trim();
  // The Dofus tab lists everything; achievements and quests are far too many, so they are searched.
  const needsQuery = tab.value !== 'goal';
  let entries: SearchEntry[];
  if (typed.length >= 2) entries = search(index, typed, { kinds: [tab.value], limit: LIMIT });
  else if (needsQuery) entries = [];
  else
    entries = index.filter((e) => e.kind === 'goal').sort((a, b) => a.norm.localeCompare(b.norm));

  return (
    <section>
      <h1 class="page-title">{fr.catalog.title}</h1>
      <div class="tabs" role="group" aria-label={fr.catalog.tabsLabel}>
        {TABS.map((kind) => (
          <button
            key={kind}
            type="button"
            class="tab"
            aria-pressed={tab.value === kind}
            onClick={() => (tab.value = kind)}
          >
            {fr.catalog.tabs[kind]}
          </button>
        ))}
      </div>
      <label class="field">
        <span class="field__label">{fr.catalog.search}</span>
        <input
          class="input"
          type="search"
          value={query.value}
          placeholder={fr.catalog.searchPlaceholder}
          onInput={(event) => (query.value = event.currentTarget.value)}
        />
      </label>
      {who ? null : (
        <p class="notice">
          {fr.catalog.needCharacter}{' '}
          <a href={routeHref({ t: 'characters' })}>{fr.home.createCharacter}</a>
        </p>
      )}
      <p class="muted" role="status" aria-live="polite">
        {needsQuery && typed.length < 2
          ? fr.catalog.typeToSearch
          : entries.length === LIMIT && typed.length >= 2
            ? fr.catalog.limited(LIMIT)
            : fr.catalog.count(entries.length)}
      </p>
      {entries.length === 0 && (typed.length >= 2 || !needsQuery) ? (
        <p>{fr.catalog.noResult}</p>
      ) : null}
      <ul class="stack">
        {entries.map((entry) => {
          const goal = goalOf(entry);
          const followed = who?.goals.some((g) => sameGoal(g, goal)) ?? false;
          const plan = who && followed ? planFor.value(goal) : null;
          const href = routeHref({ t: 'plan', goal, tab: 'steps' });
          return (
            <li class="card" key={`${entry.kind}-${entry.id}`}>
              <h2 class="card__title">
                <a href={href}>{entry.name}</a>
              </h2>
              <p class="muted">
                {fr.catalog.level(entry.level)}
                {followed ? <span class="badge">{fr.catalog.followed}</span> : null}{' '}
                <Badges entry={entry} />
              </p>
              {plan ? (
                <>
                  <progress
                    class="progress"
                    max={Math.max(1, plan.progress.total)}
                    value={plan.progress.done}
                  />
                  <p class="muted">{fr.home.progress(plan.progress.done, plan.progress.total)}</p>
                </>
              ) : null}
              <div class="actions">
                <a class="button" href={href}>
                  {fr.catalog.open}
                </a>
                {who ? (
                  <button
                    type="button"
                    class={followed ? 'button' : 'button button--primary'}
                    onClick={() =>
                      dispatch((state, d) =>
                        followed
                          ? removeGoal(state, who.id, goal, d)
                          : addGoal(state, who.id, goal, d),
                      )
                    }
                  >
                    {followed ? fr.catalog.unfollow : fr.catalog.follow}
                  </button>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
