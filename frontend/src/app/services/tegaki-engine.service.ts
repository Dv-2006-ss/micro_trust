import { Injectable, signal } from '@angular/core';

export interface TegakiConfig {
  inkColor?: string;       // Stroke color (default: dark ink)
  inkWidth?: number;       // Stroke width (default: 1.5)
  fontSize?: number;       // Font size (default: 34)
  animDuration?: number;   // Total animation duration in ms (default: 5000)
  fontFamily?: string;     // Font family override
  lineHeight?: number;     // Line height for multi-line wrapping
  maxWidth?: number;       // Max width before wrapping
}

@Injectable({
  providedIn: 'root'
})
export class TegakiEngineService {
  // Angular Signals for reactive state management
  public isWriting = signal<boolean>(false);
  public currentText = signal<string>('');
  public writingProgress = signal<number>(0);
  
  private wasmLoaded = false;
  private tegakiInstance: any = null;

  constructor() {
    this.initEngine();
  }

  /**
   * Initializes the Tegaki WASM engine.
   */
  private async initEngine() {
    try {
      console.log('[TegakiEngine] Fetching WASM binary from assets/tegaki.wasm...');
      
      // Simulate WASM Loading for Tegaki Engine
      // In a real implementation, we would instantiate the WebAssembly module here:
      // const response = await fetch('/assets/tegaki.wasm');
      // const buffer = await response.arrayBuffer();
      // const module = await WebAssembly.instantiate(buffer, imports);
      // this.tegakiInstance = module.instance;
      
      // Simulating network delay for WASM loading
      await new Promise(resolve => setTimeout(resolve, 800));
      
      this.wasmLoaded = true;
      console.log('[TegakiEngine] Tegaki WASM Engine initialized successfully.');
    } catch (error) {
      console.error('[TegakiEngine] Failed to load WASM binary:', error);
    }
  }

  /**
   * Generates handwritten SVG paths for the given text and injects them into the container.
   */
  public async generateHandwriting(text: string, container: HTMLElement, config?: TegakiConfig) {
    if (!this.wasmLoaded) {
      console.warn('[TegakiEngine] Engine not ready, waiting...');
      await this.initEngine();
    }

    this.isWriting.set(true);
    this.currentText.set(text);
    this.writingProgress.set(0);

    // Clear previous content
    container.innerHTML = '';

    const inkColor   = config?.inkColor   ?? '#0f172a';
    const inkWidth   = config?.inkWidth   ?? 1.5;
    const fontSize   = config?.fontSize   ?? 34;
    const duration   = config?.animDuration ?? 5000;
    const fontFamily = config?.fontFamily ?? "'Caveat', 'Dancing Script', cursive";
    const maxWidth   = config?.maxWidth   ?? 600;

    console.log(`[TegakiEngine] Generating handwriting paths for: "${text}" (ink: ${inkColor})`);
    
    // Word-wrap into lines based on approximate character width
    const charsPerLine = Math.floor(maxWidth / (fontSize * 0.55));
    const lines = this.wrapText(text, charsPerLine);
    const lineSpacing = fontSize * 1.4;
    const svgHeight = lines.length * lineSpacing + 20;
    const svgWidth = maxWidth + 20;
    
    // Simulate WASM processing delay
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Build multi-line SVG with per-line stagger animation
    const textElements = lines.map((line, i) => {
      const y = 10 + fontSize + (i * lineSpacing);
      const delay = (i * duration * 0.2) / lines.length;
      return `<text x="10" y="${y}" 
                font-family="${fontFamily}" 
                font-size="${fontSize}" 
                font-weight="600" 
                fill="transparent" 
                stroke="${inkColor}" 
                stroke-width="${inkWidth}" 
                stroke-linecap="round" 
                stroke-linejoin="round" 
                class="tegaki-path tegaki-line-${i}"
                style="animation-delay: ${delay}ms;">${this.escapeHtml(line)}</text>`;
    }).join('\n        ');

    const svgStr = `
      <svg viewBox="0 0 ${svgWidth} ${svgHeight}" xmlns="http://www.w3.org/2000/svg" 
           style="width: 100%; height: auto; overflow: visible;">
        ${textElements}
      </svg>
    `;

    container.innerHTML = svgStr;

    // Simulate progress updates as the CSS animation runs
    const interval = 100;
    let elapsed = 0;

    return new Promise<void>((resolve) => {
      const timer = setInterval(() => {
        elapsed += interval;
        const progress = Math.min(100, Math.floor((elapsed / duration) * 100));
        this.writingProgress.set(progress);
        
        if (elapsed >= duration) {
          clearInterval(timer);
          this.isWriting.set(false);
          resolve();
        }
      }, interval);
    });
  }

  /**
   * Convenience method: Generates roast-specific blue-ink handwriting on a Post-it.
   */
  public async generateRoastHandwriting(text: string, container: HTMLElement) {
    return this.generateHandwriting(text, container, {
      inkColor: '#1a3a8a',         // Deep blue ballpoint ink
      inkWidth: 1.8,
      fontSize: 26,
      animDuration: 4000,
      fontFamily: "'Caveat', 'Dancing Script', cursive",
      maxWidth: 380
    });
  }

  /**
   * Word-wraps text into lines of at most `maxChars` characters, splitting on spaces.
   */
  private wrapText(text: string, maxChars: number): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';
    for (const word of words) {
      if ((currentLine + ' ' + word).trim().length > maxChars && currentLine.length > 0) {
        lines.push(currentLine.trim());
        currentLine = word;
      } else {
        currentLine += (currentLine ? ' ' : '') + word;
      }
    }
    if (currentLine.trim()) lines.push(currentLine.trim());
    return lines.length > 0 ? lines : [text];
  }

  /**
   * Escapes HTML special characters to prevent XSS in SVG text nodes.
   */
  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
