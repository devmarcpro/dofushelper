import { fr } from './strings.fr';

export function App() {
  return (
    <div class="layout">
      <header class="header">
        <h1 class="header__title">{fr.app.name}</h1>
        <p class="header__tagline">{fr.app.tagline}</p>
      </header>
      <main class="main">
        <section class="card" aria-labelledby="wip-title">
          <h2 id="wip-title" class="card__title">
            {fr.app.underConstruction}
          </h2>
          <p>{fr.app.underConstructionDetail}</p>
        </section>
      </main>
      <footer class="footer">
        <p>{fr.footer.dataCredit}</p>
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
