import {
  Component, inject, signal, computed, ViewChild, ElementRef,
  OnDestroy, NgZone, AfterViewInit, effect
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { environment } from '../../environments/environment';
import { TuiTextfieldComponent } from '@taiga-ui/core/components/textfield';
import { TuiInputDirective } from '@taiga-ui/core/components/input';
import { TuiButton, TuiLoader, TuiLabel, TuiErrorComponent } from '@taiga-ui/core';
import { TuiBlock, TuiProgress } from '@taiga-ui/kit';
import * as THREE from 'three';

const BANKS = ['HDFC', 'SBI', 'ICICI', 'Axis', 'Kotak', 'PNB'];

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    CommonModule, RouterModule, ReactiveFormsModule,
    TuiTextfieldComponent, TuiInputDirective,
    TuiLoader,
    TuiProgress
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
          <div class="auth-logo auth-logo-indigo">
            <svg class="auth-logo-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                    d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"/>
            </svg>
          </div>
          <h1 class="auth-title">Create Account</h1>
          <p class="auth-subtitle">Join the Micro-Trust network</p>
        </div>

        <!-- Glassmorphism Register Card -->
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

          <form [formGroup]="registerForm" (ngSubmit)="register()" class="auth-form">

            <!-- ── Username Field with Live Availability Check ── -->
            <div class="auth-field">
              <label class="auth-label">
                <span class="auth-label-icon">👤</span> Username
              </label>
              <div class="auth-field-with-status">
                <tui-textfield class="auth-field-grow">
                  <input tuiInput
                         formControlName="username"
                         placeholder="Choose a unique username"
                         class="auth-tui-input"/>
                </tui-textfield>

                <!-- Live Status Indicator -->
                <div class="auth-status-badge">
                  @if (isCheckingUsername()) {
                    <div class="auth-mini-spinner"></div>
                  } @else if (usernameAvailable() === true) {
                    <svg class="auth-status-icon auth-status-ok" viewBox="0 0 20 20" fill="currentColor">
                      <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                    </svg>
                  } @else if (usernameAvailable() === false) {
                    <svg class="auth-status-icon auth-status-err" viewBox="0 0 20 20" fill="currentColor">
                      <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
                    </svg>
                  }
                </div>
              </div>
              @if (usernameAvailable() === false) {
                <p class="auth-field-error animate-slide-down">Username is already taken</p>
              }
              @if (registerForm.get('username')?.touched && registerForm.get('username')?.hasError('required')) {
                <p class="auth-field-error animate-slide-down">Username is required</p>
              }
              @if (registerForm.get('username')?.touched && registerForm.get('username')?.hasError('minlength')) {
                <p class="auth-field-error animate-slide-down">Minimum 3 characters</p>
              }
            </div>

            <!-- ── Email Field ── -->
            <div class="auth-field">
              <label class="auth-label">
                <span class="auth-label-icon">✉️</span> Email Address
              </label>
              <tui-textfield>
                <input tuiInput
                       formControlName="email"
                       type="email"
                       placeholder="you@domain.com"
                       class="auth-tui-input"/>
              </tui-textfield>
              @if (registerForm.get('email')?.touched && registerForm.get('email')?.hasError('email')) {
                <p class="auth-field-error animate-slide-down">Enter a valid email address</p>
              }
            </div>

            <!-- ── Phone Number with +91 ── -->
            <div class="auth-field">
              <label class="auth-label">
                <span class="auth-label-icon">📱</span> Phone Number
              </label>
              <div class="auth-phone-wrapper">
                <span class="auth-phone-prefix">+91</span>
                <tui-textfield class="auth-field-grow">
                  <input tuiInput
                         formControlName="phone"
                         type="tel"
                         inputmode="numeric"
                         maxlength="10"
                         placeholder="98XXXXXXXX"
                         class="auth-tui-input"/>
                </tui-textfield>
              </div>
              @if (registerForm.get('phone')?.touched && registerForm.get('phone')?.hasError('pattern')) {
                <p class="auth-field-error animate-slide-down">Enter a valid 10-digit number</p>
              }
            </div>

            <!-- ── Primary Bank Selector ── -->
            <div class="auth-field">
              <label class="auth-label">
                <span class="auth-label-icon">🏦</span> Primary Bank
              </label>
              <div class="auth-select-wrapper">
                <select formControlName="primaryBank" class="auth-native-select">
                  <option value="" disabled>Select your bank...</option>
                  @for (bank of banks; track bank) {
                    <option [value]="bank">{{ bank }} Bank</option>
                  }
                </select>
                <div class="auth-select-chevron">
                  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                  </svg>
                </div>
              </div>
            </div>

            <!-- ── Password with Live Strength Meter ── -->
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

              <!-- Live Password Strength Bar -->
              <div class="auth-strength-wrap">
                <progress tuiProgressBar
                          [max]="100"
                          [value]="strengthPercent()"
                          [color]="strengthColor()"
                          size="s"
                          class="auth-strength-bar">
                </progress>
                <span class="auth-strength-label" [style.color]="strengthColor()">
                  {{ strengthLabel() }}
                </span>
              </div>

              <!-- Strength Criteria Checklist -->
              <div class="auth-criteria">
                <span class="auth-criterion" [class.met]="criteria().hasLength">
                  {{ criteria().hasLength ? '✓' : '○' }} 8+ characters
                </span>
                <span class="auth-criterion" [class.met]="criteria().hasUpper">
                  {{ criteria().hasUpper ? '✓' : '○' }} Uppercase
                </span>
                <span class="auth-criterion" [class.met]="criteria().hasNumber">
                  {{ criteria().hasNumber ? '✓' : '○' }} Number
                </span>
                <span class="auth-criterion" [class.met]="criteria().hasSpecial">
                  {{ criteria().hasSpecial ? '✓' : '○' }} Special
                </span>
              </div>
            </div>

            <!-- Submit Button -->
            <button type="submit"
                    [disabled]="isSubmitting() || usernameAvailable() === false || isCheckingUsername()"
                    class="auth-submit-btn auth-submit-indigo">
              @if (isSubmitting()) {
                <tui-loader size="s" [inheritColor]="true" class="auth-btn-loader"></tui-loader>
                <span>Creating Profile...</span>
              } @else {
                <span>🚀 Create Secure Account</span>
              }
            </button>
          </form>

          <!-- Footer Link -->
          <p class="auth-footer">
            Already trusted?
            <a routerLink="/login" class="auth-link auth-link-indigo">Sign in →</a>
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
    .auth-submit-indigo {
      background: linear-gradient(135deg, #4f46e5, #7c3aed) !important;
      box-shadow: 0 0 20px rgba(99,102,241,0.25), 0 4px 16px rgba(0,0,0,0.3) !important;
    }
    .auth-submit-indigo:hover:not(:disabled) {
      box-shadow: 0 0 30px rgba(99,102,241,0.4), 0 6px 24px rgba(0,0,0,0.4) !important;
    }
    .auth-link-indigo { color: #a78bfa !important; }
    .auth-link-indigo:hover { color: #c4b5fd !important; }
    .auth-orb-1 {
      top: 25%; right: -8%;
      background: radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%);
    }
    .auth-orb-2 {
      bottom: 25%; left: -8%;
      background: radial-gradient(circle, rgba(168,85,247,0.1) 0%, transparent 70%);
    }
    .auth-orb-3 {
      top: 55%; left: 40%;
      width: 400px; height: 400px;
      background: radial-gradient(circle, rgba(99,102,241,0.05) 0%, transparent 70%);
    }

    /* ── Phone Prefix ── */
    .auth-phone-wrapper {
      display: flex;
      align-items: center;
      gap: 0;
    }
    .auth-phone-prefix {
      flex-shrink: 0;
      padding: 0 14px;
      height: 48px;
      display: flex;
      align-items: center;
      font-size: 14px;
      font-weight: 700;
      color: rgba(255,255,255,0.4);
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(99,102,241,0.15);
      border-right: none;
      border-radius: 12px 0 0 12px;
    }
    .auth-phone-wrapper .auth-field-grow {
      flex: 1;
    }
    .auth-phone-wrapper :host ::ng-deep tui-textfield {
      border-radius: 0 12px 12px 0 !important;
    }

    /* ── Native Select ── */
    .auth-select-wrapper {
      position: relative;
    }
    .auth-native-select {
      width: 100%;
      padding: 14px 16px;
      padding-right: 40px;
      border-radius: 12px;
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(99,102,241,0.15);
      color: white;
      font-size: 14px;
      font-weight: 500;
      outline: none;
      appearance: none;
      cursor: pointer;
      transition: border-color 0.2s ease, box-shadow 0.2s ease;
    }
    .auth-native-select:focus {
      border-color: rgba(99,102,241,0.5);
      box-shadow: 0 0 0 3px rgba(99,102,241,0.08);
    }
    .auth-native-select option {
      background: #0f172a;
      color: white;
    }
    .auth-select-chevron {
      position: absolute;
      right: 14px;
      top: 50%;
      transform: translateY(-50%);
      pointer-events: none;
      width: 16px;
      height: 16px;
      color: rgba(99,102,241,0.6);
    }

    /* ── Username with Status ── */
    .auth-field-with-status {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .auth-field-grow {
      flex: 1;
    }
    .auth-status-badge {
      width: 28px;
      height: 28px;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .auth-mini-spinner {
      width: 18px;
      height: 18px;
      border: 2px solid rgba(99,102,241,0.2);
      border-top-color: #6366f1;
      border-radius: 50%;
      animation: spinAuth 0.7s linear infinite;
    }
    @keyframes spinAuth {
      to { transform: rotate(360deg); }
    }
    .auth-status-icon {
      width: 20px;
      height: 20px;
    }
    .auth-status-ok { color: #10b981; }
    .auth-status-err { color: #ef4444; }

    /* ── Password Strength ── */
    .auth-strength-wrap {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-top: 8px;
    }
    .auth-strength-bar {
      flex: 1;
      height: 4px !important;
    }
    .auth-strength-label {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      flex-shrink: 0;
      transition: color 0.3s ease;
    }

    /* ── Criteria Checklist ── */
    .auth-criteria {
      display: flex;
      gap: 12px;
      margin-top: 8px;
      flex-wrap: wrap;
    }
    .auth-criterion {
      font-size: 10px;
      font-weight: 600;
      color: rgba(255,255,255,0.25);
      transition: color 0.2s ease;
    }
    .auth-criterion.met {
      color: #10b981;
    }

    /* ── Logo indigo variant ── */
    .auth-logo-indigo {
      background: linear-gradient(135deg, rgba(99,102,241,0.2), rgba(168,85,247,0.2)) !important;
      border-color: rgba(99,102,241,0.3) !important;
      box-shadow: 0 0 24px rgba(99,102,241,0.15) !important;
    }
    .auth-logo-indigo .auth-logo-icon {
      color: #a78bfa !important;
    }
  `]
})
export class RegisterComponent implements AfterViewInit, OnDestroy {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private ngZone = inject(NgZone);

  @ViewChild('bgCanvas') bgCanvasRef!: ElementRef<HTMLCanvasElement>;

  banks = BANKS;

  // ── Angular Signals (The "Live Engine") ──
  showPassword = signal(false);
  isSubmitting = signal(false);
  errorMsg = signal('');
  shaking = signal(false);
  isCheckingUsername = signal(false);
  usernameAvailable = signal<boolean | null>(null);

  private usernameCheckTimer: any;
  private renderer?: THREE.WebGLRenderer;
  private animFrame?: number;

  // ── Reactive Form ──
  registerForm = this.fb.group({
    username: ['', [Validators.required, Validators.minLength(3)]],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]],
    primaryBank: ['', Validators.required],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  // ── Computed: Password Strength Engine ──
  private passwordValue = signal('');

  constructor() {
    // Watch password changes and sync to signal
    effect(() => {
      // Initial setup — the effect will track form changes via subscription below
    });

    // Subscribe to password value changes for the signal bridge
    this.registerForm.get('password')!.valueChanges.subscribe(val => {
      this.passwordValue.set(val || '');
    });

    // Subscribe to username value changes for debounced availability check
    this.registerForm.get('username')!.valueChanges.subscribe(val => {
      this.onUsernameChange(val || '');
    });
  }

  // ── Live Password Strength Calculation ──
  criteria = computed(() => {
    const p = this.passwordValue();
    return {
      hasLength: p.length >= 8,
      hasUpper: /[A-Z]/.test(p),
      hasNumber: /[0-9]/.test(p),
      hasSpecial: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(p)
    };
  });

  strengthPercent = computed(() => {
    const c = this.criteria();
    const p = this.passwordValue();
    if (!p) return 0;

    let score = 0;
    if (p.length >= 6) score += 15;
    if (c.hasLength) score += 25;
    if (c.hasUpper) score += 20;
    if (c.hasNumber) score += 20;
    if (c.hasSpecial) score += 20;

    return Math.min(100, score);
  });

  strengthColor = computed(() => {
    const pct = this.strengthPercent();
    if (pct < 40) return '#ef4444';      // Red
    if (pct < 70) return '#f59e0b';      // Orange/Amber
    return '#10b981';                     // Green
  });

  strengthLabel = computed(() => {
    const pct = this.strengthPercent();
    if (pct === 0) return '';
    if (pct < 40) return 'Weak';
    if (pct < 70) return 'Fair';
    if (pct < 90) return 'Strong';
    return 'Excellent';
  });

  // ── Username Availability Check (debounced 500ms) ──
  private onUsernameChange(username: string) {
    this.usernameAvailable.set(null);
    if (this.usernameCheckTimer) clearTimeout(this.usernameCheckTimer);

    if (!username || username.length < 3) {
      this.isCheckingUsername.set(false);
      return;
    }

    this.isCheckingUsername.set(true);

    this.usernameCheckTimer = setTimeout(async () => {
      try {
        const authUrl = environment.apiUrl.replace('/v1', '/auth');
        const res = await fetch(`${authUrl}/check-username?username=${encodeURIComponent(username)}`);
        const data = await res.json();
        if (res.ok) {
          this.usernameAvailable.set(data.available);
        } else {
          this.usernameAvailable.set(false);
        }
      } catch {
        console.warn('[Register] Backend unavailable for username check — allowing');
        this.usernameAvailable.set(true); // Allow if backend is down
      } finally {
        this.isCheckingUsername.set(false);
      }
    }, 500);
  }

  togglePassword() {
    this.showPassword.update(s => !s);
  }

  private triggerShake() {
    this.shaking.set(true);
    setTimeout(() => this.shaking.set(false), 600);
  }

  // ── Three.js Wireframe Background ──
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
    const mat = new THREE.LineBasicMaterial({ color: 0x6366f1, transparent: true, opacity: 0.18 });
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

  // ── Form Submission ──
  async register() {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      this.errorMsg.set('Please fill in all fields correctly.');
      this.triggerShake();
      return;
    }

    if (this.usernameAvailable() === false) {
      this.errorMsg.set('Username is currently taken.');
      this.triggerShake();
      return;
    }

    this.isSubmitting.set(true);
    this.errorMsg.set('');

    try {
      const { username, email, phone, primaryBank, password } = this.registerForm.value;
      const authUrl = environment.apiUrl.replace('/v1', '/auth');

      const res = await fetch(`${authUrl}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          email,
          phone_number: phone,
          primary_bank: primaryBank,
          password
        })
      });

      const data = await res.json();

      if (res.ok) {
        // Auto-login: store user and navigate to dashboard
        localStorage.setItem('microtrust_user', JSON.stringify({
          _id: data._id,
          username: data.username,
          phone_number: data.phone_number,
          primary_bank: data.primary_bank || primaryBank,
          email: data.email,
          token: data.token
        }));
        this.router.navigate(['/dashboard']);
      } else {
        this.errorMsg.set(data.message || 'Registration failed.');
        this.triggerShake();
      }
    } catch {
      this.errorMsg.set('Network error connecting to auth server.');
      this.triggerShake();
    } finally {
      this.isSubmitting.set(false);
    }
  }

  ngOnDestroy() {
    if (this.usernameCheckTimer) clearTimeout(this.usernameCheckTimer);
    if (this.animFrame) cancelAnimationFrame(this.animFrame);
    if (this.renderer) this.renderer.dispose();
  }
}
