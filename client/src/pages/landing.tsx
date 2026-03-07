import { useEffect, useRef, useCallback, useState } from "react";
import { useLocation } from "wouter";
import { LP_TEXT, HEARTBEAT_MS, PARTICLE_THRESHOLD, MAX_PARTICLES } from "./landing-content";

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  born: number;
}

type Scene = "idle" | "touch" | "awaken" | "text" | "fade" | "dot";

export default function Landing() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sparksRef = useRef<Spark[]>([]);
  const sceneRef = useRef<Scene>("idle");
  const frameRef = useRef(0);
  const tickRef = useRef(0);
  const textProgressRef = useRef(0);
  const fadeTimerRef = useRef(0);
  const [, navigate] = useLocation();

  const seedGlow = useRef({ x: 0, y: 0 });

  useEffect(() => {
    document.title = "D-Planet";
    const meta = document.querySelector('meta[name="description"]');
    const desc = "D-Planet — 分散型ASI共同開発プラットフォーム";
    if (meta) meta.setAttribute("content", desc);
    else {
      const m = document.createElement("meta");
      m.name = "description";
      m.content = desc;
      document.head.appendChild(m);
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let running = true;
    const dpr = window.devicePixelRatio || 1;

    const resize = () => {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seedGlow.current = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    };
    resize();
    window.addEventListener("resize", resize);

    const w = () => window.innerWidth;
    const h = () => window.innerHeight;

    const addSpark = (x: number, y: number) => {
      if (sparksRef.current.length >= MAX_PARTICLES) return;
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.3 + Math.random() * 0.5;
      sparksRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 1.5 + Math.random() * 2,
        alpha: 0.5 + Math.random() * 0.5,
        born: tickRef.current,
      });
    };

    const onPointer = (e: PointerEvent) => {
      const scene = sceneRef.current;
      if (scene === "dot") {
        const cx = w() / 2;
        const cy = h() / 2;
        const dx = e.clientX - cx;
        const dy = e.clientY - cy;
        if (Math.sqrt(dx * dx + dy * dy) < 40) {
          navigate("/whitepaper");
        }
        return;
      }
      if (scene !== "idle" && scene !== "touch") return;
      if (scene === "idle") sceneRef.current = "touch";

      addSpark(e.clientX, e.clientY);
      addSpark(e.clientX + (Math.random() - 0.5) * 10, e.clientY + (Math.random() - 0.5) * 10);

      if (sparksRef.current.length >= PARTICLE_THRESHOLD && sceneRef.current === "touch") {
        sceneRef.current = "awaken";
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      if (sceneRef.current !== "touch") return;
      if (e.pressure > 0 || e.pointerType === "touch") {
        addSpark(e.clientX, e.clientY);
        if (sparksRef.current.length >= PARTICLE_THRESHOLD) {
          sceneRef.current = "awaken";
        }
      }
    };

    canvas.addEventListener("pointerdown", onPointer);
    canvas.addEventListener("pointermove", onPointerMove);

    let awakenStart = 0;

    const animate = () => {
      if (!running) return;
      tickRef.current++;
      const t = tickRef.current;
      const beat = Math.sin((t * 16.67 * Math.PI * 2) / HEARTBEAT_MS) * 0.5 + 0.5;
      const scene = sceneRef.current;

      ctx.clearRect(0, 0, w(), h());

      if (scene === "idle") {
        drawSeedGlow(ctx, seedGlow.current.x, seedGlow.current.y, beat);
      }

      if (scene === "touch") {
        drawSeedGlow(ctx, seedGlow.current.x, seedGlow.current.y, beat * 0.3);
        drawSparks(ctx, sparksRef.current, t, 1);
      }

      if (scene === "awaken") {
        if (awakenStart === 0) awakenStart = t;
        const elapsed = t - awakenStart;
        const cx = w() / 2;
        const cy = h() / 2;

        const progress = Math.min(elapsed / 180, 1);
        const eased = 1 - Math.pow(1 - progress, 3);

        for (const s of sparksRef.current) {
          const dx = cx - s.x;
          const dy = cy - s.y;
          const pull = 0.008 * eased;
          s.vx += dx * pull;
          s.vy += dy * pull;
          s.vx *= 0.98;
          s.vy *= 0.98;
          s.x += s.vx;
          s.y += s.vy;
        }

        drawSparks(ctx, sparksRef.current, t, 1);

        if (progress >= 0.7) {
          const coreAlpha = (progress - 0.7) / 0.3;
          const coreR = 20 + beat * 10;
          const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR);
          g.addColorStop(0, `rgba(0, 255, 128, ${coreAlpha * (0.15 + beat * 0.1)})`);
          g.addColorStop(1, "rgba(0, 255, 128, 0)");
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(cx, cy, coreR, 0, Math.PI * 2);
          ctx.fill();
        }

        if (progress >= 1) {
          sceneRef.current = "text";
          textProgressRef.current = 0;
        }
      }

      if (scene === "text") {
        textProgressRef.current += 0.4;
        const cx = w() / 2;
        const cy = h() / 2;

        const coreR = 25 + beat * 12;
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR);
        g.addColorStop(0, `rgba(0, 255, 128, ${0.15 + beat * 0.1})`);
        g.addColorStop(1, "rgba(0, 255, 128, 0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(cx, cy, coreR, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = `rgba(0, 255, 128, ${0.5 + beat * 0.3})`;
        ctx.beginPath();
        ctx.arc(cx, cy, 3 + beat * 2, 0, Math.PI * 2);
        ctx.fill();

        drawSparks(ctx, sparksRef.current, t, 0.3);

        const chars = Math.min(Math.floor(textProgressRef.current), LP_TEXT.length);
        const displayText = LP_TEXT.substring(0, chars);

        if (displayText.length > 0) {
          const fontSize = Math.min(w() * 0.04, 18);
          ctx.font = `${fontSize}px 'JetBrains Mono', 'IBM Plex Mono', monospace`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";

          const textY = cy + coreR + 40;
          const textAlpha = Math.min(chars / 3, 0.8);
          ctx.fillStyle = `rgba(200, 220, 210, ${textAlpha})`;
          ctx.fillText(displayText, cx, textY);

          if (chars < LP_TEXT.length && Math.floor(t / 15) % 2 === 0) {
            const cursorX = cx + ctx.measureText(displayText).width / 2 + 2;
            ctx.fillStyle = `rgba(0, 255, 128, 0.6)`;
            ctx.fillRect(cursorX, textY - fontSize / 2, 2, fontSize);
          }
        }

        if (chars >= LP_TEXT.length && textProgressRef.current > LP_TEXT.length + 60) {
          sceneRef.current = "fade";
          fadeTimerRef.current = 0;
        }
      }

      if (scene === "fade") {
        fadeTimerRef.current++;
        const progress = Math.min(fadeTimerRef.current / 90, 1);
        const alpha = 1 - progress;

        const cx = w() / 2;
        const cy = h() / 2;

        if (alpha > 0.01) {
          const coreR = 25 + beat * 12;
          const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR);
          g.addColorStop(0, `rgba(0, 255, 128, ${alpha * (0.15 + beat * 0.1)})`);
          g.addColorStop(1, "rgba(0, 255, 128, 0)");
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(cx, cy, coreR, 0, Math.PI * 2);
          ctx.fill();

          drawSparks(ctx, sparksRef.current, t, alpha * 0.3);

          const fontSize = Math.min(w() * 0.04, 18);
          ctx.font = `${fontSize}px 'JetBrains Mono', 'IBM Plex Mono', monospace`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillStyle = `rgba(200, 220, 210, ${alpha * 0.8})`;
          ctx.fillText(LP_TEXT, cx, cy + 65);
        }

        if (progress >= 1) {
          sceneRef.current = "dot";
          sparksRef.current = [];
        }
      }

      if (scene === "dot") {
        const cx = w() / 2;
        const cy = h() / 2;
        const dotR = 3 + beat * 1.5;
        const dotAlpha = 0.3 + beat * 0.7;

        ctx.fillStyle = `rgba(0, 255, 128, ${dotAlpha})`;
        ctx.beginPath();
        ctx.arc(cx, cy, dotR, 0, Math.PI * 2);
        ctx.fill();

        const glowR = 15 + beat * 8;
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowR);
        g.addColorStop(0, `rgba(0, 255, 128, ${dotAlpha * 0.15})`);
        g.addColorStop(1, "rgba(0, 255, 128, 0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(cx, cy, glowR, 0, Math.PI * 2);
        ctx.fill();
      }

      frameRef.current = requestAnimationFrame(animate);
    };

    frameRef.current = requestAnimationFrame(animate);

    return () => {
      running = false;
      cancelAnimationFrame(frameRef.current);
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("pointerdown", onPointer);
      canvas.removeEventListener("pointermove", onPointerMove);
    };
  }, [navigate]);

  return (
    <div className="relative bg-black w-screen h-screen h-[100dvh] overflow-hidden" data-testid="landing-root">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 z-10 touch-none"
        data-testid="art-canvas"
      />

      <footer className="absolute bottom-0 left-0 right-0 py-3 z-20 pointer-events-auto">
        <div className="container mx-auto px-4 flex items-center justify-between text-[8px] font-mono text-primary/15">
          <span>D-PLANET © 2026</span>
          <div className="flex items-center gap-3">
            <a href="/about" className="hover:text-primary/40 transition-colors" data-testid="link-tour-about">ABOUT</a>
            <a href="/whitepaper" className="hover:text-primary/40 transition-colors" data-testid="link-tour-whitepaper">WHITE PAPER</a>
            <a href="/login" className="hover:text-primary/40 transition-colors" data-testid="link-tour-login">LOGIN</a>
            <a href="/legal" className="hover:text-primary/40 transition-colors" data-testid="link-tour-legal">LEGAL</a>
            <a href="/privacy" className="hover:text-primary/40 transition-colors" data-testid="link-tour-privacy">PRIVACY</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

function drawSeedGlow(ctx: CanvasRenderingContext2D, x: number, y: number, beat: number) {
  const r = 3 + beat * 2;
  const glowR = 25 + beat * 15;

  const g = ctx.createRadialGradient(x, y, 0, x, y, glowR);
  g.addColorStop(0, `rgba(0, 255, 128, ${0.08 + beat * 0.07})`);
  g.addColorStop(0.5, `rgba(0, 255, 128, ${0.03 + beat * 0.02})`);
  g.addColorStop(1, "rgba(0, 255, 128, 0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, glowR, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = `rgba(0, 255, 128, ${0.4 + beat * 0.4})`;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

function drawSparks(ctx: CanvasRenderingContext2D, sparks: Spark[], t: number, globalAlpha: number) {
  for (const s of sparks) {
    const age = t - s.born;
    const fadeIn = Math.min(age / 20, 1);
    const a = s.alpha * fadeIn * globalAlpha;

    if (a < 0.01) continue;

    ctx.fillStyle = `rgba(0, 255, 128, ${a})`;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
    ctx.fill();

    const glowR = s.size * 4;
    const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, glowR);
    g.addColorStop(0, `rgba(0, 255, 128, ${a * 0.15})`);
    g.addColorStop(1, "rgba(0, 255, 128, 0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(s.x, s.y, glowR, 0, Math.PI * 2);
    ctx.fill();
  }
}
