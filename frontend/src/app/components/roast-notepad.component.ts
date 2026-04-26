import {
  Component, inject, ViewChild, ElementRef, Input,
  OnChanges, SimpleChanges, signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TuiBlock } from '@taiga-ui/kit';
import { TuiIcon } from '@taiga-ui/core';
import * as THREE from 'three';
import { TegakiEngineService } from '../services/tegaki-engine.service';

@Component({
  selector: 'app-roast-notepad',
  standalone: true,
  imports: [CommonModule, TuiIcon],
  template: `
    <!-- Outer Taiga UI Block / Card wrapper -->
    <div tuiBlock class="roast-card-outer">

      <!-- Header Bar -->
      <div class="roast-header">
        <div class="roast-header-left">
          <canvas #roastSphereCanvas class="roast-sphere-canvas"></canvas>
          <div>
            <p class="roast-title">Roast Engine™ — NLG Analysis</p>
            <span class="roast-badge">
              <tui-icon icon="@tui.bot" class="roast-badge-icon"></tui-icon>
              AI Generated
            </span>
          </div>
        </div>
        <div class="roast-progress-wrap" [class.active]="tegaki.isWriting()">
          <div class="roast-progress-bar" [style.width.%]="tegaki.writingProgress()"></div>
        </div>
      </div>

      <!-- Post-it Note Area -->
      <div class="postit-container">
        <!-- Tape strip decoration -->
        <div class="postit-tape"></div>

        <div class="postit-note" [class.writing]="tegaki.isWriting()">
          <!-- Ruled lines -->
          <div class="postit-lines" aria-hidden="true">
            @for (line of ruledLines; track line) {
              <div class="postit-ruled-line"></div>
            }
          </div>

          <!-- Tegaki handwriting container -->
          <div #handwritingContainer class="handwriting-area"></div>

          <!-- Idle state -->
          @if (!aiRoast && !tegaki.isWriting()) {
            <div class="postit-idle">
              <p class="postit-idle-text">Awaiting financial roast…</p>
            </div>
          }
        </div>

        <!-- Post-it shadow and curl effect -->
        <div class="postit-shadow"></div>
      </div>

      <!-- Signature line -->
      @if (aiRoast && !tegaki.isWriting()) {
        <div class="roast-signature animate-fade-in">
          <span class="sig-dash">—</span>
          <span class="sig-text">Micro-Trust NLG Engine</span>
        </div>
      }
    </div>
  `,
  styles: [`
    /* ── Outer Card ── */
    .roast-card-outer {
      background: rgba(255, 255, 255, 0.03) !important;
      backdrop-filter: blur(32px) !important;
      -webkit-backdrop-filter: blur(32px) !important;
      border: 1px solid rgba(168, 85, 247, 0.15) !important;
      border-radius: 24px !important;
      padding: 24px !important;
      position: relative;
      overflow: hidden;
      box-shadow:
        0 8px 32px rgba(0, 0, 0, 0.5),
        inset 0 1px 0 rgba(255,255,255,0.04) !important;
    }
    .roast-card-outer::before {
      content: '';
      position: absolute;
      top: -60px;
      right: -60px;
      width: 200px;
      height: 200px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(168,85,247,0.08) 0%, transparent 70%);
      pointer-events: none;
    }

    /* ── Header ── */
    .roast-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 20px;
    }
    .roast-header-left {
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .roast-sphere-canvas {
      width: 48px;
      height: 48px;
      flex-shrink: 0;
    }
    .roast-title {
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      color: #c084fc;
      margin: 0;
    }
    .roast-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      margin-top: 4px;
      padding: 2px 10px;
      border-radius: 999px;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      background: rgba(168,85,247,0.1);
      border: 1px solid rgba(168,85,247,0.2);
      color: #c084fc;
    }
    .roast-badge-icon {
      width: 12px !important;
      height: 12px !important;
      font-size: 12px !important;
    }

    /* ── Writing Progress ── */
    .roast-progress-wrap {
      width: 80px;
      height: 4px;
      border-radius: 4px;
      background: rgba(168,85,247,0.1);
      overflow: hidden;
      opacity: 0;
      transition: opacity 0.3s ease;
    }
    .roast-progress-wrap.active { opacity: 1; }
    .roast-progress-bar {
      height: 100%;
      border-radius: 4px;
      background: linear-gradient(90deg, #a855f7, #6366f1);
      transition: width 0.15s linear;
      box-shadow: 0 0 8px rgba(168,85,247,0.5);
    }

    /* ── Post-it Note Container ── */
    .postit-container {
      position: relative;
      display: flex;
      justify-content: center;
      padding: 8px 0;
    }

    /* ── Tape Strip ── */
    .postit-tape {
      position: absolute;
      top: -6px;
      left: 50%;
      transform: translateX(-50%) rotate(-1.5deg);
      width: 80px;
      height: 22px;
      background: rgba(255, 255, 255, 0.12);
      border: 1px solid rgba(255, 255, 255, 0.06);
      backdrop-filter: blur(4px);
      -webkit-backdrop-filter: blur(4px);
      border-radius: 2px;
      z-index: 3;
    }

    /* ── The Post-it Note ── */
    .postit-note {
      position: relative;
      width: 100%;
      max-width: 460px;
      min-height: 180px;
      padding: 28px 24px 20px;
      border-radius: 4px;
      transform: rotate(-0.8deg);
      transform-origin: top center;
      z-index: 2;

      /* Classic post-it yellow with warm gradient */
      background: linear-gradient(
        168deg,
        #fef9c3 0%,
        #fde68a 40%,
        #fcd34d 100%
      );

      /* Subtle inner shadow for paper depth */
      box-shadow:
        inset 0 0 40px rgba(0, 0, 0, 0.04),
        inset 0 -2px 0 rgba(0, 0, 0, 0.03);

      transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    .postit-note.writing {
      transform: rotate(-0.8deg) scale(1.01);
    }

    /* ── Ruled lines (notebook effect) ── */
    .postit-lines {
      position: absolute;
      inset: 28px 24px 20px;
      display: flex;
      flex-direction: column;
      gap: 0;
      pointer-events: none;
    }
    .postit-ruled-line {
      height: 36px;
      border-bottom: 1px solid rgba(120, 90, 40, 0.12);
      flex-shrink: 0;
    }

    /* ── Handwriting Area ── */
    .handwriting-area {
      position: relative;
      z-index: 1;
      min-height: 100px;
    }

    /* ── Tegaki SVG Animation ── */
    :host ::ng-deep .tegaki-path {
      stroke-dasharray: 2000;
      stroke-dashoffset: 2000;
      animation: tegakiWrite 3.5s cubic-bezier(0.42, 0, 0.58, 1) forwards;
      filter: drop-shadow(0 1px 1px rgba(26, 58, 138, 0.15));
    }
    :host ::ng-deep .tegaki-line-0 { animation-delay: 0s; }
    :host ::ng-deep .tegaki-line-1 { animation-delay: 0.8s; }
    :host ::ng-deep .tegaki-line-2 { animation-delay: 1.6s; }
    :host ::ng-deep .tegaki-line-3 { animation-delay: 2.4s; }

    @keyframes tegakiWrite {
      0%   { stroke-dashoffset: 2000; fill: transparent; }
      70%  { stroke-dashoffset: 0;    fill: transparent; }
      100% { stroke-dashoffset: 0;    fill: #1a3a8a; }
    }

    /* ── Post-it Shadow ── */
    .postit-shadow {
      position: absolute;
      bottom: -4px;
      left: 12px;
      right: 12px;
      height: 12px;
      background: rgba(0, 0, 0, 0.15);
      filter: blur(6px);
      border-radius: 50%;
      z-index: 1;
    }

    /* ── Idle State ── */
    .postit-idle {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100px;
    }
    .postit-idle-text {
      font-family: 'Caveat', 'Dancing Script', cursive;
      font-size: 22px;
      color: rgba(120, 90, 40, 0.35);
      font-style: italic;
    }

    /* ── Signature ── */
    .roast-signature {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 16px;
      padding-left: 8px;
    }
    .sig-dash {
      color: rgba(168, 85, 247, 0.4);
      font-size: 18px;
    }
    .sig-text {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: rgba(168, 85, 247, 0.5);
    }
    .animate-fade-in {
      animation: fadeInSig 0.6s ease-out both;
      animation-delay: 0.3s;
    }
    @keyframes fadeInSig {
      from { opacity: 0; transform: translateY(6px); }
      to   { opacity: 1; transform: translateY(0); }
    }
  `]
})
export class RoastNotepadComponent implements OnChanges {
  @Input() aiRoast: string = '';
  @ViewChild('handwritingContainer') handwritingRef!: ElementRef<HTMLElement>;
  @ViewChild('roastSphereCanvas') sphereCanvasRef?: ElementRef<HTMLCanvasElement>;

