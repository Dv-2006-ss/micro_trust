import { Component, inject, signal, computed, ViewChild, ElementRef, OnDestroy, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { PretextService } from '../services/pretext.service';
import { FormsModule } from '@angular/forms';
import { environment } from '../../environments/environment';
import * as THREE from 'three';

const BANKS = ['HDFC', 'SBI', 'ICICI', 'Axis', 'Kotak', 'PNB'];

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="min-h-screen flex items-center justify-center px-4 relative overflow-hidden cyber-grid" style="background:#020617;">

      <!-- Three.js BG Canvas -->
      <canvas #bgCanvas class="absolute inset-0 w-full h-full" style="z-index:0; pointer-events:none; opacity:0.45;"></canvas>

      <!-- Glow orbs -->
      <div class="absolute top-1/4 -left-32 w-96 h-96 rounded-full" style="background:radial-gradient(circle,rgba(6,182,212,0.12) 0%,transparent 70%); z-index:1;"></div>
      <div class="absolute bottom-1/4 -right-32 w-96 h-96 rounded-full" style="background:radial-gradient(circle,rgba(99,102,241,0.12) 0%,transparent 70%); z-index:1;"></div>

      <div class="w-full max-w-md relative" style="z-index:10;">

        <!-- Brand -->
        <div class="text-center mb-8">
          <div class="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4"
               style="background:linear-gradient(135deg,rgba(6,182,212,0.2),rgba(99,102,241,0.2)); border:1px solid rgba(6,182,212,0.3); box-shadow:0 0 24px rgba(6,182,212,0.15);">
            <svg class="w-7 h-7 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
            </svg>
          </div>
          <h1 class="text-3xl font-black text-white tracking-tight">Access Securely</h1>
          <p class="text-gray-500 mt-2 text-sm">Micro-Trust V2 · Alternative Credit Intelligence</p>
        </div>

        <!-- Glass Card -->
        <div #formCard class="glass-card rounded-3xl p-8" [class.shake]="shaking()">

          <!-- ── Layout-Shift Prevented Error Container via Pretext ── -->
          <div [style.height.px]="errorContainerHeight()" style="transition: height 0.3s ease; overflow: hidden;" class="mb-4">
            @if (errorMsg()) {
              <div class="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-xl text-sm flex items-center justify-center gap-3">
                <svg class="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                {{ errorMsg() }}
              </div>
            }
          </div>

          <form (ngSubmit)="login()" class="space-y-5">

            <!-- Username -->
            <div>
              <label class="block text-xs font-bold uppercase tracking-widest mb-2" style="color:rgba(6,182,212,0.8);">
                👤 Username
              </label>
              <div class="relative">
                <input
                  type="text"
                  [(ngModel)]="username" name="username" required
                  placeholder="Enter your username"
                  class="w-full px-4 py-4 rounded-xl text-white font-mono text-base tracking-wider transition-all duration-200 outline-none"
                  style="background:rgba(255,255,255,0.05); border:1px solid rgba(6,182,212,0.2); color:white;"
                  (focus)="onFieldFocus($event)"
                  (blur)="onFieldBlur($event)"/>
              </div>
            </div>

            <!-- Password -->
            <div>
              <label class="block text-xs font-bold uppercase tracking-widest mb-2" style="color:rgba(6,182,212,0.8);">
                🔒 Password
              </label>
              <div class="relative">
                <input
                  [type]="showPassword() ? 'text' : 'password'"
                  [(ngModel)]="password" name="password" required
                  placeholder="••••••••"
                  class="w-full px-4 py-4 pr-12 rounded-xl text-white transition-all duration-200 outline-none"
                  style="background:rgba(255,255,255,0.05); border:1px solid rgba(6,182,212,0.2);"
                  (focus)="onFieldFocus($event)"
                  (blur)="onFieldBlur($event)"/>
                
                <button type="button" (click)="togglePassword()" tabindex="-1"
                        class="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-cyan-400 transition-colors cursor-pointer outline-none">
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
            </div>

            <!-- Submit -->
            <button type="submit"
                    [disabled]="isLoading()"
                    class="w-full py-4 rounded-xl font-bold text-white text-base transition-all duration-300 neon-btn mt-2"
                    style="background:linear-gradient(135deg,#0891b2,#4f46e5); box-shadow:0 0 20px rgba(6,182,212,0.25);">
              @if (isLoading()) {
                <span class="flex items-center justify-center gap-3">
                  <svg class="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Verifying...
                </span>
              } @else {
                ⚡ Sign In to Dashboard
              }
            </button>
          </form>

          <p class="text-center text-gray-500 text-sm mt-6">
            New to Micro-Trust?
            <a routerLink="/register" class="text-cyan-400 font-bold hover:text-cyan-300 transition-colors ml-1">Create Account →</a>
          </p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    input::placeholder, select { color: rgba(255,255,255,0.2); }
    select option { color: white; }
    input:focus, select:focus { border-color: rgba(6,182,212,0.6) !important; box-shadow: 0 0 0 3px rgba(6,182,212,0.08); }
  `]
})
export class LoginComponent implements OnDestroy {
  private authService = inject(AuthService);
  private ngZone = inject(NgZone);

  @ViewChild('bgCanvas') bgCanvasRef!: ElementRef<HTMLCanvasElement>;

  username = '';
  password = '';
  showPassword = signal(false);
  isLoading = signal(false);
  errorMsg = signal('');
  shaking = signal(false);

  private pretext = inject(PretextService);

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

  private renderer?: THREE.WebGLRenderer;
  private animFrame?: number;
  private startTime = performance.now();

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
    const mat = new THREE.LineBasicMaterial({ color: 0x06b6d4, transparent: true, opacity: 0.25 });
    const sphere = new THREE.LineSegments(edges, mat);
    scene.add(sphere);

    const loop = () => {
      this.animFrame = requestAnimationFrame(loop);
      const t = (performance.now() - this.startTime) / 1000;
      sphere.rotation.y = t * 0.05;
      sphere.rotation.x = t * 0.03;
      this.renderer?.render(scene, camera);
    };
    loop();
  }

  onFieldFocus(e: Event) {
    (e.target as HTMLElement).style.borderColor = 'rgba(6,182,212,0.6)';
  }
  onFieldBlur(e: Event) {
    (e.target as HTMLElement).style.borderColor = 'rgba(6,182,212,0.2)';
  }

  private triggerShake() {
    this.shaking.set(true);
    setTimeout(() => this.shaking.set(false), 600);
  }

  togglePassword() {
    this.showPassword.update(s => !s);
  }

  async login() {
    if (!this.username) {
      this.errorMsg.set('Enter your username.');
      this.triggerShake();
      return;
    }
    this.isLoading.set(true);
    this.errorMsg.set('');
    try {
      const res = await fetch(`${environment.apiUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: this.username, password: this.password })
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
        this.authService.loginSuccess(userToSave);
      } else {
        this.errorMsg.set(data.message || 'Authentication failed.');
        this.triggerShake();
      }
    } catch {
      this.errorMsg.set('Network error — is the Orchestrator running on :3000?');
      this.triggerShake();
    } finally {
      this.isLoading.set(false);
    }
  }

  ngOnDestroy() {
    cancelAnimationFrame(this.animFrame!);
    this.renderer?.dispose();
  }
}
