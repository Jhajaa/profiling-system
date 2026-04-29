import './bootstrap';
import { createRoot } from 'react-dom/client';
import App from './src/App.jsx';
import './src/index.css';

const container = document.getElementById('app');
const root = createRoot(container);
root.render(<App />);
