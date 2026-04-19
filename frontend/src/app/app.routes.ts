import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { LoginComponent } from './components/login.component';
import { RegisterComponent } from './components/register.component';
import { DashboardComponent } from './components/dashboard.component';
import { HeroComponent } from './components/hero.component';
import { SettingsComponent } from './components/settings.component';

export const routes: Routes = [
    { path: '',         component: HeroComponent },
    { path: 'login',    component: LoginComponent },
    { path: 'register', component: RegisterComponent },
    { path: 'dashboard', component: DashboardComponent, canActivate: [authGuard] },
    { path: 'settings',  component: SettingsComponent,  canActivate: [authGuard] },
    { path: '**', redirectTo: '' }
];
