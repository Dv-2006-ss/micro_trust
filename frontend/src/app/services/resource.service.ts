import { Injectable, signal, resource, computed } from '@angular/core';
import { environment } from '../../environments/environment';

export interface ForecastPoint {
  month: string;
  value: number;
}

export interface ShapFeature {
  name: string;
  value: number;
}

export interface CardRecommendation {
  card: string;
  type: string;
  reward: string;
  limit: string;
}

export interface AnalysisResponse {
  merchant_id: string;
  credit_score: number;
  risk_level: string;
  approval_status: boolean;
  persona: string;
  suggested_interest: string;
  roast: string;
  ai_roast: string;
  forecast: ForecastPoint[];
  shap: ShapFeature[];
  recommended_cards: CardRecommendation[];
  banks: any[];
}

// ── Pipeline Stage Model ──────────────────────────────────────────────────
export interface PipelineStage {
  id: number;
  label: string;
  icon: string;     // Emoji icon for visual flair
  status: 'pending' | 'active' | 'done' | 'error';
}

@Injectable({
  providedIn: 'root'
})
export class ResourceApiService {
  // Parameters for the resource loader
  private queryParams = signal<{ file: File; merchantId: string; pdfPassword?: string; primaryBank?: string } | null>(null);

  // ── Duplicate Request Guard ──────────────────────────────────────────────
  // Prevents multiple concurrent analysis requests from flooding Render's rate limiter
  public isAnalyzing = signal<boolean>(false);

  // ── Pipeline Live Stage Tracking ────────────────────────────────────────
  public pipelineStages = signal<PipelineStage[]>([]);
  public pipelineActive = signal<boolean>(false);
  private stageTimers: any[] = [];

  // ── Angular 21 Reactive Signals ─────────────────────────────────────────
  // Computed risk level derived reactively from credit score
  public riskLevel = computed<string>(() => {
    const result = this.creditScoreResource.value();
    if (!result) return 'Unknown';
    if (result.credit_score >= 700) return 'Low Risk';
    if (result.credit_score >= 500) return 'Medium Risk';
    return 'High Risk';
  });

  // Computed color theme derived reactively from risk level
  public riskColor = computed<{ primary: string; glow: string; bg: string; label: string }>(() => {
    const level = this.riskLevel();
    switch (level) {
      case 'Low Risk':
        return { primary: '#10b981', glow: 'rgba(16,185,129,0.5)', bg: 'rgba(16,185,129,0.08)', label: 'text-green-400' };
      case 'Medium Risk':
        return { primary: '#f59e0b', glow: 'rgba(245,158,11,0.5)', bg: 'rgba(245,158,11,0.08)', label: 'text-amber-400' };
      case 'High Risk':
        return { primary: '#ef4444', glow: 'rgba(239,68,68,0.5)', bg: 'rgba(239,68,68,0.08)', label: 'text-red-400' };
      default:
        return { primary: '#6b7280', glow: 'rgba(107,114,128,0.5)', bg: 'rgba(107,114,128,0.08)', label: 'text-gray-400' };
    }
  });

  // Computed: has the ai_roast arrived? (triggers Tegaki reactively)
  public aiRoastReady = computed<string>(() => {
    const result = this.creditScoreResource.value();
    return result?.ai_roast || result?.roast || '';
  });