  tegaki = inject(TegakiEngineService);

  ruledLines = Array.from({ length: 5 });

  private hasAnimated = false;
  private lastRoast = '';
  private renderer?: any;
  private animFrame?: number;

  ngOnChanges(changes: SimpleChanges) {
    if (changes['aiRoast'] && this.aiRoast && this.aiRoast !== this.lastRoast) {
      this.lastRoast = this.aiRoast;
      this.hasAnimated = false;
      // Wait for ViewChild to be available, then trigger
      setTimeout(() => this.triggerAnimation(), 100);
    }
  }

  ngAfterViewInit() {
    this.initSphere();
    // If data arrived before view init
    if (this.aiRoast && !this.hasAnimated) {
      setTimeout(() => this.triggerAnimation(), 200);
    }
  }

  private async triggerAnimation() {
    if (this.hasAnimated || !this.handwritingRef?.nativeElement || !this.aiRoast) return;
    this.hasAnimated = true;
    console.log('[RoastNotepad] Triggering Tegaki animation for ai_roast');
    await this.tegaki.generateRoastHandwriting(this.aiRoast, this.handwritingRef.nativeElement);
  }

  private initSphere() {
    const canvas = this.sphereCanvasRef?.nativeElement;
    if (!canvas) return;
    try {
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
      camera.position.z = 4;
      this.renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
      this.renderer.setSize(48, 48);
      this.renderer.setPixelRatio(window.devicePixelRatio || 1);

      const geo = new THREE.IcosahedronGeometry(1.5, 1);
      const edges = new THREE.EdgesGeometry(geo);
      const mat = new THREE.LineBasicMaterial({ color: 0xec4899, transparent: true, opacity: 0.6 });
      const mesh = new THREE.LineSegments(edges, mat);
      scene.add(mesh);

      const startTime = performance.now();
      const loop = () => {
        this.animFrame = requestAnimationFrame(loop);
        const t = (performance.now() - startTime) / 1000;
        mesh.rotation.y = t * 0.8;
        mesh.rotation.x = t * 0.5;
        const scale = 1 + Math.sin(t * 5) * 0.05;
        mesh.scale.set(scale, scale, scale);
        this.renderer!.render(scene, camera);
      };
      loop();
    } catch (e) {
      console.warn('[RoastNotepad] Three.js sphere initialization skipped:', e);
    }
  }

  ngOnDestroy() {
    if (this.animFrame) cancelAnimationFrame(this.animFrame);
    if (this.renderer) this.renderer.dispose();
  }
}
