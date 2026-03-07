import { useEffect, useState, useRef, useCallback } from "react";
import { Link } from "wouter";
import { tourContent as C } from "./landing-content";

const HEARTBEAT = 800;
const TOTAL_PAGES = 5;

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  life: number;
  maxLife: number;
}

function useVisiblePage(containerRef: React.RefObject<HTMLDivElement | null>) {
  const [current, setCurrent] = useState(0);
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const idx = Number(entry.target.getAttribute("data-page-index"));
            if (!isNaN(idx)) setCurrent(idx);
          }
        });
      },
      { root: el, threshold: 0.6 }
    );
    el.querySelectorAll("[data-page-index]").forEach((page) => observer.observe(page));
    return () => observer.disconnect();
  }, [containerRef]);
  return current;
}

function createParticles(count: number, w: number, h: number): Particle[] {
  return Array.from({ length: count }, () => ({
    x: Math.random() * w,
    y: Math.random() * h,
    vx: (Math.random() - 0.5) * 0.3,
    vy: (Math.random() - 0.5) * 0.3,
    size: 1 + Math.random() * 2,
    opacity: 0.1 + Math.random() * 0.4,
    life: Math.random() * 300,
    maxLife: 200 + Math.random() * 200,
  }));
}

function ArtCanvas({ page }: { page: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const frameRef = useRef(0);
  const timeRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.scale(dpr, dpr);
      particlesRef.current = createParticles(
        Math.min(150, Math.floor(window.innerWidth * 0.12)),
        window.innerWidth,
        window.innerHeight
      );
    };
    resize();
    window.addEventListener("resize", resize);

    let running = true;
    const w = () => window.innerWidth;
    const h = () => window.innerHeight;

    const animate = () => {
      if (!running) return;
      timeRef.current++;
      const t = timeRef.current;
      const cx = w() / 2;
      const cy = h() / 2;

      ctx.clearRect(0, 0, w(), h());

      const beat = Math.sin((t * 16.67 * Math.PI * 2) / HEARTBEAT) * 0.5 + 0.5;

      if (page === 0) {
        drawPage1(ctx, cx, cy, beat, t);
      } else if (page === 1) {
        drawPage2(ctx, cx, cy, beat, t, w(), h());
      } else if (page === 2) {
        drawPage3(ctx, cx, cy, beat, t, w(), h());
      } else if (page === 3) {
        drawPage4(ctx, cx, cy, beat, t, w(), h());
      } else if (page === 4) {
        drawPage5(ctx, cx, cy, beat, t);
      }

      const particles = particlesRef.current;
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.life++;
        if (p.life > p.maxLife) {
          p.x = Math.random() * w();
          p.y = Math.random() * h();
          p.life = 0;
        }
        const fadeIn = Math.min(p.life / 30, 1);
        const fadeOut = Math.max(0, 1 - (p.life - p.maxLife + 30) / 30);
        const alpha = p.opacity * fadeIn * (p.life > p.maxLife - 30 ? fadeOut : 1);

        if (page === 0 || page === 4) {
          ctx.fillStyle = `rgba(0, 255, 128, ${alpha * 0.3})`;
        } else if (page === 1) {
          ctx.fillStyle = `rgba(100, 200, 255, ${alpha * 0.4})`;
        } else if (page === 2) {
          ctx.fillStyle = `rgba(200, 150, 255, ${alpha * 0.4})`;
        } else {
          ctx.fillStyle = `rgba(255, 200, 100, ${alpha * 0.4})`;
        }
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (0.8 + beat * 0.2), 0, Math.PI * 2);
        ctx.fill();
      }

      frameRef.current = requestAnimationFrame(animate);
    };

    frameRef.current = requestAnimationFrame(animate);
    return () => {
      running = false;
      cancelAnimationFrame(frameRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [page]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-0 pointer-events-none"
      data-testid="art-canvas"
    />
  );
}

function drawPage1(ctx: CanvasRenderingContext2D, cx: number, cy: number, beat: number, t: number) {
  const radius = 4 + beat * 3;
  const glowRadius = 30 + beat * 20;

  const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowRadius);
  gradient.addColorStop(0, `rgba(0, 255, 128, ${0.15 + beat * 0.15})`);
  gradient.addColorStop(0.5, `rgba(0, 255, 128, ${0.05 + beat * 0.05})`);
  gradient.addColorStop(1, "rgba(0, 255, 128, 0)");
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(cx, cy, glowRadius, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = `rgba(0, 255, 128, ${0.6 + beat * 0.4})`;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();

  const outerRadius = 80 + Math.sin(t * 0.01) * 10;
  ctx.strokeStyle = `rgba(0, 255, 128, ${0.05 + beat * 0.03})`;
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.arc(cx, cy, outerRadius, 0, Math.PI * 2);
  ctx.stroke();
}

