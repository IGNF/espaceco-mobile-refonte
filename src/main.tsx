import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './app/App';

import { defineCustomElements } from '@ionic/pwa-elements/loader';
import { initAppEvents } from './platform/app/events';

import './styles/global.css';

const VITE_MODULE_RELOAD_RETRY_KEY = 'vite-module-reload-retry';
const VITE_MODULE_RELOAD_RETRY_RESET_MS = 10000;

function resetViteModuleReloadRetry(): void {
  window.setTimeout(() => {
    window.sessionStorage.removeItem(VITE_MODULE_RELOAD_RETRY_KEY);
  }, VITE_MODULE_RELOAD_RETRY_RESET_MS);
}

function reloadOnceOnViteModuleError(): void {
  if (window.sessionStorage.getItem(VITE_MODULE_RELOAD_RETRY_KEY) === '1') {
    return;
  }

  window.sessionStorage.setItem(VITE_MODULE_RELOAD_RETRY_KEY, '1');
  window.location.reload();
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return typeof error === 'string' ? error : '';
}

function isStaleViteDependencyError(error: unknown): boolean {
  const message = getErrorMessage(error);

  return (
    message.includes('Outdated Optimize Dep') ||
    message.includes('Failed to fetch dynamically imported module')
  );
}

resetViteModuleReloadRetry();

window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault();
  reloadOnceOnViteModuleError();
});

defineCustomElements(window);
initAppEvents();

if (import.meta.env.DEV) {
  window.addEventListener('error', (event) => {
    if (!isStaleViteDependencyError(event.error ?? event.message)) {
      return;
    }

    event.preventDefault();
    reloadOnceOnViteModuleError();
  });

  window.addEventListener('unhandledrejection', (event) => {
    if (!isStaleViteDependencyError(event.reason)) {
      return;
    }

    event.preventDefault();
    reloadOnceOnViteModuleError();
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
