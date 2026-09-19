import type { Goal } from '../../core/types';
import { routeHref } from '../router';
import { fr } from '../strings.fr';
import { character, engine, labels } from '../store';

function GoalCard({ goal }: { goal: Goal }) {
  const who = character.value;
  const currentEngine = engine.value;
  const names = labels.value;
  if (!who || !currentEngine || !names) return null;
  const plan = currentEngine.resolve(goal, who);
  const next = plan.nextActions[0];
  const finished = plan.progress.total > 0 && plan.progress.done === plan.progress.total;
  const href = routeHref({ t: 'plan', goal, tab: 'steps' });
  return (
    <li class="card">
      <h2 class="card__title">
        <a href={href}>{names.goalName(goal) ?? fr.plan.unknownGoal}</a>
      </h2>
      <progress
        class="progress"
        max={Math.max(1, plan.progress.total)}
        value={plan.progress.done}
      />
      <p class="muted">{fr.home.progress(plan.progress.done, plan.progress.total)}</p>
      <p>
        <strong>{fr.home.nextAction} : </strong>
        {finished
          ? fr.home.allDone
          : next
            ? (names.nodeName(next) ?? next)
            : fr.home.nothingAvailable}
      </p>
      <a class="button button--primary" href={href}>
        {fr.home.openPlan}
      </a>
    </li>
  );
}

export function Home() {
  const who = character.value;
  if (!who) {
    return (
      <section class="card">
        <h1 class="card__title">{fr.home.emptyTitle}</h1>
        <p>{fr.app.tagline}</p>
        <p>{fr.home.emptyDetail}</p>
        <a class="button button--primary" href={routeHref({ t: 'characters' })}>
          {fr.home.createCharacter}
        </a>
      </section>
    );
  }
  if (who.goals.length === 0) {
    return (
      <section class="card">
        <h1 class="card__title">{fr.home.noGoalTitle}</h1>
        <p>{fr.home.noGoalDetail}</p>
        <a class="button button--primary" href={routeHref({ t: 'catalog' })}>
          {fr.home.chooseGoal}
        </a>
      </section>
    );
  }
  return (
    <section>
      <h1 class="page-title">{fr.home.goals}</h1>
      <ul class="stack">
        {who.goals.map((goal) => (
          <GoalCard key={routeHref({ t: 'plan', goal, tab: 'steps' })} goal={goal} />
        ))}
      </ul>
      <p>
        <a href={routeHref({ t: 'catalog' })}>{fr.home.chooseGoal}</a>
      </p>
    </section>
  );
}
