import {
  Component, inject, signal, ViewChild, ElementRef,
  AfterViewInit, OnDestroy, HostListener, NgZone, effect
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { BankTableComponent } from './bank-table.component';
import { PdfFileCardComponent } from './pdf-file-card.component';
import { PdfPasswordModalComponent } from './pdf-password-modal.component';
import { ResourceApiService } from '../services/resource.service';
import { AuthService } from '../services/auth.service';
import { PdfSecurityService } from '../services/pdf-security.service';
import { HistoryService } from '../services/history.service';
import gsap from 'gsap';
import * as THREE from 'three';
import * as _confetti from 'canvas-confetti';
const confetti = (_confetti as any).default || _confetti;

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, BankTableComponent, PdfFileCardComponent, PdfPasswordModalComponent],
  template: `
    <!-- Film grain overlay -->
    <div class="film-grain-overlay" aria-hidden="true"></div>

    <!-- Mouse-follow interactive glow -->
    <div class="cursor-glow pointer-events-none"
         [style.left.px]="mouseX"
         [style.top.px]="mouseY">
    </div>

    <!-- Three.js Cyber-Floor canvas -->
    <canvas #bgCanvas class="cyber-floor-canvas" aria-hidden="true"></canvas>

    <div class="min-h-screen relative overflow-x-hidden animate__animated animate__fadeIn dashboard-root">

      <!-- Background deep glows -->
      <div class="absolute top-0 right-0 w-[700px] h-[700px] rounded-full pointer-events-none"
           style="background: radial-gradient(circle, rgba(6,182,212,0.07) 0%, transparent 65%); z-index:0;"></div>
      <div class="absolute bottom-0 left-0 w-[600px] h-[600px] rounded-full pointer-events-none"
           style="background: radial-gradient(circle, rgba(99,102,241,0.06) 0%, transparent 65%); z-index:0;"></div>
      <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] rounded-full pointer-events-none"
           style="background: radial-gradient(ellipse, rgba(6,182,212,0.03) 0%, transparent 70%); z-index:0;"></div>

      <!-- ── Top Navigation Bar ── -->
      <nav class="relative glass-card-v2 px-8 py-4 flex items-center justify-between" style="z-index:10; border-bottom: 1px solid rgba(0,255,255,0.15);">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-lg flex items-center justify-center"
               style="background: linear-gradient(135deg,#0891b2,#4f46e5); box-shadow: 0 0 18px rgba(6,182,212,0.5);">
            <svg class="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
            </svg>
          </div>
          <span class="font-black tracking-tight text-white text-lg">Micro-Trust <span class="text-cyan-400" style="text-shadow:0 0 12px rgba(6,182,212,0.6);">V2</span></span>
        </div>

        <!-- ── User Identity Dropdown ── -->
        <div class="flex items-center gap-4">
          <div class="flex items-center gap-2 px-3 py-1.5 rounded-full"
               style="background: rgba(16,185,129,0.08); border: 1px solid rgba(16,185,129,0.25);">
            <span class="w-2 h-2 bg-green-400 rounded-full pulse-dot"></span>
            <span class="text-green-400 text-xs font-bold uppercase tracking-wider">Engine Online</span>
          </div>

          <!-- Avatar trigger -->
          <div class="relative" id="user-dropdown-wrap">
            <button class="flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all user-avatar-btn"
                    (click)="toggleUserMenu()"
                    id="user-avatar-trigger">
              <div class="w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm text-white"
                   style="background: linear-gradient(135deg,#4f46e5,#0891b2); box-shadow:0 0 12px rgba(99,102,241,0.4);">
                {{ (authService.currentUser()?.username ?? 'U').charAt(0).toUpperCase() }}
              </div>
              <span class="text-gray-300 text-sm font-medium hidden sm:block">
                {{ authService.currentUser()?.username }}
              </span>
              <svg class="w-3.5 h-3.5 text-gray-500 transition-transform"
                   [class.rotate-180]="userMenuOpen"
                   fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
              </svg>
            </button>

            <!-- Dropdown menu -->
            @if (userMenuOpen) {
              <div id="user-dropdown-menu"
                   class="absolute right-0 top-full mt-2 w-48 rounded-2xl overflow-hidden user-dropdown-menu"
                   style="z-index: 999;">
                <div class="px-4 py-3 border-b" style="border-color: rgba(0,255,255,0.08);">
                  <p class="text-xs font-bold text-white truncate">{{ authService.currentUser()?.username }}</p>
                  <p class="text-[11px] text-gray-600 mt-0.5">{{ authService.currentUser()?.primary_bank ?? 'HDFC' }} Primary</p>
                </div>
                <button class="w-full text-left px-4 py-3 text-sm text-indigo-400 flex items-center gap-2.5 dropdown-item"
                        (click)="goToSettings(); userMenuOpen=false">
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                          d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                  </svg>
                  Identity & Settings
                </button>
                <button class="w-full text-left px-4 py-3 text-sm text-red-400 flex items-center gap-2.5 dropdown-item border-t"
                        style="border-color: rgba(255,255,255,0.04);"
                        (click)="logout()">
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                          d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
                  </svg>
                  Sign Out
                </button>
              </div>
            }
          </div>
        </div>
      </nav>

      <main class="relative px-6 py-10 max-w-5xl mx-auto" style="z-index:5;">

        <!-- Page Header -->
        <div class="mb-10 text-center animate__animated animate__fadeInDown">
          <h1 class="text-5xl font-black text-white tracking-tight mb-3 dashboard-title">
            Intelligence&nbsp;<span class="title-glow">Dashboard</span>
          </h1>
          <p class="text-gray-500 text-sm tracking-wide">Upload a passbook → OCR extracts data → XGBoost scores the merchant</p>
        </div>

        <!-- Upload Card — fully removed from DOM once analysis results arrive -->
        @if (viewState !== 'RESULT') {
        <section class="card-glass animate__animated animate__fadeInUp rounded-3xl p-8 mb-8"
                 style="animation-delay: 0.1s; animation-fill-mode: both;">

          <!-- Upload Zone -->
          @if (!pdfService.currentFile()) {
            <div
              class="flex flex-col items-center justify-center p-14 rounded-2xl cursor-pointer transition-all duration-400 upload-zone-anim"
              [class.upload-zone-active]="uploadZoneHover || dragOver"
              (click)="fileInput.click()"
              (mouseenter)="uploadHoverEnter()"
              (mouseleave)="uploadHoverLeave()"
              (dragover)="onDragOver($event)"
              (dragleave)="onDragLeave()"
              (drop)="onDrop($event)">

              <div class="w-16 h-16 rounded-2xl flex items-center justify-center mb-5 transition-all duration-300 upload-icon-wrap"
                   [class.active]="uploadZoneHover || dragOver">
                <svg class="w-8 h-8 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
                </svg>
              </div>

              <p class="text-white font-bold text-lg mb-1">Drop Passbook Here</p>
              <p class="text-gray-500 text-sm">Supports PDF (with AES encryption) and PNG/JPG images · Max 5MB</p>
              <input type="file" #fileInput class="hidden" (change)="onFileSelected($event)" accept="image/*,.pdf"/>
            </div>
          }

          <!-- Processing Spinner -->
          @if (pdfService.isProcessing() && !pdfService.isLocked()) {
            <div class="flex flex-col items-center justify-center py-10 space-y-5">
              <div class="relative w-20 h-20">
                <div class="absolute inset-0 rounded-full border-4" style="border-color: rgba(6,182,212,0.1);"></div>
                <div class="absolute inset-0 rounded-full border-4 border-t-transparent animate-spin"
                     style="border-color: #06b6d4; border-top-color: transparent;"></div>
                <div class="absolute inset-2 rounded-full border-4 border-t-transparent animate-spin"
                     style="border-color: rgba(99,102,241,0.5); border-top-color: transparent; animation-direction: reverse; animation-duration: 1.5s;"></div>
                <div class="absolute inset-0 flex items-center justify-center">
                  <svg class="w-6 h-6 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                  </svg>
                </div>
              </div>
              <p class="text-cyan-300 font-bold animate-pulse">Scanning Document Security...</p>
            </div>
          }

          <!-- File Card -->
          @if (pdfService.currentFile() && !pdfService.isProcessing()) {
            <app-pdf-file-card
              (analyzeClicked)="submitAnalysis()"
              (removeClicked)="onFileRemoved()">
            </app-pdf-file-card>
          }

          <!-- Locked Indicator -->
          @if (pdfService.currentFile() && pdfService.isLocked() && !pdfService.isDecrypted() && !pdfService.isProcessing()) {
            <div class="mt-4 p-4 rounded-2xl flex items-center space-x-4"
                 style="background: rgba(239,68,68,0.05); border: 1px solid rgba(239,68,68,0.2);">
              <div class="w-10 h-10 rounded-full flex items-center justify-center" style="background: rgba(239,68,68,0.1);">
                <svg class="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                </svg>
              </div>
              <div class="flex-1">
                <p class="text-sm font-bold text-red-300">Encrypted PDF Detected</p>
                <p class="text-xs text-gray-500 mt-0.5">Enter the document password to unlock OCR processing.</p>
              </div>
              <button (click)="showPasswordModal.set(true)"
                      class="px-5 py-2.5 rounded-xl text-sm font-bold text-white flex-shrink-0"
                      style="background: linear-gradient(135deg,#d97706,#b45309); box-shadow: 0 0 12px rgba(217,119,6,0.4);">
                Unlock PDF
              </button>
            </div>
          }
        </section>
        }

        <!-- Intelligence Results — only shown after analysis starts -->
        @if (viewState !== 'AWAITING') {
        <app-bank-table></app-bank-table>
        }

        <!-- Save Analysis Button -->
        @if (resourceService.hasResult()) {
          <div class="mt-6 flex items-center justify-between card-glass rounded-2xl px-6 py-4 animate__animated animate__fadeInUp">
            <div>
              <p class="text-sm font-bold text-white">Archive this Analysis</p>
              @if (!isEditingName) {
                <p class="text-xs text-gray-500 mt-0.5">Save the current result to your Statement Archive for {{ currentMonthYear() }}</p>
              } @else {
                <input type="text"
                       [value]="customDisplayName"
                       (input)="updateDisplayName($event)"
                       class="custom-name-input mt-1 w-64 px-1 py-1 text-sm text-cyan-300 outline-none"
                       placeholder="Enter custom history name"
                       autofocus>
              }
            </div>
            <button (click)="handleArchiveClick()"
                    [disabled]="isSaving"
                    class="px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-40"
                    style="background:linear-gradient(135deg,#059669,#4f46e5); box-shadow:0 0 12px rgba(16,185,129,0.3);">
              {{ isSaving ? 'Archiving...' : (isEditingName ? '💾 Confirm Save' : '✎ Set Name & Save') }}
            </button>
          </div>
        }

      </main>

      <footer class="relative mt-4 py-3 overflow-hidden ticker-glass" style="z-index:10;">
        <div class="flex items-center">
          <div class="flex-shrink-0 px-4 py-1 text-xs font-bold uppercase tracking-wider text-cyan-400 mr-4"
               style="border-right: 1px solid rgba(0,255,255,0.2);">
            <span class="inline-block w-2 h-2 bg-green-400 rounded-full mr-2 pulse-dot"></span>
            Live Engine
          </div>
          <div class="overflow-hidden flex-1">
            <div class="ticker-scroll">
              @for (log of tickerLogs; track log) {
                <span class="text-gray-500 text-xs mr-10 flex-shrink-0 font-mono">
                  <span class="text-cyan-500">›</span> {{ log }}
                </span>
              }
              @for (log of tickerLogs; track log) {
                <span class="text-gray-500 text-xs mr-10 flex-shrink-0 font-mono">
                  <span class="text-cyan-500">›</span> {{ log }}
                </span>
              }
            </div>
          </div>
        </div>
      </footer>
    </div>

    <!-- Password Modal -->
    @if (showPasswordModal()) {
      <app-pdf-password-modal
        (unlocked)="onPdfUnlocked()"
        (dismissed)="showPasswordModal.set(false)">
      </app-pdf-password-modal>
    }
  `,
  styles: [`
    /* ── Root background: animated mesh gradient ── */
    :host {
      display: block;
      position: relative;
    }
    .dashboard-root {
      background: #050505;
      animation: meshGradient 20s ease infinite;
      min-height: 100vh;
    }
    @keyframes meshGradient {
      0%   { background-color: #050505; }
      33%  { background-color: #0A0A1F; }
      66%  { background-color: #1A1A2E; }
      100% { background-color: #050505; }
    }

    /* ── Three.js cyber-floor canvas ── */
    .cyber-floor-canvas {
      position: fixed;
      inset: 0;
      width: 100vw;
      height: 100vh;
      z-index: 0;
      pointer-events: none;
    }

    /* ── Film grain overlay ── */
    .film-grain-overlay {
      position: fixed;
      inset: 0;
      z-index: 1;
      pointer-events: none;
      opacity: 0.03;
      background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
    }

    /* ── Mouse-follow cursor glow ── */
    .cursor-glow {
      position: fixed;
      z-index: 2;
      pointer-events: none;
      width: 600px;
      height: 600px;
      transform: translate(-50%, -50%);
      background: radial-gradient(circle, rgba(6,182,212,0.06) 0%, transparent 65%);
      transition: left 0.15s ease, top 0.15s ease;
    }

    /* ── Glassmorphism 3.0 card ── */
    .card-glass {
      background: rgba(255, 255, 255, 0.03) !important;
      backdrop-filter: blur(32px) !important;
      -webkit-backdrop-filter: blur(32px) !important;
      border: 1px solid rgba(0, 255, 255, 0.12) !important;
      box-shadow:
        0 8px 32px rgba(0, 0, 0, 0.5),
        inset 0 1px 0 rgba(255,255,255,0.04) !important;
    }

    /* ── Nav glass ── */
    .glass-card-v2 {
      background: rgba(5, 5, 5, 0.7);
      backdrop-filter: blur(32px);
      -webkit-backdrop-filter: blur(32px);
    }

    /* ── Ticker glass ── */
    .ticker-glass {
      background: rgba(5, 5, 5, 0.6);
      backdrop-filter: blur(24px);
      -webkit-backdrop-filter: blur(24px);
      border-top: 1px solid rgba(0, 255, 255, 0.1);
    }

    /* ── Upload zone ── */
    .upload-zone-anim {
      border: 2px dashed rgba(0, 255, 255, 0.2);
      background: transparent;
      transition: all 0.3s ease;
    }
    .upload-zone-anim.upload-zone-active {
      border-color: rgba(0, 255, 255, 0.7);
      background: rgba(6, 182, 212, 0.05);
      box-shadow: 0 0 30px rgba(6,182,212,0.15) inset, 0 0 30px rgba(6,182,212,0.1);
    }
    .upload-icon-wrap {
      background: rgba(6,182,212,0.05);
      border: 1px solid rgba(0,255,255,0.3);
      box-shadow: 0 0 18px rgba(6,182,212,0.3);
    }
    .upload-icon-wrap.active {
      background: rgba(6,182,212,0.15);
      box-shadow: 0 0 28px rgba(6,182,212,0.5);
    }

    /* ── Title glow ── */
    .dashboard-title {
      text-shadow: 0 2px 40px rgba(0,0,0,0.8);
    }
    .title-glow {
      color: #22d3ee;
      text-shadow:
        0 0 20px rgba(6,182,212,0.8),
        0 0 40px rgba(6,182,212,0.4),
        0 0 80px rgba(6,182,212,0.2);
    }
    
    /* ── Custom Name Input ── */
    .custom-name-input {
      background: transparent;
      border: none;
      border-bottom: 1px solid rgba(6, 182, 212, 0.4);
      transition: border-bottom-color 0.2s ease, box-shadow 0.2s ease;
    }
    .custom-name-input:focus {
      border-bottom-color: rgba(6, 182, 212, 1);
      box-shadow: 0 1px 0 rgba(6, 182, 212, 0.8);
    }

    /* ── Pulse dot ── */
    .pulse-dot {
      animation: pulseDot 2s ease-in-out infinite;
    }
    @keyframes pulseDot {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.4; transform: scale(0.8); }
    }

    /* ── User Avatar dropdown ── */
    .user-avatar-btn {
      border: 1px solid rgba(255,255,255,0.06);
    }
    .user-avatar-btn:hover {
      background: rgba(255,255,255,0.04);
      border-color: rgba(0,255,255,0.15);
    }
    .rotate-180 { transform: rotate(180deg); }
    .transition-transform { transition: transform 0.2s ease; }
    .user-dropdown-menu {
      background: rgba(8,8,24,0.92);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 1px solid rgba(0,255,255,0.15);
      box-shadow: 0 20px 60px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.04);
      transform-origin: top right;
      animation: dropdownIn 0.18s cubic-bezier(0.16,1,0.3,1) forwards;
    }
    @keyframes dropdownIn {
      from { opacity: 0; transform: scale(0.92) translateY(-6px); }
      to   { opacity: 1; transform: scale(1)   translateY(0); }
    }
    .dropdown-item {
      transition: background 0.15s ease, color 0.15s ease;
    }
    .dropdown-item:hover { background: rgba(255,255,255,0.04); }
  `]
})
export class DashboardComponent implements AfterViewInit, OnDestroy {
  @ViewChild('bgCanvas') bgCanvasRef!: ElementRef<HTMLCanvasElement>;

