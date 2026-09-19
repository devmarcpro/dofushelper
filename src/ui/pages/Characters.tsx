import { useSignal } from '@preact/signals';
import type { AlignmentSide, Character } from '../../core/types';
import {
  createCharacter,
  deleteCharacter,
  setActiveCharacter,
  updateCharacter,
  type CharacterInput,
} from '../../state/actions';
import { importState } from '../../state/persistence';
import { fr } from '../strings.fr';
import { appState, data, dispatch, downloadText, exportJson, history } from '../store';

interface FormValues {
  name: string;
  breedId: string;
  level: string;
  alignment: string;
  serverName: string;
}

const EMPTY: FormValues = { name: '', breedId: '', level: '', alignment: '', serverName: '' };

const fromCharacter = (c: Character): FormValues => ({
  name: c.name,
  breedId: c.breedId === null ? '' : String(c.breedId),
  level: c.level === null ? '' : String(c.level),
  alignment: c.alignment === null ? '' : String(c.alignment),
  serverName: c.serverName ?? '',
});

function toInput(values: FormValues): CharacterInput {
  const alignment = values.alignment === '' ? null : (Number(values.alignment) as AlignmentSide);
  return {
    name: values.name,
    breedId: values.breedId === '' ? null : Number(values.breedId),
    level: values.level === '' ? null : Number(values.level),
    alignment,
    serverName: values.serverName,
  };
}

function CharacterForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial: FormValues;
  submitLabel: string;
  onSubmit: (input: CharacterInput) => void;
  onCancel?: () => void;
}) {
  const values = useSignal<FormValues>(initial);
  const error = useSignal(false);
  const set = (field: keyof FormValues) => (event: { currentTarget: { value: string } }) => {
    values.value = { ...values.value, [field]: event.currentTarget.value };
  };
  const breeds = data.value.t === 'ready' ? data.value.dataset.refs.breeds : [];
  return (
    <form
      class="form"
      onSubmit={(event) => {
        event.preventDefault();
        if (values.value.name.trim() === '') {
          error.value = true;
          return;
        }
        onSubmit(toInput(values.value));
        values.value = EMPTY;
        error.value = false;
      }}
    >
      <label class="field">
        <span class="field__label">{fr.characters.name}</span>
        <input
          class="input"
          type="text"
          required
          maxLength={40}
          value={values.value.name}
          onInput={set('name')}
          aria-invalid={error.value}
        />
        {error.value ? (
          <span class="field__error" role="alert">
            {fr.characters.nameRequired}
          </span>
        ) : null}
      </label>
      <label class="field">
        <span class="field__label">{fr.characters.breed}</span>
        <select class="select" value={values.value.breedId} onChange={set('breedId')}>
          <option value="">{fr.characters.unknown}</option>
          {breeds.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </label>
      <label class="field">
        <span class="field__label">{fr.characters.level}</span>
        <input
          class="input"
          type="number"
          inputMode="numeric"
          min={1}
          max={200}
          value={values.value.level}
          onInput={set('level')}
        />
      </label>
      <label class="field">
        <span class="field__label">{fr.characters.alignment}</span>
        <select class="select" value={values.value.alignment} onChange={set('alignment')}>
          <option value="">{fr.characters.unknown}</option>
          {[0, 1, 2].map((side) => (
            <option key={side} value={side}>
              {fr.characters.alignments[side]}
            </option>
          ))}
        </select>
      </label>
      <label class="field">
        <span class="field__label">{fr.characters.server}</span>
        <input
          class="input"
          type="text"
          maxLength={40}
          value={values.value.serverName}
          onInput={set('serverName')}
        />
      </label>
      <p class="muted">{fr.characters.optionalHint}</p>
      <div class="actions">
        <button type="submit" class="button button--primary">
          {submitLabel}
        </button>
        {onCancel ? (
          <button type="button" class="button" onClick={onCancel}>
            {fr.characters.cancel}
          </button>
        ) : null}
      </div>
    </form>
  );
}

function CharacterCard({ who, active }: { who: Character; active: boolean }) {
  const editing = useSignal(false);
  const confirming = useSignal(false);
  if (editing.value) {
    return (
      <li class="card">
        <CharacterForm
          initial={fromCharacter(who)}
          submitLabel={fr.characters.save}
          onSubmit={(input) => {
            dispatch((state, d) => updateCharacter(state, who.id, input, d));
            editing.value = false;
          }}
          onCancel={() => (editing.value = false)}
        />
      </li>
    );
  }
  return (
    <li class="card">
      <h2 class="card__title">
        {fr.character.summary(who.name, who.level)}
        {active ? <span class="badge">{fr.characters.activeBadge}</span> : null}
      </h2>
      <p class="muted">
        {fr.characters.stats(who.doneQuests.length, who.doneAchievements.length, who.goals.length)}
      </p>
      <div class="actions">
        {active ? null : (
          <button
            type="button"
            class="button button--primary"
            onClick={() => dispatch((state) => setActiveCharacter(state, who.id))}
          >
            {fr.characters.activate}
          </button>
        )}
        <button type="button" class="button" onClick={() => (editing.value = true)}>
          {fr.characters.edit}
        </button>
        {confirming.value ? (
          <>
            <button
              type="button"
              class="button button--danger"
              onClick={() => dispatch((state) => deleteCharacter(state, who.id))}
            >
              {fr.characters.removeConfirm(who.name)}
            </button>
            <button type="button" class="button" onClick={() => (confirming.value = false)}>
              {fr.characters.cancel}
            </button>
          </>
        ) : (
          <button type="button" class="button" onClick={() => (confirming.value = true)}>
            {fr.characters.remove}
          </button>
        )}
      </div>
    </li>
  );
}

export function Characters() {
  const message = useSignal<{ text: string; error: boolean } | null>(null);
  const state = appState.value;

  const onImport = async (event: { currentTarget: HTMLInputElement }): Promise<void> => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    const result = importState(history.value.present, await file.text());
    input.value = '';
    if (!result.ok) {
      message.value = { text: fr.characters.importError(result.error), error: true };
      return;
    }
    dispatch(() => result.value.state);
    const { added, replaced, kept } = result.value.summary;
    message.value = { text: fr.characters.importDone(added, replaced, kept), error: false };
  };

  return (
    <section>
      <h1 class="page-title">{fr.characters.title}</h1>
      {state.characters.length === 0 ? <p>{fr.characters.empty}</p> : null}
      <ul class="stack">
        {state.characters.map((who) => (
          <CharacterCard key={who.id} who={who} active={who.id === state.activeCharacterId} />
        ))}
      </ul>

      <section class="card" aria-labelledby="new-character">
        <h2 id="new-character" class="card__title">
          {fr.characters.create}
        </h2>
        <CharacterForm
          initial={EMPTY}
          submitLabel={fr.characters.add}
          onSubmit={(input) => dispatch((s, d) => createCharacter(s, input, d))}
        />
      </section>

      <section class="card" aria-labelledby="backup">
        <h2 id="backup" class="card__title">
          {fr.characters.backupTitle}
        </h2>
        <p>{fr.characters.backupDetail}</p>
        <div class="actions">
          <button
            type="button"
            class="button"
            onClick={() => downloadText('roadbook-progression.json', exportJson())}
          >
            {fr.characters.exportAll}
          </button>
          <label class="button">
            {fr.characters.importFile}
            <input
              class="visually-hidden"
              type="file"
              accept="application/json,.json"
              onChange={(event) => void onImport(event)}
            />
          </label>
        </div>
        {message.value ? (
          <p
            class={message.value.error ? 'field__error' : 'notice'}
            role="status"
            aria-live="polite"
          >
            {message.value.text}
          </p>
        ) : null}
      </section>
    </section>
  );
}
