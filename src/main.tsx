import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Handle redirects from index.html
const params = new URLSearchParams(window.location.search);
if (window.location.pathname.endsWith('index.html')) {
  const newUrl = window.location.origin + '/?' + params.toString();
  window.history.replaceState({}, '', newUrl);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
