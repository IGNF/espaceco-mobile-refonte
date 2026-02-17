import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './app/App';

import { defineCustomElements } from '@ionic/pwa-elements/loader';
import { initAppLifecycleListener } from './platform/app/lifecycle';

import './styles/global.css';

const VITE_PRELOAD_RETRY_KEY = 'vite-preload-retry';
window.sessionStorage.removeItem(VITE_PRELOAD_RETRY_KEY);
window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault();

  if (window.sessionStorage.getItem(VITE_PRELOAD_RETRY_KEY) === '1') {
    return;
  }

  window.sessionStorage.setItem(VITE_PRELOAD_RETRY_KEY, '1');
  window.location.reload();
});

defineCustomElements(window);
initAppLifecycleListener();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
