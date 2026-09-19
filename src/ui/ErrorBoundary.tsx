import { Component, type ComponentChildren } from 'preact';
import { fr } from './strings.fr';
import { downloadText, exportJson } from './store';

/** No uncaught exception may blank the screen (SPEC §11): offer a rescue export, then a reload. */
export class ErrorBoundary extends Component<{ children: ComponentChildren }, { failed: boolean }> {
  override state = { failed: false };

  static override getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }

  override render() {
    if (!this.state.failed) return this.props.children;
    return (
      <main class="main" id="contenu">
        <section class="card card--alert" role="alert">
          <h1 class="card__title">{fr.crash.title}</h1>
          <p>{fr.crash.detail}</p>
          <div class="actions">
            <button
              type="button"
              class="button"
              onClick={() => downloadText('roadbook-progression.json', exportJson())}
            >
              {fr.crash.download}
            </button>
            <button
              type="button"
              class="button button--primary"
              onClick={() => window.location.reload()}
            >
              {fr.crash.reload}
            </button>
          </div>
        </section>
      </main>
    );
  }
}
