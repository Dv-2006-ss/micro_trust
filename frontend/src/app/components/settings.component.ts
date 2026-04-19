import {
  Component, inject, signal, computed, OnInit, AfterViewInit, HostListener
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { HistoryService, MonthEntry } from '../services/history.service';
import { PretextService } from '../services/pretext.service';
import { environment } from '../../environments/environment';
import gsap from 'gsap';
import * as confetti from 'canvas-confetti';

const ALL_BANKS = [
  'HDFC', 'SBI', 'ICICI', 'Axis', 'Kotak', 'PNB',
  'Bank of Baroda', 'Canara Bank', 'IDFC FIRST', 'IndusInd', 'Federal Bank', 'Union Bank'
];

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="film-grain" aria-hidden="true"></div>
    <div class="cursor-glow" [style.left.px]="mouseX" [style.top.px]="mouseY"></div>

    <!-- ── Global Toast ── -->
    @if (toast) {
      <div class="toast-wrapper animate__animated animate__slideInDown">
        <div class="toast-inner" [class.toast-success]="toast.type==='success'" [class.toast-error]="toast.type==='error'">
          <span class="toast-icon">{{ toast.type==='success' ? '✓' : '✕' }}</span>
          <p class="toast-msg" [style.min-width.px]="toastWidth()">{{ toast.msg }}</p>
        </div>
      </div>
    }

    <div class="settings-root">
      <div class="blob blob-top"></div>
      <div class="blob blob-bottom"></div>

      <!-- ── Navbar ── -->
      <nav class="s-nav" id="settings-nav">
        <div class="flex items-center gap-3">
          <div class="nav-logo">
            <svg class="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
            </svg>
          </div>
          <span class="font-black text-white text-lg">Micro-Trust <span class="title-glow">V2</span></span>
        </div>

        <div class="flex items-center gap-3">
          <button class="btn-ghost-cyan" (click)="goToDashboard()">← Dashboard</button>

          <!-- Identity Dropdown -->
          <div class="relative" id="id-dropdown-wrap">
            <button class="id-avatar-btn" (click)="toggleIdMenu()">
              <div class="id-avatar">{{ avatarLetter() }}</div>
              <span class="hidden sm:block text-gray-300 text-sm font-medium">{{ authService.currentUser()?.username }}</span>
              <svg class="w-3.5 h-3.5 text-gray-500 chevron-icon" [class.chevron-open]="idMenuOpen"
                   fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
              </svg>
            </button>

            @if (idMenuOpen) {
              <div class="id-dropdown animate__animated animate__slideInDown" id="id-dropdown-menu">
                <div class="id-dropdown-header">
                  <p class="text-xs font-black text-white truncate">{{ authService.currentUser()?.username }}</p>
                  <p class="text-[10px] text-gray-600 mt-0.5">{{ authService.currentUser()?.primary_bank ?? 'HDFC' }} · Primary</p>
                </div>
                <button class="id-dropdown-item id-item-settings" (click)="scrollToProfile(); idMenuOpen=false">
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                          d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                  </svg>
                  Identity & Settings
                </button>
                <button class="id-dropdown-item id-item-signout" (click)="logout()">
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

      <main class="s-main">
        <!-- ── Page Header ── -->
        <div class="mb-10 animate__animated animate__fadeInDown">
          <h1 class="page-title">Identity & <span class="title-glow">Settings</span></h1>
          <p class="text-gray-500 text-sm mt-2">Edit your profile, update your bank, and manage your statement archive.</p>
        </div>

        <div class="s-grid">

          <!-- ── LEFT COLUMN ── -->
          <div class="space-y-5">

            <!-- ── Identity Profile Card ── -->
            <div class="s-card animate__animated animate__fadeInUp anim-delay-1" id="profile-card">
              <div class="s-card-header">
                <div class="s-card-icon icon-cyan">
                  <svg class="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                  </svg>
                </div>
                <p class="s-card-label text-cyan-400">Identity Profile</p>
                <!-- Edit toggle -->
                <button class="ml-auto edit-toggle-btn"
                        [class.edit-toggle-active]="isEditing"
                        (click)="toggleEdit()">
                  {{ isEditing ? '✕ Cancel' : '✎ Edit' }}
                </button>
              </div>

              <!-- Avatar -->
              <div class="flex items-center gap-4 mb-5 pb-5 border-b" style="border-color:rgba(0,255,255,0.06);">
                <div class="profile-avatar">{{ avatarLetter() }}</div>
                <div>
                  <p class="text-white font-black text-lg">{{ authService.currentUser()?.username ?? '—' }}</p>
                  <p class="text-[10px] text-gray-600 uppercase tracking-widest mt-0.5">
                    {{ authService.currentUser()?.primary_bank ?? 'HDFC' }} Primary
                  </p>
                </div>
              </div>

              <!-- STATIC VIEW -->
              @if (!isEditing) {
                <div class="space-y-4 animate__animated animate__fadeIn">
                  @for (f of staticFields(); track f.label) {
                    <div>
                      <p class="field-label">{{ f.label }}</p>
                      <p class="field-value" [style.min-height.px]="fieldHeight(f.value)">{{ f.value }}</p>
                    </div>
                  }
                </div>
              }

              <!-- EDIT MODE -->
              @if (isEditing) {
                <div class="space-y-4 animate__animated animate__fadeInUp">
                  <!-- Username -->
                  <div>
                    <label class="field-label">Username</label>
                    <input type="text" [(ngModel)]="edit.username" class="edit-input"
                           placeholder="Enter username"
                           [style.min-height.px]="inputHeight('username')"/>
                    @if (profileErrors.username) {
                      <p class="err-msg animate__animated animate__fadeIn"
                         [style.min-height.px]="errHeight(profileErrors.username)">
                        {{ profileErrors.username }}
                      </p>
                    }
                  </div>
                  <!-- Phone -->
                  <div>
                    <label class="field-label">Phone (+91)</label>
                    <input type="tel" [(ngModel)]="edit.phone_number" class="edit-input"
                           placeholder="10-digit number"
                           [style.min-height.px]="inputHeight('phone')"/>
                    @if (profileErrors.phone_number) {
                      <p class="err-msg animate__animated animate__fadeIn"
                         [style.min-height.px]="errHeight(profileErrors.phone_number)">
                        {{ profileErrors.phone_number }}
                      </p>
                    }
                  </div>
                  <!-- Email -->
                  <div>
                    <label class="field-label">Email</label>
                    <input type="email" [(ngModel)]="edit.email" class="edit-input"
                           placeholder="your@email.com"
                           [style.min-height.px]="inputHeight('email')"/>
                    @if (profileErrors.email) {
                      <p class="err-msg animate__animated animate__fadeIn"
                         [style.min-height.px]="errHeight(profileErrors.email)">
                        {{ profileErrors.email }}
                      </p>
                    }
                  </div>

                  <button class="save-profile-btn" id="save-profile-btn"
                          [disabled]="profileSaving" (click)="saveProfile()">
                    {{ profileSaving ? 'Saving…' : '💾 Save Profile' }}
                  </button>
                </div>
              }
            </div>

            <!-- ── Primary Bank Card ── -->
            <div class="s-card animate__animated animate__fadeInUp anim-delay-2" id="bank-card">
              <div class="s-card-header">
                <div class="s-card-icon icon-amber">
                  <svg class="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                          d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
                  </svg>
                </div>
                <p class="s-card-label text-amber-400">Primary Bank</p>
              </div>

              <!-- Grid of bank chips -->
              <div class="bank-grid mb-4">
                @for (bank of allBanks; track bank) {
                  <button class="bank-chip"
                          [class.bank-chip-active]="selectedBank === bank"
                          (click)="selectedBank = bank">
                    {{ bank }}
                  </button>
                }
              </div>

              <button id="save-bank-btn" (click)="savePrimaryBank()"
                      [disabled]="bankSaving || selectedBank === authService.currentUser()?.primary_bank"
                      class="save-bank-btn">
                {{ bankSaving ? 'Saving…' : 'Update Primary Bank' }}
              </button>
              <p class="text-[10px] text-gray-600 mt-2 text-center">
                Recalibrates XGBoost card-match weighting for {{ selectedBank }}.
              </p>
            </div>

            <!-- ── Archive Summary ── -->
            <div class="s-card animate__animated animate__fadeInUp anim-delay-3">
              <p class="s-card-label text-gray-500 mb-4">Archive Summary</p>
              <div class="grid grid-cols-2 gap-4">
                <div class="stat-cell">
                  <p class="text-3xl font-black text-cyan-400" id="count-statements">0</p>
                  <p class="stat-label">Statements</p>
                </div>
                <div class="stat-cell">
                  <p class="text-3xl font-black text-indigo-400" id="count-years">0</p>
                  <p class="stat-label">Years</p>
                </div>
              </div>
            </div>
          </div>

          <!-- ── RIGHT COLUMN ── -->
          <div class="space-y-5">

            <!-- History Archive -->
            <div class="s-card animate__animated animate__fadeInUp anim-delay-2">
              <div class="flex items-center justify-between mb-6">
                <div class="s-card-header">
                  <div class="s-card-icon icon-purple">
                    <svg class="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                  </div>
                  <p class="s-card-label text-indigo-400">Statement Archive</p>
                </div>
                <button class="refresh-btn" (click)="refreshHistory()">
                  <svg class="w-3.5 h-3.5" [class.spin-pulse]="historyService.isLoading()"
                       fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                  </svg>
                  Refresh
                </button>
              </div>

              @if (historyService.isLoading()) {
                <div class="flex items-center justify-center py-16 gap-3">
                  <div class="w-5 h-5 rounded-full border-2 border-t-transparent border-cyan-400 animate-spin"></div>
                  <p class="text-gray-500 text-sm">Loading archive…</p>
                </div>
              }
              @else if (historyService.total() === 0) {
                <div class="empty-state">
                  <div class="empty-icon">
                    <svg class="w-8 h-8 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1"
                            d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                    </svg>
                  </div>
                  <p class="text-gray-400 font-bold mb-1">No archived statements yet</p>
                  <p class="text-gray-600 text-xs">Run an analysis then save it to your archive.</p>
                </div>
              }
              @else {
                <div class="space-y-2">
                  @for (yg of historyService.years(); track yg.year) {
                    <div class="year-wrap">
                      <button class="year-hdr" [class.year-hdr-open]="yg.expanded"
                              (click)="historyService.toggleYear(yg.year)">
                        <div class="flex items-center gap-3">
                          <span class="year-badge">{{ yg.year.toString().slice(2) }}</span>
                          <div>
                            <p class="font-bold text-white text-sm">{{ yg.year }}</p>
                            <p class="text-[10px] text-gray-600">{{ yg.months.length }} statement{{ yg.months.length !== 1 ? 's' : '' }}</p>
                          </div>
                        </div>
                        <svg class="w-4 h-4 text-gray-500 chevron-icon" [class.chevron-open]="yg.expanded"
                             fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                        </svg>
                      </button>

                      @if (yg.expanded) {
                        <div class="px-3 pb-3 space-y-2 animate__animated animate__fadeIn">
                          @for (entry of yg.months; track entry.reportId) {
                            <div class="month-row" [class.month-row-sel]="historyService.selected()?.reportId === entry.reportId"
                                 (click)="selectEntry(entry)">
                              <div class="w-12 text-center flex-shrink-0">
                                <p class="text-[10px] font-black uppercase tracking-widest" [style.color]="riskColor(entry.risk_level)">
                                  {{ entry.monthName.slice(0,3).toUpperCase() }}
                                </p>
                                <p class="text-[9px] text-gray-600">{{ yg.year }}</p>
                              </div>
                              <div class="score-badge" [style.background]="riskBg(entry.risk_level)" [style.border]="riskBorder(entry.risk_level)">
                                <p class="text-lg font-black" [style.color]="riskColor(entry.risk_level)">{{ entry.credit_score }}</p>
                                <p class="text-[8px] text-gray-600 uppercase">Score</p>
                              </div>
                              <div class="flex-1 min-w-0">
                                <div class="flex items-center gap-2 mb-1">
                                  <p class="text-sm font-bold text-white truncate">{{ entry.filename }}</p>
                                  <span class="status-badge" [class.status-ok]="entry.approval_status" [class.status-rev]="!entry.approval_status">
                                    {{ entry.approval_status ? 'Approved' : 'Review' }}
                                  </span>
                                </div>
                                <p class="text-xs text-gray-600">{{ entry.persona }} · {{ entry.primary_bank }}</p>
                                <p class="text-[10px] text-gray-700 mt-0.5">{{ entry.risk_level }}-Risk</p>
                              </div>
                              <button class="view-btn" (click)="reopenInDashboard(entry, $event)">View →</button>
                            </div>
                          }
                        </div>
                      }
                    </div>
                  }
                </div>
              }
            </div>

            <!-- Selected entry preview -->
            @if (historyService.selected()) {
              <div class="s-card animate__animated animate__fadeInUp">
                <p class="s-card-label text-purple-400 mb-4">
                  Viewing — {{ historyService.selected()!.monthName }} {{ historyService.selected()!.full?.year ?? '' }}
                </p>
                <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  @for (m of previewMeta(); track m.label) {
                    <div class="meta-cell text-center">
                      <p class="font-black" [style.color]="m.color">{{ m.value }}</p>
                      <p class="text-[10px] text-gray-600 uppercase mt-1">{{ m.label }}</p>
                    </div>
                  }
                </div>
                @if (historyService.selected()!.full?.roast) {
                  <p class="text-sm text-gray-400 italic mt-4 pl-4 border-l-2 border-purple-500/30">
                    "{{ historyService.selected()!.full.roast }}"
                  </p>
                }
              </div>
            }
          </div>
        </div>
      </main>
    </div>
  `,
  styles: [`
    .settings-root { min-height:100vh; position:relative; background:#050505; animation:meshGrad 20s ease infinite; }
    @keyframes meshGrad { 0%,100%{background-color:#050505;} 33%{background-color:#0A0A1F;} 66%{background-color:#1A1A2E;} }
    .film-grain { position:fixed;inset:0;z-index:1;pointer-events:none;opacity:.03;
      background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E"); }
    .cursor-glow { position:fixed;z-index:2;pointer-events:none;width:520px;height:520px;transform:translate(-50%,-50%);
      background:radial-gradient(circle,rgba(6,182,212,.05) 0%,transparent 65%);transition:left .12s ease,top .12s ease; }
    .blob { position:fixed;border-radius:50%;pointer-events:none;z-index:0; }
    .blob-top    { top:0;right:0;width:600px;height:600px;background:radial-gradient(circle,rgba(6,182,212,.06) 0%,transparent 65%); }
    .blob-bottom { bottom:0;left:0;width:500px;height:500px;background:radial-gradient(circle,rgba(99,102,241,.05) 0%,transparent 65%); }

    /* Nav */
    .s-nav { position:relative;z-index:10;display:flex;align-items:center;justify-content:space-between;padding:1rem 2rem;
      background:rgba(5,5,5,.75);backdrop-filter:blur(32px);-webkit-backdrop-filter:blur(32px);border-bottom:1px solid rgba(0,255,255,.1); }
    .nav-logo { width:2rem;height:2rem;border-radius:.5rem;display:flex;align-items:center;justify-content:center;
      background:linear-gradient(135deg,#0891b2,#4f46e5);box-shadow:0 0 18px rgba(6,182,212,.5); }
    .btn-ghost-cyan { padding:.5rem 1rem;border-radius:.5rem;font-size:.875rem;font-weight:600;color:#22d3ee;
      border:1px solid rgba(6,182,212,.2);transition:background .15s,border-color .15s; }
    .btn-ghost-cyan:hover { background:rgba(6,182,212,.08);border-color:rgba(6,182,212,.4); }
    .id-avatar-btn { display:flex;align-items:center;gap:.625rem;padding:.5rem .75rem;border-radius:.75rem;
      border:1px solid rgba(255,255,255,.06);transition:background .15s,border-color .15s; }
    .id-avatar-btn:hover { background:rgba(255,255,255,.04);border-color:rgba(0,255,255,.15); }
    .id-avatar { width:2rem;height:2rem;border-radius:.5rem;display:flex;align-items:center;justify-content:center;
      font-weight:900;font-size:.875rem;color:#fff;background:linear-gradient(135deg,#4f46e5,#0891b2);box-shadow:0 0 12px rgba(99,102,241,.4); }
    .id-dropdown { position:absolute;right:0;top:calc(100% + .5rem);width:210px;border-radius:1rem;overflow:hidden;z-index:999;
      background:rgba(8,8,24,.94);backdrop-filter:blur(32px);-webkit-backdrop-filter:blur(32px);
      border:1px solid rgba(0,255,255,.15);box-shadow:0 20px 60px rgba(0,0,0,.7),inset 0 1px 0 rgba(255,255,255,.04);
      animation:dropIn .2s cubic-bezier(.16,1,.3,1) forwards; }
    @keyframes dropIn { from{opacity:0;transform:scaleY(.88) translateY(-8px);}to{opacity:1;transform:scaleY(1) translateY(0);} }
    .id-dropdown-header { padding:.75rem 1rem;border-bottom:1px solid rgba(0,255,255,.08); }
    .id-dropdown-item { width:100%;text-align:left;display:flex;align-items:center;gap:.625rem;padding:.75rem 1rem;font-size:.875rem;font-weight:500;transition:background .12s; }
    .id-dropdown-item:hover { background:rgba(255,255,255,.04); }
    .id-item-settings { color:#818cf8; }
    .id-item-signout  { color:#f87171;border-top:1px solid rgba(255,255,255,.04); }
    .chevron-icon { transition:transform .2s ease; }
    .chevron-open { transform:rotate(180deg); }
    .title-glow { color:#22d3ee;text-shadow:0 0 20px rgba(6,182,212,.8),0 0 40px rgba(6,182,212,.4); }

    /* Layout */
    .s-main { position:relative;z-index:5;max-width:72rem;margin:0 auto;padding:2.5rem 1.5rem; }
    .s-grid  { display:grid;gap:1.5rem;grid-template-columns:1fr; }
    @media(min-width:1024px){ .s-grid{ grid-template-columns:1fr 2fr; } }
    .page-title { font-size:2.25rem;font-weight:900;color:#fff;letter-spacing:-.025em; }

    /* Cards */
    .s-card { border-radius:1.5rem;padding:1.5rem;background:rgba(255,255,255,.03);
      backdrop-filter:blur(32px);-webkit-backdrop-filter:blur(32px);
      border:1px solid rgba(0,255,255,.12);
      box-shadow:0 8px 32px rgba(0,0,0,.5),inset 0 1px 0 rgba(255,255,255,.04);
      transition:transform .28s cubic-bezier(.2,1,.3,1),box-shadow .28s ease,border-color .28s ease; }
    .s-card:hover { transform:translateY(-5px);border-color:rgba(0,255,255,.25);
      box-shadow:0 22px 55px rgba(0,0,0,.6),0 0 32px rgba(6,182,212,.07),inset 0 1px 0 rgba(255,255,255,.06); }
    .s-card-header { display:flex;align-items:center;gap:.75rem;margin-bottom:1.25rem; }
    .s-card-icon { width:2.5rem;height:2.5rem;border-radius:.75rem;display:flex;align-items:center;justify-content:center; }
    .icon-cyan   { background:linear-gradient(135deg,#0891b2,#4f46e5);box-shadow:0 0 12px rgba(6,182,212,.4); }
    .icon-amber  { background:linear-gradient(135deg,#f59e0b,#d97706);box-shadow:0 0 12px rgba(245,158,11,.3); }
    .icon-purple { background:linear-gradient(135deg,#7c3aed,#4f46e5);box-shadow:0 0 12px rgba(99,102,241,.4); }
    .s-card-label { font-size:.65rem;font-weight:700;text-transform:uppercase;letter-spacing:.1em; }
    .anim-delay-1{animation-delay:.05s;} .anim-delay-2{animation-delay:.15s;} .anim-delay-3{animation-delay:.25s;}

    /* Profile card */
    .profile-avatar { width:3.5rem;height:3.5rem;border-radius:1rem;flex-shrink:0;display:flex;align-items:center;justify-content:center;
      font-weight:900;font-size:1.5rem;color:#fff;background:linear-gradient(135deg,#0891b2,#4f46e5);box-shadow:0 0 20px rgba(6,182,212,.35); }
    .field-label { font-size:.6rem;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#4b5563;margin-bottom:.2rem; }
    .field-value { color:#d1d5db;font-size:.875rem;word-break:break-all; }
    .edit-toggle-btn { margin-left:auto;font-size:.7rem;font-weight:700;padding:.25rem .75rem;border-radius:.5rem;
      color:#6b7280;border:1px solid rgba(255,255,255,.06);transition:all .15s; }
    .edit-toggle-btn:hover { color:#22d3ee;border-color:rgba(0,255,255,.2); }
    .edit-toggle-active { color:#f87171 !important;border-color:rgba(248,113,113,.2) !important; }
    .edit-input { width:100%;padding:.5rem .875rem;border-radius:.625rem;background:rgba(0,0,0,.5);
      border:1px solid rgba(0,255,255,.15);color:#fff;font-size:.875rem;outline:none;transition:border-color .15s; }
    .edit-input:focus { border-color:rgba(0,255,255,.4); }
    .err-msg { font-size:.7rem;color:#f87171;margin-top:.25rem;padding:.25rem .5rem;background:rgba(239,68,68,.06);border-radius:.375rem; }
    .save-profile-btn { width:100%;padding:.625rem;border-radius:.75rem;font-size:.875rem;font-weight:700;color:#fff;
      background:linear-gradient(135deg,#10b981,#059669);box-shadow:0 0 14px rgba(16,185,129,.3);
      transition:opacity .2s,box-shadow .2s;margin-top:.25rem; }
    .save-profile-btn:hover:not(:disabled) { box-shadow:0 0 24px rgba(16,185,129,.5); }
    .save-profile-btn:disabled { opacity:.4;cursor:not-allowed; }

    /* Bank grid chips */
    .bank-grid { display:grid;grid-template-columns:repeat(3,1fr);gap:.5rem; }
    .bank-chip { padding:.5rem .25rem;border-radius:.625rem;font-size:.7rem;font-weight:700;text-align:center;
      color:#6b7280;border:1px solid rgba(255,255,255,.06);transition:all .15s;background:rgba(0,0,0,.2); }
    .bank-chip:hover { color:#fff;border-color:rgba(0,255,255,.15);background:rgba(6,182,212,.05); }
    .bank-chip-active { color:#22d3ee !important;border-color:rgba(0,255,255,.35) !important;
      background:rgba(6,182,212,.1) !important;box-shadow:0 0 10px rgba(6,182,212,.12); }
    .save-bank-btn { width:100%;padding:.625rem;border-radius:.75rem;font-size:.875rem;font-weight:700;color:#fff;
      background:linear-gradient(135deg,#0891b2,#4f46e5);box-shadow:0 0 14px rgba(6,182,212,.3);
      transition:opacity .2s,box-shadow .2s; }
    .save-bank-btn:hover:not(:disabled) { box-shadow:0 0 24px rgba(6,182,212,.5); }
    .save-bank-btn:disabled { opacity:.4;cursor:not-allowed; }

    /* Summary */
    .stat-cell { text-align:center; }
    .stat-label { font-size:.6rem;text-transform:uppercase;letter-spacing:.08em;color:#4b5563;margin-top:.25rem; }

    /* History */
    .year-wrap { border-radius:1rem;overflow:hidden;border:1px solid rgba(255,255,255,.04);background:rgba(0,0,0,.2); }
    .year-hdr { width:100%;display:flex;align-items:center;justify-content:space-between;padding:.875rem 1.25rem;text-align:left;background:rgba(0,0,0,.2);transition:background .15s; }
    .year-hdr:hover { background:rgba(99,102,241,.07); }
    .year-hdr-open { background:rgba(99,102,241,.06); }
    .year-badge { width:2rem;height:2rem;border-radius:.5rem;display:flex;align-items:center;justify-content:center;
      font-weight:900;font-size:.875rem;color:#818cf8;background:rgba(99,102,241,.12);border:1px solid rgba(99,102,241,.2); }
    .month-row { display:flex;align-items:center;gap:1rem;border-radius:.75rem;padding:1rem;cursor:pointer;
      background:rgba(0,0,0,.25);border:1px solid rgba(255,255,255,.03);transition:background .15s,border-color .15s; }
    .month-row:hover { background:rgba(6,182,212,.04);border-color:rgba(0,255,255,.07); }
    .month-row-sel { background:rgba(99,102,241,.09) !important;border-color:rgba(99,102,241,.25) !important; }
    .score-badge { flex-shrink:0;width:3.5rem;height:3.5rem;border-radius:.75rem;display:flex;flex-direction:column;align-items:center;justify-content:center; }
    .status-badge { flex-shrink:0;padding:.1rem .5rem;border-radius:9999px;font-size:.55rem;font-weight:700;text-transform:uppercase; }
    .status-ok  { background:rgba(16,185,129,.1);color:#34d399;border:1px solid rgba(16,185,129,.2); }
    .status-rev { background:rgba(239,68,68,.1);color:#f87171;border:1px solid rgba(239,68,68,.2); }
    .view-btn { flex-shrink:0;padding:.3rem .75rem;border-radius:.5rem;font-size:.75rem;font-weight:700;color:#22d3ee;
      background:rgba(6,182,212,.06);border:1px solid rgba(0,255,255,.12);transition:background .15s; }
    .view-btn:hover { background:rgba(6,182,212,.14);border-color:rgba(0,255,255,.3); }
    .meta-cell { padding:.75rem;border-radius:.75rem;background:rgba(0,0,0,.2);border:1px solid rgba(255,255,255,.04); }
    .empty-state { padding:4rem 0;text-align:center; }
    .empty-icon { width:4rem;height:4rem;border-radius:1rem;display:flex;align-items:center;justify-content:center;margin:0 auto 1rem;background:rgba(99,102,241,.05);border:1px solid rgba(99,102,241,.1); }

    /* Refresh */
    .refresh-btn { display:flex;align-items:center;gap:.375rem;font-size:.75rem;color:#6b7280;transition:color .15s; }
    .refresh-btn:hover { color:#22d3ee; }
    .spin-pulse { animation:spinPulse .65s linear infinite; }
    @keyframes spinPulse { to{transform:rotate(360deg);} }

    /* Toast */
    .toast-wrapper { position:fixed;top:1.5rem;right:1.5rem;z-index:9999; }
    .toast-inner { display:flex;align-items:center;gap:.75rem;padding:.875rem 1.25rem;border-radius:1rem;
      backdrop-filter:blur(16px);box-shadow:0 12px 40px rgba(0,0,0,.5); }
    .toast-icon { font-size:1.125rem; }
    .toast-msg { font-size:.875rem;font-weight:600;color:#fff; }
    .toast-success { background:rgba(16,185,129,.12);border:1px solid rgba(16,185,129,.3); }
    .toast-error   { background:rgba(239,68,68,.12);border:1px solid rgba(239,68,68,.3); }
  `]
})
export class SettingsComponent implements OnInit, AfterViewInit {
  authService    = inject(AuthService);
  historyService = inject(HistoryService);
  private router  = inject(Router);
  private pretext = inject(PretextService);

  // ── State ──────────────────────────────────────────────────
  mouseX = -999; mouseY = -999;
  idMenuOpen   = false;
  isEditing    = false;
  profileSaving = false;
  bankSaving    = false;
  selectedBank  = this.authService.currentUser()?.primary_bank ?? 'HDFC';
  allBanks      = ALL_BANKS;

  // Edit form fields — pre-populated from current user
  edit = {
    username:     this.authService.currentUser()?.username     ?? '',
    phone_number: this.authService.currentUser()?.phone_number ?? '',
    email:        this.authService.currentUser()?.email        ?? '',
  };
  profileErrors: { username?: string; phone_number?: string; email?: string } = {};

  toast: { msg: string; type: 'success' | 'error' } | null = null;
  private toastTimer?: ReturnType<typeof setTimeout>;

  // ── Computed ──────────────────────────────────────────────
  readonly avatarLetter = computed(() =>
    (this.authService.currentUser()?.username ?? 'U').charAt(0).toUpperCase()
  );

  readonly toastWidth = computed(() => {
    if (!this.toast) return 0;
    this.pretext.prepare('Inter', 14, '600');
    return this.pretext.layoutNextLine(this.toast.msg) + 8;
  });

  readonly staticFields = computed(() => [
    { label: 'Phone',        value: this.authService.currentUser()?.phone_number ?? '—' },
    { label: 'Email',        value: this.authService.currentUser()?.email ?? 'Not set' },
    { label: 'Member Since', value: new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) },
  ]);

  readonly previewMeta = computed(() => {
    const e = this.historyService.selected();
    if (!e) return [];
    return [
      { label: 'Score',  value: String(e.credit_score), color: '#22d3ee' },
      { label: 'Risk',   value: e.risk_level,           color: '#818cf8' },
      { label: 'Bank',   value: e.primary_bank,         color: '#fbbf24' },
      { label: 'Status', value: e.approval_status ? 'Approved' : 'Review',
        color: e.approval_status ? '#34d399' : '#f87171' },
    ];
  });

  // PretextService — pre-calculate heights for zero layout shift
  fieldHeight(val: string): number { return this.pretext.fitToContainer(val, 280, 20, 0); }
  inputHeight(field: string): number { return 36; } // fixed input height
  errHeight(msg: string): number {
    this.pretext.prepare('Inter', 11, '400');
    return this.pretext.fitToContainer(msg, 260, 16, 8);
  }

  riskColor(r: string)  { return r==='Low'?'#34d399':r==='Medium'?'#fbbf24':'#f87171'; }
  riskBg(r: string)     { return r==='Low'?'rgba(16,185,129,.08)':r==='Medium'?'rgba(245,158,11,.08)':'rgba(239,68,68,.08)'; }
  riskBorder(r: string) { return r==='Low'?'1px solid rgba(16,185,129,.2)':r==='Medium'?'1px solid rgba(245,158,11,.2)':'1px solid rgba(239,68,68,.2)'; }

  // ── Lifecycle ─────────────────────────────────────────────
  ngOnInit() {
    document.addEventListener('mousemove', e => { this.mouseX = e.clientX; this.mouseY = e.clientY; });
    if (!this.historyService.state().loaded) {
      this.historyService.loadHistory().then(() => this.animateCounts());
    }
  }

  ngAfterViewInit() {
    gsap.fromTo('#settings-nav', { y: -20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: 'power3.out' });
    this.animateCounts();
  }

  // ── Identity Dropdown ─────────────────────────────────────
  toggleIdMenu() {
    this.idMenuOpen = !this.idMenuOpen;
    if (this.idMenuOpen) {
      setTimeout(() => {
        const el = document.getElementById('id-dropdown-menu');
        if (el) gsap.fromTo(el, { opacity: 0, scaleY: 0.88, y: -10 },
          { opacity: 1, scaleY: 1, y: 0, duration: 0.22, ease: 'power3.out', transformOrigin: 'top right' });
      }, 8);
    }
  }

  @HostListener('document:click', ['$event'])
  onDocClick(e: MouseEvent) {
    const wrap = document.getElementById('id-dropdown-wrap');
    if (wrap && !wrap.contains(e.target as Node)) this.idMenuOpen = false;
  }

  scrollToProfile() {
    document.getElementById('profile-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // ── Edit Mode ─────────────────────────────────────────────
  toggleEdit() {
    this.isEditing = !this.isEditing;
    this.profileErrors = {};
    if (this.isEditing) {
      // Sync edit fields to latest user data
      const u = this.authService.currentUser();
      this.edit = { username: u?.username ?? '', phone_number: u?.phone_number ?? '', email: u?.email ?? '' };
    }
  }

  async saveProfile() {
    this.profileErrors = {};

    // Client-side validation
    if (this.edit.phone_number && !/^\d{10}$/.test(this.edit.phone_number)) {
      this.profileErrors.phone_number = 'Phone must be exactly 10 digits.';
    }
    if (this.edit.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.edit.email)) {
      this.profileErrors.email = 'Please enter a valid email address.';
    }
    if (Object.keys(this.profileErrors).length) return;

    this.profileSaving = true;
    try {
      const token = this.authService.currentUser()?.token ?? '';
      const response = await fetch(`${environment.apiUrl}/api/auth/profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          username:     this.edit.username     || undefined,
          phone_number: this.edit.phone_number || undefined,
          email:        this.edit.email        || undefined,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        if (data.error === 'E11000' && data.field) {
          this.profileErrors[data.field as keyof typeof this.profileErrors] = data.message;
        } else {
          this.showToast(data.message ?? 'Update failed.', 'error');
        }
        return;
      }

      // Signal update → navbar dropdown refreshes instantly
      this.authService.profileUpdateSuccess(data);
      this.isEditing = false;

      this.showToast('✓ Profile updated successfully!', 'success');
      this.fireSuccessConfetti();
    } catch (err) {
      this.showToast('Network error — please try again.', 'error');
    } finally {
      this.profileSaving = false;
    }
  }

  // ── Primary Bank ──────────────────────────────────────────
  async savePrimaryBank() {
    this.bankSaving = true;
    const ok = await this.historyService.updatePrimaryBank(this.selectedBank);
    this.bankSaving = false;

    if (ok) {
      // Persist + signal refresh
      const user = this.authService.currentUser();
      if (user) {
        this.authService.profileUpdateSuccess({ ...user, primary_bank: this.selectedBank });
      }
      this.showToast(`✓ Primary bank set to ${this.selectedBank} — XGBoost re-weighted`, 'success');

      // GSAP elastic pulse on button
      const btn = document.getElementById('save-bank-btn');
      if (btn) gsap.fromTo(btn, { scale: 0.93 }, { scale: 1, duration: 0.4, ease: 'elastic.out(1,.5)' });

      this.fireSuccessConfetti('#bank-card');
    } else {
      this.showToast('✕ Bank update failed — please try again.', 'error');
    }
  }

  // ── History ───────────────────────────────────────────────
  selectEntry(entry: MonthEntry) {
    this.historyService.selectEntry(
      this.historyService.selected()?.reportId === entry.reportId ? null : entry
    );
  }

  reopenInDashboard(entry: MonthEntry, e: Event) {
    e.stopPropagation();
    this.historyService.selectEntry(entry);
    this.router.navigate(['/dashboard']);
  }

  async refreshHistory() {
    await this.historyService.loadHistory();
    this.animateCounts();
  }

  // ── GSAP count-up ─────────────────────────────────────────
  private animateCounts() {
    const stEl = document.getElementById('count-statements');
    const yrEl = document.getElementById('count-years');
    if (stEl) {
      const obj = { v: 0 };
      gsap.to(obj, { v: this.historyService.total(), duration: 1.3, ease: 'power2.out',
        onUpdate: () => { stEl.textContent = String(Math.round(obj.v)); } });
    }
    if (yrEl) {
      const obj = { v: 0 };
      gsap.to(obj, { v: this.historyService.years().length, duration: 1.1, ease: 'power2.out',
        onUpdate: () => { yrEl.textContent = String(Math.round(obj.v)); } });
    }
  }

  // ── Confetti + Toast ──────────────────────────────────────
  private fireSuccessConfetti(cardId?: string) {
    const card = cardId ? document.getElementById(cardId) : null;
    const rect = card?.getBoundingClientRect();
    const oy = rect ? Math.max(0.1, Math.min(0.9, (rect.top + rect.height / 2) / window.innerHeight)) : 0.45;
    confetti({ particleCount: 80, spread: 75, origin: { y: oy },
               colors: ['#10b981','#34d399','#4f46e5','#22d3ee','#fff'], scalar: 1.1 });
    setTimeout(() => {
      confetti({ particleCount: 35, spread: 50, origin: { x: 0.3, y: oy }, colors: ['#10b981','#4f46e5'] });
      confetti({ particleCount: 35, spread: 50, origin: { x: 0.7, y: oy }, colors: ['#22d3ee','#818cf8'] });
    }, 250);
  }

  private showToast(msg: string, type: 'success' | 'error') {
    clearTimeout(this.toastTimer);
    this.toast = { msg, type };
    this.toastTimer = setTimeout(() => { this.toast = null; }, 4500);
  }

  goToDashboard() { this.router.navigate(['/dashboard']); }
  logout() { this.authService.logout(); }
}
