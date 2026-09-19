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
