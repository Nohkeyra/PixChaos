/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { injectSpeedInsights } from '@vercel/speed-insights';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AppProvider } from './context/AppContext';
import './index.css';

// Initialize Vercel Speed Insights for performance monitoring
injectSpeedInsights();

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
        <AppProvider>
            <App />
        </AppProvider>
    </ErrorBoundary>
  </React.StrictMode>
);