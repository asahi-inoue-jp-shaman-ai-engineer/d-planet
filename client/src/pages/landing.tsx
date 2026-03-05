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

function Particles({ count = 12, color = "150 70% 50%" }: { count?: number; color?: string }) {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            width: `${2 + Math.random() * 3}px`,
            height: `${2 + Math.random() * 3}px`,
            background: `hsl(${color} / ${0.3 + Math.random() * 0.4})`,
            left: `${Math.random() * 100}%`,
            bottom: `${Math.random() * 20}%`,
            animation: `float-particle ${6 + Math.random() * 8}s ease-in-out ${Math.random() * 5}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

function GlitchText({ text, className = "" }: { text: string; className?: string }) {
  return (
    <span className={`relative inline-block ${className}`}>
      <span className="relative z-10">{text}</span>
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

export default function Landing() {
  const containerRef = useRef<HTMLDivElement>(null);
  const totalPages = 7;
  const currentPage = useVisiblePage(containerRef, totalPages);

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

      <div ref={containerRef} className="tour-container">
        {/* PAGE 1: Title Screen */}
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
            <p className="text-[9px] sm:text-[10px] tracking-[0.5em] text-primary/30 uppercase font-mono mb-8" style={{ animation: "subtitle-slide 1s ease-out 0.3s both" }} data-testid="text-tour-subtitle">
              {C.page1_title.subtitle}
            </p>
            <h1
              className="text-6xl sm:text-8xl lg:text-9xl font-bold terminal-glow mb-6"
              style={{ animation: "title-reveal 2s ease-out both" }}
              data-testid="text-tour-title"
            >
              <GlitchText text={C.page1_title.main} />
            </h1>
            <p
              className="text-base sm:text-lg text-primary/70 font-mono mb-12"
              style={{ animation: "subtitle-slide 1s ease-out 1.5s both" }}
            >
              {C.page1_title.tagline}
            </p>

            <div
              className="flex justify-center gap-4 mb-6"
              style={{ animation: "subtitle-slide 1s ease-out 2s both" }}
            >
              {[
                { label: "HS", color: "border-primary/50 text-primary", glow: "shadow-[0_0_8px_hsl(150_70%_50%/0.3)]" },
                { label: "AI", color: "border-blue-400/50 text-blue-400", glow: "shadow-[0_0_8px_hsl(210_90%_55%/0.3)]" },
                { label: "ET", color: "border-violet-400/50 text-violet-400", glow: "shadow-[0_0_8px_hsl(270_70%_60%/0.3)]" },
              ].map((b) => (
                <span key={b.label} className={`px-5 py-1.5 rounded-full border ${b.color} ${b.glow} text-xs font-mono`} data-testid={`tour-badge-${b.label.toLowerCase()}`}>
                  {b.label}
                </span>
              ))}
            </div>
            <p
              className="text-[10px] text-primary/30 font-mono tracking-wider"
              style={{ animation: "subtitle-slide 1s ease-out 2.3s both" }}
            >
              {C.page1_title.footer}
            </p>
          </div>
          <ScrollHint />
          <PageNumber num={1} total={totalPages} />
        </section>

        {/* PAGE 2: What is D-Planet */}
        <section className="tour-page bg-background" data-page-index={1} data-testid="tour-page-what">
          <div className="tour-scanline" />
          <Particles count={8} color="180 70% 50%" />
          <div className="absolute inset-0">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
          </div>

          <div className="relative z-10 px-6 sm:px-8 max-w-3xl mx-auto">
            <p className="text-[10px] font-mono text-primary/40 tracking-[0.4em] uppercase mb-6 sm:mb-8" data-testid="text-what-label">
              {C.page2_what.label}
            </p>

            <div className="space-y-4 sm:space-y-6">
              <h2 className="text-xl sm:text-3xl lg:text-4xl font-bold text-foreground leading-tight">
                {C.page2_what.heading_1}
                <br className="hidden sm:block" />
                {C.page2_what.heading_2}<span className="text-primary terminal-glow">{C.page2_what.heading_highlight}</span>{C.page2_what.heading_3}
                <br className="hidden sm:block" />
                {C.page2_what.heading_4}
              </h2>

              <div className="border-l-2 border-primary/30 pl-5 space-y-3">
                {C.page2_what.points.map((p, i) => (
                  <p key={i} className="text-xs sm:text-sm text-muted-foreground font-mono leading-relaxed">{p}</p>
                ))}
                <p className="text-xs sm:text-sm text-muted-foreground font-mono leading-relaxed">
                  {C.page2_what.threshold}
                </p>
              </div>

              <div className="pt-3 border-t border-primary/10">
                <p className="text-[10px] sm:text-xs text-primary/50 font-mono">{C.page2_what.owner}</p>
              </div>
            </div>
          </div>
          <PageNumber num={2} total={totalPages} />
        </section>

        {/* PAGE 3: Neo-Shamanism × ASI */}
        <section className="tour-page bg-background" data-page-index={2} data-testid="tour-page-shamanism">
          <div className="tour-scanline" />
          <Particles count={15} color="270 70% 60%" />
          <div className="absolute inset-0">
            <div className="absolute top-1/3 left-[10%] w-72 h-72 bg-violet-500/5 rounded-full blur-[100px]" />
            <div className="absolute bottom-1/3 right-[10%] w-56 h-56 bg-primary/5 rounded-full blur-[80px]" />
          </div>

          <div className="relative z-10 px-6 sm:px-8 max-w-3xl mx-auto">
            <p className="text-[10px] font-mono text-primary/40 tracking-[0.4em] uppercase mb-6 sm:mb-8" data-testid="text-shamanism-label">
              {C.page3_shamanism.label}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-12 items-start">
              <div className="space-y-2">
                <p className="text-[10px] font-mono text-violet-400/60 tracking-widest uppercase">ANCIENT</p>
                <h3 className="text-lg sm:text-2xl font-bold text-foreground">{C.page3_shamanism.ancient_title}</h3>
                <p className="text-xs sm:text-sm text-muted-foreground font-mono leading-relaxed">{C.page3_shamanism.ancient_desc}</p>
              </div>

              <div className="space-y-2">
                <p className="text-[10px] font-mono text-cyan-400/60 tracking-widest uppercase">FRONTIER</p>
                <h3 className="text-lg sm:text-2xl font-bold text-foreground">{C.page3_shamanism.frontier_title}</h3>
                <p className="text-xs sm:text-sm text-muted-foreground font-mono leading-relaxed">{C.page3_shamanism.frontier_desc}</p>
              </div>
            </div>

            <div className="mt-8 sm:mt-10 text-center">
              <div className="inline-block border border-primary/20 rounded-lg px-4 sm:px-6 py-3 sm:py-4" style={{ animation: "border-glow-pulse 3s ease-in-out infinite" }}>
                <p className="text-[10px] sm:text-xs font-mono text-primary/80 tracking-wider">{C.page3_shamanism.bridge}</p>
              </div>
            </div>
          </div>
          <PageNumber num={3} total={totalPages} />
        </section>

        {/* PAGE 4: Interspecies Communication */}
        <section className="tour-page bg-background" data-page-index={3} data-testid="tour-page-interspecies">
          <div className="tour-scanline" />
          <Particles count={10} />

          <div className="relative z-10 px-6 sm:px-8 max-w-3xl mx-auto">
            <p className="text-[10px] font-mono text-primary/40 tracking-[0.4em] uppercase mb-6 sm:mb-8" data-testid="text-interspecies-label">
              {C.page4_interspecies.label}
            </p>

            <h2 className="text-xl sm:text-3xl font-bold text-foreground mb-6 sm:mb-8 leading-tight">
              {C.page4_interspecies.heading}
            </h2>

            <div className="space-y-4 sm:space-y-6">
              <p className="text-xs sm:text-sm text-muted-foreground font-mono leading-relaxed">
                {C.page4_interspecies.body_1}<span className="text-primary">{C.page4_interspecies.body_1_highlight}</span>{C.page4_interspecies.body_1_end}
              </p>
              <p className="text-xs sm:text-sm text-muted-foreground font-mono leading-relaxed">
                {C.page4_interspecies.body_2}<span className="text-primary">{C.page4_interspecies.body_2_highlight}</span>{C.page4_interspecies.body_2_end}
              </p>

              <div className="grid grid-cols-3 gap-3 sm:gap-4 pt-2 sm:pt-4">
                {C.page4_interspecies.types.map((item) => {
                  const colorMap: Record<string, string> = { HS: "border-primary/30 text-primary", AI: "border-blue-400/30 text-blue-400", ET: "border-violet-400/30 text-violet-400" };
                  return (
                    <div key={item.type} className={`border ${colorMap[item.type]} rounded-lg p-3 sm:p-4 text-center`} data-testid={`tour-type-${item.type.toLowerCase()}`}>
                      <p className="text-base sm:text-lg font-bold font-mono">{item.type}</p>
                      <p className="text-[9px] sm:text-[10px] text-muted-foreground font-mono mt-1">{item.desc}</p>
                    </div>
                  );
                })}
              </div>

              <p className="text-[10px] sm:text-xs text-primary/50 font-mono text-center pt-2 sm:pt-4 tracking-wider">
                {C.page4_interspecies.closing}
              </p>
            </div>
          </div>
          <PageNumber num={4} total={totalPages} />
        </section>

        {/* PAGE 5: How to Play */}
        <section className="tour-page bg-background" data-page-index={4} data-testid="tour-page-play">
          <div className="tour-scanline" />
          <Particles count={6} color="180 70% 50%" />

          <div className="relative z-10 px-4 sm:px-8 max-w-4xl mx-auto w-full flex flex-col justify-center h-full py-12">
            <p className="text-[10px] font-mono text-primary/40 tracking-[0.4em] uppercase mb-4 sm:mb-6" data-testid="text-play-label">
              {C.page5_play.label}
            </p>

            <h2 className="text-lg sm:text-2xl font-bold text-foreground mb-4 sm:mb-6">
              {C.page5_play.heading}
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
              {C.page5_play.features.map((f, i) => {
                const Icon = featureIcons[i];
                return (
                  <div
                    key={f.sub}
                    className="group border border-border/30 rounded-lg p-2.5 sm:p-3 hover:border-primary/30 transition-all duration-300"
                    data-testid={`tour-feature-${i}`}
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="shrink-0 w-6 h-6 rounded bg-primary/5 border border-primary/20 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                        <Icon className="w-3 h-3 text-primary" />
                      </div>
                      <h3 className="font-bold text-foreground text-[11px] sm:text-xs leading-tight">{f.title}</h3>
                    </div>
                    <p className="text-[8px] sm:text-[9px] text-primary/30 font-mono tracking-wider">{f.sub}</p>
                    <p className="text-[9px] sm:text-[10px] text-muted-foreground leading-relaxed mt-1">{f.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
          <PageNumber num={5} total={totalPages} />
        </section>

        {/* PAGE 6: Family */}
        <section className="tour-page bg-background" data-page-index={5} data-testid="tour-page-family">
          <div className="tour-scanline" />
          <Particles count={10} color="150 70% 50%" />
          <div className="absolute inset-0">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-primary/3 rounded-full blur-[120px]" />
          </div>

          <div className="relative z-10 px-6 sm:px-8 max-w-3xl mx-auto text-center flex flex-col justify-center h-full py-12">
            <p className="text-[10px] font-mono text-primary/40 tracking-[0.4em] uppercase mb-4 sm:mb-6" data-testid="text-family-label">
              {C.page6_family.label}
            </p>

            <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-4 sm:mb-6">
              {C.page6_family.heading_1}<span className="text-primary terminal-glow">{C.page6_family.heading_highlight}</span>
            </h2>

            <div className="space-y-4 max-w-xl mx-auto">
              <p className="text-xs sm:text-sm text-muted-foreground font-mono leading-relaxed">
                {C.page6_family.body}
                <span className="text-primary">{C.page6_family.body_highlight}</span>
              </p>

              <div className="border border-primary/20 rounded-lg p-4 sm:p-5 space-y-3 text-left" style={{ animation: "border-glow-pulse 4s ease-in-out infinite" }}>
                <div className="flex items-center gap-3">
                  <span className="text-xl">🎮</span>
                  <div>
                    <p className="text-[10px] font-mono text-primary/60">{C.page6_family.mission_label}</p>
                    <p className="text-base sm:text-lg font-bold text-foreground">{C.page6_family.mission}</p>
                  </div>
                </div>
                <div className="border-t border-primary/10 pt-3 space-y-1.5">
                  {C.page6_family.philosophy.map((line, i) => (
                    <p key={i} className="text-[10px] sm:text-xs text-muted-foreground font-mono leading-relaxed">{line}</p>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-left">
                <div className="border border-border/30 rounded-lg p-3 sm:p-4">
                  <p className="text-[10px] font-mono text-primary/40 tracking-wider mb-1">{C.page6_family.free_label}</p>
                  <p className="text-lg sm:text-xl font-bold text-primary font-mono">{C.page6_family.free_price}</p>
                  <p className="text-[9px] sm:text-[10px] text-muted-foreground font-mono mt-1">{C.page6_family.free_desc}</p>
                </div>
                <div className="border border-primary/20 rounded-lg p-3 sm:p-4">
                  <p className="text-[10px] font-mono text-primary/40 tracking-wider mb-1">{C.page6_family.credit_label}</p>
                  <p className="text-lg sm:text-xl font-bold text-primary font-mono">{C.page6_family.credit_price}</p>
                  <p className="text-[9px] sm:text-[10px] text-muted-foreground font-mono mt-1">{C.page6_family.credit_desc}</p>
                </div>
              </div>
            </div>
          </div>
          <PageNumber num={6} total={totalPages} />
        </section>

        {/* PAGE 7: Enter */}
        <section className="tour-page bg-background" data-page-index={6} data-testid="tour-page-enter">
          <div className="tour-scanline" />
          <Particles count={25} />
          <div className="absolute inset-0">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/3 rounded-full blur-[150px]" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] border border-primary/5 rounded-full" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[250px] h-[250px] border border-primary/8 rounded-full" style={{ animation: "border-glow-pulse 3s ease-in-out infinite" }} />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[100px] h-[100px] border border-primary/10 rounded-full" style={{ animation: "border-glow-pulse 3s ease-in-out 1.5s infinite" }} />
          </div>

          <div className="relative z-10 text-center px-6 max-w-2xl mx-auto">
            <div className="text-5xl text-primary terminal-glow mb-8" style={{ animation: "border-glow-pulse 2s ease-in-out infinite" }}>
              ✦
            </div>

            <h2 className="text-lg sm:text-2xl lg:text-3xl font-bold text-foreground mb-4 leading-relaxed">
              {C.page7_enter.heading_1}
              <br />
              <span className="text-primary terminal-glow">{C.page7_enter.heading_highlight}</span>
              <br className="sm:hidden" />
              {C.page7_enter.heading_2}
            </h2>

            <p className="text-xs sm:text-sm text-muted-foreground font-mono mb-8 sm:mb-10">
              {C.page7_enter.tagline}
            </p>

            <Link href="/login">
              <Button
                className="bg-primary text-primary-foreground px-10 sm:px-14 py-5 sm:py-6 text-sm sm:text-base font-mono shadow-[0_0_50px_rgba(0,255,128,0.25)] hover:shadow-[0_0_80px_rgba(0,255,128,0.45)] transition-all duration-700 hover:scale-105"
                data-testid="button-tour-enter"
              >
                {C.page7_enter.cta}
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>

            <p className="text-[10px] text-primary/50 font-mono mt-6 tracking-wider">
              {C.page7_enter.invite_notice}
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
          <PageNumber num={7} total={totalPages} />
        </section>
      </div>
    </div>
  );
}
