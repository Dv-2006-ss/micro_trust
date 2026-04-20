// src/environments/environment.ts
// ─────────────────────────────────────────────────────────────────────────────
// RUNTIME DETECTION: Guarantees the correct API URL regardless of whether
// Angular's fileReplacements swaps this file during the production build.
// If the browser is NOT on localhost → use the Render backend URL.
// ─────────────────────────────────────────────────────────────────────────────
const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
const isDeployed = hostname !== 'localhost' && hostname !== '127.0.0.1';

export const environment = {
  production: isDeployed,
  apiUrl: isDeployed
    ? 'https://micro-trust-1.onrender.com/api/v1'
    : 'http://localhost:3000/api/v1'
};
