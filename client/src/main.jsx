import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import VaimozLivePilotApp from './app/App.jsx';
import { runUiSmokeTests } from './tests/smoke-tests.js';

runUiSmokeTests();

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <VaimozLivePilotApp />
  </React.StrictMode>
);
