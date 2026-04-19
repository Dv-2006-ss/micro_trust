import { Component, inject, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PdfSecurityService } from '../services/pdf-security.service';
import { ResourceApiService } from '../services/resource.service';

@Component({
  selector: 'app-pdf-file-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="mt-6 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md overflow-hidden transition-all hover:border-white/20"
         style="animation: cardSlideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;">

      <!-- Preview Section -->
      @if (pdfService.pdfPreviewUrl()) {
        <div class="relative w-full h-48 bg-black/40 overflow-hidden group">
          <img [src]="pdfService.pdfPreviewUrl()"
               alt="Document Preview"
               class="w-full h-full object-contain p-2 transition-transform duration-300 group-hover:scale-105" />
          <!-- Overlay gradient & Neon Scanner -->
          <div class="absolute inset-0 bg-gradient-to-t from-gray-900/80 via-transparent to-transparent pointer-events-none"></div>
          @if (api.creditScoreResource.isLoading()) {
            <div class="absolute top-0 left-0 w-full h-[2px] bg-cyan-400 shadow-[0_0_15px_4px_rgba(34,211,238,0.8)] animate-[neonScan_2s_ease-in-out_infinite] z-20"></div>
          }

          <!-- Status Badge -->
          <div class="absolute top-3 right-3">
            @switch (pdfService.fileStatus()) {
              @case ('unlocked') {
                <span class="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-green-500/20 border border-green-500/30 text-green-400 text-xs font-bold uppercase rounded-full backdrop-blur-sm">
                  <span class="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                  <span>Unlocked</span>
                </span>
              }
              @case ('decrypted') {
                <span class="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-amber-500/20 border border-amber-500/30 text-amber-400 text-xs font-bold uppercase rounded-full backdrop-blur-sm">
                  <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                  </svg>
                  <span>Decrypted</span>
                </span>
              }
              @case ('checking') {
                <span class="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 text-xs font-bold uppercase rounded-full backdrop-blur-sm">
                  <svg class="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                  </svg>
                  <span>Checking</span>
                </span>
              }
            }
          </div>
        </div>
      }

      <!-- File Info Section -->
      <div class="p-5">
        <div class="flex items-start space-x-4">
          <!-- File Type Icon -->
          <div class="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center"
               [class]="isPdf ? 'bg-red-500/15 border border-red-500/20' : 'bg-blue-500/15 border border-blue-500/20'">
            @if (isPdf) {
              <svg class="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            } @else {
              <svg class="w-6 h-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            }
          </div>

          <!-- File Details -->
          <div class="flex-1 min-w-0">
            <p class="text-sm font-semibold text-white truncate">{{ pdfService.currentFile()?.name }}</p>
            <p class="text-xs text-gray-500 mt-0.5">{{ formattedSize }} · {{ isPdf ? 'PDF Document' : 'Image File' }}</p>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="flex space-x-3 mt-5">
          <!-- Remove Button -->
          <button
            (click)="onRemove()"
            class="flex-1 flex items-center justify-center space-x-2 px-4 py-2.5 bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 hover:text-red-300 rounded-xl text-sm font-semibold transition-all">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            <span>Remove</span>
          </button>

          <!-- Analyze Button -->
          <button
            (click)="onAnalyze()"
            [disabled]="!pdfService.canAnalyze()"
            class="flex-1 flex items-center justify-center space-x-2 px-4 py-2.5 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-lg hover:shadow-cyan-500/25 transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:shadow-none text-sm"
            [title]="!pdfService.canAnalyze() ? 'Unlock the PDF first to analyze' : 'Start OCR & ML analysis'">
            @if (pdfService.canAnalyze()) {
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
              <span>Analyze Fast</span>
            } @else {
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span>Locked</span>
            }
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    @keyframes cardSlideUp {
      from {
        opacity: 0;
        transform: translateY(16px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    @keyframes neonScan {
      0%, 100% { top: 0%; opacity: 1; }
      50% { top: 100%; opacity: 0.8; }
    }
  `]
})
export class PdfFileCardComponent {
  pdfService = inject(PdfSecurityService);
  api = inject(ResourceApiService);

  analyzeClicked = output<void>();
  removeClicked = output<void>();

  get isPdf(): boolean {
    const name = this.pdfService.currentFile()?.name ?? '';
    return name.toLowerCase().endsWith('.pdf');
  }

  get formattedSize(): string {
    const bytes = this.pdfService.currentFile()?.size ?? 0;
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  onAnalyze() {
    if (this.pdfService.canAnalyze()) {
      this.analyzeClicked.emit();
    }
  }

  onRemove() {
    this.pdfService.resetState();
    this.removeClicked.emit();
  }
}
