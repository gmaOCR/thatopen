import { lazy, Suspense } from 'react';
import ErrorBoundary from './components/ErrorBoundary';
import './App.css';

// Lazy-load : le moteur 3D (three + @thatopen + web-ifc, plusieurs Mo) n'est
// pas dans le bundle initial — l'app affiche instantanément puis charge le viewer.
const IFCViewer = lazy(() => import('./components/Viewer/IFCViewer'));

function App() {
  return (
    <ErrorBoundary>
      <div className="app">
        <Suspense fallback={<div className="viewer-loading" aria-label="Chargement du viewer" />}>
          <IFCViewer />
        </Suspense>
      </div>
    </ErrorBoundary>
  );
}

export default App;