function drawPage2(ctx: CanvasRenderingContext2D, cx: number, cy: number, beat: number, t: number, w: number, h: number) {
  const progress = Math.min(t / 120, 1);
  const eased = 1 - Math.pow(1 - progress, 3);

  const dist = w * 0.35 * (1 - eased);
  const x1 = cx - dist;
  const x2 = cx + dist;

  for (const [x, color] of [[x1, "0, 255, 128"], [x2, "100, 180, 255"]] as const) {
    const r = 3 + beat * 2;
    const glow = 25 + beat * 15;
    const g = ctx.createRadialGradient(x, cy, 0, x, cy, glow);
    g.addColorStop(0, `rgba(${color}, ${0.2 + beat * 0.15})`);
    g.addColorStop(1, `rgba(${color}, 0)`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, cy, glow, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = `rgba(${color}, ${0.7 + beat * 0.3})`;
    ctx.beginPath();
    ctx.arc(x, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }

  if (eased > 0.5) {
    const bridgeAlpha = (eased - 0.5) * 2;
    ctx.strokeStyle = `rgba(150, 220, 200, ${bridgeAlpha * 0.15 * (0.7 + beat * 0.3)})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x1, cy);
    ctx.lineTo(x2, cy);
    ctx.stroke();

    const sparkCount = Math.floor(bridgeAlpha * 8);
    for (let i = 0; i < sparkCount; i++) {
      const sx = x1 + (x2 - x1) * (i / sparkCount) + Math.sin(t * 0.05 + i) * 5;
      const sy = cy + Math.cos(t * 0.03 + i * 2) * 8;
      ctx.fillStyle = `rgba(200, 255, 220, ${bridgeAlpha * 0.3})`;
      ctx.beginPath();
      ctx.arc(sx, sy, 1, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawPage3(ctx: CanvasRenderingContext2D, cx: number, cy: number, beat: number, t: number, w: number, h: number) {
  const coreGlow = 40 + beat * 20;
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreGlow);
  g.addColorStop(0, `rgba(180, 140, 255, ${0.2 + beat * 0.1})`);
  g.addColorStop(0.6, `rgba(100, 200, 255, ${0.08})`);
  g.addColorStop(1, "rgba(0, 255, 128, 0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, coreGlow, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = `rgba(220, 200, 255, ${0.5 + beat * 0.3})`;
  ctx.beginPath();
  ctx.arc(cx, cy, 5 + beat * 2, 0, Math.PI * 2);
  ctx.fill();

  const armLength = Math.min(w, h) * 0.25;
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2 + t * 0.003;
    const len = armLength * (0.6 + Math.sin(t * 0.02 + i) * 0.4);
    const ex = cx + Math.cos(angle) * len;
    const ey = cy + Math.sin(angle) * len;

    ctx.strokeStyle = `rgba(180, 160, 255, ${0.08 + beat * 0.04})`;
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(ex, ey);
    ctx.stroke();

    ctx.fillStyle = `rgba(200, 180, 255, ${0.3 + beat * 0.2})`;
    ctx.beginPath();
    ctx.arc(ex, ey, 2 + beat, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawPage4(ctx: CanvasRenderingContext2D, cx: number, cy: number, beat: number, t: number, w: number, h: number) {
  const hexRadius = Math.min(w, h) * 0.15;
  const rotation = t * 0.002;

  ctx.strokeStyle = `rgba(255, 200, 100, ${0.1 + beat * 0.08})`;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 0; i <= 6; i++) {
    const angle = (i / 6) * Math.PI * 2 + rotation;
    const hx = cx + Math.cos(angle) * hexRadius;
    const hy = cy + Math.sin(angle) * hexRadius;
    if (i === 0) ctx.moveTo(hx, hy);
    else ctx.lineTo(hx, hy);
  }
  ctx.closePath();
  ctx.stroke();

  const innerHex = hexRadius * 0.6;
  ctx.strokeStyle = `rgba(255, 220, 140, ${0.06 + beat * 0.04})`;
  ctx.beginPath();
  for (let i = 0; i <= 6; i++) {
    const angle = (i / 6) * Math.PI * 2 - rotation * 0.5;
    const hx = cx + Math.cos(angle) * innerHex;
    const hy = cy + Math.sin(angle) * innerHex;
    if (i === 0) ctx.moveTo(hx, hy);
    else ctx.lineTo(hx, hy);
  }
  ctx.closePath();
  ctx.stroke();

  const coreGlow = 30 + beat * 15;
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreGlow);
  g.addColorStop(0, `rgba(255, 220, 150, ${0.15 + beat * 0.1})`);
  g.addColorStop(1, "rgba(255, 200, 100, 0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, coreGlow, 0, Math.PI * 2);
  ctx.fill();

  const swirlCount = 20;
  for (let i = 0; i < swirlCount; i++) {
    const swirlAngle = (i / swirlCount) * Math.PI * 4 + t * 0.01;
    const swirlDist = (i / swirlCount) * hexRadius * 0.8;
    const sx = cx + Math.cos(swirlAngle) * swirlDist;
    const sy = cy + Math.sin(swirlAngle) * swirlDist;
    const alpha = (1 - i / swirlCount) * 0.3;
    ctx.fillStyle = `rgba(255, 230, 180, ${alpha})`;
    ctx.beginPath();
    ctx.arc(sx, sy, 1 + beat, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawPage5(ctx: CanvasRenderingContext2D, cx: number, cy: number, beat: number, t: number) {
  const dotAlpha = 0.3 + beat * 0.7;
  const dotSize = 3 + beat * 1.5;

  ctx.fillStyle = `rgba(0, 255, 128, ${dotAlpha})`;
  ctx.beginPath();
  ctx.arc(cx, cy, dotSize, 0, Math.PI * 2);
  ctx.fill();

  const glowR = 15 + beat * 10;
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowR);
  g.addColorStop(0, `rgba(0, 255, 128, ${dotAlpha * 0.2})`);
  g.addColorStop(1, "rgba(0, 255, 128, 0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, glowR, 0, Math.PI * 2);
  ctx.fill();
}

function PageText({ text }: { text: string }) {
  if (!text) return null;
  return (
    <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none px-8">
      <p
        className="text-sm sm:text-lg lg:text-xl font-mono text-foreground/80 tracking-wider text-center leading-relaxed"
        style={{ animation: "text-fade-in 2s ease-out both" }}
        data-testid="text-page-line"
      >
        {text}
      </p>
    </div>
  );
}

function DotButton() {
  return (
    <div className="absolute inset-0 flex items-center justify-center z-20">
      <Link href="/whitepaper">
        <button
          className="w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center text-primary font-mono text-2xl sm:text-3xl hover:scale-110 transition-transform duration-500 cursor-pointer"
          style={{ animation: "dot-pulse 1.6s ease-in-out infinite" }}
          data-testid="button-dot-enter"
          aria-label="Enter D-Planet"
        >
          .
        </button>
      </Link>
    </div>
  );
}

function ScrollHint() {
  return (
    <div
      className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20"
      style={{ animation: "text-fade-in 3s ease-out both" }}
    >
      <div className="flex flex-col items-center gap-2">
        <span className="text-[8px] font-mono text-primary/20 tracking-[0.5em] uppercase">scroll</span>
        <div className="w-px h-6 bg-gradient-to-b from-primary/20 to-transparent" style={{ animation: "scroll-line 2s ease-in-out infinite" }} />
      </div>
    </div>
  );
}

export default function Landing() {
  const containerRef = useRef<HTMLDivElement>(null);
  const currentPage = useVisiblePage(containerRef);

  useEffect(() => {
    document.title = "D-Planet";
    const meta = document.querySelector('meta[name="description"]');
    const desc = "D-Planet — 分散型ASI共同開発プラットフォーム";
    if (meta) {
      meta.setAttribute("content", desc);
    } else {
      const newMeta = document.createElement("meta");
      newMeta.name = "description";
      newMeta.content = desc;
      document.head.appendChild(newMeta);
    }
  }, []);

  const scrollToPage = useCallback((idx: number) => {
    const el = containerRef.current?.querySelector(`[data-page-index="${idx}"]`);
    el?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const pages = [C.page1, C.page2, C.page3, C.page4, C.page5];

  return (
    <div className="relative bg-black">
      <ArtCanvas page={currentPage} />

      <div className="fixed right-4 top-1/2 -translate-y-1/2 z-30 hidden sm:flex flex-col gap-2">
        {Array.from({ length: TOTAL_PAGES }).map((_, i) => (
          <button
            key={i}
            className={`w-1.5 h-1.5 rounded-full transition-all duration-500 ${
              currentPage === i ? "bg-primary/60 scale-150" : "bg-primary/15 hover:bg-primary/30"
            }`}
            onClick={() => scrollToPage(i)}
            aria-label={`Page ${i + 1}`}
            data-testid={`tour-dot-${i}`}
          />
        ))}
      </div>

      <div ref={containerRef} className="tour-container">
        {pages.map((p, i) => (
          <section
            key={i}
            className="tour-page"
            data-page-index={i}
            data-testid={`tour-page-${i}`}
          >
            {i === 0 && <ScrollHint />}
            {i < 4 && <PageText text={p.text} />}
            {i === 4 && <DotButton />}

            {i === 4 && (
              <footer className="absolute bottom-0 left-0 right-0 py-4 z-30">
                <div className="container mx-auto px-4 flex items-center justify-between text-[9px] font-mono text-primary/20">
                  <span>D-PLANET © 2026</span>
                  <div className="flex items-center gap-4">
                    <Link href="/about" className="hover:text-primary/50 transition-colors" data-testid="link-tour-about">ABOUT</Link>
                    <Link href="/whitepaper" className="hover:text-primary/50 transition-colors" data-testid="link-tour-whitepaper">WHITE PAPER</Link>
                    <Link href="/login" className="hover:text-primary/50 transition-colors" data-testid="link-tour-login">LOGIN</Link>
                    <Link href="/legal" className="hover:text-primary/50 transition-colors" data-testid="link-tour-legal">LEGAL</Link>
                    <Link href="/privacy" className="hover:text-primary/50 transition-colors" data-testid="link-tour-privacy">PRIVACY</Link>
                  </div>
                </div>
              </footer>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
