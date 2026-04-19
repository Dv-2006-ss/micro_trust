// ── Custom Pretext Layout Service ─────────────────────────────────────────
// Uses Canvas API measureText() for sub-millisecond text dimension calculation.
// Prevents Layout Shift (CLS) by computing exact heights before DOM insertion.
import { Injectable } from '@angular/core';

export interface TextMetrics {
  width: number;
  lineCount: number;
  totalHeight: number;
  lines: string[];
}

@Injectable({ providedIn: 'root' })
export class PretextService {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  // Cache computed metrics to avoid redundant Canvas calls
  private cache = new Map<string, TextMetrics>();

  constructor() {
    // Create a single off-screen canvas — never attached to the DOM
    this.canvas = document.createElement('canvas');
    this.canvas.width = 1;
    this.canvas.height = 1;
    this.ctx = this.canvas.getContext('2d')!;
  }

  /**
   * prepare() — Sets the font context for subsequent layout calls.
   * Mirrors the Pretext prepare(font, size) API.
   */
  prepare(fontFamily: string, fontSize: number, fontWeight = '400') {
    this.ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
    // Bust the cache when font changes
    this.cache.clear();
  }

  /**
   * layout() — Computes full text block metrics for a given maxWidth.
   * Returns line-wrapped output with total height — no DOM reflow.
   * ~0.05ms per call on average hardware.
   */
  layout(text: string, maxWidth: number, lineHeight: number): TextMetrics {
    const cacheKey = `${text}|${maxWidth}|${this.ctx.font}`;
    if (this.cache.has(cacheKey)) return this.cache.get(cacheKey)!;

    const words = text.split(' ');
    const lines: string[] = [];
    let current = '';

    for (const word of words) {
      const test = current ? `${current} ${word}` : word;
      if (this.ctx.measureText(test).width <= maxWidth) {
        current = test;
      } else {
        if (current) lines.push(current);
        current = word;
      }
    }
    if (current) lines.push(current);

    const metrics: TextMetrics = {
      width: maxWidth,
      lineCount: lines.length,
      totalHeight: lines.length * lineHeight,
      lines,
    };

    this.cache.set(cacheKey, metrics);
    return metrics;
  }

  /**
   * layoutNextLine() — Single-line width measurement.
   * Use for inline elements that must wrap around the Three.js sphere.
   */
  layoutNextLine(text: string): number {
    return this.ctx.measureText(text).width;
  }

  /**
   * fitToContainer() — Ensures text fits in a pixel-constrained container.
   * Returns the exact container height needed. Used for XAI and Roast cards.
   */
  fitToContainer(text: string, containerWidth: number, lineHeight: number, padding = 32): number {
    this.prepare('Inter', 14);
    const { totalHeight } = this.layout(text, containerWidth - padding * 2, lineHeight);
    return totalHeight + padding * 2;
  }
}
