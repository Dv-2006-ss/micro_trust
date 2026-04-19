// src/environments/environment.production.ts
// The BUILD_API_URL placeholder is replaced by Render's build environment variable.
export const environment = {
  production: true,
  apiUrl: (window as any).__API_URL__ ?? 'https://microtrust-backend.onrender.com'
};
