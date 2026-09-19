import { render } from 'preact';
import { App } from './ui/App';
import { startApp } from './ui/store';
import './styles/tokens.css';
import './styles/base.css';

const root = document.getElementById('app');
if (root) {
  startApp();
  render(<App />, root);
}

// Offline support: production only, so the dev server is never shadowed by a cache.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`)
      .catch(() => undefined);
  });
}
