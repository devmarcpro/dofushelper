import { useSignal } from '@preact/signals';
import type { FullPlan } from '../../core/engine';
import { leafKey } from '../../core/graph';
import type { BlockReason, ChoicePoint, DataIssue, PlanNode } from '../../core/plan-types';
import type { Character, Goal, NodeKey, Requirement } from '../../core/types';
import { setChoice, setOwnedQuantity } from '../../state/actions';
import type { Labels } from '../labels';
import { routeHref, type PlanTab } from '../router';
import { fr } from '../strings.fr';
import { character, dispatch, engine, labels, planFor } from '../store';
import { tickNode } from '../tick';

const TABS: readonly PlanTab[] = ['steps', 'gather', 'conditions', 'choices'];
const nameOf = (names: Labels, key: NodeKey): string => names.nodeName(key) ?? key;
const sideName = (side: number): string => fr.characters.alignments[side] ?? String(side);

function blockText(reason: BlockReason, names: Labels): string {
  switch (reason.t) {
    case 'node':
      return fr.plan.blockedNode(nameOf(names, reason.key));
    case 'level':
      return fr.plan.blockedLevel(reason.min);
    case 'jobLevel':
      return fr.plan.blockedJob(names.jobName(reason.jobId) ?? String(reason.jobId), reason.min);
    case 'alignment':
      return reason.negated
        ? fr.plan.blockedNotAlignment(sideName(reason.side))
        : fr.plan.blockedAlignment(sideName(reason.side));
    case 'breed': {
      const breed = names.breedName(reason.id) ?? String(reason.id);
      return reason.negated ? fr.plan.blockedNotBreed(breed) : fr.plan.blockedBreed(breed);
    }
  }
}