  // New Angular experimental resource API (aligned for v19+)
  // Re-runs the loader automatically whenever the request signal (queryParams) changes
  public readonly creditScoreResource = resource<AnalysisResponse, { file: File; merchantId: string, pdfPassword?: string, primaryBank?: string } | null>({
    params: () => this.queryParams(),
    loader: async ({ params: request }) => {
      if (!request) return null as any; // Initial Idle State

      // ── Guard: Block duplicate concurrent requests ──────────────────
      if (this.isAnalyzing()) {
        console.warn('[Frontend] ⚠️ Analysis already in-flight — skipping duplicate request.');
        return null as any;
      }
      this.isAnalyzing.set(true);

      console.log(`[Frontend] Initiating Analysis for Merchant: ${request.merchantId}`);

      // ── Start pipeline stage simulation ───────────────────────────
      this.startPipelineSimulation();

      const MAX_RETRIES = 4;
      const RETRY_DELAY_MS = 15000; // 15 seconds between retries (backend pre-warms Python service)
      const FETCH_TIMEOUT_MS = 180000; // 3 minute timeout per attempt (Render cold start + ML processing)

      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
          const formData = new FormData();
          formData.append('passbook_file', request.file);
          formData.append('merchant_id', request.merchantId);

          if (request.pdfPassword) {
              formData.append('pdf_password', request.pdfPassword);
          }
          if (request.primaryBank) {
              formData.append('primary_bank', request.primaryBank);
          }

          // Safely extract token + primary_bank from localStorage
          const stored = localStorage.getItem('microtrust_user');
          const parsed = stored ? JSON.parse(stored) : {};
          const token = parsed.token || '';

          // Pointing to Node.js Orchestrator protected route
          const response = await fetch(`${environment.apiUrl}/analyze`, {
            method: 'POST',
            body: formData,
            headers: { 'Authorization': `Bearer ${token}` },
            signal: AbortSignal.timeout(FETCH_TIMEOUT_MS)
          });

          // Retry on transient Render cold-start errors (502/503/504)
          if ([502, 503, 504].includes(response.status) && attempt < MAX_RETRIES) {
            console.warn(`[Frontend] API returned ${response.status} — Render cold start detected. Retrying in ${RETRY_DELAY_MS / 1000}s... (attempt ${attempt + 1}/${MAX_RETRIES})`);
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
            continue;
          }

          if (!response.ok) {
            throw new Error(`API responded with status: ${response.status}`);
          }

          const data = await response.json();

          // ── Complete all pipeline stages ───────────────────────────
          this.completePipeline();
          this.isAnalyzing.set(false);

          return data;
        } catch (error) {
          // On network-level errors, retry if attempts remain
          if (attempt < MAX_RETRIES && error instanceof TypeError) {
            console.warn(`[Frontend] Network error — retrying in ${RETRY_DELAY_MS / 1000}s... (attempt ${attempt + 1}/${MAX_RETRIES})`);
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
            continue;
          }
          this.failPipeline();
          this.isAnalyzing.set(false);
          console.error('OCR/ML Processing submission failed', error);
          throw error;
        }
      }

      // Should not reach here, but safety fallback
      this.failPipeline();
      this.isAnalyzing.set(false);
      throw new Error('Analysis failed after maximum retries');
    }
  });

  // ── Pipeline Stage Simulation ──────────────────────────────────────────
  // Simulates live progress updates while the backend processes
  private startPipelineSimulation() {
    // Clear any previous timers
    this.stageTimers.forEach(t => clearTimeout(t));
    this.stageTimers = [];

    const stages: PipelineStage[] = [
      { id: 1, label: 'Authenticating via Account Aggregator...', icon: '🔐', status: 'active' },
      { id: 2, label: 'OCR extracting transaction data...', icon: '📄', status: 'pending' },
      { id: 3, label: 'Feeding 12-month data into XGBoost...', icon: '🧠', status: 'pending' },
      { id: 4, label: 'K-Means clustering merchant persona...', icon: '📊', status: 'pending' },
      { id: 5, label: 'RNN identifying liquidity patterns...', icon: '🔬', status: 'pending' },
      { id: 6, label: 'Computing SHAP feature importance...', icon: '📈', status: 'pending' },
      { id: 7, label: 'ARIMA forecasting future cash flow...', icon: '📉', status: 'pending' },
      { id: 8, label: 'Surprise', icon: '✍️', status: 'pending' },
    ];

    this.pipelineStages.set(stages);
    this.pipelineActive.set(true);

    // Advance each stage with staggered delays (stretched for Render cold-start scenarios)
    const stageDelays = [0, 2000, 5000, 8000, 11000, 15000, 19000, 24000];

    stageDelays.forEach((delay, index) => {
      if (index === 0) return; // First stage is already active

      const timer = setTimeout(() => {
        this.pipelineStages.update(current => {
          return current.map((s, i) => {
            if (i < index) return { ...s, status: 'done' as const };
            if (i === index) return { ...s, status: 'active' as const };
            return s;
          });
        });
      }, delay);
      this.stageTimers.push(timer);
    });
  }

  private completePipeline() {
    this.stageTimers.forEach(t => clearTimeout(t));
    this.stageTimers = [];

    // Mark all stages as done
    this.pipelineStages.update(stages =>
      stages.map(s => ({ ...s, status: 'done' as const }))
    );

    // Deactivate after a brief moment so the user sees all green
    setTimeout(() => {
      this.pipelineActive.set(false);
    }, 1500);
  }

  private failPipeline() {
    this.stageTimers.forEach(t => clearTimeout(t));
    this.stageTimers = [];

    // Mark the active stage as error
    this.pipelineStages.update(stages =>
      stages.map(s => s.status === 'active' ? { ...s, status: 'error' as const } : s)
    );
    this.pipelineActive.set(false);
  }

  // Action dispatcher — now carries primary_bank from stored user
  public analyzePassbook(fileData: File, merchantId: string, pdfPassword?: string) {
    // ── Prevent duplicate concurrent submissions ────────────────────
    if (this.isAnalyzing()) {
      console.warn('[Frontend] ⚠️ Analysis already in progress — ignoring duplicate submit.');
      return;
    }
    const stored = localStorage.getItem('microtrust_user');
    const primaryBank = stored ? (JSON.parse(stored).primary_bank || '') : '';
    this.queryParams.set({ file: fileData, merchantId, pdfPassword, primaryBank });
  }

  public reset() {
    this.queryParams.set(null);
    this.pipelineStages.set([]);
    this.pipelineActive.set(false);
    this.stageTimers.forEach(t => clearTimeout(t));
    this.stageTimers = [];
  }

  // Helper to check if analysis results are available
  public hasResult(): boolean {
    return !!this.creditScoreResource.value();
  }

  // Helper to get the latest analysis data
  public getLatestResult(): AnalysisResponse | undefined {
    return this.creditScoreResource.value();
  }
}
