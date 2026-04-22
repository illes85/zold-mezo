import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './App.tsx';
import Admin from './Admin.tsx';
import Adatkezeles from './pages/Adatkezeles.tsx';
import Aszf from './pages/Aszf.tsx';
import Impresszum from './pages/Impresszum.tsx';
import './index.css';
import { AuthProvider } from './AuthContext.tsx';
import ErrorBoundary from './ErrorBoundary.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<App />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/adatkezeles" element={<Adatkezeles />} />
            <Route path="/aszf" element={<Aszf />} />
            <Route path="/impresszum" element={<Impresszum />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  </StrictMode>,
);