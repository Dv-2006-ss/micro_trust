declare module 'canvas-confetti' {
  interface ConfettiOptions {
    particleCount?: number;
    spread?: number;
    origin?: { x?: number; y?: number };
    colors?: string[];
    gravity?: number;
    scalar?: number;
    ticks?: number;
  }
  function confetti(options?: ConfettiOptions): Promise<null>;
  namespace confetti {}
  export = confetti;
}
