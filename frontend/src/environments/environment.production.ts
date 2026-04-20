// src/environments/environment.production.ts
// ─────────────────────────────────────────────────────────────────────────────
// Production build target. Angular's fileReplacements swaps environment.ts
// with this file during `ng build --configuration production`.
// ALSO uses runtime detection as a belt-and-suspenders failsafe.
// ─────────────────────────────────────────────────────────────────────────────
const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
const isDeployed = hostname !== 'localhost' && hostname !== '127.0.0.1';

export const environment = {
  production: true,
  apiUrl: isDeployed
    ? 'https://micro-trust-1.onrender.com/api/v1'
    : 'http://localhost:3000/api/v1'
};
