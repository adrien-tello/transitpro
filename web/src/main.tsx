import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/index.css';

// Router, React Query provider and the dashboard layout go in src/app/.
function App() {
  return <p className="p-8 font-sans text-ink">TransitPro dashboard: start in src/app/.</p>;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
