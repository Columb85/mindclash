declare module 'canvas-confetti' {
  interface Options {
    particleCount?: number;
    angle?: number;
    spread?: number;
    startVelocity?: number;
    decay?: number;
    gravity?: number;
    drift?: number;
    ticks?: number;
    origin?: { x?: number; y?: number };
    colors?: string[];
    shapes?: ('square' | 'circle')[];
    scalar?: number;
    zIndex?: number;
    disableForReducedMotion?: boolean;
  }

  type ConfettiFn = (options?: Options) => Promise<null>;

  const confetti: ConfettiFn & {
    reset: () => void;
    create: (canvas: HTMLCanvasElement, options?: { resize?: boolean; useWorker?: boolean }) => ConfettiFn;
    shapeFromText: (options: { text: string; scalar?: number; color?: string; fontFamily?: string }) => any;
  };

  export default confetti;
}
