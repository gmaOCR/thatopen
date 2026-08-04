import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { applyTheme, initialTheme } from './services/theme'

// Avant le rendu : évite le flash de thème et garantit que le renderer 3D lira
// le bon --td-scene-bg à l'initialisation.
applyTheme(initialTheme())

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
