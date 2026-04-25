import { Component, ElementRef, ViewChild, inject, effect, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ResourceApiService } from '../services/resource.service';
import { TegakiEngineService } from '../services/tegaki-engine.service';

@Component({
  selector: 'app-antigravity-note',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="parchment-bg rounded-xl p-8 relative min-h-[220px] transition-all duration-500 max-w-2xl mx-auto mt-6 overflow-hidden"
         [class.opacity-50]="tegaki.isWriting()">
      
      <!-- Watermark -->
      <div class="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03] select-none" style="z-index: 0;">
        <span class="text-7xl font-black uppercase tracking-[0.5em] rotate-12 text-gray-900">Micro-Trust AI</span>
      </div>

      <!-- Premium Stamp/Header -->
      <div class="relative flex items-center justify-between mb-6 border-b border-red-500/20 pb-4" style="z-index: 10;">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-full border border-red-400 flex items-center justify-center">
            <svg class="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <span class="text-xs font-bold uppercase tracking-widest text-red-600">Executive Manager's Desk</span>
        </div>
        <div class="text-right">
          <p class="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Date</p>
          <p class="text-xs text-gray-800 font-mono">{{ currentDate | date:'dd MMM yyyy' }}</p>
        </div>
      </div>

      <!-- Handwriting Target Container -->
      <div class="relative w-full flex justify-center items-center min-h-[100px]" #handwritingContainer style="z-index: 10;">
        @if (!hasRendered && !errorState) {
          <p class="text-gray-400 text-sm italic animate-pulse">Awaiting final verdict...</p>
        }
      </div>

      <!-- Writing Indicator -->
      @if (tegaki.isWriting()) {
        <div class="absolute bottom-4 right-4 flex items-center gap-2">
          <svg class="w-4 h-4 text-indigo-500 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
          <span class="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Signing... {{ tegaki.writingProgress() }}%</span>
        </div>
      }
    </div>
  `
})
export class AntigravityNoteComponent implements OnDestroy {
  @ViewChild('handwritingContainer', { static: true }) container!: ElementRef<HTMLElement>;
  
  public resource = inject(ResourceApiService);
  public tegaki = inject(TegakiEngineService);
  
  public currentDate = new Date();
  public hasRendered = false;
  public errorState = false;

  private fallbackTimeout: any;

  constructor() {
    // Effect to monitor the backend analysis result via ResourceApiService
    effect(() => {
      const result = this.resource.creditScoreResource.value();
      const isLoading = this.resource.creditScoreResource.isLoading();
      const error = this.resource.creditScoreResource.error();

      if (isLoading) {
        this.resetState();
        // Start 60s timeout guard for cold start/failure
        this.fallbackTimeout = setTimeout(() => {
          if (!this.hasRendered) {
            this.handleFallback("Manager is unavailable.");
          }
        }, 60000); // 60s
      } else if (result && result.roast && !this.hasRendered) {
        this.clearGuard();
        this.hasRendered = true;
        // Trigger Tegaki handwriting with the roast string
        this.tegaki.generateHandwriting(result.roast, this.container.nativeElement);
      } else if (error && !this.hasRendered) {
        this.clearGuard();
        this.handleFallback("Manager is unavailable.");
      }
    });
  }

  private resetState() {
    this.hasRendered = false;
    this.errorState = false;
    this.clearGuard();
    if (this.container) {
      this.container.nativeElement.innerHTML = '';
    }
  }

  private handleFallback(message: string) {
    this.errorState = true;
    this.hasRendered = true;
    this.tegaki.generateHandwriting(message, this.container.nativeElement);
  }

  private clearGuard() {
    if (this.fallbackTimeout) {
      clearTimeout(this.fallbackTimeout);
      this.fallbackTimeout = null;
    }
  }

  ngOnDestroy() {
    this.clearGuard();
  }
}
