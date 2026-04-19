import { Component, inject, signal, computed, ViewChild, ElementRef, OnDestroy, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { PretextService } from '../services/pretext.service';
import { environment } from '../../environments/environment';
import * as THREE from 'three';

const BANKS = ['HDFC', 'SBI', 'ICICI', 'Axis', 'Kotak', 'PNB'];

const BANK_CARD_PREVIEWS: Record<string, string> = {
  'HDFC':  'HDFC Regalia, Millennia, Infinia',
  'SBI':   'SBI Elite, SimplyCLICK, PRIME',
  'ICICI': 'ICICI Sapphiro, Amazon Pay card',
  'Axis':  'Axis Magnus, Flipkart card',
  'Kotak': 'Kotak White, League Platinum',
  'PNB':   'PNB RuPay Platinum, Select',
};

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="min-h-screen flex items-center justify-center px-4 py-10 relative overflow-hidden cyber-grid" style="background:#020617;">

      <canvas #bgCanvas class="absolute inset-0 w-full h-full" style="z-index:0; pointer-events:none; opacity:0.4;"></canvas>

      <div class="absolute top-1/3 -right-32 w-96 h-96 rounded-full" style="background:radial-gradient(circle,rgba(99,102,241,0.12) 0%,transparent 70%); z-index:1;"></div>
      <div class="absolute bottom-1/4 -left-32 w-72 h-72 rounded-full" style="background:radial-gradient(circle,rgba(168,85,247,0.08) 0%,transparent 70%); z-index:1;"></div>

      <div class="w-full max-w-md relative" style="z-index:10;">

        <!-- Brand -->
        <div class="text-center mb-8">
          <div class="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4"
               style="background:linear-gradient(135deg,rgba(99,102,241,0.2),rgba(168,85,247,0.2)); border:1px solid rgba(99,102,241,0.3); box-shadow:0 0 24px rgba(99,102,241,0.15);">
            <svg class="w-7 h-7 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"/>
            </svg>
          </div>
          <h1 class="text-3xl font-black text-white tracking-tight">Create Account</h1>
          <p class="text-gray-500 mt-2 text-sm">Join the Micro-Trust network</p>
        </div>

        <!-- Glass Card -->
        <div class="glass-card rounded-3xl p-8" [class.shake]="shaking()">

          <!-- ── Layout-Shift Prevented Error Container via Pretext ── -->
          <div [style.height.px]="errorContainerHeight()" style="transition: height 0.3s ease; overflow: hidden;" class="mb-4">
            @if (errorMsg()) {
              <div class="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-xl text-sm flex items-center gap-3">
                <svg class="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                {{ errorMsg() }}
              </div>
            }
          </div>

          <form (ngSubmit)="register()" class="space-y-5">

            <!-- Name / Username -->
            <div>
              <label class="block text-xs font-bold uppercase tracking-widest mb-2" style="color:rgba(99,102,241,0.9);">
                👤 Username
              </label>
              <div class="relative">
                <input type="text" [(ngModel)]="username" name="username" required
                       (ngModelChange)="checkUsernameAvailability()"
                       placeholder="Choose a username"
                       class="w-full px-4 py-4 rounded-xl text-white transition-all duration-200 outline-none"
                       style="background:rgba(255,255,255,0.05); border:1px solid rgba(99,102,241,0.2);"
                       (focus)="onFocus($event,'indigo')" (blur)="onBlur($event,'indigo')"/>
                <div class="absolute right-4 top-1/2 -translate-y-1/2 flex items-center px-1 bg-[#020617] rounded shadow-lg pointer-events-none">
                  @if (checkingUsername()) {
                    <svg class="w-5 h-5 animate-spin text-indigo-400" viewBox="0 0 24 24" fill="none">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                  } @else if (usernameAvailable() === true) {
                    <svg class="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                    </svg>
                  } @else if (usernameAvailable() === false) {
                    <svg class="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  }
                </div>
              </div>
              @if (usernameAvailable() === false) {
                <p class="text-xs text-red-400 mt-1 pl-1">Username is already taken.</p>
              }
            </div>

            <!-- Email -->
            <div>
              <label class="block text-xs font-bold uppercase tracking-widest mb-2" style="color:rgba(99,102,241,0.9);">
                ✉️ Email Address
              </label>
              <input type="email" [(ngModel)]="email" name="email" required
                     placeholder="you@domain.com"
                     class="w-full px-4 py-4 rounded-xl text-white transition-all duration-200 outline-none"
                     style="background:rgba(255,255,255,0.05); border:1px solid rgba(99,102,241,0.2);"
                     (focus)="onFocus($event,'indigo')" (blur)="onBlur($event,'indigo')"/>
            </div>

            <!-- Phone Number -->
            <div>
              <label class="block text-xs font-bold uppercase tracking-widest mb-2" style="color:rgba(99,102,241,0.9);">
                📱 Phone Number
              </label>
              <div class="relative">
                <span class="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-bold select-none">+91</span>
                <input type="tel" inputmode="numeric" maxlength="10" pattern="[0-9]{10}"
                       [(ngModel)]="phoneNumber" name="phoneNumber" required
                       placeholder="98XXXXXXXX"
                       class="w-full pl-12 pr-4 py-4 rounded-xl text-white font-mono text-base tracking-wider transition-all duration-200 outline-none"
                       style="background:rgba(255,255,255,0.05); border:1px solid rgba(99,102,241,0.2);"
                       (focus)="onFocus($event,'indigo')" (blur)="onBlur($event,'indigo')"/>
              </div>
            </div>

            <!-- Primary Bank Dropdown -->
            <div>
              <label class="block text-xs font-bold uppercase tracking-widest mb-2" style="color:rgba(99,102,241,0.9);">
                🏦 Primary Bank
              </label>
              <div class="relative">
                <select [(ngModel)]="primaryBank" name="primaryBank" required
                        class="w-full px-4 py-4 rounded-xl text-white font-semibold transition-all duration-200 outline-none appearance-none cursor-pointer"
                        style="background:rgba(255,255,255,0.05); border:1px solid rgba(99,102,241,0.2);"
                        (change)="onBankChange()" (focus)="onFocus($event,'indigo')" (blur)="onBlur($event,'indigo')">
                  <option value="" disabled [selected]="!primaryBank" style="background:#0f172a;">Select your bank...</option>
                  @for (bank of banks; track bank) {
                    <option [value]="bank" style="background:#0f172a;">{{ bank }} Bank</option>
                  }
                </select>
                <div class="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                  <svg class="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                  </svg>
                </div>
              </div>
            </div>

            <!-- Password with Strength Meter -->
            <div>
              <label class="block text-xs font-bold uppercase tracking-widest mb-2" style="color:rgba(99,102,241,0.9);">
                🔒 Password
              </label>
              <div class="relative">
                <input [type]="showPassword() ? 'text' : 'password'"
                       [(ngModel)]="password" name="password" required minlength="6"
                       (ngModelChange)="checkPasswordStrength()"
                       placeholder="••••••••"
                       class="w-full px-4 py-4 pr-12 rounded-xl text-white transition-all duration-200 outline-none"
                       style="background:rgba(255,255,255,0.05); border:1px solid rgba(99,102,241,0.2);"
                       (focus)="onFocus($event,'indigo')" (blur)="onBlur($event,'indigo')"/>
                
                <button type="button" (click)="togglePassword()" tabindex="-1"
                        class="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-indigo-400 transition-colors cursor-pointer outline-none">
                  @if (showPassword()) {
                    <svg class="w-5 h-5 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/>
                    </svg>
                  } @else {
                    <svg class="w-5 h-5 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                    </svg>
                  }
                </button>
              </div>
              
              <!-- Password Strength Meter -->
              <div class="mt-2 flex gap-1 h-1.5 w-full rounded-full overflow-hidden" style="background:rgba(255,255,255,0.05);">
                <div class="h-full transition-all duration-300 rounded-full" 
                     [style.width.%]="pwdStrength() * 33.33" 
                     [style.background]="pwdColor()"></div>
              </div>
            </div>

            <!-- Submit -->
            <button type="submit" [disabled]="isLoading() || checkingUsername() || usernameAvailable() === false"
                    class="w-full py-4 rounded-xl font-bold text-white text-base transition-all duration-300 neon-btn mt-6"
                    style="background:linear-gradient(135deg,#4f46e5,#7c3aed); box-shadow:0 0 20px rgba(99,102,241,0.25);">
              @if (isLoading()) {
                <span class="flex items-center justify-center gap-3">
                  <svg class="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Creating Profile...
                </span>
              } @else {
                Create Secure Account
              }
            </button>
          </form>

          <p class="text-center text-gray-500 text-sm mt-6">
            Already trusted?
            <a routerLink="/login" class="text-indigo-400 font-bold hover:text-indigo-300 transition-colors ml-1">Sign in →</a>
          </p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    input::placeholder, select { color: rgba(255,255,255,0.3); }
    select option { color: white; }
    input:focus, select:focus { border-color: rgba(99,102,241,0.6) !important; box-shadow:0 0 0 3px rgba(99,102,241,0.08); }
    input:disabled { opacity: 0.5; }
    button:disabled { opacity: 0.5; cursor: not-allowed; }
  `]
})
export class RegisterComponent implements OnDestroy {
  private router = inject(Router);
  private ngZone = inject(NgZone);
  private pretext = inject(PretextService);

  @ViewChild('bgCanvas') bgCanvasRef!: ElementRef<HTMLCanvasElement>;

  banks = BANKS;
  
  // Form fields
  username = '';
  email = '';
  phoneNumber = '';
  primaryBank = '';
  password = '';
  
  // Real-time states
  isLoading = signal(false);
  errorMsg = signal('');
  shaking = signal(false);
  
  bankPreviewText = signal('');
  pretextBankPreviewHeight = signal(44);  // computed using Pretext
  
  checkingUsername = signal(false);
  usernameAvailable = signal<boolean | null>(null);
  private usernameTimeout: any;

  pwdStrength = signal(0); // 0 to 3
  pwdColor = signal('rgba(255,255,255,0.1)');
  showPassword = signal(false);

  private renderer?: THREE.WebGLRenderer;
  private animFrame?: number;
  private startTime = performance.now();

  // ── PRETEXT: Error container zero layout shift ──
  errorContainerHeight = computed(() => {
    const msg = this.errorMsg();
    if (!msg) return 0;
    this.pretext.prepare('Inter', 14, '400');
    // Assuming max width of container ~ 400px - paddings (8rem = 128px) 
    const containerWidth = Math.min(window.innerWidth - 64, 400 - 64);
    // 32 padding inside error div, 16px font-size equivalent line-height
    const h = this.pretext.fitToContainer(msg, containerWidth, 20, 32);
    // Add extra padding for icon and stable bounding box
    return Math.max(56, h + 16);
  });

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
    const mat = new THREE.LineBasicMaterial({ color: 0x6366f1, transparent: true, opacity: 0.2 });
    const sphere = new THREE.LineSegments(edges, mat);
    scene.add(sphere);

    const loop = () => {
      this.animFrame = requestAnimationFrame(loop);
      const t = (performance.now() - this.startTime) / 1000;
      sphere.rotation.y = t * 0.04;
      sphere.rotation.x = t * 0.025;
      this.renderer?.render(scene, camera);
    };
    loop();
  }

  // ── Username Availability Debouncer ──
  checkUsernameAvailability() {
    this.usernameAvailable.set(null);
    if (!this.username || this.username.length < 3) return;

    if (this.usernameTimeout) clearTimeout(this.usernameTimeout);
    
    this.checkingUsername.set(true);
    this.usernameTimeout = setTimeout(async () => {
      try {
        const authUrl = environment.apiUrl.replace('/v1', '/auth');
        const res = await fetch(`${authUrl}/check-username?username=${encodeURIComponent(this.username)}`);
        const data = await res.json();
        if (res.ok) {
          this.usernameAvailable.set(data.available);
        } else {
          this.usernameAvailable.set(false);
        }
      } catch (err) {
        // Fallback or ignore if server offline
        console.warn('Backend unavailable for username check');
      } finally {
        this.checkingUsername.set(false);
      }
    }, 500); 
  }

  // ── Password Strength Algorithm ──
  checkPasswordStrength() {
    const p = this.password;
    if (!p) {
      this.pwdStrength.set(0);
      this.pwdColor.set('rgba(255,255,255,0.1)');
      return;
    }
    
    let strength = 0;
    if (p.length >= 6) strength += 1;
    if (p.length >= 8 && /[A-Z]/.test(p)) strength += 1;
    if (p.length >= 10 && /[0-9!@#$&*]/.test(p)) strength += 1;
    
    this.pwdStrength.set(strength);
    
    if (strength === 1) this.pwdColor.set('#ef4444'); // Red
    else if (strength === 2) this.pwdColor.set('#f59e0b'); // Amber
    else if (strength === 3) this.pwdColor.set('#10b981'); // Green
    else this.pwdColor.set('rgba(255,255,255,0.1)');
  }

  onBankChange() {
    // The EligibleCards text preview is now exclusively pushed to the Dashboard.
  }

  togglePassword() {
    this.showPassword.update(s => !s);
  }

  onFocus(e: Event, color: 'cyan' | 'indigo') {
    const c = color === 'cyan' ? 'rgba(6,182,212,0.6)' : 'rgba(99,102,241,0.6)';
    (e.target as HTMLElement).style.borderColor = c;
  }
  onBlur(e: Event, color: 'cyan' | 'indigo') {
    const c = color === 'cyan' ? 'rgba(6,182,212,0.2)' : 'rgba(99,102,241,0.2)';
    (e.target as HTMLElement).style.borderColor = c;
  }

  async register() {
    if (!this.username) {
        this.errorMsg.set('Username is required.');
        this.triggerShake(); return;
    }
    if (this.usernameAvailable() === false) {
        this.errorMsg.set('Username is currently taken.');
        this.triggerShake(); return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email)) {
        this.errorMsg.set('Enter a valid email address.');
        this.triggerShake(); return;
    }
    if (!/^[0-9]{10}$/.test(this.phoneNumber)) {
      this.errorMsg.set('Enter a valid 10-digit phone number.');
      this.triggerShake(); return;
    }
    if (!this.primaryBank) {
      this.errorMsg.set('Please select your primary bank.'); 
      this.triggerShake(); return;
    }
    if (this.pwdStrength() < 1) {
      this.errorMsg.set('Password must be at least 6 characters.'); 
      this.triggerShake(); return;
    }
    
    this.isLoading.set(true); 
    this.errorMsg.set('');
    
    try {
      const authUrl = environment.apiUrl.replace('/v1', '/auth');
      const res = await fetch(`${authUrl}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          username: this.username,
          email: this.email,
          phone_number: this.phoneNumber, 
          primary_bank: this.primaryBank, 
          password: this.password 
        })
      });
      const data = await res.json();
      if (res.ok) {
        // Auto-login: store full user object including JWT
        localStorage.setItem('microtrust_user', JSON.stringify({
          _id: data._id, 
          username: data.username,
          phone_number: data.phone_number, 
          primary_bank: data.primary_bank || this.primaryBank,
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
      this.isLoading.set(false);
    }
  }
  
  private triggerShake() {
      this.shaking.set(true); 
      setTimeout(() => this.shaking.set(false), 600);
  }

  ngOnDestroy() {
    if (this.usernameTimeout) clearTimeout(this.usernameTimeout);
    if (this.animFrame) cancelAnimationFrame(this.animFrame);
    if (this.renderer) this.renderer.dispose();
  }
}
