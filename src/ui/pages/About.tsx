import { fr } from '../strings.fr';

export function About() {
  return (
    <section class="card">
      <h1 class="card__title">{fr.about.title}</h1>
      <p>{fr.about.what}</p>
      <p>{fr.about.data}</p>
      <p>{fr.about.uncertainty}</p>
      <p>
        <a href={fr.footer.dataCreditUrl} rel="noopener noreferrer">
          {fr.footer.dataCredit}
        </a>
      </p>
      <p>{fr.footer.trademark}</p>
    </section>
  );
}
