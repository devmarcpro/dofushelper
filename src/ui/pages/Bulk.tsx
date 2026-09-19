import { useSignal } from '@preact/signals';
import type { NodeKey } from '../../core/types';
import { setManyNodesDone } from '../../state/actions';
import { routeHref } from '../router';
import { fr } from '../strings.fr';
import { character, data, dispatch, effectiveDone, engine, toast } from '../store';
import { tickNode } from '../tick';

type Kind = 'quest' | 'achievement';

interface Row {
  key: NodeKey;
  name: string;
  level: number;
  special: boolean;
}

export function Bulk() {
  const kind = useSignal<Kind>('quest');
  const categoryId = useSignal<string>('');
  const showSpecial = useSignal(false);
  const who = character.value;
  const currentEngine = engine.value;
  const state = data.value;
  if (!currentEngine || state.t !== 'ready') return null;
  const { dataset } = state;

  const isQuest = kind.value === 'quest';
  const categories = isQuest ? dataset.refs.questCategories : dataset.refs.achievementCategories;
  const counts = new Map<number, number>();
  for (const node of isQuest ? dataset.quests : dataset.achievements) {
    const id = node.categoryId ?? -1;
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  const options = categories
    .filter((c) => (counts.get(c.id) ?? 0) > 0)
    .sort((a, b) => a.name.localeCompare(b.name, 'fr'));

  const selected = categoryId.value === '' ? null : Number(categoryId.value);
  const rows: Row[] =
    selected === null
      ? []
      : isQuest
        ? dataset.quests
            .filter((q) => (q.categoryId ?? -1) === selected)
            .map((q) => ({
              key: `q:${q.id}` as NodeKey,
              name: q.name,
              level: q.levelMin,
              special: q.isEvent === true || (q.repeatType !== null && q.repeatType !== 0),
            }))
        : dataset.achievements
            .filter((a) => a.categoryId === selected)
            .map((a) => ({
              key: `a:${a.id}` as NodeKey,
              name: a.name,
              level: a.level ?? 0,
              special: false,
            }));
  const visible = rows
    .filter((row) => showSpecial.value || !row.special)
    .sort((a, b) => a.level - b.level || a.name.localeCompare(b.name, 'fr'));

  const hiddenCount = rows.length - visible.length;
  const done = who ? effectiveDone.value : null;
  const notDone = visible.filter((row) => !done?.effective.has(row.key));
  const explicit = visible.filter((row) => done?.explicit.has(row.key));

  const applyAll = (keys: NodeKey[], value: boolean): void => {
    if (!who || keys.length === 0) return;
    const before = done?.effective.size ?? 0;
    dispatch((s, d) => setManyNodesDone(s, who.id, keys, value, d), true);
    const after = effectiveDone.value?.effective.size ?? before;
    toast.value = {
      message: value
        ? fr.bulk.ticked(keys.length, Math.max(0, after - before - keys.length))
        : fr.bulk.unticked(keys.length),
      undoable: true,
    };
  };

  return (
    <section>
      <h1 class="page-title">{fr.bulk.title}</h1>
      <p>{fr.bulk.intro}</p>
      {who ? null : (
        <p class="notice">
          {fr.bulk.needCharacter}{' '}
          <a href={routeHref({ t: 'characters' })}>{fr.home.createCharacter}</a>
        </p>
      )}
      <label class="field">
        <span class="field__label">{fr.bulk.kind}</span>
        <select
          class="select"
          value={kind.value}
          onChange={(event) => {
            kind.value = event.currentTarget.value === 'achievement' ? 'achievement' : 'quest';
            categoryId.value = '';
          }}
        >
          <option value="quest">{fr.bulk.quests}</option>
          <option value="achievement">{fr.bulk.achievements}</option>
        </select>
      </label>
      <label class="field">
        <span class="field__label">{fr.bulk.category}</span>
        <select
          class="select"
          value={categoryId.value}
          onChange={(event) => (categoryId.value = event.currentTarget.value)}
        >
          <option value="">{fr.bulk.chooseCategory}</option>
          {options.map((c) => (
            <option key={c.id} value={c.id}>
              {fr.bulk.categoryOption(c.name || fr.bulk.uncategorized, counts.get(c.id) ?? 0)}
            </option>
          ))}
        </select>
      </label>
      {isQuest ? (
        <>
          <label class="check">
            <input
              type="checkbox"
              checked={showSpecial.value}
              onChange={(e) => (showSpecial.value = e.currentTarget.checked)}
            />
            {fr.bulk.showSpecial}
          </label>
          {/* Without this, a category announced as 390 quests can show two lines with no reason. */}
          {hiddenCount > 0 ? <p class="muted">{fr.bulk.hidden(hiddenCount)}</p> : null}
        </>
      ) : null}

      {selected !== null ? (
        <>
          <p class="muted" role="status" aria-live="polite">
            {fr.bulk.summary(visible.length - notDone.length, visible.length)}
          </p>
          <div class="actions">
            <button
              type="button"
              class="button button--primary"
              disabled={!who || notDone.length === 0}
              onClick={() =>
                applyAll(
                  notDone.map((r) => r.key),
                  true,
                )
              }
            >
              {fr.bulk.tickAll(notDone.length)}
            </button>
            <button
              type="button"
              class="button"
              disabled={!who || explicit.length === 0}
              onClick={() =>
                applyAll(
                  explicit.map((r) => r.key),
                  false,
                )
              }
            >
              {fr.bulk.untickAll(explicit.length)}
            </button>
          </div>
          {visible.length === 0 ? <p>{fr.bulk.empty}</p> : null}
          <ul class="steps">
            {visible.map((row) => {
              const impliedBy = done?.implied.get(row.key) ?? null;
              const isExplicit = done?.explicit.has(row.key) ?? false;
              const inputId = `bulk-${row.key.replace(':', '-')}`;
              return (
                <li class="step" key={row.key}>
                  <input
                    id={inputId}
                    class="step__check"
                    type="checkbox"
                    checked={isExplicit || impliedBy !== null}
                    disabled={!who || (impliedBy !== null && !isExplicit)}
                    onChange={(event) => tickNode(row.key, event.currentTarget.checked)}
                  />
                  <div class="step__body">
                    <label class="step__name" for={inputId}>
                      {row.name || row.key}
                    </label>
                    <p class="step__meta">
                      {row.level > 0 ? <span>{fr.plan.level(row.level)}</span> : null}
                      {row.special ? <span class="badge">{fr.plan.badges.event}</span> : null}
                      <a href={routeHref({ t: 'node', key: row.key })}>{fr.plan.openSheet}</a>
                    </p>
                    {impliedBy && !isExplicit ? (
                      <p class="muted">
                        {fr.plan.impliedBy(
                          currentEngine.graph.nodes.get(impliedBy)?.name ?? impliedBy,
                        )}
                      </p>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      ) : null}
    </section>
  );
}
