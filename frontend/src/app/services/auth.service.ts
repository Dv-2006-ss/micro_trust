import { Injectable, computed, signal, inject } from '@angular/core';
import { Router } from '@angular/router';

export interface User {
  _id: string;
  username: string;
  phone_number?: string;
  primary_bank?: string;
  email?: string;
  token: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private router = inject(Router);
  
  // Zoneless signal state
  private currentUserSignal = signal<User | null>(this.getStoredUser());

  // Computed state
  readonly currentUser = computed(() => this.currentUserSignal());
  readonly isAuthenticated = computed(() => !!this.currentUserSignal());

  private getStoredUser(): User | null {
    try {
      const stored = localStorage.getItem('microtrust_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }

  // Purely handles the UI/Client state after server responds
  loginSuccess(user: User) {
    localStorage.setItem('microtrust_user', JSON.stringify(user));
    this.currentUserSignal.set(user);
    this.router.navigate(['/dashboard']);
  }

  // ── Profile update: persists new data + refreshes signal instantly ──────
  profileUpdateSuccess(updated: User) {
    // Keep the existing token if the server didn't issue a new one
    const merged: User = { ...this.currentUserSignal()!, ...updated };
    localStorage.setItem('microtrust_user', JSON.stringify(merged));
    this.currentUserSignal.set(merged);  // → all computed() subscribers update instantly
  }

  logout() {
    localStorage.removeItem('microtrust_user');
    this.currentUserSignal.set(null);
    this.router.navigate(['/']);
  }
}
