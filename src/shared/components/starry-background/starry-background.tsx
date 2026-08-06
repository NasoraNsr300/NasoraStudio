"use client";

import { useEffect, useRef } from "react";
import styles from "./starry-background.module.css";

interface Star {
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  radius: number;
  color: string;
  alpha: number;
  twinkleSpeed: number;
  layer: number;
  glow: boolean;
}

interface StardustParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
}

interface ShootingStar {
  x: number;
  y: number;
  vx: number;
  vy: number;
  length: number;
  color: string;
  alpha: number;
}

const STAR_COLORS_NIGHT = [
  "#ffffff",
  "#e0f2fe",
  "#bae6fd",
  "#c4b5fd",
  "#f6c85f",
  "#e9d5ff",
];

const STAR_COLORS_AUTUMN = [
  "#ffffff",
  "#fef08a",
  "#fde047",
  "#e9a23b",
  "#c65d32",
  "#fecdd3",
];

export function StarryBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let animationFrameId: number;
    let width = 0;
    let height = 0;
    let dpr = 1;

    let stars: Star[] = [];
    let stardust: StardustParticle[] = [];
    let shootingStars: ShootingStar[] = [];

    let mouseX = -1000;
    let mouseY = -1000;
    let lastMouseX = -1000;
    let lastMouseY = -1000;

    let isReducedMotion = false;
    let shootingStarTimer: ReturnType<typeof setTimeout> | null = null;

    const checkReducedMotion = () => {
      isReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    };

    const getStarColors = () => {
      const theme = document.documentElement.getAttribute("data-theme");
      return theme === "autumn" ? STAR_COLORS_AUTUMN : STAR_COLORS_NIGHT;
    };

    const initCanvasSize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;

      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      ctx.scale(dpr, dpr);
      generateStars();
    };

    const generateStars = () => {
      stars = [];
      const colors = getStarColors();
      const count = Math.floor(Math.min((width * height) / 2800, 500));

      for (let i = 0; i < count; i++) {
        const x = Math.random() * width;
        const y = Math.random() * height;
        stars.push({
          x,
          y,
          baseX: x,
          baseY: y,
          radius: Math.random() * 1.6 + 0.4,
          color: colors[Math.floor(Math.random() * colors.length)],
          alpha: Math.random() * 0.7 + 0.3,
          twinkleSpeed: (Math.random() * 0.015 + 0.005) * (Math.random() > 0.5 ? 1 : -1),
          layer: Math.random() * 2 + 1,
          glow: Math.random() > 0.82,
        });
      }
    };

    const addStardust = (x: number, y: number, intensity: number) => {
      if (isReducedMotion) return;
      const colors = getStarColors();
      const count = Math.min(Math.floor(intensity / 2) + 1, 6);

      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 1.2 + 0.4;
        const life = Math.random() * 30 + 20;
        stardust.push({
          x: x + (Math.random() - 0.5) * 8,
          y: y + (Math.random() - 0.5) * 8,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 0.3,
          radius: Math.random() * 1.8 + 0.6,
          color: colors[Math.floor(Math.random() * colors.length)],
          alpha: 0.9,
          life,
          maxLife: life,
        });
      }

      if (stardust.length > 120) {
        stardust.splice(0, stardust.length - 120);
      }
    };

    const triggerShootingStar = () => {
      if (isReducedMotion || document.hidden) return;
      const startX = Math.random() * (width * 0.75);
      const startY = Math.random() * (height * 0.35);
      const angle = Math.PI / 4 + (Math.random() - 0.5) * 0.2;
      const speed = Math.random() * 10 + 8;

      shootingStars.push({
        x: startX,
        y: startY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        length: Math.random() * 140 + 90,
        color: Math.random() > 0.5 ? "#f6c85f" : "#c4b5fd",
        alpha: 1.0,
      });
    };

    const scheduleShootingStar = () => {
      const delay = Math.random() * 7000 + 4000;
      shootingStarTimer = setTimeout(() => {
        triggerShootingStar();
        scheduleShootingStar();
      }, delay);
    };

    const handleMouseMove = (e: MouseEvent) => {
      lastMouseX = mouseX;
      lastMouseY = mouseY;
      mouseX = e.clientX;
      mouseY = e.clientY;

      if (lastMouseX !== -1000) {
        const dist = Math.hypot(mouseX - lastMouseX, mouseY - lastMouseY);
        if (dist > 3) {
          addStardust(mouseX, mouseY, dist);
        }
      }
    };

    const drawSparkle = (x: number, y: number, radius: number, color: string, alpha: number) => {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      const size = radius * 2.5;

      ctx.beginPath();
      ctx.moveTo(x - size, y);
      ctx.lineTo(x + size, y);
      ctx.moveTo(x, y - size);
      ctx.lineTo(x, y + size);
      ctx.stroke();
      ctx.restore();
    };

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Render Stars
      stars.forEach((star) => {
        if (!isReducedMotion) {
          star.alpha += star.twinkleSpeed;
          if (star.alpha > 0.95 || star.alpha < 0.2) {
            star.twinkleSpeed = -star.twinkleSpeed;
          }

          // Parallax push from cursor
          if (mouseX !== -1000) {
            const dx = mouseX - star.x;
            const dy = mouseY - star.y;
            const dist = Math.hypot(dx, dy);
            const maxDist = 120 * star.layer;
            if (dist < maxDist) {
              const force = (maxDist - dist) / maxDist;
              const angle = Math.atan2(dy, dx);
              star.x -= Math.cos(angle) * force * 1.5;
              star.y -= Math.sin(angle) * force * 1.5;
            } else {
              star.x += (star.baseX - star.x) * 0.04;
              star.y += (star.baseY - star.y) * 0.04;
            }
          }
        }

        ctx.save();
        ctx.globalAlpha = Math.max(0.1, Math.min(1, star.alpha));
        ctx.fillStyle = star.color;

        if (star.glow) {
          ctx.shadowBlur = star.radius * 5;
          ctx.shadowColor = star.color;
        }

        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        ctx.fill();

        if (star.glow && star.radius > 1.2 && !isReducedMotion) {
          drawSparkle(star.x, star.y, star.radius, star.color, star.alpha * 0.7);
        }

        ctx.restore();
      });

      // Render Stardust particles
      for (let i = stardust.length - 1; i >= 0; i--) {
        const p = stardust[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 1;
        p.alpha = Math.max(0, p.life / p.maxLife);

        if (p.life <= 0) {
          stardust.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.shadowBlur = 6;
        ctx.shadowColor = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * p.alpha, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Render Shooting Stars
      for (let i = shootingStars.length - 1; i >= 0; i--) {
        const ss = shootingStars[i];
        ss.x += ss.vx;
        ss.y += ss.vy;
        ss.alpha -= 0.015;

        if (ss.x > width + 100 || ss.y > height + 100 || ss.alpha <= 0) {
          shootingStars.splice(i, 1);
          continue;
        }

        const tailX = ss.x - (ss.vx / 8) * ss.length;
        const tailY = ss.y - (ss.vy / 8) * ss.length;

        ctx.save();
        ctx.globalAlpha = ss.alpha;
        const grad = ctx.createLinearGradient(ss.x, ss.y, tailX, tailY);
        grad.addColorStop(0, "#ffffff");
        grad.addColorStop(0.4, ss.color);
        grad.addColorStop(1, "transparent");

        ctx.strokeStyle = grad;
        ctx.lineWidth = 2;
        ctx.shadowBlur = 12;
        ctx.shadowColor = ss.color;
        ctx.beginPath();
        ctx.moveTo(ss.x, ss.y);
        ctx.lineTo(tailX, tailY);
        ctx.stroke();

        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(ss.x, ss.y, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      if (!isReducedMotion) {
        animationFrameId = requestAnimationFrame(render);
      }
    };

    checkReducedMotion();
    initCanvasSize();
    scheduleShootingStar();
    render();

    const handleResize = () => {
      initCanvasSize();
      render();
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        cancelAnimationFrame(animationFrameId);
      } else if (!isReducedMotion) {
        render();
      }
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      cancelAnimationFrame(animationFrameId);
      if (shootingStarTimer) clearTimeout(shootingStarTimer);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  return (
    <div aria-hidden="true" className={styles.container}>
      <canvas ref={canvasRef} className={styles.canvas} />
      <div className={styles.vignette} />
      <div className={styles.atmosphereGlow} />
    </div>
  );
}
