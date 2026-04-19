import { Component, inject, signal, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PdfSecurityService } from '../services/pdf-security.service';

@Component({
  selector: 'app-pdf-password-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <!-- Backdrop -->
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4"
         (click)="onBackdropClick($event)">

      <!-- Frosted glass overlay -->
      <div class="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>

      <!-- Modal Card -->
      <div class="relative w-full max-w-md transform transition-all"
           style="animation: modalIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;">

        <div class="relative bg-gray-900/70 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-[0_32px_64px_rgba(0,0,0,0.5)] overflow-hidden">

          <!-- Decorative glow orbs -->
          <div class="absolute -top-20 -right-20 w-48 h-48 bg-red-500/20 rounded-full blur-3xl pointer-events-none"></div>
          <div class="absolute -bottom-20 -left-20 w-48 h-48 bg-amber-500/15 rounded-full blur-3xl pointer-events-none"></div>

          <div class="relative z-10 p-8">
            <!-- Lock Icon -->
            <div class="flex justify-center mb-6">
              <div class="w-20 h-20 rounded-full bg-gradient-to-br from-red-500/20 to-amber-500/20 border border-red-500/30 flex items-center justify-center shadow-[0_0_30px_rgba(239,68,68,0.2)]">
                <svg class="w-10 h-10 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
            </div>

            <!-- Title -->
            <h3 class="text-2xl font-black text-center text-white mb-2 tracking-tight">
              Protected Document
            </h3>
            <p class="text-gray-400 text-center text-sm mb-8">
              This PDF is encrypted. Enter the document password to unlock it for analysis.
            </p>

            <!-- Error Alert -->
            @if (pdfService.errorMessage()) {
              <div class="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-xl text-sm text-center mb-6 flex items-center justify-center space-x-2"
                   style="animation: shake 0.5s ease-in-out;">
                <svg class="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <span>{{ pdfService.errorMessage() }}</span>
              </div>
            }

            <!-- Password Input -->
            <div class="mb-6">
              <label class="block text-sm font-medium text-gray-300 mb-2">Document Password</label>
              <div class="relative">
                <input
                  [type]="showPassword() ? 'text' : 'password'"
                  [(ngModel)]="password"
                  (keydown.enter)="tryUnlock()"
                  placeholder="Enter PDF password"
                  class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 pr-12 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-transparent transition-all font-mono tracking-wider"
                  autofocus />
                <!-- Toggle visibility -->
                <button (click)="showPassword.set(!showPassword())"
                        class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors p-1">
                  @if (showPassword()) {
                    <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  } @else {
                    <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  }
                </button>
              </div>
            </div>

            <!-- Buttons -->
            <div class="flex space-x-3">
              <button
                (click)="onCancel()"
                class="flex-1 px-5 py-3 bg-white/5 border border-white/10 text-gray-300 hover:text-white hover:bg-white/10 rounded-xl font-semibold transition-all">
                Cancel
              </button>
              <button
                (click)="tryUnlock()"
                [disabled]="pdfService.isProcessing() || !password"
                class="flex-1 px-5 py-3 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold rounded-xl shadow-lg hover:shadow-amber-500/25 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center space-x-2">
                @if (pdfService.isProcessing()) {
                  <svg class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                  </svg>
                  <span>Decrypting...</span>
                } @else {
                  <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                  </svg>
                  <span>Unlock PDF</span>
                }
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    @keyframes modalIn {
      from {
        opacity: 0;
        transform: scale(0.92) translateY(12px);
      }
      to {
        opacity: 1;
        transform: scale(1) translateY(0);
      }
    }

    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      20% { transform: translateX(-6px); }
      40% { transform: translateX(6px); }
      60% { transform: translateX(-4px); }
      80% { transform: translateX(4px); }
    }
  `]
})
export class PdfPasswordModalComponent {
  pdfService = inject(PdfSecurityService);

  password = '';
  showPassword = signal(false);

  dismissed = output<void>();
  unlocked = output<void>();

  async tryUnlock() {
    if (!this.password) return;
    const success = await this.pdfService.unlockWithPassword(this.password);
    if (success) {
      this.unlocked.emit();
    }
  }

  onCancel() {
    this.pdfService.resetState();
    this.dismissed.emit();
  }

  onBackdropClick(event: MouseEvent) {
    // Only close if clicking the outer backdrop, not the modal card
    if (event.target === event.currentTarget) {
      this.onCancel();
    }
  }
}
