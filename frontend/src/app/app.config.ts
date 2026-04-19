import { ApplicationConfig, provideZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    // Angular 21 (zoneless) configuration enabled securely
    provideZonelessChangeDetection(),
    provideRouter(routes)
  ]
};
