import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ResourceApiService, PipelineStage } from '../services/resource.service';

@Component({
  selector: 'app-live-ticker',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="live-ticker-container" [class.active]="api.pipelineActive()">

      <!-- Header -->
      <div class="ticker-header">
        <div class="ticker-header-left">
          <span class="ticker-pulse-dot" [class.error]="hasError()"></span>
          <span class="ticker-header-label">
            {{ api.pipelineActive() ? 'LIVE — Intelligence Pipeline' : (hasError() ? 'Pipeline Failed' : 'Pipeline Complete') }}
          </span>
        </div>
        <div class="ticker-header-right">
          <span class="ticker-step-count">
            {{ completedCount() }}/{{ api.pipelineStages().length }} steps
          </span>
        </div>
      </div>

      <!-- Progress Bar -->
      <div class="ticker-progress-track">
        <div class="ticker-progress-fill"
             [style.width.%]="progressPercent()"
             [class.error]="hasError()"
             [class.complete]="!api.pipelineActive() && !hasError() && completedCount() > 0">
        </div>
      </div>

      <!-- Stage List -->
      <div class="ticker-stages">
        @for (stage of api.pipelineStages(); track stage.id) {
          <div class="ticker-stage" [class]="'stage-' + stage.status">
            <!-- Status Icon -->
            <div class="stage-icon-wrap">
              @switch (stage.status) {
                @case ('done') {
                  <svg class="stage-check" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                  </svg>
                }
                @case ('active') {
                  <div class="stage-spinner"></div>
                }
                @case ('error') {
                  <svg class="stage-error-icon" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
                  </svg>
                }
                @default {
                  <span class="stage-pending-dot"></span>
                }
              }
            </div>

            <!-- Stage Label -->
            <div class="stage-content">
              <span class="stage-emoji">{{ stage.icon }}</span>
              <span class="stage-label">{{ stage.label }}</span>
            </div>

            <!-- Live Badge for active stage -->
            @if (stage.status === 'active') {
              <span class="stage-live-badge">LIVE</span>
            }
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .live-ticker-container {
      background: rgba(0, 0, 0, 0.4);
      backdrop-filter: blur(24px);
      -webkit-backdrop-filter: blur(24px);
      border: 1px solid rgba(6, 182, 212, 0.15);
      border-radius: 24px;
      padding: 20px 24px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255,255,255,0.04);
      animation: tickerSlideIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both;
    }
    .live-ticker-container.active {
      border-color: rgba(6, 182, 212, 0.3);
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4), 0 0 40px rgba(6, 182, 212, 0.05), inset 0 1px 0 rgba(255,255,255,0.04);
    }

    @keyframes tickerSlideIn {
      from { opacity: 0; transform: translateY(12px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    /* ── Header ── */
    .ticker-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 12px;
    }
    .ticker-header-left {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .ticker-pulse-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #10b981;
      box-shadow: 0 0 8px rgba(16, 185, 129, 0.6);
      animation: pulseLive 1.5s ease-in-out infinite;
    }
    .ticker-pulse-dot.error {
      background: #ef4444;
      box-shadow: 0 0 8px rgba(239, 68, 68, 0.6);
      animation: none;
    }
    @keyframes pulseLive {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.4; transform: scale(0.7); }
    }
    .ticker-header-label {
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      color: #22d3ee;
    }
    .ticker-step-count {
      font-size: 11px;
      font-weight: 600;
      color: rgba(255,255,255,0.35);
      font-variant-numeric: tabular-nums;
    }

    /* ── Progress Bar ── */
    .ticker-progress-track {
      height: 3px;
      border-radius: 3px;
      background: rgba(255, 255, 255, 0.06);
      margin-bottom: 16px;
      overflow: hidden;
    }
    .ticker-progress-fill {
      height: 100%;
      border-radius: 3px;
      background: linear-gradient(90deg, #06b6d4, #6366f1);
      transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 0 12px rgba(6, 182, 212, 0.4);
    }
    .ticker-progress-fill.error {
      background: linear-gradient(90deg, #ef4444, #dc2626);
      box-shadow: 0 0 12px rgba(239, 68, 68, 0.4);
    }
    .ticker-progress-fill.complete {
      background: linear-gradient(90deg, #10b981, #059669);
      box-shadow: 0 0 12px rgba(16, 185, 129, 0.4);
    }

    /* ── Stage List ── */
    .ticker-stages {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .ticker-stage {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px 12px;
      border-radius: 12px;
      transition: all 0.3s ease;
    }

    /* Stage states */
    .stage-pending {
      opacity: 0.3;
    }
    .stage-active {
      opacity: 1;
      background: rgba(6, 182, 212, 0.06);
      border: 1px solid rgba(6, 182, 212, 0.15);
    }
    .stage-done {
      opacity: 0.6;
    }
    .stage-error {
      opacity: 1;
      background: rgba(239, 68, 68, 0.06);
      border: 1px solid rgba(239, 68, 68, 0.15);
    }

    /* ── Stage Icon ── */
    .stage-icon-wrap {
      width: 20px;
      height: 20px;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .stage-check {
      width: 16px;
      height: 16px;
      color: #10b981;
    }
    .stage-error-icon {
      width: 16px;
      height: 16px;
      color: #ef4444;
    }
    .stage-spinner {
      width: 14px;
      height: 14px;
      border: 2px solid rgba(6, 182, 212, 0.2);
      border-top-color: #06b6d4;
      border-radius: 50%;
      animation: spinStage 0.8s linear infinite;
    }
    @keyframes spinStage {
      to { transform: rotate(360deg); }
    }
    .stage-pending-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.15);
    }

    /* ── Stage Content ── */
    .stage-content {
      flex: 1;
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: 0;
    }
    .stage-emoji {
      font-size: 14px;
      flex-shrink: 0;
    }
    .stage-label {
      font-size: 12px;
      font-weight: 500;
      color: rgba(255, 255, 255, 0.7);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .stage-active .stage-label {
      color: #22d3ee;
      font-weight: 600;
    }
    .stage-done .stage-label {
      color: rgba(255, 255, 255, 0.4);
    }

    /* ── Live Badge ── */
    .stage-live-badge {
      flex-shrink: 0;
      padding: 2px 8px;
      border-radius: 999px;
      font-size: 9px;
      font-weight: 800;
      letter-spacing: 0.1em;
      color: #06b6d4;
      background: rgba(6, 182, 212, 0.1);
      border: 1px solid rgba(6, 182, 212, 0.2);
      animation: pulseLive 1.5s ease-in-out infinite;
    }
  `]
})
export class LiveTickerComponent {
  api = inject(ResourceApiService);

  completedCount = computed(() =>
    this.api.pipelineStages().filter(s => s.status === 'done').length
  );

  hasError = computed(() =>
    this.api.pipelineStages().some(s => s.status === 'error')
  );

  progressPercent = computed(() => {
    const stages = this.api.pipelineStages();
    if (stages.length === 0) return 0;
    const done = stages.filter(s => s.status === 'done').length;
    const active = stages.filter(s => s.status === 'active').length;
    return Math.round(((done + active * 0.5) / stages.length) * 100);
  });
}