  public resourceService  = inject(ResourceApiService);
  private historyService   = inject(HistoryService);
  private router           = inject(Router);
  authService = inject(AuthService);
  pdfService  = inject(PdfSecurityService);
  private zone = inject(NgZone);

  showPasswordModal = signal(false);
  uploadZoneHover = false;
  dragOver = false;
  isSaving = false;
  userMenuOpen = false;
  isEditingName = false;
  customDisplayName = 'Statement Archive';
  merchantIdMock = 'M_' + Math.random().toString(36).substring(2, 9).toUpperCase();

  // ── Tri-state view machine ──────────────────────────────────────────────
  viewState: 'AWAITING' | 'PROCESSING' | 'RESULT' = 'AWAITING';

  // ── Architectural Mapping Requirement ─────────────────────────────────────
  shapData: any[] = [];

  constructor() {
    // Watch the resource API and transition to RESULT when data arrives
    effect(() => {
      const value = this.resourceService.creditScoreResource.value();
      const isLoading = this.resourceService.creditScoreResource.isLoading();
      const error = this.resourceService.creditScoreResource.error();

      if (isLoading) {
        this.viewState = 'PROCESSING';
      } else if (value || error) {
        this.viewState = 'RESULT';
        // Architecture strictness: Ensures this.shapData is never null
        if (value && value.shap) {
          this.shapData = Array.isArray(value.shap) ? value.shap : [];
        } else {
          this.shapData = [];
        }
      }
    });
  }

