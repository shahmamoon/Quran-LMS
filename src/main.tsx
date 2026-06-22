import { StrictMode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

const container = document.getElementById('root')!;

// Pre-rendered marketing pages: hydrate the server HTML.
// LMS pages (served via SPA fallback with empty root): mount fresh.
if (container.hasChildNodes()) {
  hydrateRoot(container, <StrictMode><App /></StrictMode>);
} else {
  createRoot(container).render(<StrictMode><App /></StrictMode>);
}
