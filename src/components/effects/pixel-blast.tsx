"use client";

import { useEffect, useRef } from "react";

type Particle = {
  x: number;
  y: number;
  s: number; // size
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
};

const YELLOW = "#facc15"; // Tailwind yellow-400

export function PixelBlastBackground({ density = 0.00045, speed = 0.35 }: { density?: number; speed?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext("2d", { alpha: true })!;

    let dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    let w = 0,
      h = 0;
    let particles: Particle[] = [];
    let raf = 0;

    const reset = () => {
      const doc = document.documentElement;
      const body = document.body;
      const cssW = Math.max(
        doc.clientWidth,
        doc.scrollWidth,
        body?.scrollWidth || 0,
        window.innerWidth,
      );
      const cssH = Math.max(
        doc.clientHeight,
        doc.scrollHeight,
        body?.scrollHeight || 0,
        window.innerHeight,
      );
      w = Math.floor(cssW * dpr);
      h = Math.floor(cssH * dpr);
      canvas.width = w;
      canvas.height = h;
      canvas.style.width = `${Math.floor(w / dpr)}px`;
      canvas.style.height = `${Math.floor(h / dpr)}px`;

      const count = Math.floor(w * h * density * (1 / dpr));
      particles = Array.from({ length: count }, () => spawn());
    };

    const spawn = (): Particle => {
      const centerX = w / 2;
      const centerY = h / 2;
      // start near the center, with slight randomness
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * (Math.min(w, h) * 0.05);
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;
      const s = Math.max(1, Math.floor(Math.random() * 4 + 2)) * dpr;
      const speedPx = (Math.random() * 0.6 + 0.4) * speed * dpr;
      const vx = Math.cos(angle) * speedPx;
      const vy = Math.sin(angle) * speedPx;
      const maxLife = Math.floor(200 + Math.random() * 200);
      return { x, y, s, vx, vy, life: 0, maxLife, color: YELLOW };
    };

    const step = () => {
      raf = requestAnimationFrame(step);
      ctx.clearRect(0, 0, w, h);
      ctx.globalAlpha = 0.12; // subtle but visible
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life++;

        // recycle if out of bounds or expired
        if (p.x < -20 || p.x > w + 20 || p.y < -20 || p.y > h + 20 || p.life > p.maxLife) {
          particles[i] = spawn();
          continue;
        }

        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, p.s, p.s);
      }
    };

    const onResize = () => {
      reset();
    };
    reset();
    step();
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, [density, speed]);

  return (
    <canvas
      ref={ref}
      aria-hidden
      className="fixed inset-0 z-0 pointer-events-none"
    />
  );
}
