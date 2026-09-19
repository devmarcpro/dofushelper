import { useSignal } from '@preact/signals';
import { routeHref } from '../router';
import { search, type SearchEntry, type SearchKind } from '../search';
import { fr } from '../strings.fr';
import { searchIndex } from '../store';

const LIMIT = 60;
const KINDS: readonly SearchKind[] = ['goal', 'quest', 'achievement'];

export function entryHref(entry: SearchEntry): string {
  if (entry.kind === 'goal')
    return routeHref({ t: 'plan', goal: { t: 'item', itemId: entry.id }, tab: 'steps' });
  return routeHref({ t: 'node', key: entry.kind === 'quest' ? `q:${entry.id}` : `a:${entry.id}` });
}

export function Search() {
  const query = useSignal('');
  const ready = query.value.trim().length >= 2;
  const results = ready ? search(searchIndex.value, query.value, { limit: LIMIT }) : [];
  return (
    <section>
      <h1 class="page-title">{fr.search.title}</h1>
      <label class="field">
        <span class="field__label">{fr.search.label}</span>
        <input
          class="input"
          type="search"
          value={query.value}
          placeholder={fr.search.placeholder}
          onInput={(event) => (query.value = event.currentTarget.value)}
        />
      </label>
      <p class="muted" role="status" aria-live="polite">
        {ready
          ? results.length === 0
            ? fr.search.none
            : fr.search.count(results.length, results.length === LIMIT)
          : fr.search.hint}
      </p>
      {KINDS.map((kind) => {
        const group = results.filter((entry) => entry.kind === kind);
        if (group.length === 0) return null;
        return (
          <section key={kind}>
            <h2 class="section-title">{fr.search.kinds[kind]}</h2>
            <ul class="plain">
              {group.map((entry) => (
                <li key={entry.id}>
                  <a href={entryHref(entry)}>{entry.name}</a>
                  {entry.level !== null ? (
                    <span class="muted"> · {fr.plan.level(entry.level)}</span>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </section>
  );
}
