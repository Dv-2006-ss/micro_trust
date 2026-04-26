import {
  Component, inject, signal, computed, ViewChild, ElementRef,
  OnDestroy, NgZone, AfterViewInit
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { AuthService } from '../services/auth.service';
import { environment } from '../../environments/environment';
import { TuiTextfieldComponent } from '@taiga-ui/core/components/textfield';
import { TuiInputDirective } from '@taiga-ui/core/components/input';
import { TuiButton, TuiLoader, TuiLabel, TuiCheckbox } from '@taiga-ui/core';
import { TuiBlock } from '@taiga-ui/kit';
import * as THREE from 'three';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule, RouterModule, ReactiveFormsModule,
    TuiTextfieldComponent, TuiInputDirective,
    TuiButton, TuiLoader, TuiLabel, TuiCheckbox, TuiBlock
  ],
  template: `
    <div class="auth-viewport">

      <!-- Three.js Background Canvas -->
      <canvas #bgCanvas class="auth-bg-canvas"></canvas>

      <!-- Animated Gradient Orbs -->
      <div class="auth-orb auth-orb-1"></div>
      <div class="auth-orb auth-orb-2"></div>
      <div class="auth-orb auth-orb-3"></div>

      <!-- Main Auth Container -->
      <div class="auth-container">

        <!-- Brand Header -->
        <div class="auth-brand">
          <div class="auth-logo">
            <svg class="auth-logo-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
            </svg>
          </div>
          <h1 class="auth-title">Access Securely</h1>
          <p class="auth-subtitle">Micro-Trust V2 · Alternative Credit Intelligence</p>
        </div>

        <!-- Glassmorphism Login Card -->
        <div class="auth-glass-card" [class.shake]="shaking()">

          <!-- Error Banner -->
          @if (errorMsg()) {
            <div class="auth-error-banner animate-slide-down">
              <svg class="auth-error-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              {{ errorMsg() }}
            </div>
          }

          <form [formGroup]="loginForm" (ngSubmit)="login()" class="auth-form">

            <!-- Username Field -->
            <div class="auth-field">
              <label class="auth-label">
                <span class="auth-label-icon">👤</span> Username
              </label>
              <tui-textfield>
                <input tuiInput
                       formControlName="username"
                       placeholder="Enter your username"
                       class="auth-tui-input"/>
              </tui-textfield>
              @if (loginForm.get('username')?.touched && loginForm.get('username')?.hasError('required')) {
                <p class="auth-field-error animate-slide-down">Username is required</p>
              }
            </div>

            <!-- Password Field -->
            <div class="auth-field">
              <label class="auth-label">
                <span class="auth-label-icon">🔒</span> Password
              </label>
              <tui-textfield>
                <input tuiInput
                       [type]="showPassword() ? 'text' : 'password'"
                       formControlName="password"
                       placeholder="••••••••"
                       class="auth-tui-input"/>
              </tui-textfield>
              <!-- Toggle visibility -->
              <button type="button" (click)="togglePassword()" class="auth-pw-toggle" tabindex="-1">
                @if (showPassword()) {
                  <svg class="auth-pw-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                          d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/>
                  </svg>
                } @else {
                  <svg class="auth-pw-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                  </svg>
                }
              </button>
            </div>

            <!-- Remember Me -->
            <div class="auth-remember-row">
              <label class="auth-remember-label">
                <input tuiCheckbox type="checkbox" formControlName="rememberMe"/>
                <span class="auth-remember-text">Remember Me</span>
              </label>
            </div>

            <!-- Submit Button -->
            <button type="submit"
                    [disabled]="isSubmitting() || loginForm.invalid"
                    class="auth-submit-btn auth-submit-cyan">
              @if (isSubmitting()) {
                <tui-loader size="s" [inheritColor]="true" class="auth-btn-loader"></tui-loader>
                <span>Verifying...</span>
              } @else {
                <span>⚡ Sign In to Dashboard</span>
              }
            </button>
          </form>

          <!-- Footer Link -->
          <p class="auth-footer">
            New to Micro-Trust?
            <a routerLink="/register" class="auth-link auth-link-cyan">Create Account →</a>
          </p>
        </div>

        <!-- Security Badge -->
        <div class="auth-security-badge">
          <svg class="auth-badge-lock" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
          </svg>
          <span>256-bit AES · End-to-End Encrypted</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    @import 'auth-shared';
    .auth-submit-cyan {
      background: linear-gradient(135deg, #0891b2, #4f46e5) !important;
      box-shadow: 0 0 20px rgba(6,182,212,0.25), 0 4px 16px rgba(0,0,0,0.3) !important;
    }
    .auth-submit-cyan:hover:not(:disabled) {
      box-shadow: 0 0 30px rgba(6,182,212,0.4), 0 6px 24px rgba(0,0,0,0.4) !important;
    }
    .auth-link-cyan { color: #22d3ee !important; }
    .auth-link-cyan:hover { color: #67e8f9 !important; }
    .auth-orb-1 {
      top: 20%; left: -8%;
      background: radial-gradient(circle, rgba(6,182,212,0.12) 0%, transparent 70%);
    }
    .auth-orb-2 {
      bottom: 20%; right: -8%;
      background: radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%);
    }
    .auth-orb-3 {
      top: 60%; left: 50%;
      width: 400px; height: 400px;
      background: radial-gradient(circle, rgba(6,182,212,0.05) 0%, transparent 70%);
    }
  `]
})
export class LoginComponent implements AfterViewInit, OnDestroy {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private ngZone = inject(NgZone);

