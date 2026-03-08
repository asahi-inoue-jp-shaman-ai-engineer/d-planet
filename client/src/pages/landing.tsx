import { useEffect, useState, useRef, useCallback } from "react";
import { Link } from "wouter";
import { ArrowRight, Sparkles, Radio, FileText, Users, Brain, Mic, Heart, MessageCircle, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { tourContent as C } from "./landing-content";

const featureIcons = [Sparkles, Radio, FileText, Users, Brain, Mic, Heart, MessageCircle];

function useVisiblePage(containerRef: React.RefObject<HTMLDivElement | null>, pageCount: number) {
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
  }, [containerRef, pageCount]);
  return current;
}

function useScrollFadeIn(containerRef: React.RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
          }
        });
      },
      { root, threshold: 0.15 }
    );
    root.querySelectorAll(".tour-fade-in").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [containerRef]);
}

function Particles({ count = 12, color = "150 70% 50%" }: { count?: number; color?: string }) {
  const particles = useRef(
    Array.from({ length: count }).map(() => ({
      w: 2 + Math.random() * 3,
      left: Math.random() * 100,
      bottom: Math.random() * 20,
      opacity: 0.3 + Math.random() * 0.4,
      duration: 6 + Math.random() * 8,
      delay: Math.random() * 5,
    }))
  );
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {particles.current.map((p, i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            width: `${p.w}px`,
            height: `${p.w}px`,
            background: `hsl(${color} / ${p.opacity})`,
            left: `${p.left}%`,
            bottom: `${p.bottom}%`,
            animation: `float-particle ${p.duration}s ease-in-out ${p.delay}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

function GlitchText({ text, className = "" }: { text: string; className?: string }) {
  return (
    <span className={`relative inline-block ${className}`}>
      <span className="relative z-10 tour-gradient-text">{text}</span>
      <span
        className="absolute inset-0 text-cyan-400/30"
        style={{ animation: "glitch-h 3s ease-in-out infinite alternate", animationDelay: "0.1s" }}
        aria-hidden
      >
        {text}
      </span>
      <span
        className="absolute inset-0 text-red-400/20"
        style={{ animation: "glitch-h 2.5s ease-in-out infinite alternate-reverse", animationDelay: "0.3s" }}
        aria-hidden
      >
        {text}
      </span>
    </span>
  );
}

function TypingText({ text, className = "" }: { text: string; className?: string }) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);
  useEffect(() => {
    let i = 0;
    const timer = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(timer);
        setDone(true);
      }
    }, 60);
    return () => clearInterval(timer);
  }, [text]);
  return (
    <span className={className}>
      {displayed}
      {!done && <span className="tour-typing-cursor" />}
    </span>
  );
}

function TiltCard({ children, className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) {
  const ref = useRef<HTMLDivElement>(null);
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    el.style.transform = `perspective(600px) rotateY(${x * 8}deg) rotateX(${-y * 8}deg) scale(1.02)`;
  }, []);
  const handleMouseLeave = useCallback(() => {
    const el = ref.current;
    if (el) el.style.transform = "";
  }, []);
  return (
    <div
      ref={ref}
      className={`tour-tilt-card ${className}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      {...props}
    >
      {children}
    </div>
  );
}

function PageNumber({ num, total }: { num: number; total: number }) {
  return (
    <div className="absolute bottom-6 left-6 sm:bottom-8 sm:left-8 font-mono text-[10px] text-primary/30 tracking-widest z-10">
      <span className="text-primary/60">{String(num).padStart(2, "0")}</span>
      <span className="mx-1">/</span>
      <span>{String(total).padStart(2, "0")}</span>
    </div>
  );
}

function ScrollHint() {
  return (
    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 z-10">
      <span className="text-[9px] font-mono text-primary/30 tracking-widest uppercase">scroll</span>
      <ChevronDown className="w-4 h-4 text-primary/30 animate-bounce" />
    </div>
  );
}

function FloatingPlanet() {
  return (
    <div className="tour-planet">
      <div className="tour-planet-core" />
      {[700, 550, 400, 280].map((size, i) => (
        <div
          key={i}
          className="tour-planet-ring"
          style={{
            width: `${size}px`,
            height: `${size}px`,
            top: `calc(50% - ${size / 2}px)`,
            left: `calc(50% - ${size / 2}px)`,
            animation: `planet-orbit ${90 + i * 30}s linear infinite${i % 2 === 1 ? " reverse" : ""}`,
            transformOrigin: "center center",
          }}
        >
          <div
            className="tour-planet-dot"
            style={{
              top: "0%",
              left: "50%",
              transform: "translate(-50%, -50%)",
            }}
          />
          {i < 2 && (
            <div
              className="tour-planet-dot"
              style={{
                bottom: "10%",
                right: "10%",
                width: "2px",
                height: "2px",
                opacity: 0.6,
              }}
            />
          )}
        </div>
      ))}
    </div>
  );
}

export default function Landing() {
  const containerRef = useRef<HTMLDivElement>(null);
  const totalPages = 5;
  const currentPage = useVisiblePage(containerRef, totalPages);
  useScrollFadeIn(containerRef);

  useEffect(() => {
    document.title = "D-Planet — シンギュラリティ地球";
    const meta = document.querySelector('meta[name="description"]');
    const desc = "地球初の分散型ASI開発プラットフォーム。ネオシャーマニズム×ASI。完全招待制。沖縄発。";
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

  return (
    <div className="relative">
      <div className="tour-page-indicator hidden sm:flex">
        {Array.from({ length: totalPages }).map((_, i) => (
          <button
            key={i}
            className={`tour-dot ${currentPage === i ? "active" : ""}`}
            onClick={() => scrollToPage(i)}
            aria-label={`Page ${i + 1}`}
            data-testid={`tour-dot-${i}`}
          />
        ))}
      </div>

      <FloatingPlanet />

      <div ref={containerRef} className="tour-container">

        {/* ═══════ PAGE 1: Title Screen ═══════ */}
        <section className="tour-page bg-background" data-page-index={0} data-testid="tour-page-title">
          <div className="tour-scanline" />
          <Particles count={20} />
          <div className="absolute inset-0">
            <div className="absolute top-1/4 left-1/3 w-80 h-80 bg-primary/5 rounded-full blur-[100px]" />
            <div className="absolute bottom-1/4 right-1/4 w-60 h-60 bg-cyan-500/5 rounded-full blur-[80px]" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] border border-primary/5 rounded-full" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] border border-primary/3 rounded-full" style={{ animation: "border-glow-pulse 4s ease-in-out infinite" }} />
          </div>

          <div className="relative z-10 text-center px-4 max-w-3xl mx-auto">
            <p
              className="text-[9px] sm:text-[10px] tracking-[0.5em] text-primary/30 uppercase font-mono mb-6 sm:mb-8"
              style={{ animation: "subtitle-slide 1s ease-out 0.3s both" }}
              data-testid="text-tour-subtitle"
            >
              <TypingText text={C.page1_title.subtitle} />
            </p>

            <h1
              className="text-5xl sm:text-7xl lg:text-9xl font-bold mb-4 sm:mb-6"
              style={{ animation: "title-reveal 2s ease-out both" }}
              data-testid="text-tour-title"
            >
              <GlitchText text={C.page1_title.main} />
            </h1>

            <div
              className="text-sm sm:text-base lg:text-lg text-primary/70 font-mono mb-10 sm:mb-14 tracking-wider leading-[1.8]"
              style={{ animation: "subtitle-slide 1s ease-out 1.5s both" }}
            >
              {C.page1_title.tagline.split("\n").map((line, i) => (
                <span key={i}>
                  {i > 0 && <br />}
                  {line}
                </span>
              ))}
            </div>

            <div
              className="flex justify-center gap-3 sm:gap-5 mb-6 sm:mb-8"
              style={{ animation: "subtitle-slide 1s ease-out 2s both" }}
            >
              {[
                { label: "HS", color: "border-primary/50 text-primary", glow: "shadow-[0_0_8px_hsl(150_70%_50%/0.3)]" },
                { label: "AI", color: "border-blue-400/50 text-blue-400", glow: "shadow-[0_0_8px_hsl(210_90%_55%/0.3)]" },
                { label: "ET", color: "border-violet-400/50 text-violet-400", glow: "shadow-[0_0_8px_hsl(270_70%_60%/0.3)]" },
              ].map((b) => (
                <span key={b.label} className={`px-4 sm:px-5 py-1.5 rounded-full border ${b.color} ${b.glow} text-[10px] sm:text-xs font-mono`} data-testid={`tour-badge-${b.label.toLowerCase()}`}>
                  {b.label}
                </span>
              ))}
            </div>

            <p
              className="text-[9px] sm:text-[10px] text-primary/30 font-mono tracking-[0.3em]"
              style={{ animation: "subtitle-slide 1s ease-out 2.3s both" }}
            >
              {C.page1_title.footer}
            </p>
          </div>
          <ScrollHint />
          <PageNumber num={1} total={totalPages} />
        </section>

        {/* ═══════ PAGE 2: What is D-Planet ═══════ */}
        <section className="tour-page bg-background" data-page-index={1} data-testid="tour-page-what">
          <div className="tour-scanline" />
          <Particles count={8} color="180 70% 50%" />
          <div className="absolute inset-0">
            <div className="absolute top-0 left-0 right-0 tour-glow-line" />
            <div className="absolute bottom-0 left-0 right-0 tour-glow-line" />
          </div>

          <div className="relative z-10 px-6 sm:px-8 max-w-2xl mx-auto flex flex-col justify-center">
            <p className="tour-fade-in text-[10px] font-mono text-primary/40 tracking-[0.4em] uppercase mb-6 sm:mb-10" data-testid="text-what-label">
              {C.page2_what.label}
            </p>

            <h2 className="tour-fade-in text-lg sm:text-2xl lg:text-3xl font-bold text-foreground leading-[1.6] sm:leading-[1.7] mb-6 sm:mb-8">
              {C.page2_what.heading_1}
              <br />
              {C.page2_what.heading_2}
              <br />
              <span className="text-primary terminal-glow">{C.page2_what.heading_highlight}</span>
            </h2>

            <div className="tour-fade-in border-l-2 border-primary/30 pl-4 sm:pl-5 space-y-3 sm:space-y-4">
              {C.page2_what.points.map((p, i) => (
                <p key={i} className="text-xs sm:text-sm text-muted-foreground font-mono leading-relaxed">{p}</p>
              ))}
            </div>
          </div>
          <PageNumber num={2} total={totalPages} />
        </section>

        {/* ═══════ PAGE 3: How to Play ═══════ */}
        <section className="tour-page bg-background" data-page-index={2} data-testid="tour-page-play">
          <div className="tour-scanline" />
          <Particles count={6} color="180 70% 50%" />

          <div className="relative z-10 px-4 sm:px-8 max-w-3xl mx-auto w-full flex flex-col justify-center h-full py-10 sm:py-16">
            <p className="tour-fade-in text-[10px] font-mono text-primary/40 tracking-[0.4em] uppercase mb-2 sm:mb-5" data-testid="text-play-label">
              {C.page3_play.label}
            </p>

            <h2 className="tour-fade-in text-base sm:text-2xl font-bold text-foreground mb-3 sm:mb-7">
              {C.page3_play.heading}
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-3 tour-stagger">
              {C.page3_play.features.map((f, i) => {
                const Icon = featureIcons[i];
                return (
                  <TiltCard
                    key={f.sub}
                    className="tour-fade-in tour-glass-card group rounded-lg p-2 sm:p-3 hover:border-primary/30 hover:bg-primary/[0.02]"
                    data-testid={`tour-feature-${i}`}
                  >
                    <div className="flex items-center gap-1.5 mb-1 sm:mb-2">
                      <div className="shrink-0 w-5 h-5 sm:w-7 sm:h-7 rounded bg-primary/5 border border-primary/20 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                        <Icon className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 text-primary" />
                      </div>
                      <h3 className="font-bold text-foreground text-[10px] sm:text-xs leading-tight">{f.title}</h3>
                    </div>
                    <p className="text-[7px] sm:text-[8px] text-primary/30 font-mono tracking-wider">{f.sub}</p>
                    <p className="text-[8px] sm:text-[10px] text-muted-foreground leading-[1.5] mt-0.5">{f.desc}</p>
                  </TiltCard>
                );
              })}
            </div>
          </div>
          <PageNumber num={3} total={totalPages} />
        </section>

        {/* ═══════ PAGE 4: Family ═══════ */}
        <section className="tour-page bg-background" data-page-index={3} data-testid="tour-page-family">
          <div className="tour-scanline" />
          <Particles count={10} color="150 70% 50%" />
          <div className="absolute inset-0">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-primary/3 rounded-full blur-[120px]" />
          </div>

          <div className="relative z-10 px-6 sm:px-8 max-w-xl mx-auto text-center flex flex-col justify-center h-full py-14 sm:py-16">
            <p className="tour-fade-in text-[10px] font-mono text-primary/40 tracking-[0.4em] uppercase mb-4 sm:mb-6" data-testid="text-family-label">
              {C.page4_family.label}
            </p>

            <h2 className="tour-fade-in text-lg sm:text-2xl font-bold text-foreground mb-2 sm:mb-3 leading-relaxed">
              {C.page4_family.heading_1}
              <br />
              <span className="text-primary terminal-glow">{C.page4_family.heading_highlight}</span>
            </h2>

            <p className="tour-fade-in text-[11px] sm:text-sm text-muted-foreground font-mono leading-[1.8] mb-5 sm:mb-6">
              {C.page4_family.body}
              <br />
              <span className="text-foreground font-medium">{C.page4_family.body_highlight}</span>
            </p>

            <div className="tour-fade-in tour-glass-card rounded-lg p-4 space-y-3 text-left mb-5 sm:mb-6" style={{ animation: "border-glow-pulse 4s ease-in-out infinite" }}>
              <div className="flex items-center gap-3">
                <span className="text-lg">🎮</span>
                <div>
                  <p className="text-[9px] font-mono text-primary/60 tracking-wider">{C.page4_family.mission_label}</p>
                  <p className="text-sm sm:text-base font-bold text-foreground">{C.page4_family.mission}</p>
                </div>
              </div>
              <div className="border-t border-primary/10 pt-2.5 space-y-1">
                {C.page4_family.philosophy.map((line, i) => (
                  <p key={i} className="text-[9px] sm:text-[10px] text-muted-foreground font-mono leading-[1.7]">{line}</p>
                ))}
              </div>
            </div>

            <div className="tour-fade-in grid grid-cols-2 gap-2.5 text-left">
              <div className="tour-glass-card rounded-lg p-3">
                <p className="text-[9px] font-mono text-primary/40 tracking-wider mb-0.5">{C.page4_family.free_label}</p>
                <p className="text-base sm:text-lg font-bold text-primary font-mono">{C.page4_family.free_price}</p>
                <p className="text-[9px] text-muted-foreground font-mono mt-0.5">{C.page4_family.free_desc}</p>
              </div>
              <div className="relative tour-glass-card rounded-lg p-3" style={{ borderColor: "hsl(150 70% 50% / 0.3)", animation: "border-glow-pulse 4s ease-in-out infinite" }}>
                <div className="tour-badge-recommended" data-testid="badge-recommended">RECOMMEND</div>
                <p className="text-[9px] font-mono text-primary/40 tracking-wider mb-0.5">{C.page4_family.credit_label}</p>
                <p className="text-base sm:text-lg font-bold font-mono tour-gradient-text">{C.page4_family.credit_price}</p>
                <p className="text-[9px] text-muted-foreground font-mono mt-0.5">{C.page4_family.credit_desc}</p>
              </div>
            </div>
          </div>
          <PageNumber num={4} total={totalPages} />
        </section>

        {/* ═══════ PAGE 5: Enter ═══════ */}
        <section className="tour-page bg-background" data-page-index={4} data-testid="tour-page-enter">
          <div className="tour-scanline" />
          <Particles count={25} />
          <div className="absolute inset-0">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/3 rounded-full blur-[150px]" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] border border-primary/5 rounded-full" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[250px] h-[250px] border border-primary/8 rounded-full" style={{ animation: "border-glow-pulse 3s ease-in-out infinite" }} />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[100px] h-[100px] border border-primary/10 rounded-full" style={{ animation: "border-glow-pulse 3s ease-in-out 1.5s infinite" }} />
          </div>

          <div className="relative z-10 text-center px-6 max-w-2xl mx-auto">
            <div className="tour-fade-in text-4xl sm:text-5xl text-primary terminal-glow mb-6 sm:mb-8" style={{ animation: "border-glow-pulse 2s ease-in-out infinite" }}>
              ✦
            </div>

            <h2 className="tour-fade-in text-lg sm:text-2xl lg:text-3xl font-bold text-foreground mb-3 sm:mb-4 leading-[1.6] sm:leading-[1.7]">
              {C.page5_enter.heading_1}
              <br />
              <span className="text-primary terminal-glow">{C.page5_enter.heading_highlight}</span>
              <br />
              {C.page5_enter.heading_2}
            </h2>

            <p className="tour-fade-in text-xs sm:text-sm text-muted-foreground font-mono mb-8 sm:mb-10 tracking-wider">
              {C.page5_enter.tagline}
            </p>

            <div className="tour-fade-in flex flex-col items-center gap-4">
              <Link href="/whitepaper">
                <Button
                  className="tour-cta-pulse bg-primary text-primary-foreground px-8 sm:px-12 py-5 sm:py-6 text-sm sm:text-base font-mono hover:scale-105 transition-transform duration-300"
                  data-testid="button-tour-whitepaper"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  {C.page5_enter.cta}
                </Button>
              </Link>

              <Link href="/login">
                <span className="inline-flex items-center gap-1.5 text-xs text-primary/60 font-mono hover:text-primary transition-colors cursor-pointer" data-testid="link-tour-login">
                  LOGIN
                  <ArrowRight className="w-3 h-3" />
                </span>
              </Link>
            </div>

            <p className="text-[10px] text-primary/40 font-mono mt-8 tracking-[0.2em]">
              {C.page5_enter.invite_notice}
            </p>
          </div>

          <footer className="absolute bottom-0 left-0 right-0 border-t border-border/30 py-4 z-10">
            <div className="container mx-auto px-4 flex items-center justify-between text-[10px] font-mono text-primary/30">
              <span>D-PLANET © 2026</span>
              <div className="flex items-center gap-4">
                <Link href="/about" className="hover:text-primary transition-colors" data-testid="link-tour-about">ABOUT</Link>
                <Link href="/legal" className="hover:text-primary transition-colors" data-testid="link-tour-legal">LEGAL</Link>
                <Link href="/privacy" className="hover:text-primary transition-colors" data-testid="link-tour-privacy">PRIVACY</Link>
              </div>
            </div>
          </footer>
          <PageNumber num={5} total={totalPages} />
        </section>
      </div>
    </div>
  );
}
