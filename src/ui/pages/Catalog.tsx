import { useSignal } from '@preact/signals';
import { addGoal, removeGoal, sameGoal } from '../../state/actions';
import { routeHref } from '../router';
import { fr } from '../strings.fr';
import { character, dispatch, engine } from '../store';

const normalize = (text: string): string =>
  text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();

export function Catalog() {
  const query = useSignal('');
  const who = character.value;
  const currentEngine = engine.value;
  if (!currentEngine) return null;
  const needle = normalize(query.value.trim());
  const presets = currentEngine.catalog.filter((p) => normalize(p.name).includes(needle));

  return (
    <section>
      <h1 class="page-title">{fr.catalog.title}</h1>
      <div class="tabs" role="tablist" aria-label={fr.catalog.title}>
        <button type="button" class="tab" role="tab" aria-selected="true">
          {fr.catalog.tabDofus}
        </button>
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
        {fr.catalog.count(presets.length)}
      </p>
      {presets.length === 0 ? <p>{fr.catalog.noResult}</p> : null}
      <ul class="stack">
        {presets.map((preset) => {
          const followed = who?.goals.some((g) => sameGoal(g, preset.goal)) ?? false;
          const plan = who && followed ? currentEngine.resolve(preset.goal, who) : null;
          const href = routeHref({ t: 'plan', goal: preset.goal, tab: 'steps' });
          return (
            <li class="card" key={preset.goal.itemId}>
              <h2 class="card__title">
                <a href={href}>{preset.name}</a>
              </h2>
              <p class="muted">
                {fr.catalog.level(preset.level)}
                {followed ? <span class="badge">{fr.catalog.followed}</span> : null}
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
                          ? removeGoal(state, who.id, preset.goal, d)
                          : addGoal(state, who.id, preset.goal, d),
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