function Badges({ node, names }: { node: PlanNode; names: Labels }) {
  const id = Number(node.key.slice(2));
  const quest = node.key.startsWith('q:') ? names.quest(id) : undefined;
  const badges: string[] = [];
  if (!quest) badges.push(fr.plan.badges.achievement);
  if (quest?.isDungeonQuest) badges.push(fr.plan.badges.dungeon);
  if (quest?.isPartyQuest) badges.push(fr.plan.badges.party);
  if (quest?.isEvent) badges.push(fr.plan.badges.event);
  if (quest && quest.repeatType !== null && quest.repeatType !== 0)
    badges.push(fr.plan.badges.repeatable);
  for (const condition of node.conditions) {
    if (condition.t === 'alignment') badges.push(sideName(condition.side));
  }
  if (node.context.length > 0) badges.push(fr.plan.badges.uninterpreted);
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

function StepRow({ node, names, canTick }: { node: PlanNode; names: Labels; canTick: boolean }) {
  const id = Number(node.key.slice(2));
  const level = node.key.startsWith('q:')
    ? names.quest(id)?.levelMin
    : names.achievement(id)?.level;
  const checked = node.status === 'done' || node.status === 'implied';
  const inputId = `node-${node.key.replace(':', '-')}`;
  return (
    <li class={`step step--${node.status}`}>
      <input
        id={inputId}
        class="step__check"
        type="checkbox"
        checked={checked}
        disabled={!canTick || node.status === 'implied'}
        aria-describedby={`${inputId}-status`}
        onChange={(event) => tickNode(node.key, event.currentTarget.checked)}
      />
      <div class="step__body">
        <label class="step__name" for={inputId}>
          {nameOf(names, node.key)}
        </label>
        <p class="step__meta">
          {typeof level === 'number' && level > 0 ? <span>{fr.plan.level(level)}</span> : null}
          <Badges node={node} names={names} />
          <a href={routeHref({ t: 'node', key: node.key })}>{fr.plan.openSheet}</a>
        </p>
        <p class="step__status" id={`${inputId}-status`}>
          <strong>{fr.plan.status[node.status]}</strong>
          {node.status === 'implied' && node.impliedBy ? (
            <span> · {fr.plan.impliedBy(nameOf(names, node.impliedBy))}</span>
          ) : null}
        </p>
        {node.status === 'implied' ? <p class="muted">{fr.plan.impliedLocked}</p> : null}
        {node.status === 'blocked' ? (
          <ul class="reasons">
            {node.blockedBy.map((reason, index) => (
              <li key={index}>{blockText(reason, names)}</li>
            ))}
          </ul>
        ) : null}
        {node.exclusions.length > 0 ? (
          <p class="muted">
            {fr.plan.incompatibleWith(node.exclusions.map((key) => nameOf(names, key)).join(', '))}
          </p>
        ) : null}
      </div>
    </li>
  );
}

function StepsTab({ plan, names, canTick }: { plan: FullPlan; names: Labels; canTick: boolean }) {
  const hideDone = useSignal(false);
  const onlyAvailable = useSignal(false);
  const rows = plan.nodes.filter((node) => {
    if (onlyAvailable.value) return node.status === 'available';
    if (hideDone.value) return node.status !== 'done' && node.status !== 'implied';
    return true;
  });
  return (
    <section aria-labelledby="tab-steps">
      <h2 id="tab-steps" class="visually-hidden">
        {fr.plan.tabs.steps}
      </h2>
      <div class="filters">
        <label class="check">
          <input
            type="checkbox"
            checked={hideDone.value}
            onChange={(e) => (hideDone.value = e.currentTarget.checked)}
          />
          {fr.plan.hideDone}
        </label>
        <label class="check">
          <input
            type="checkbox"
            checked={onlyAvailable.value}
            onChange={(e) => (onlyAvailable.value = e.currentTarget.checked)}
          />
          {fr.plan.onlyAvailable}
        </label>
      </div>
      {rows.length === 0 ? <p>{fr.plan.emptyFilter}</p> : null}
      <ol class="steps">
        {rows.map((node) => (
          <StepRow key={node.key} node={node} names={names} canTick={canTick} />
        ))}
      </ol>
    </section>
  );
}

/** A branch is shown as the list of nodes it asks for; anything else is summed up, never guessed. */
function branchParts(branch: Requirement, names: Labels): string[] {
  const parts: string[] = [];
  let other = false;
  const visit = (req: Requirement): void => {
    const key = leafKey(req);
    if (key) parts.push(nameOf(names, key));
    else if (req.t === 'all' || req.t === 'any') req.of.forEach(visit);
    else other = true;
  };
  visit(branch);
  if (other) parts.push(fr.choices.otherConditions);
  return parts;
}

function ChoiceBlock({
  choice,
  names,
  who,
}: {
  choice: ChoicePoint;
  names: Labels;
  who: Character | null;
}) {
  const group = `choice-${choice.id}`;
  return (
    <fieldset class="card">
      <legend class="card__title">
        {choice.owner === 'goal'
          ? fr.choices.goalOwner
          : fr.choices.owner(nameOf(names, choice.owner))}
      </legend>
      <p class="muted">{fr.choices.chosenBy[choice.chosenBy]}</p>
      {choice.branches.map((branch, index) => (
        <label class="check check--block" key={index}>
          <input
            type="radio"
            name={group}
            checked={choice.chosen === index}
            disabled={!who || choice.chosenBy === 'progress'}
            onChange={() =>
              who && dispatch((state, d) => setChoice(state, who.id, choice.id, index, d), true)
            }
          />
          <span>
            <strong>{fr.choices.branch(index + 1)}</strong> :{' '}
            {branchParts(branch, names).join(', ')}
          </span>
        </label>
      ))}
      {who && choice.chosenBy === 'user' ? (
        <button
          type="button"
          class="button button--small"
          onClick={() => dispatch((state, d) => setChoice(state, who.id, choice.id, null, d), true)}
        >
          {fr.choices.auto}
        </button>
      ) : null}
    </fieldset>
  );
}

function GatherTab({ plan, names, who }: { plan: FullPlan; names: Labels; who: Character | null }) {
  const showQuestItems = useSignal(false);
  const items = plan.needs.items.filter((item) => showQuestItems.value || !item.isQuestItem);
  const setOwned = (itemId: number, qty: number): void => {
    if (who) dispatch((state, d) => setOwnedQuantity(state, who.id, itemId, qty, d), true);
  };
  return (
    <section aria-labelledby="tab-gather">
      <h2 id="tab-gather" class="section-title">
        {fr.gather.itemsTitle}
      </h2>
      <label class="check">
        <input
          type="checkbox"
          checked={showQuestItems.value}
          onChange={(e) => (showQuestItems.value = e.currentTarget.checked)}
        />
        {fr.gather.showQuestItems}
      </label>
      {items.length === 0 ? <p>{fr.gather.noItems}</p> : null}
      <ul class="stack">
        {items.map((need) => {
          const item = names.item(need.itemId);
          const name = item?.name || fr.sheet.unknownRef('objet', need.itemId);
          const inputId = `owned-${need.itemId}`;
          const drops = (item?.dropMonsterIds ?? []).slice(0, 6);
          return (
            <li class="card" key={need.itemId}>
              <h3 class="card__title">
                {name}
                {need.isQuestItem ? <span class="badge">{fr.gather.questItem}</span> : null}
              </h3>
              <p>
                <strong>{fr.gather.remaining(need.remaining)}</strong>
              </p>
              <div class="stepper">
                <label for={inputId}>{fr.gather.owned}</label>
                <button
                  type="button"
                  class="button button--small"
                  disabled={!who || need.owned === 0}
                  aria-label={fr.gather.decrease(name)}
                  onClick={() => setOwned(need.itemId, need.owned - 1)}
                >
                  −
                </button>
                <input
                  id={inputId}
                  class="input input--number"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  disabled={!who}
                  value={need.owned}
                  onChange={(e) => setOwned(need.itemId, Number(e.currentTarget.value))}
                />
                <button
                  type="button"
                  class="button button--small"
                  disabled={!who}
                  aria-label={fr.gather.increase(name)}
                  onClick={() => setOwned(need.itemId, need.owned + 1)}
                >
                  +
                </button>
              </div>
              <h4 class="list-title">{fr.gather.usedBy}</h4>
              <ul class="plain">
                {need.usedBy.map((use, index) => (
                  <li key={index}>
                    {fr.gather.usedLine(nameOf(names, use.key), use.qty, use.consumed)}
                  </li>
                ))}
              </ul>
              {need.providedBy.length > 0 ? (
                <>
                  <h4 class="list-title">{fr.gather.providedBy}</h4>
                  <ul class="plain">
                    {need.providedBy.map((source, index) => (
                      <li key={index}>
                        {fr.gather.providedLine(nameOf(names, source.key), source.qty)}
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}
              <h4 class="list-title">{fr.gather.sources}</h4>
              {drops.length === 0 && !item?.recipe ? (
                <p class="muted">{fr.gather.noSource}</p>
              ) : null}
              <ul class="plain">
                {drops.map((monsterId) => {
                  const rates = names.monsterDrop(monsterId, need.itemId);
                  return (
                    <li key={monsterId}>
                      {fr.gather.dropLine(
                        names.monsterName(monsterId) ?? fr.sheet.unknownRef('monstre', monsterId),
                        rates.min,
                        rates.max,
                      )}
                    </li>
                  );
                })}
              </ul>
              {item?.recipe ? (
                <details>
                  <summary>
                    {fr.gather.recipe(
                      item.recipe.jobId === null ? null : names.jobName(item.recipe.jobId),
                    )}
                  </summary>
                  <ul class="plain">
                    {item.recipe.ingredients.map(([ingredientId, qty]) => (
                      <li key={ingredientId}>
                        {fr.gather.ingredientLine(
                          names.itemName(ingredientId) ??
                            fr.sheet.unknownRef('objet', ingredientId),
                          qty,
                        )}
                      </li>
                    ))}
                  </ul>
                </details>
              ) : null}
            </li>
          );
        })}
      </ul>

      <h2 class="section-title">{fr.gather.monstersTitle}</h2>
      {plan.needs.monsters.length === 0 ? <p>{fr.gather.noMonsters}</p> : null}
      <ul class="plain">
        {plan.needs.monsters.map((monster) => (
          <li key={monster.monsterId}>
            {fr.gather.monsterLine(
              names.monsterName(monster.monsterId) ??
                fr.sheet.unknownRef('monstre', monster.monsterId),
              monster.qty,
            )}
            {monster.singleFightMax > 0 ? (
              <span class="muted"> · {fr.gather.singleFight(monster.singleFightMax)}</span>
            ) : null}
          </li>
        ))}
      </ul>

      <h2 class="section-title">{fr.gather.dungeonsTitle}</h2>
      {plan.needs.dungeons.length === 0 ? <p>{fr.gather.noDungeons}</p> : null}
      <ul class="plain">
        {plan.needs.dungeons.map((dungeon) => (
          <li key={dungeon.dungeonId}>
            {fr.gather.dungeonLine(
              names.dungeonName(dungeon.dungeonId) ??
                fr.sheet.unknownRef('donjon', dungeon.dungeonId),
              names.dungeonLevel(dungeon.dungeonId),
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function ConditionsTab({
  plan,
  names,
  who,
}: {
  plan: FullPlan;
  names: Labels;
  who: Character | null;
}) {
  const c = plan.conditions;
  const verdict = (known: boolean, pass: boolean): string =>
    known ? (pass ? fr.conditions.ok : fr.conditions.missing) : fr.conditions.unknown;
  const lines: { text: string; verdict: string }[] = [];
  if (c.level !== null)
    lines.push({
      text: fr.conditions.level(c.level, who?.level ?? null),
      verdict: verdict(who?.level != null, (who?.level ?? 0) >= c.level),
    });
  for (const job of c.jobs) {
    const current = who?.jobs[job.jobId] ?? null;
    lines.push({
      text: fr.conditions.job(names.jobName(job.jobId) ?? String(job.jobId), job.min, current),
      verdict: verdict(current !== null, (current ?? 0) >= job.min),
    });
  }
  if (c.alignment !== null)
    lines.push({
      text: fr.conditions.alignment(sideName(c.alignment)),
      verdict: verdict(who?.alignment != null, who?.alignment === c.alignment),
    });
  if (c.breed !== null)
    lines.push({
      text: fr.conditions.breed(names.breedName(c.breed) ?? String(c.breed)),
      verdict: verdict(who?.breedId != null, who?.breedId === c.breed),
    });
  return (
    <section aria-labelledby="tab-conditions">
      <h2 id="tab-conditions" class="visually-hidden">
        {fr.plan.tabs.conditions}
      </h2>
      {lines.length === 0 ? <p>{fr.conditions.none}</p> : null}
      <ul class="stack">
        {lines.map((line) => (
          <li class="card" key={line.text}>
            <p>{line.text}</p>
            <p class="muted">{line.verdict}</p>
          </li>
        ))}
      </ul>
      {c.context.length > 0 ? (
        <>
          <h2 class="section-title">{fr.conditions.contextTitle}</h2>
          <p class="muted">{fr.conditions.contextDetail}</p>
          <ul class="plain">
            {c.context.map((raw) => (
              <li key={raw}>
                <code>{raw}</code>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </section>
  );
}

function issueText(issue: DataIssue, names: Labels): string | null {
  switch (issue.t) {
    case 'cycle':
      return fr.plan.issueCycle(issue.path.map((key) => nameOf(names, key)).join(' → '));
    case 'missingNode':
      return fr.plan.issueMissing(issue.key);
    case 'unknownCriterion':
      return fr.plan.issueUnknown(issue.raw, nameOf(names, issue.owner));
    case 'noSourceForItem':
      return null;
  }
}

export function PlanPage({ goal, tab }: { goal: Goal; tab: PlanTab }) {
  const currentEngine = engine.value;
  const names = labels.value;
  if (!currentEngine || !names) return null;
  const who = character.value;
  const plan = planFor.value(goal);
  if (!plan) return null;
  const title = names.goalName(goal);

  if (plan.issues.some((i) => i.t === 'noSourceForItem')) {
    return (
      <section class="card">
        <h1 class="card__title">{title ?? fr.plan.unknownGoal}</h1>
        <p>{fr.plan.noSource}</p>
      </section>
    );
  }
  if (plan.nodes.length === 0) {
    return (
      <section class="card">
        <h1 class="card__title">{fr.plan.unknownGoal}</h1>
        <a href={routeHref({ t: 'catalog' })}>{fr.home.chooseGoal}</a>
      </section>
    );
  }

  const next = plan.nextActions[0];
  const finished = plan.progress.done === plan.progress.total;
  const issues = plan.issues.flatMap((issue) => issueText(issue, names) ?? []);

  return (
    <section>
      <h1 class="page-title">{title ?? fr.plan.unknownGoal}</h1>
      <progress
        class="progress"
        max={plan.progress.total}
        value={plan.progress.done}
        aria-label={fr.plan.progress(plan.progress.done, plan.progress.total)}
      />
      <p class="muted">{fr.plan.progress(plan.progress.done, plan.progress.total)}</p>
      {who ? null : <p class="notice">{fr.plan.needCharacter}</p>}

      <div class="card card--accent">
        <h2 class="card__title">{fr.plan.nextAction}</h2>
        {finished ? (
          <p>{fr.plan.allDone}</p>
        ) : next ? (
          <a href={routeHref({ t: 'node', key: next })}>{nameOf(names, next)}</a>
        ) : (
          <p>{fr.plan.nothingAvailable}</p>
        )}
      </div>

      {issues.length > 0 ? (
        <details class="card card--alert">
          <summary>{fr.plan.issuesTitle}</summary>
          <p>{fr.plan.issuesDetail}</p>
          <ul class="plain">
            {issues.slice(0, 40).map((text) => (
              <li key={text}>{text}</li>
            ))}
          </ul>
        </details>
      ) : null}

      <nav class="tabs" aria-label={fr.plan.tabsLabel}>
        {TABS.map((t) => (
          <a
            key={t}
            class="tab"
            href={routeHref({ t: 'plan', goal, tab: t })}
            aria-current={t === tab ? 'page' : undefined}
          >
            {fr.plan.tabs[t]}
          </a>
        ))}
      </nav>

      {tab === 'steps' ? <StepsTab plan={plan} names={names} canTick={who !== null} /> : null}
      {tab === 'gather' ? <GatherTab plan={plan} names={names} who={who} /> : null}
      {tab === 'conditions' ? <ConditionsTab plan={plan} names={names} who={who} /> : null}
      {tab === 'choices' ? (
        <section aria-labelledby="tab-choices">
          <h2 id="tab-choices" class="visually-hidden">
            {fr.plan.tabs.choices}
          </h2>
          <p class="muted">{plan.choicePoints.length === 0 ? fr.choices.none : fr.choices.intro}</p>
          {plan.choicePoints.map((choice) => (
            <ChoiceBlock key={choice.id} choice={choice} names={names} who={who} />
          ))}
        </section>
      ) : null}
    </section>
  );
}
