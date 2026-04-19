import { Injectable, inject, signal, computed } from '@angular/core';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';

export interface MonthEntry {
  month: number;
  monthName: string;
  reportId: string;
  credit_score: number;
  risk_level: 'Low' | 'Medium' | 'High';
  approval_status: boolean;
  persona: string;
  primary_bank: string;
  filename: string;
  createdAt: string;
  full: any; // full hydrated analysis payload
}

export interface YearGroup {
  year: number;
  months: MonthEntry[];
  expanded: boolean; // local accordion state
}

export interface HistoryState {
  loaded: boolean;
  loading: boolean;
  years: YearGroup[];
  selectedEntry: MonthEntry | null;
  error: string | null;
}

@Injectable({ providedIn: 'root' })
export class HistoryService {
  private auth = inject(AuthService);

  private readonly API = `${environment.apiUrl}/api/v1/reports`;

  // ── Angular Signals ──────────────────────────────────────────────────────
  private stateSignal = signal<HistoryState>({
    loaded: false,
    loading: false,
    years: [],
    selectedEntry: null,
    error: null,
  });

  readonly state     = computed(() => this.stateSignal());
  readonly years     = computed(() => this.stateSignal().years);
  readonly selected  = computed(() => this.stateSignal().selectedEntry);
  readonly isLoading = computed(() => this.stateSignal().loading);
  readonly total     = computed(() =>
    this.stateSignal().years.reduce((acc, y) => acc + y.months.length, 0)
  );

  private get authHeaders(): Record<string, string> {
    const token = this.auth.currentUser()?.token ?? '';
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }

  // ── Load tree history ────────────────────────────────────────────────────
  async loadHistory(): Promise<void> {
    this.stateSignal.update(s => ({ ...s, loading: true, error: null }));
    try {
      const response = await fetch(`${this.API}/history`, { headers: this.authHeaders });
      if (!response.ok) throw new Error(`History fetch failed: ${response.status}`);
      const data = await response.json();
      const years: YearGroup[] = (data.years ?? []).map((y: any, i: number) => ({
        ...y,
        expanded: i === 0,
      }));
      this.stateSignal.update(s => ({ ...s, loaded: true, loading: false, years }));
    } catch (err: any) {
      this.stateSignal.update(s => ({
        ...s, loading: false,
        error: err?.message ?? 'Failed to load history.'
      }));
    }
  }

  // ── Save current analysis result ─────────────────────────────────────────
  async saveReport(payload: any): Promise<{ message: string } | null> {
    try {
      const now = new Date();
      const body = {
        ...payload,
        month: now.getMonth() + 1,
        year: now.getFullYear(),
        filename: payload.filename ?? 'statement.pdf',
      };
      const response = await fetch(`${this.API}/save`, {
        method: 'POST',
        headers: this.authHeaders,
        body: JSON.stringify(body),
      });
      if (!response.ok) throw new Error(`Save failed: ${response.status}`);
      const res = await response.json();
      // Reload history after save
      await this.loadHistory();
      return res;
    } catch (err: any) {
      console.error('[HistoryService] saveReport error:', err);
      return null;
    }
  }

  // ── Update primary bank ──────────────────────────────────────────────────
  async updatePrimaryBank(bank: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.API}/bank`, {
        method: 'PATCH',
        headers: this.authHeaders,
        body: JSON.stringify({ primary_bank: bank }),
      });
      if (!response.ok) throw new Error(`Bank update failed: ${response.status}`);
      return true;
    } catch (err) {
      console.error('[HistoryService] updatePrimaryBank error:', err);
      return false;
    }
  }

  // ── Accordion toggle ─────────────────────────────────────────────────────
  toggleYear(year: number): void {
    this.stateSignal.update(s => ({
      ...s,
      years: s.years.map(y => y.year === year ? { ...y, expanded: !y.expanded } : y)
    }));
  }

  // ── Select a historical entry (re-hydrates dashboard signals) ─────────────
  selectEntry(entry: MonthEntry | null): void {
    this.stateSignal.update(s => ({ ...s, selectedEntry: entry }));
  }

  reset(): void {
    this.stateSignal.set({ loaded: false, loading: false, years: [], selectedEntry: null, error: null });
  }
}
