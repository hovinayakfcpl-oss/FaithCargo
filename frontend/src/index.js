import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

// --- JERVICE VOICE INITIALIZATION ---
// Isse browser ki voices load ho jati hain taaki Jervice turant bol sake
const initJerviceVoices = () => {
  if ('speechSynthesis' in window) {
    // Voices load karne ka trigger
    window.speechSynthesis.getVoices();
    window.speechSynthesis.onvoiceschanged = () => {
      window.speechSynthesis.getVoices();
    };
  }
};
initJerviceVoices();

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Performance tracking (optional)
reportWebVitals();