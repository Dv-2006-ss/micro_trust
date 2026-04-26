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
  forecast: ForecastPoint[];
  shap: ShapFeature[];
  recommended_cards: CardRecommendation[];
  banks: any[];
}

@Injectable({
  providedIn: 'root'
})
export class ResourceApiService {
  // Parameters for the resource loader
  private queryParams = signal<{ file: File; merchantId: string; pdfPassword?: string; primaryBank?: string } | null>(null);

  // New Angular experimental resource API (aligned for v19+)
  // Re-runs the loader automatically whenever the request signal (queryParams) changes
  public readonly creditScoreResource = resource<AnalysisResponse, { file: File; merchantId: string, pdfPassword?: string, primaryBank?: string } | null>({
    params: () => this.queryParams(),
    loader: async ({ params: request }) => {
      if (!request) return null as any; // Initial Idle State

      console.log(`[Frontend] Initiating Analysis for Merchant: ${request.merchantId}`);

      const MAX_RETRIES = 3;
      const RETRY_DELAY_MS = 10000; // 10 seconds between retries (backend pre-warms Python service)

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
            headers: { 'Authorization': `Bearer ${token}` }
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

          return await response.json();
        } catch (error) {
          // On network-level errors, retry if attempts remain
          if (attempt < MAX_RETRIES && error instanceof TypeError) {
            console.warn(`[Frontend] Network error — retrying in ${RETRY_DELAY_MS / 1000}s... (attempt ${attempt + 1}/${MAX_RETRIES})`);
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
            continue;
          }
          console.error('OCR/ML Processing submission failed', error);
          throw error;
        }
      }

      // Should not reach here, but safety fallback
      throw new Error('Analysis failed after maximum retries');
    }
  });

  // Action dispatcher — now carries primary_bank from stored user
  public analyzePassbook(fileData: File, merchantId: string, pdfPassword?: string) {
    const stored = localStorage.getItem('microtrust_user');
    const primaryBank = stored ? (JSON.parse(stored).primary_bank || '') : '';
    this.queryParams.set({ file: fileData, merchantId, pdfPassword, primaryBank });
  }

  public reset() {
    this.queryParams.set(null);
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
