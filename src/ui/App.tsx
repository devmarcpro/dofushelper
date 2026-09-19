import { useSignal } from '@preact/signals';
import type { DatasetError } from '../data/load';
import { setActiveCharacter } from '../state/actions';
import { ErrorBoundary } from './ErrorBoundary';
import { About } from './pages/About';
import { Bulk } from './pages/Bulk';
import { Catalog } from './pages/Catalog';
import { Characters } from './pages/Characters';
import { Home } from './pages/Home';
import { NodePage } from './pages/NodePage';
import { PlanPage } from './pages/PlanPage';
import { Search } from './pages/Search';
import { routeHref, type Route } from './router';
import { fr } from './strings.fr';
import {
  appState,
  character,
  corrupt,
  data,
  dispatch,
  downloadText,
  loadData,
  resetCorruptState,
  route,
  toast,
  undoLast,
} from './store';

function dataErrorMessage(error: DatasetError): string {
  if (error.t === 'network') return fr.data.errorNetwork(error.file);
  if (error.t === 'invalid') return fr.data.errorInvalid(error.file);
  return fr.data.errorFormat;
}

function NavLink({
  to,
  label,
  current,
}: {
  to: Exclude<Route, { t: 'notFound' }>;
  label: string;
  current: boolean;
}) {
  return (
    <a class="nav__link" href={routeHref(to)} aria-current={current ? 'page' : undefined}>
      {label}
    </a>
  );
}

function Header() {
  const current = route.value.t;
  const characters = appState.value.characters;
  return (
    <header class="header">
      <div class="header__bar">
        <a class="header__title" href={routeHref({ t: 'home' })}>
          {fr.app.name}
        </a>
        {characters.length > 0 ? (
          <label class="switcher">
            <span class="visually-hidden">{fr.character.active}</span>
            <select
              class="select"
              value={character.value?.id ?? ''}
              onChange={(event) => {
                const id = event.currentTarget.value;
                dispatch((state) => setActiveCharacter(state, id));
              }}
            >
              {characters.map((c) => (
                <option key={c.id} value={c.id}>
                  {fr.character.summary(c.name, c.level)}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>
      <nav class="nav" aria-label={fr.nav.label}>
        <NavLink to={{ t: 'home' }} label={fr.nav.home} current={current === 'home'} />
        <NavLink
          to={{ t: 'catalog' }}
          label={fr.nav.catalog}
          current={current === 'catalog' || current === 'plan'}
        />
        <NavLink
          to={{ t: 'characters' }}
          label={fr.nav.characters}
          current={current === 'characters'}
        />
        <NavLink to={{ t: 'search' }} label={fr.nav.search} current={current === 'search'} />
        <NavLink to={{ t: 'bulk' }} label={fr.nav.bulk} current={current === 'bulk'} />
        <NavLink to={{ t: 'about' }} label={fr.nav.about} current={current === 'about'} />
      </nav>
    </header>
  );
}

function CorruptState() {
  const confirming = useSignal(false);
  const state = corrupt.value;
  if (!state) return null;
  return (
    <section class="card card--alert" role="alert">
      <h1 class="card__title">{fr.corrupt.title}</h1>
      <p>{fr.corrupt.detail}</p>
      <p class="muted">{fr.corrupt.reason(state.reason)}</p>
      <div class="actions">
        <button
          type="button"
          class="button button--primary"
          onClick={() => downloadText('roadbook-contenu-brut.json', state.raw)}
        >
          {fr.corrupt.download}
        </button>
        {confirming.value ? (
          <button type="button" class="button button--danger" onClick={resetCorruptState}>
            {fr.corrupt.resetConfirm}
          </button>
        ) : (
          <button type="button" class="button" onClick={() => (confirming.value = true)}>
            {fr.corrupt.reset}
          </button>
        )}
      </div>
    </section>
  );
}

function Page() {
  const current = route.value;
  const state = data.value;
  if (corrupt.value) return <CorruptState />;
  if (current.t === 'about') return <About />;
  if (current.t === 'notFound') {
    return (
      <section class="card">
        <h1 class="card__title">{fr.notFound.title}</h1>
        <a href={routeHref({ t: 'home' })}>{fr.notFound.back}</a>
      </section>
    );
  }
  if (state.t === 'loading') {
    return (
      <p class="status" role="status" aria-live="polite">
        {fr.data.loading}
      </p>
    );
  }
  if (state.t === 'error') {
    return (
      <section class="card card--alert" role="alert">
        <h1 class="card__title">{fr.data.errorTitle}</h1>
        <p>{dataErrorMessage(state.error)}</p>
        <button type="button" class="button button--primary" onClick={() => void loadData()}>
          {fr.data.retry}
        </button>
      </section>
    );
  }
  switch (current.t) {
    case 'home':
      return <Home />;
    case 'catalog':
      return <Catalog />;
    case 'characters':
      return <Characters />;
    case 'search':
      return <Search />;
    case 'bulk':
      return <Bulk />;
    case 'plan':
      return <PlanPage goal={current.goal} tab={current.tab} />;
    case 'node':
      return <NodePage nodeKey={current.key} />;
  }
}

function ToastBar() {
  const current = toast.value;
  if (!current) return null;
  return (
    <div class="toast" role="status" aria-live="polite">
      <span>{current.message}</span>
      {current.undoable ? (
        <button
          type="button"
          class="button button--small"
          onClick={() => {
            undoLast();
            toast.value = null;
          }}
        >
          {fr.toast.undo}
        </button>
      ) : null}
      <button
        type="button"
        class="button button--small button--ghost"
        onClick={() => (toast.value = null)}
      >
        {fr.toast.dismiss}
      </button>
    </div>
  );
}

export function App() {
  const state = data.value;
  return (
    <div class="layout">
      <a class="skip-link" href="#contenu">
        {fr.app.skipToContent}
      </a>
      <Header />
      <ErrorBoundary>
        <main class="main" id="contenu" tabIndex={-1}>
          <Page />
        </main>
      </ErrorBoundary>
      <ToastBar />
      <footer class="footer">
        <p>
          <a href={fr.footer.dataCreditUrl} rel="noopener noreferrer">
            {fr.footer.dataCredit}
          </a>
        </p>
        {state.t === 'ready' ? <p>{fr.data.version(state.manifest.gameVersion)}</p> : null}
        <p>{fr.footer.trademark}</p>
        <p>
          <a href={fr.footer.repositoryUrl} rel="noopener noreferrer">
            {fr.footer.repository}
          </a>
        </p>
      </footer>
    </div>
  );
}
