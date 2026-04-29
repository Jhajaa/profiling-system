import './bootstrap';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './src/App.jsx';
import './src/index.css';

const container = document.getElementById('app');
const root = createRoot(container);
root.render(
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <App />
    </BrowserRouter>
);
