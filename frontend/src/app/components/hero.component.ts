import {
  Component,
  OnInit,
  OnDestroy,
  ElementRef,
  ViewChild,
  AfterViewInit,
  inject,
  signal,
  NgZone
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import * as THREE from 'three';
import gsap from 'gsap';

@Component({
  selector: 'app-hero',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="relative min-h-screen flex flex-col items-center justify-center overflow-hidden cyber-grid" style="background: #020617;">

      <!-- Three.js Canvas -->
      <canvas #sphereCanvas class="absolute inset-0 w-full h-full" style="z-index:1; pointer-events: none;"></canvas>

      <!-- Glow Orbs -->
      <div class="absolute top-1/3 left-1/4 w-[600px] h-[600px] rounded-full pointer-events-none" style="background: radial-gradient(circle, rgba(6,182,212,0.08) 0%, transparent 70%); z-index:2;"></div>
      <div class="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full pointer-events-none" style="background: radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%); z-index:2;"></div>

      <!-- Content -->
      <div class="relative text-center max-w-5xl mx-auto px-6" style="z-index: 10;">

        <!-- Eyebrow Badge -->
        <div #eyebrow class="inline-flex items-center space-x-2 px-4 py-2 rounded-full border mb-10 opacity-0"
             style="border-color: rgba(6,182,212,0.4); background: rgba(6,182,212,0.05);">
          <span class="w-2 h-2 rounded-full bg-cyan-400 inline-block" style="animation: pulse 2s infinite;"></span>
          <span class="text-xs font-bold tracking-widest uppercase text-cyan-400">Alternative Credit Intelligence Engine</span>
        </div>

        <!-- Main Headline — individual word spans for GSAP stagger -->
        <h1 class="font-black tracking-tight leading-none mb-8 text-white" style="font-size: clamp(2.5rem, 7vw, 6rem);">
          <span #word class="inline-block opacity-0 mr-4">THE</span>
          <span #word class="inline-block opacity-0 mr-4">FUTURE</span>
          <span #word class="inline-block opacity-0 mr-4">OF</span>
          <br/>
          <span #word class="inline-block opacity-0 mr-4 score-reveal">TRUST</span>
          <span #word class="inline-block opacity-0 mr-4">IS</span>
          <span #word class="inline-block opacity-0">CALCULATED.</span>
        </h1>

        <!-- Sub headline -->
        <p #subline class="text-xl text-gray-400 mb-12 max-w-2xl mx-auto leading-relaxed opacity-0">
          XGBoost-powered ML pipeline that analyses bank passbooksvia secure OCR, generates trust scores,
          and matches merchants with optimal micro-lending partners.
        </p>

        <!-- CTA Buttons -->
        <div #ctaRow class="flex flex-col sm:flex-row items-center justify-center gap-5 opacity-0">
          <button (click)="goToDashboard()"
                  class="neon-btn group relative px-10 py-4 rounded-2xl font-bold text-white text-lg transition-all duration-300"
                  style="background: linear-gradient(135deg, #0891b2, #4f46e5); box-shadow: 0 0 30px rgba(6,182,212,0.3);">
            <span class="relative z-10 flex items-center gap-3">
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
              </svg>
              Analyze Passbook
            </span>
          </button>

          <a routerLink="/login"
             class="px-10 py-4 rounded-2xl font-bold text-cyan-400 text-lg border border-cyan-500/30 hover:border-cyan-400 hover:bg-cyan-500/5 transition-all duration-300">
            Sign In
          </a>
        </div>

        <!-- Stats strip -->
        <div #stats class="grid grid-cols-3 gap-8 mt-24 max-w-2xl mx-auto opacity-0">
          @for (stat of heroStats; track stat.label) {
            <div class="text-center glass-card rounded-2xl p-5 glass-card-hover">
              <p class="text-2xl font-black score-reveal">{{ stat.value }}</p>
              <p class="text-xs text-gray-500 mt-1 uppercase tracking-widest">{{ stat.label }}</p>
            </div>
          }
        </div>
      </div>

      <!-- Scroll Indicator -->
      <div class="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-60" style="z-index:10;">
        <span class="text-xs text-gray-500 uppercase tracking-widest">Scroll to explore</span>
        <div class="w-px h-12 bg-gradient-to-b from-cyan-400 to-transparent" style="animation: pulse 2s infinite;"></div>
      </div>
    </div>
  `,
  styles: [`
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.4; }
    }
  `]
})
export class HeroComponent implements AfterViewInit, OnDestroy {
  private router = inject(Router);
  private ngZone = inject(NgZone);

  @ViewChild('sphereCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('eyebrow') eyebrowRef!: ElementRef;
  @ViewChild('subline') sublineRef!: ElementRef;
  @ViewChild('ctaRow') ctaRowRef!: ElementRef;
  @ViewChild('stats') statsRef!: ElementRef;

  heroStats = [
    { value: '99.2%', label: 'OCR Accuracy' },
    { value: '<2s',   label: 'Analysis Time' },
    { value: '3-Tier', label: 'ML Pipeline' }
  ];

  // Three.js
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private sphere!: THREE.LineSegments;
  private nodes: THREE.Mesh[] = [];
  private animFrame!: number;
  private mouse = { x: 0, y: 0 };
  private targetRotation = { x: 0, y: 0 };
  private startTime = performance.now();

  ngAfterViewInit() {
    this.ngZone.runOutsideAngular(() => {
      this.initThreeJs();
      this.setupMouseListener();
    });
    this.runGsapIntro();
  }

  private initThreeJs() {
    const canvas = this.canvasRef.nativeElement;
    const W = window.innerWidth;
    const H = window.innerHeight;

    // Scene
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(60, W / H, 0.1, 1000);
    this.camera.position.z = 5;

    // Renderer — antialias off for VivoBook performance
    this.renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false });
    this.renderer.setSize(W, H);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.renderer.setClearColor(0x000000, 0);

    // Wireframe Trust Sphere
    const geo = new THREE.IcosahedronGeometry(2, 2); // low segments for perf
    const edges = new THREE.EdgesGeometry(geo);
    const mat = new THREE.LineBasicMaterial({
      color: 0x06b6d4,
      transparent: true,
      opacity: 0.35
    });
    this.sphere = new THREE.LineSegments(edges, mat);
    this.scene.add(this.sphere);

    // Pulsing neon nodes at vertices
    const positions = geo.attributes['position'];
    const nodeMat = new THREE.MeshBasicMaterial({ color: 0x67e8f9 });
    const nodeGeo = new THREE.SphereGeometry(0.04, 4, 4);
    const uniqueVerts = new Set<string>();

    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i).toFixed(3);
      const y = positions.getY(i).toFixed(3);
      const z = positions.getZ(i).toFixed(3);
      const key = `${x},${y},${z}`;
      if (!uniqueVerts.has(key)) {
        uniqueVerts.add(key);
        const node = new THREE.Mesh(nodeGeo, nodeMat.clone());
        node.position.set(+x, +y, +z);
        this.scene.add(node);
        this.nodes.push(node);
      }
    }

    // Resize handler
    window.addEventListener('resize', this.onResize.bind(this));

    // Animate loop
    this.animate();
  }

  private setupMouseListener() {
    window.addEventListener('mousemove', (e) => {
      this.mouse.x = (e.clientX / window.innerWidth - 0.5) * 2;
      this.mouse.y = (e.clientY / window.innerHeight - 0.5) * 2;
    });
  }

  private animate() {
    this.animFrame = requestAnimationFrame(() => this.animate());

    const t = (performance.now() - this.startTime) / 1000;

    // Smooth mouse-follow rotation
    this.targetRotation.x += (this.mouse.y * 0.5 - this.targetRotation.x) * 0.05;
    this.targetRotation.y += (this.mouse.x * 0.5 - this.targetRotation.y) * 0.05;

    this.sphere.rotation.x = this.targetRotation.x + t * 0.05;
    this.sphere.rotation.y = this.targetRotation.y + t * 0.08;

    // Pulse nodes opacity
    this.nodes.forEach((node, i) => {
      const mat = node.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.4 + 0.6 * Math.abs(Math.sin(t * 1.5 + i * 0.3));
      node.rotation.x = this.sphere.rotation.x;
      node.rotation.y = this.sphere.rotation.y;
    });

    this.renderer.render(this.scene, this.camera);
  }

  private runGsapIntro() {
    const tl = gsap.timeline({ delay: 0.2 });

    // Eyebrow badge
    tl.to(this.eyebrowRef.nativeElement, {
      opacity: 1, y: 0, duration: 0.6, ease: 'power3.out'
    }, 0);

    // Headline words stagger
    const words = document.querySelectorAll('h1 span[class*="opacity-0"]');
    tl.fromTo(words,
      { opacity: 0, y: 60, rotateX: -40 },
      { opacity: 1, y: 0, rotateX: 0, duration: 0.8, stagger: 0.1, ease: 'power4.out' },
      0.3
    );

    // Subline
    tl.to(this.sublineRef.nativeElement, {
      opacity: 1, y: 0, duration: 0.7, ease: 'power3.out'
    }, 0.9);

    // CTA
    tl.to(this.ctaRowRef.nativeElement, {
      opacity: 1, y: 0, duration: 0.6, ease: 'back.out(1.4)'
    }, 1.1);

    // Stats
    tl.to(this.statsRef.nativeElement, {
      opacity: 1, y: 0, duration: 0.6, ease: 'power2.out'
    }, 1.3);
  }

  private onResize() {
    const W = window.innerWidth;
    const H = window.innerHeight;
    this.camera.aspect = W / H;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(W, H);
  }

  goToDashboard() {
    this.router.navigate(['/dashboard']);
  }

  ngOnDestroy() {
    cancelAnimationFrame(this.animFrame);
    this.renderer?.dispose();
    window.removeEventListener('resize', this.onResize.bind(this));
  }
}