  @ViewChild('bgCanvas') bgCanvasRef!: ElementRef<HTMLCanvasElement>;

  // ── Angular Signals ──
  showPassword = signal(false);
  isSubmitting = signal(false);
  errorMsg = signal('');
  shaking = signal(false);

  // ── Reactive Form ──
  loginForm = this.fb.group({
    username: ['', Validators.required],
    password: ['', Validators.required],
    rememberMe: [false]
  });

  // ── Three.js ──
  private renderer?: THREE.WebGLRenderer;
  private animFrame?: number;

  ngAfterViewInit() {
    this.ngZone.runOutsideAngular(() => this.initBg());
  }

  private initBg() {
    const canvas = this.bgCanvasRef.nativeElement;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 5;
    this.renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.renderer.setClearColor(0x000000, 0);

    const geo = new THREE.IcosahedronGeometry(2, 2);
    const edges = new THREE.EdgesGeometry(geo);
    const mat = new THREE.LineBasicMaterial({ color: 0x06b6d4, transparent: true, opacity: 0.2 });
    const sphere = new THREE.LineSegments(edges, mat);
    scene.add(sphere);

    const startTime = performance.now();
    const loop = () => {
      this.animFrame = requestAnimationFrame(loop);
      const t = (performance.now() - startTime) / 1000;
      sphere.rotation.y = t * 0.05;
      sphere.rotation.x = t * 0.03;
      this.renderer?.render(scene, camera);
    };
    loop();

    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      this.renderer?.setSize(window.innerWidth, window.innerHeight);
    });
  }

  togglePassword() {
    this.showPassword.update(s => !s);
  }

  private triggerShake() {
    this.shaking.set(true);
    setTimeout(() => this.shaking.set(false), 600);
  }

  async login() {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      this.triggerShake();
      return;
    }

    this.isSubmitting.set(true);
    this.errorMsg.set('');

    try {
      const { username, password, rememberMe } = this.loginForm.value;
      const authUrl = environment.apiUrl.replace('/v1', '/auth');
      const res = await fetch(`${authUrl}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();

      if (res.ok) {
        const userToSave = {
          _id: data._id,
          username: data.username,
          phone_number: data.phone_number,
          primary_bank: data.primary_bank,
          email: data.email,
          token: data.token
        };

        if (rememberMe) {
          localStorage.setItem('microtrust_remember', 'true');
        }

        this.authService.loginSuccess(userToSave);
      } else {
        this.errorMsg.set(data.message || 'Authentication failed.');
        this.triggerShake();
      }
    } catch {
      this.errorMsg.set('Network error — is the Orchestrator running?');
      this.triggerShake();
    } finally {
      this.isSubmitting.set(false);
    }
  }

  ngOnDestroy() {
    if (this.animFrame) cancelAnimationFrame(this.animFrame);
    if (this.renderer) this.renderer.dispose();
  }
}
