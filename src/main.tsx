import { render } from 'preact';
import { App } from './app/App';
import './styles/app.css';
import './styles/audio.css';
import './styles/motion.css';
import './styles/shop.css';
import './styles/win.css';

render(<App />, document.getElementById('app') as HTMLElement);
