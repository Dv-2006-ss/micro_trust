import {
  Component, computed, inject, ViewChild, ElementRef, AfterViewInit
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ResourceApiService } from '../services/resource.service';
import { PretextService } from '../services/pretext.service';
import gsap from 'gsap';
import * as THREE from 'three';
import * as _confetti from 'canvas-confetti';
const confetti = (_confetti as any).default || _confetti;

@Component({
  selector: 'app-bank-table',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-6">

      <!-- ═══════════════  LOADING STATE  ═══════════════ -->
      @if (scoreResource.isLoading()) {
        <div class="glass-card rounded-3xl p-8">
          <div class="flex flex-col items-center justify-center py-16 space-y-8">
            <div class="relative w-28 h-28">
              <div class="absolute inset-0 rounded-full border-4" style="border-color: rgba(6,182,212,0.1);"></div>
              <div class="absolute inset-0 rounded-full border-4 border-t-transparent animate-spin" style="border-color:#06b6d4; border-top-color: transparent;"></div>
              <div class="absolute inset-2 rounded-full border-4 border-t-transparent animate-spin" style="border-color:rgba(99,102,241,0.6); border-top-color: transparent; animation-direction: reverse; animation-duration: 1.5s;"></div>
              <div class="absolute inset-0 flex items-center justify-center">
                <svg class="w-8 h-8 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2h-2"/>
                </svg>
              </div>
            </div>
            <div class="text-center space-y-2">
              <p class="text-xl font-bold text-cyan-300">OCR Extracting & ML Processing</p>
              <p class="text-gray-500 text-sm">PyTesseract → Feature Extraction → XGBoost.predict() → ARIMA.forecast()</p>
            </div>
            <div class="w-72 h-1.5 rounded-full overflow-hidden" style="background: rgba(6,182,212,0.1);">
              <div class="h-full rounded-full animate-[progressBar_1.8s_ease-in-out_infinite]"
                   style="background: linear-gradient(90deg,#06b6d4,#6366f1);"></div>
            </div>
          </div>
        </div>
      }

      <!-- ═══════════════  ERROR STATE  ═══════════════ -->
      @else if (scoreResource.error()) {
        <div class="glass-card rounded-3xl p-8">
          <div class="p-6 rounded-2xl flex items-start space-x-4" style="background:rgba(239,68,68,0.05); border:1px solid rgba(239,68,68,0.2);">
            <div class="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style="background:rgba(239,68,68,0.15);">
              <svg class="h-5 w-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>
            <div>
              <h3 class="text-red-400 font-bold text-lg">Analysis Failed</h3>
              <p class="text-red-300/70 mt-1 text-sm font-mono">{{ scoreResource.error()?.message }}</p>
              <p class="text-gray-500 mt-2 text-xs">Check the Python Intelligence Engine terminal for the traceback.</p>
            </div>
          </div>
        </div>
      }

      <!-- ═══════════════  RESULTS  ═══════════════ -->
      @else if (scoreResource.value()) {

        <!-- ── ROW 1: Score + XAI ── -->
        <div class="glass-card glass-morphic animate__animated animate__fadeInUp rounded-3xl overflow-hidden relative" style="animation-duration: 0.8s;">
          <div class="absolute -top-32 -left-32 w-96 h-96 rounded-full pointer-events-none" style="background:radial-gradient(circle,rgba(6,182,212,0.07) 0%,transparent 70%);"></div>
          <div class="p-8">

            <!-- Header -->
            <div class="flex items-center justify-between mb-8">
              <div>
                <h2 class="text-2xl font-black text-white tracking-tight">Micro-Trust Profile</h2>
                <p class="text-gray-500 text-sm mt-1">Alternative Credit Risk Assessment · XGBoost + K-Means + ARIMA</p>
              </div>
              <span class="px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider"
                    [style.background]="result?.approval_status ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)'"
                    [style.color]="result?.approval_status ? '#10b981' : '#ef4444'"
                    [style.border]="result?.approval_status ? '1px solid rgba(16,185,129,0.3)' : '1px solid rgba(239,68,68,0.3)'">
                {{ result?.approval_status ? '✓ Approved' : '✕ Review Required' }}
              </span>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-5 gap-6">

              <!-- Score Card -->
              <div class="lg:col-span-2 rounded-2xl p-6 relative overflow-hidden glass-card-hover"
                   style="background:rgba(0,0,0,0.3); border:1px solid rgba(6,182,212,0.15);">
                <div class="absolute inset-0 rounded-2xl pointer-events-none" style="background:linear-gradient(135deg,rgba(6,182,212,0.06) 0%,transparent 60%);"></div>
                <p class="text-gray-500 text-xs font-bold uppercase tracking-widest mb-3">Micro-Trust Score</p>
                <div class="flex items-end gap-4 mb-4">
                  <h3 #scoreDisplay class="text-7xl font-black score-reveal" style="line-height:1;">0</h3>
                  <span class="mb-2 px-3 py-1.5 rounded-full text-sm font-bold uppercase"
                        [ngClass]="{'bg-green-500/20 text-green-400 border border-green-500/30': result?.risk_level === 'Low',
                                    'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30': result?.risk_level === 'Medium',
                                    'bg-red-500/20 text-red-400 border border-red-500/30': result?.risk_level === 'High'}">
                    {{ result?.risk_level }} Risk
                  </span>
                </div>

                <!-- Gauge -->
                <div class="w-full h-2 rounded-full mb-4 overflow-hidden" style="background:rgba(255,255,255,0.05);">
                  <div class="h-full rounded-full transition-all duration-1000"
                       [style.width.%]="(result?.credit_score ?? 0) / 9"
                       style="background:linear-gradient(90deg,#ef4444,#f59e0b,#10b981); box-shadow: 0 0 10px rgba(6,182,212,0.4);"></div>
                </div>

                <div class="grid grid-cols-2 gap-4 border-t pt-4" style="border-color:rgba(255,255,255,0.05);">
                  <div>
                    <p class="text-gray-500 text-xs font-bold uppercase tracking-widest mb-1">Persona</p>
                    <p class="text-indigo-300 font-bold text-sm">{{ result?.persona }}</p>
                  </div>
                  <div>
                    <p class="text-gray-500 text-xs font-bold uppercase tracking-widest mb-1">Interest</p>
                    <p class="text-cyan-400 font-black text-xl">{{ result?.suggested_interest }}</p>
                  </div>
                </div>
              </div>

              <!-- SHAP XAI Breakdown -->
              <div class="lg:col-span-3 rounded-2xl p-6 glass-card-hover"
                   style="background:rgba(0,0,0,0.3); border:1px solid rgba(99,102,241,0.15);"
                   [style.minHeight.px]="xaiHeight()">
                <div class="flex items-center gap-2 mb-5">
                  <svg class="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
                  </svg>
                  <p class="text-gray-400 text-xs font-bold uppercase tracking-widest">SHAP Feature Importance — Explainable AI</p>
                </div>

                <div class="space-y-4">
                  @if (shapFactors().length > 0) {
                    @for (factor of shapFactors(); track factor.label) {
                      <div class="shap-factor-row" style="opacity: 0;">
                        <div class="flex justify-between text-xs font-bold uppercase tracking-wider mb-1.5">
                          <span class="text-gray-400">{{ factor.label }}</span>
                          <span [style.color]="factor.color">{{ factor.value }}%</span>
                        </div>
                        <div class="relative w-full h-2.5 rounded-full overflow-hidden" style="background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.04);">
                          <div class="absolute inset-y-0 left-0 rounded-full transition-all duration-1000"
                               [style.width.%]="factor.value"
                               [style.background]="factor.gradient"
                               [style.boxShadow]="'0 0 12px 2px ' + factor.glow"></div>
                        </div>
                      </div>
                    }
                  } @else {
                    <!-- Placeholder when SHAP data is missing or empty -->
                    <div class="flex flex-col items-center justify-center py-10 space-y-3">
                      <div class="w-12 h-12 rounded-xl flex items-center justify-center" style="background:rgba(99,102,241,0.08); border:1px solid rgba(99,102,241,0.15);">
                        <svg class="w-6 h-6 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
                        </svg>
                      </div>
                      <p class="text-indigo-300 text-sm font-bold">Gathering Financial Insights</p>
                    </div>
                  }
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- ── ROW 2: Roast Engine ── -->
        <div class="glass-card glass-morphic animate__animated animate__fadeInUp rounded-3xl p-6 relative overflow-hidden" [style.minHeight.px]="roastHeight()" style="animation-duration: 0.8s; animation-delay: 0.1s; animation-fill-mode: both;">
          <div class="absolute top-0 right-0 w-40 h-40 rounded-full pointer-events-none" style="background:radial-gradient(circle,rgba(168,85,247,0.08) 0%,transparent 70%);"></div>
          
          <div style="float: left; width: 80px; height: 80px; margin-right: 20px; margin-bottom: 8px; position: relative;" class="rounded-2xl flex items-center justify-center flex-shrink-0" id="roast-sphere-container">
            <canvas #roastSphereCanvas class="w-full h-full absolute inset-0"></canvas>
          </div>
          
          <div class="block mt-2">
            <div class="flex items-center gap-2 mb-2">
              <p class="text-xs font-bold uppercase tracking-widest text-purple-400">Roast Engine™ — NLG Analysis</p>
              <span class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider" style="background:rgba(168,85,247,0.1); border:1px solid rgba(168,85,247,0.2); color:#c084fc;">AI Generated</span>
            </div>
            <p class="text-lg text-gray-200 font-medium italic leading-relaxed">"{{ result?.roast }}"</p>
          </div>
          <div class="clear-both"></div>
        </div>

        <!-- ── ROW 3: ARIMA Forecast + Smart Cards ── -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">

          <!-- ARIMA Forecast -->
          <div class="glass-card glass-morphic animate__animated animate__fadeInUp rounded-3xl p-6" style="animation-duration: 0.8s; animation-delay: 0.2s; animation-fill-mode: both;">
            <div class="flex items-center gap-2 mb-5">
              <svg class="w-4 h-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
              </svg>
              <p class="text-gray-400 text-xs font-bold uppercase tracking-widest">ARIMA Cash Flow Forecast</p>
            </div>

            <!-- Bar Chart -->
            <div class="flex items-end justify-between gap-2 h-36 mb-4 px-2">
              @for (item of forecastData(); track item.month; let i = $index) {
                <div class="flex flex-col items-center gap-1 flex-1">
                  <span class="text-[10px] text-gray-500 font-bold">₹{{ (item.value / 1000).toFixed(0) }}K</span>
                  <div class="w-full rounded-t-lg transition-all duration-700 forecast-bar"
                       [style.height.%]="getBarHeight(item.value)"
                       [style.background]="forecastBarGradient()"
                       [style.boxShadow]="forecastBarGlow()"
                       [style.animationDelay]="i * 100 + 'ms'">
                  </div>
                  <span class="text-[9px] text-gray-600 font-bold uppercase">{{ item.month.split(' ')[0] }}</span>
                </div>
              }
            </div>

            <div class="pt-3 flex items-center justify-between text-xs" style="border-top:1px solid rgba(255,255,255,0.05);">
              <span class="text-gray-500">6-month projection</span>
              <span class="font-bold" [style.color]="forecastTrend() === 'Upward' ? '#10b981' : '#f59e0b'">
                {{ forecastTrend() === 'Upward' ? '📈' : '📉' }} Trend: {{ forecastTrend() }}
              </span>
            </div>
          </div>

          <!-- Smart Card Recommendations -->
          <div class="glass-card glass-morphic animate__animated animate__fadeInUp rounded-3xl p-6" [style.minHeight.px]="smartCardsHeight()" style="animation-duration: 0.8s; animation-delay: 0.3s; animation-fill-mode: both;">
            <div class="flex items-center gap-2 mb-5">
              <svg class="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/>
              </svg>
              <p class="text-gray-400 text-xs font-bold uppercase tracking-widest">Smart Card Matches</p>
            </div>

            <div class="space-y-3">
              @for (card of smartCardsData(); track card.card; let i = $index) {
                <div class="rounded-xl p-4 transition-all duration-200 group cursor-default"
                     style="background:rgba(0,0,0,0.3); border:1px solid rgba(255,255,255,0.04);"
                     [class]="'hover-card-' + i">
                  <div class="flex items-center justify-between mb-2">
                    <div class="flex items-center gap-2.5">
                      <div class="w-8 h-5 rounded flex items-center justify-center text-[8px] font-black"
                           [style.background]="card.is_primary ? 'linear-gradient(135deg,#10b981,#059669)' : (i === 0 ? 'linear-gradient(135deg,#f59e0b,#d97706)' : i === 1 ? 'linear-gradient(135deg,#6366f1,#4f46e5)' : 'linear-gradient(135deg,#06b6d4,#0891b2)')"
                           style="letter-spacing:0.5px; color:white;">
                        {{ card.card.split(' ')[0].substring(0,4).toUpperCase() }}
                      </div>
                      <span class="font-bold text-white text-sm group-hover:text-cyan-300 transition-colors">{{ card.card }}</span>
                    </div>
                    
                    <div class="flex items-center gap-2">
                      @if (card.is_primary) {
                        <span class="text-[9px] font-bold tracking-wider px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 border border-green-500/30">
                          ⭐️ YOUR BANK
                        </span>
                      }
                      <span class="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                            style="background:rgba(6,182,212,0.08); color:#67e8f9; border:1px solid rgba(6,182,212,0.15);">
                        {{ card.type }}
                      </span>
                    </div>
                  </div>
                  <div class="flex items-center justify-between">
                    <p class="text-xs text-gray-500">{{ card.reward }}</p>
                    <p class="text-xs font-bold text-cyan-400">Limit {{ card.limit }}</p>
                  </div>
                </div>
              }
            </div>
          </div>
        </div>

        <!-- ── ROW 4: Lending Partners Table ── -->
        <div class="glass-card glass-morphic animate__animated animate__fadeInUp rounded-3xl overflow-hidden" style="animation-duration: 0.8s; animation-delay: 0.4s; animation-fill-mode: both;">
          <div class="px-6 py-4 flex items-center justify-between" style="border-bottom:1px solid rgba(6,182,212,0.08);">
            <div class="flex items-center gap-3">
              <svg class="w-4 h-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
              </svg>
              <h3 class="font-bold text-white text-sm tracking-wide">Approved Lending Partners</h3>
            </div>
            <span class="px-3 py-1 rounded-full text-xs font-bold text-cyan-400" style="background:rgba(6,182,212,0.08); border:1px solid rgba(6,182,212,0.15);">
              {{ sortedBanks().length }} Partners
            </span>
          </div>

          <table class="w-full">
            <thead style="background:rgba(0,0,0,0.2);">
              <tr class="text-xs uppercase tracking-widest text-gray-600 font-bold">
                <th class="px-6 py-3 text-left">Institution</th>
                <th class="px-6 py-3 text-left">Risk Tier</th>
                <th class="px-6 py-3 text-right">Interest Rate</th>
              </tr>
            </thead>
            <tbody>
              @for (bank of sortedBanks(); track bank.name) {
                <tr class="transition-all duration-200 group" style="border-top:1px solid rgba(255,255,255,0.03);">
                  <td class="px-6 py-4">
                    <div class="flex items-center gap-3">
                      <div class="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                           [style.background]="bank.risk === 'High-Risk' ? 'rgba(239,68,68,0.1)' : bank.risk === 'Medium-Risk' ? 'rgba(245,158,11,0.1)' : 'rgba(16,185,129,0.1)'"
                           [style.border]="bank.risk === 'High-Risk' ? '1px solid rgba(239,68,68,0.2)' : bank.risk === 'Medium-Risk' ? '1px solid rgba(245,158,11,0.2)' : '1px solid rgba(16,185,129,0.2)'">
                        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"
                             [style.color]="bank.risk === 'High-Risk' ? '#ef4444' : bank.risk === 'Medium-Risk' ? '#f59e0b' : '#10b981'">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
                        </svg>
                      </div>
                      <span class="font-semibold text-gray-200 group-hover:text-cyan-300 transition-colors">{{ bank.name }}</span>
                    </div>
                  </td>
                  <td class="px-6 py-4">
                    <span class="px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider"
                          [ngClass]="{'bg-red-500/10 text-red-400 border border-red-500/20': bank.risk === 'High-Risk',
                                      'bg-amber-500/10 text-amber-400 border border-amber-500/20': bank.risk === 'Medium-Risk',
                                      'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20': bank.risk === 'Low-Risk'}">
                      {{ bank.risk }}
                    </span>
                  </td>
                  <td class="px-6 py-4 text-right">
                    <span class="inline-flex items-center px-3.5 py-1.5 rounded-full text-sm font-black"
                          style="background:rgba(6,182,212,0.08); border:1px solid rgba(6,182,212,0.2); color:#67e8f9; text-shadow: 0 0 10px rgba(6,182,212,0.5);">
                      {{ bank.rate }}% APR
                    </span>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }

      <!-- ═══════════════  TOAST NOTIFICATION  ═══════════════ -->
      @if (showSuccessToast) {
        <div class="fixed top-8 right-8 z-50 animate__animated animate__fadeInRight animate__faster">
          <div class="glass-card rounded-2xl p-4 flex items-center gap-4" style="background:rgba(16,185,129,0.1); border:1px solid rgba(16,185,129,0.3); box-shadow: 0 0 20px rgba(16,185,129,0.2);">
            <div class="w-10 h-10 rounded-full flex items-center justify-center bg-green-500/20 text-green-400 border border-green-500/30">
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
              </svg>
            </div>
            <div>
              <p class="text-sm font-bold text-green-400">Analysis Complete</p>
              <p class="text-xs text-green-300">Profile mathematically scored and parsed securely.</p>
            </div>
          </div>
        </div>
      }

      <!-- ═══════════════  IDLE STATE — only when no result exists  ═══════════════ -->
      @if (!scoreResource.value() && !scoreResource.isLoading() && !scoreResource.error()) {
        <div class="glass-card rounded-3xl p-8">
          <div class="py-16 text-center">
            <div class="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-6"
                 style="background:rgba(6,182,212,0.05); border:1px solid rgba(6,182,212,0.1);">
              <svg class="w-10 h-10 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
              </svg>
            </div>
            <p class="text-gray-400 text-xl font-bold mb-2">Awaiting Passbook Statement</p>
            <p class="text-gray-600 text-sm">End-to-End Encrypted · Zero-Knowledge Ephemeral Processing</p>
            <div class="flex items-center justify-center gap-4 mt-8 flex-wrap">
              @for (badge of techBadges; track badge) {
                <span class="px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider text-gray-600"
                      style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06);">{{ badge }}</span>
              }
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    @keyframes progressBar {
      0% { width: 0%; transform: translateX(-100%); }
      50% { width: 60%; transform: translateX(0); }
      100% { width: 0%; transform: translateX(200%); }
    }
    .forecast-bar {
      animation: barGrow 0.8s ease-out both;
    }
    @keyframes barGrow {
      from { height: 0% !important; opacity: 0; }
      to { opacity: 1; }
    }
    .glass-morphic {
      background: rgba(255, 255, 255, 0.03) !important;
      backdrop-filter: blur(32px) !important;
      -webkit-backdrop-filter: blur(32px) !important;
      border: 1px solid rgba(0, 255, 255, 0.12) !important;
      box-shadow:
        0 8px 32px rgba(0, 0, 0, 0.5),
        inset 0 1px 0 rgba(255,255,255,0.04) !important;
    }
  `]
})
export class BankTableComponent {
  private api = inject(ResourceApiService);
  private pretext = inject(PretextService);
  scoreResource = this.api.creditScoreResource;

  @ViewChild('scoreDisplay') scoreDisplayRef!: ElementRef<HTMLElement>;
  @ViewChild('roastSphereCanvas') roastSphereCanvasRef?: ElementRef<HTMLCanvasElement>;

  techBadges = ['PyTesseract OCR', 'XGBoost ML', 'K-Means Clustering', 'ARIMA Forecast', 'SHAP XAI', 'AES Encryption'];

  get result() {
    return this.scoreResource.value() as any;
  }

  // Fire GSAP counter + confetti exactly once per new result
  private lastScore = 0;
  private confettiFired = false;
  showSuccessToast = false;
  
  private renderer?: THREE.WebGLRenderer;
  private animFrame?: number;
  private startTime = performance.now();
  private sphereMesh?: THREE.LineSegments;

  ngDoCheck() {
    const score = this.result?.credit_score;
    if (score && score !== this.lastScore) {
      this.lastScore = score;
      this.confettiFired = false; // reset flag for new result
      this.showSuccessToast = false;
      
      if (this.scoreDisplayRef?.nativeElement) {
        this.animateScore(score);
      }
      if (this.roastSphereCanvasRef?.nativeElement && !this.renderer) {
        this.initThreeJsSphere();
      }
    }
  }

  // ── Pretext Exact Heights to prevent Layout Shift ──
  roastHeight = computed(() => {
    const rst = this.result?.roast || '';
    if (!rst) return 120;
    // Assume container width approx 700px (depends on screen, using safe min height)
    return Math.max(120, this.pretext.fitToContainer(`" ${rst} "`, 700, 28, 24));
  });

  xaiHeight = computed(() => {
    // 4 rows of XAI Factors
    return 240 + this.pretext.layoutNextLine('SHAP Feature Importance'); 
  });

  smartCardsHeight = computed(() => {
    const cards = this.smartCardsData();
    if (!cards || cards.length === 0) return 360; // default height for 3 cards
    // Base padding/headers ~80px. Each card is ~70px absolute minimum.
    // We dynamically fit the strings of the cards to see if additional wrap height is needed.
    let totalHeight = 80;
    for (const c of cards) {
      totalHeight += Math.max(76, this.pretext.fitToContainer(`" ${c.card} "`, 400, 14, 14));
    }
    return totalHeight;
  });

  private initThreeJsSphere() {
    const canvas = this.roastSphereCanvasRef!.nativeElement;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
    camera.position.z = 4;
    this.renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    this.renderer.setSize(80, 80);
    this.renderer.setPixelRatio(window.devicePixelRatio || 1);

    const geo = new THREE.IcosahedronGeometry(1.5, 1);
    const edges = new THREE.EdgesGeometry(geo);
    const mat = new THREE.LineBasicMaterial({ color: 0xec4899, transparent: true, opacity: 0.6 });
    this.sphereMesh = new THREE.LineSegments(edges, mat);
    scene.add(this.sphereMesh);

    const loop = () => {
      this.animFrame = requestAnimationFrame(loop);
      if (this.sphereMesh) {
         const t = (performance.now() - this.startTime) / 1000;
         this.sphereMesh.rotation.y = t * 0.8;
         this.sphereMesh.rotation.x = t * 0.5;
         
         // Deconstructing effect by scaling randomly slightly
         const scale = 1 + Math.sin(t * 5) * 0.05;
         this.sphereMesh.scale.set(scale, scale, scale);
      }
      this.renderer!.render(scene, camera);
    };
    loop();
  }

  ngOnDestroy() {
    if (this.animFrame) cancelAnimationFrame(this.animFrame);
    if (this.renderer) this.renderer.dispose();
  }

  private animateScore(target: number) {
    const el = this.scoreDisplayRef.nativeElement;
    
    // Add glowing neon cyan effect to the score element
    el.style.color = '#22d3ee'; // tailwind text-cyan-400
    el.style.textShadow = '0 0 25px rgba(6,182,212,0.8), 0 0 10px rgba(6,182,212,0.5)';
    
    // Also stagger SHAP variables
    setTimeout(() => {
        gsap.fromTo('.shap-factor-row', 
          { opacity: 0, x: -20 },
          { opacity: 1, x: 0, duration: 0.6, stagger: 0.2, ease: 'power2.out' }
        );
    }, 500);

    const obj = { val: 0 };
    gsap.to(obj, {
      val: target,
      duration: 2.0,
      ease: 'power3.out',
      onUpdate: () => { el.textContent = Math.round(obj.val).toString(); },
      onComplete: () => {
        // Trigger the Canvas-Confetti only when the final analysis is successfully displayed
        if (!this.confettiFired && target > 0) {
          this.confettiFired = true;
          this.showSuccessToast = true;
          this.fireConfetti();
          // Hide toast after a few seconds
          setTimeout(() => { this.showSuccessToast = false; }, 5000);
        }
      }
    });
  }

  private fireConfetti() {
    // Neon-green + indigo palette to match the cyber theme
    confetti({
      particleCount: 220,
      spread: 130,
      origin: { y: 0.6 },
      colors: ['#10b981', '#34d399', '#4f46e5', '#6366f1', '#a5f3fc', '#ffffff'],
      gravity: 0.7,
      scalar: 1.2
    });
    // Second wave from the sides
    setTimeout(() => {
      confetti({ particleCount: 80, spread: 60, origin: { x: 0, y: 0.7 }, colors: ['#10b981', '#4f46e5'] });
      confetti({ particleCount: 80, spread: 60, origin: { x: 1, y: 0.7 }, colors: ['#34d399', '#6366f1'] });
    }, 300);
  }

  // ── SHAP Feature Importance factors (dynamic from API) ──
  shapFactors = computed(() => {
    const shap = this.result?.shap;
    // Guard: ensure SHAP is an array and not empty
    if (!shap || !Array.isArray(shap) || shap.length === 0) return [];
    
    return shap.map((s: any) => {
      const labelStr = s.name.split('_').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      let color, gradient, glow;
      if (s.name === 'income_stability') {
          color = '#34d399'; gradient = 'linear-gradient(90deg,#059669,#34d399)'; glow = 'rgba(16,185,129,0.5)';
      } else if (s.name === 'spending_risk') {
          color = '#fb923c'; gradient = 'linear-gradient(90deg,#dc2626,#fb923c)'; glow = 'rgba(239,68,68,0.5)';
      } else if (s.name === 'liquidity_buffer') {
          color = '#67e8f9'; gradient = 'linear-gradient(90deg,#0891b2,#818cf8)'; glow = 'rgba(6,182,212,0.5)';
      } else {
          color = '#c084fc'; gradient = 'linear-gradient(90deg,#7c3aed,#c084fc)'; glow = 'rgba(139,92,246,0.5)';
      }
      return {
          label: labelStr,
          value: Number(s.value),
          color, gradient, glow
      };
    });
  });

  // ── Explicit Angular computed signals for Live Real-Time GUI Binding ──
  forecastData = computed(() => {
    return this.result?.forecast ?? [];
  });

  smartCardsData = computed(() => {
    return this.result?.recommended_cards ?? [];
  });

  // ── Score-based forecast bar color ───────────────────────────────
  // Neon Amber  for score ≤ 500 (High-Risk)
  // Neon Cyan   for score 501–700 (Medium)
  // Neon Green  for score 701+ (Low-Risk)
  forecastBarGradient = computed(() => {
    const score = this.result?.credit_score ?? 0;
    if (score <= 500)  return 'linear-gradient(to top, rgba(245,158,11,0.3), rgba(245,158,11,0.9))';
    if (score <= 700)  return 'linear-gradient(to top, rgba(6,182,212,0.3), rgba(6,182,212,0.9))';
    return               'linear-gradient(to top, rgba(16,185,129,0.3), rgba(16,185,129,0.9))';
  });

  forecastBarGlow = computed(() => {
    const score = this.result?.credit_score ?? 0;
    if (score <= 500) return '0 0 8px rgba(245,158,11,0.4)';
    if (score <= 700) return '0 0 8px rgba(6,182,212,0.4)';
    return              '0 0 8px rgba(16,185,129,0.4)';
  });

  getBarHeight(value: number): number {
    const forecast = this.forecastData();
    if (!forecast.length) return 0;
    const max = Math.max(...forecast.map((f: any) => f.value));
    return Math.round((value / max) * 100);
  }

  forecastTrend = computed(() => {
    const f = this.forecastData();
    if (!f || f.length < 2) return 'Flat';
    return f[f.length - 1].value > f[0].value ? 'Upward' : 'Downward';
  });

  // ── Lending Partners ──
  sortedBanks = computed(() => {
    const data = this.result;
    if (!data?.banks) return [];
    
    // Sort so primary bank is on top; then fallback to sorting by rate
    return [...data.banks].sort((a, b) => {
      if (a.is_primary && !b.is_primary) return -1;
      if (!a.is_primary && b.is_primary) return 1;
      return a.rate - b.rate;
    });
  });
}
