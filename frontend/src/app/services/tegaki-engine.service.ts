import { Injectable, signal } from '@angular/core';

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
  public async generateHandwriting(text: string, container: HTMLElement) {
    if (!this.wasmLoaded) {
      console.warn('[TegakiEngine] Engine not ready, waiting...');
      await this.initEngine();
    }

    this.isWriting.set(true);
    this.currentText.set(text);
    this.writingProgress.set(0);

    // Clear previous content
    container.innerHTML = '';

    console.log(`[TegakiEngine] Generating handwriting paths for: "${text}"`);
    
    // Calculate approximate width
    const width = Math.max(300, text.length * 16);
    
    // Simulate WASM processing delay
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Simulated Tegaki output: Generating an SVG with the text mapped to a cursive font and animated stroke
    const svgStr = \`
      <svg viewBox="0 0 \${width} 100" xmlns="http://www.w3.org/2000/svg" style="width: 100%; height: auto;">
        <text x="10" y="60" 
              font-family="'Caveat', 'Dancing Script', cursive" 
              font-size="34" 
              font-weight="600" 
              fill="transparent" 
              stroke="#0f172a" 
              stroke-width="1.5" 
              stroke-linecap="round" 
              stroke-linejoin="round" 
              class="tegaki-path">\${text}</text>
      </svg>
    \`;

    container.innerHTML = svgStr;

    // Simulate progress updates as the CSS animation runs (5 seconds total)
    const totalDuration = 5000;
    const interval = 100;
    let elapsed = 0;

    return new Promise<void>((resolve) => {
      const timer = setInterval(() => {
        elapsed += interval;
        const progress = Math.min(100, Math.floor((elapsed / totalDuration) * 100));
        this.writingProgress.set(progress);
        
        if (elapsed >= totalDuration) {
          clearInterval(timer);
          this.isWriting.set(false);
          resolve();
        }
      }, interval);
    });
  }
}
