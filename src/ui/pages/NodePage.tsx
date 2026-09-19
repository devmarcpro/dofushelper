import type { NodeKey } from '../../core/types';
import type { Labels, TextPart } from '../labels';
import { routeHref } from '../router';
import { fr } from '../strings.fr';
import { character, effectiveDone, engine, labels } from '../store';
import { tickNode } from '../tick';

function GameText({ parts }: { parts: TextPart[] }) {
  return (
    <>
      {parts.map((part, index) =>
        part.t === 'text' ? (
          <span key={index}>{part.value}</span>
        ) : (
          <strong key={index}>{part.name ?? fr.sheet.unknownRef(part.kind, part.id)}</strong>
        ),
      )}
    </>
  );
}

function NodeList({
  title,
  keys,
  names,
}: {
  title: string;
  keys: readonly NodeKey[];
  names: Labels;
}) {
  return (
    <>
      <h2 class="section-title">{title}</h2>
      {keys.length === 0 ? <p class="muted">{fr.sheet.none}</p> : null}
      <ul class="plain">
        {keys.map((key) => (
          <li key={key}>
            <a href={routeHref({ t: 'node', key })}>{names.nodeName(key) ?? key}</a>
          </li>
        ))}
      </ul>
    </>
  );
}

export function NodePage({ nodeKey }: { nodeKey: NodeKey }) {
  const currentEngine = engine.value;
  const names = labels.value;
  if (!currentEngine || !names) return null;
  const node = currentEngine.graph.nodes.get(nodeKey);
  if (!node) {
    return (
      <section class="card">
        <h1 class="card__title">{fr.sheet.notFound}</h1>
        <a href={routeHref({ t: 'home' })}>{fr.notFound.back}</a>
      </section>
    );
  }
  const who = character.value;
  const done = who ? effectiveDone.value : null;
  const explicit = done?.explicit.has(nodeKey) ?? false;
  const impliedBy = done?.implied.get(nodeKey) ?? null;
  const quest = node.kind === 'quest' ? names.quest(node.id) : undefined;
  const achievement = node.kind === 'achievement' ? names.achievement(node.id) : undefined;
  const inputId = 'sheet-done';

  return (
    <article>
      <p class="muted">{node.kind === 'quest' ? fr.sheet.quest : fr.sheet.achievement}</p>
      <h1 class="page-title">{node.name || nodeKey}</h1>
      {node.levelMin > 0 ? <p class="muted">{fr.plan.level(node.levelMin)}</p> : null}
      {achievement?.description ? <p>{achievement.description}</p> : null}

      {who ? (
        <p>
          <label class="check" for={inputId}>
            <input
              id={inputId}
              type="checkbox"
              checked={explicit || impliedBy !== null}
              disabled={impliedBy !== null && !explicit}
              onChange={(event) => tickNode(nodeKey, event.currentTarget.checked)}
            />
            {fr.sheet.done}
          </label>
          {impliedBy && !explicit ? (
            <span class="muted">
              {' '}
              · {fr.plan.impliedBy(names.nodeName(impliedBy) ?? impliedBy)}
            </span>
          ) : null}
        </p>
      ) : null}

      {quest ? (
        <>
          <h2 class="section-title">{fr.sheet.steps}</h2>
          {quest.steps.length === 0 ? <p class="muted">{fr.sheet.noSteps}</p> : null}
          <ol class="stack">
            {quest.steps.map((step) => (
              <li class="card" key={step.id}>
                <h3 class="card__title">{step.name}</h3>
                <ul class="plain">
                  {step.objectives.map((objective) => (
                    <li key={objective.id}>
                      <GameText parts={names.textParts(objective.text)} />
                    </li>
                  ))}
                </ul>
                {step.rewardBands.some((band) => band.reward.items.length > 0) ? (
                  <>
                    <h4 class="list-title">{fr.sheet.rewards}</h4>
                    {step.rewardBands.map((band, index) => (
                      <p key={index}>
                        <span class="muted">
                          {fr.sheet.rewardBand(band.levelMin, band.levelMax)} :{' '}
                        </span>
                        {band.reward.items
                          .map((item) =>
                            fr.sheet.rewardLine(
                              names.itemName(item.itemId) ??
                                fr.sheet.unknownRef('objet', item.itemId),
                              item.qty,
                            ),
                          )
                          .join(', ')}
                      </p>
                    ))}
                  </>
                ) : null}
              </li>
            ))}
          </ol>
        </>
      ) : null}

      {achievement ? (
        <>
          <h2 class="section-title">{fr.sheet.objectives}</h2>
          <ul class="plain">
            {achievement.objectives.map((objective) => (
              <li key={objective.id}>
                {objective.name} <code>{objective.criterion.raw}</code>
              </li>
            ))}
          </ul>
          {achievement.missingObjectiveIds.length > 0 ? (
            <p class="notice">
              {fr.sheet.missingObjectives(achievement.missingObjectiveIds.length)}
            </p>
          ) : null}
          <h2 class="section-title">{fr.sheet.rewards}</h2>
          {achievement.rewardBands.every((band) => band.reward.items.length === 0) ? (
            <p class="muted">{fr.sheet.noRewards}</p>
          ) : null}
          {achievement.rewardBands.map((band, index) =>
            band.reward.items.length === 0 ? null : (
              <p key={index}>
                <span class="muted">{fr.sheet.rewardBand(band.levelMin, band.levelMax)} : </span>
                {band.reward.items
                  .map((item) =>
                    fr.sheet.rewardLine(
                      names.itemName(item.itemId) ?? fr.sheet.unknownRef('objet', item.itemId),
                      item.qty,
                    ),
                  )
                  .join(', ')}
              </p>
            ),
          )}
        </>
      ) : null}

      <NodeList title={fr.sheet.requires} keys={node.mandatory} names={names} />
      {node.alternative.length > 0 ? (
        <NodeList title={fr.sheet.alternatives} keys={node.alternative} names={names} />
      ) : null}
      {node.exclusions.length > 0 ? (
        <NodeList title={fr.sheet.exclusions} keys={node.exclusions} names={names} />
      ) : null}
      <NodeList
        title={fr.sheet.unlocks}
        keys={currentEngine.graph.unlocks.get(nodeKey) ?? []}
        names={names}
      />

      {quest ? (
        <>
          <h2 class="section-title">{fr.sheet.criteria}</h2>
          <p>
            <code>{quest.start.raw}</code>
          </p>
        </>
      ) : null}
    </article>
  );
}