  toggleUserMenu() {
    this.userMenuOpen = !this.userMenuOpen;
    if (this.userMenuOpen) {
      // Animate in via GSAP after a tick (element must exist in DOM)
      setTimeout(() => {
        const el = document.getElementById('user-dropdown-menu');
        if (el) gsap.fromTo(el, { opacity: 0, scale: 0.9, y: -8 }, { opacity: 1, scale: 1, y: 0, duration: 0.2, ease: 'power3.out' });
      }, 10);
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(e: MouseEvent) {
    const wrap = document.getElementById('user-dropdown-wrap');
    if (wrap && !wrap.contains(e.target as Node)) {
      this.userMenuOpen = false;
    }
  }

  mouseX = -999;
  mouseY = -999;

  private renderer?: THREE.WebGLRenderer;
  private animFrame?: number;
  private gridOffsetZ = 0;

  tickerLogs = [
    '[ML_ENGINE]: XGBoost Classified [APPROVE]',
    '[ML_ENGINE]: Running ARIMA cash flow forecast...',
    '[OCR_SERVICE]: Passbook text extraction complete',
    '[KMEANS]: Clustering Merchant Persona [Stable Income]',
    '[SHAP]: Computing XAI Feature Importance',
    '[SECURITY]: Ephemeral wipe initiated [MEMORY ZEROED]',
    '[ML_ENGINE]: Generating dynamic Credit Score',
    '[NLG]: Firing witty Roast Engine insights',
    `[DB_SYNC]: Historical statement archived for ${this.currentMonthYear()}`,
  ];

  currentMonthYear(): string {
    return new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  }

  @HostListener('mousemove', ['$event'])
  onMouseMove(e: MouseEvent) {
    this.mouseX = e.clientX;
    this.mouseY = e.clientY;
  }

  ngAfterViewInit() {
    this.zone.runOutsideAngular(() => this.initCyberFloor());
  }

  private initCyberFloor() {
    const canvas = this.bgCanvasRef.nativeElement;
    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 0.8, 2.5);
    camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000, 0);

    // Cyber-floor grid plane — tilted -85° on X so it recedes to horizon
    const gridW = 30;
    const gridH = 60;
    const geo = new THREE.PlaneGeometry(gridW, gridH, 30, 60);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x06b6d4,
      wireframe: true,
      transparent: true,
      opacity: 0.12,
    });
    const plane = new THREE.Mesh(geo, mat);
    plane.rotation.x = -Math.PI * (85 / 180);
    plane.position.y = -0.5;
    scene.add(plane);

    // Ambient helper lines for depth
    const lineMat = new THREE.LineBasicMaterial({ color: 0x4f46e5, transparent: true, opacity: 0.06 });
    for (let i = -5; i <= 5; i++) {
      const pts = [new THREE.Vector3(i * 3, -0.5, -30), new THREE.Vector3(i * 3, -0.5, 5)];
      scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), lineMat));
    }

    // GSAP infinite scroll: shift UV/position to simulate movement toward camera
    const scrollState = { z: 0 };
    gsap.to(scrollState, {
      z: 1,
      duration: 2,
      ease: 'none',
      repeat: -1,
      onUpdate: () => {
        // Shift the geometry vertices along Z to create scrolling illusion
        plane.position.z = (scrollState.z * 2) % 2;
      }
    });

    // Resize handler
    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      this.renderer!.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', onResize);

    const loop = () => {
      this.animFrame = requestAnimationFrame(loop);
      this.renderer!.render(scene, camera);
    };
    loop();
  }

  ngOnDestroy() {
    if (this.animFrame) cancelAnimationFrame(this.animFrame);
    if (this.renderer) this.renderer.dispose();
  }

  uploadHoverEnter() {
    this.uploadZoneHover = true;
    gsap.to('.upload-zone-anim', { scale: 1.015, duration: 0.3, ease: 'power2.out' });
  }

  uploadHoverLeave() {
    this.uploadZoneHover = false;
    gsap.to('.upload-zone-anim', { scale: 1.0, duration: 0.3, ease: 'power2.out' });
  }

  onDragOver(e: DragEvent) {
    e.preventDefault();
    this.dragOver = true;
    gsap.to('.upload-zone-anim', { scale: 1.025, duration: 0.2, ease: 'power2.out' });
  }

  onDragLeave() {
    this.dragOver = false;
    gsap.to('.upload-zone-anim', { scale: 1.0, duration: 0.2, ease: 'power2.out' });
  }

  async onDrop(e: DragEvent) {
    e.preventDefault();
    this.dragOver = false;
    gsap.to('.upload-zone-anim', { scale: 1.0, duration: 0.2 });
    const file = e.dataTransfer?.files[0];
    if (file) await this.pdfService.processFile(file);
    if (this.pdfService.isLocked() && !this.pdfService.isDecrypted()) {
      this.showPasswordModal.set(true);
    }
  }

  async onFileSelected(event: any) {
    const file = event.target.files[0] as File | undefined;
    if (!file) return;
    event.target.value = '';
    await this.pdfService.processFile(file);
    if (this.pdfService.isLocked() && !this.pdfService.isDecrypted()) {
      this.showPasswordModal.set(true);
    }
  }

  onPdfUnlocked() { this.showPasswordModal.set(false); }

  onFileRemoved() {
    this.merchantIdMock = 'M_' + Math.random().toString(36).substring(2, 9).toUpperCase();
    this.resourceService.reset();
  }

  submitAnalysis() {
    const file = this.pdfService.uploadReadyFile();
    const pdfPassword = this.pdfService.currentPassword();
    if (file) {
      this.viewState = 'PROCESSING';
      this.resourceService.analyzePassbook(file, this.merchantIdMock, pdfPassword);
    }
  }

  updateDisplayName(event: Event) {
    this.customDisplayName = (event.target as HTMLInputElement).value;
  }

  handleArchiveClick() {
    if (!this.isEditingName) {
      // Step 1: Open the input field
      this.customDisplayName = 'Statement ' + this.currentMonthYear();
      this.isEditingName = true;
    } else {
      // Step 2: Actually save
      this.saveAnalysis();
    }
  }

  async saveAnalysis() {
    const result = this.resourceService.getLatestResult();
    if (!result) return;
    this.isSaving = true;
    
    // Calls the requested saveRecord method with the mapped field names:
    const res = await this.historyService.saveRecord({
      credit_score: result.credit_score,
      persona: result.persona,
      suggested_interest: result.suggested_interest,
      displayName: this.customDisplayName
    });
    
    this.isSaving = false;
    this.isEditingName = false; // Reset toggle state after successful save
    if (res) {
      // Fire confetti on successful archive
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.5 }, colors: ['#10b981','#4f46e5','#22d3ee'] });
    }
  }

  goToSettings() { this.router.navigate(['/settings']); }

  logout() {
    this.pdfService.resetState();
    this.authService.logout();
  }
}
