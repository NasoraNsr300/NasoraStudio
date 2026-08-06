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
  angle: number;
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
    let isNightTheme = true;
    let shootingStarTimer: ReturnType<typeof setTimeout> | null = null;

    const checkTheme = () => {
      const theme = document.documentElement.getAttribute("data-theme");
      // Night is active when theme is "night" or not explicitly set (default is night)
      isNightTheme = !theme || theme === "night";
    };

    const checkReducedMotion = () => {
      isReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
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
      const colors = STAR_COLORS_NIGHT;
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
      if (isReducedMotion || !isNightTheme) return;
      const colors = STAR_COLORS_NIGHT;
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
      if (isReducedMotion || !isNightTheme || document.hidden) return;

      const shootingStarColors = ["#f6c85f", "#c4b5fd", "#38bdf8", "#f472b6", "#ffffff"];
      const count = Math.random() > 0.45 ? (Math.random() > 0.5 ? 3 : 2) : 1;

      for (let i = 0; i < count; i++) {
        // Spawn strictly OUTSIDE the visible viewport (off-screen top or left)
        const spawnFromTop = Math.random() > 0.4;
        let startX: number;
        let startY: number;

        if (spawnFromTop) {
          // Spawn above the top edge of the screen
          startX = Math.random() * (width * 0.85) - 50;
          startY = -60 - Math.random() * 60;
        } else {
          // Spawn to the left of the left edge of the screen
          startX = -60 - Math.random() * 60;
          startY = Math.random() * (height * 0.6) - 30;
        }

        const angle = Math.PI / 4 + (Math.random() - 0.5) * 0.25;
        const speed = Math.random() * 2.4 + 1.8;
        const color = shootingStarColors[Math.floor(Math.random() * shootingStarColors.length)];

        shootingStars.push({
          x: startX + i * 20,
          y: startY + i * 20,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          angle,
          length: Math.random() * 260 + 150,
          color,
          alpha: 1.0,
        });
      }
    };

    const scheduleShootingStar = () => {
      // Trigger very frequently (every 0.8 to 2.2 seconds)
      const delay = Math.random() * 1400 + 800;
      shootingStarTimer = setTimeout(() => {
        triggerShootingStar();
        scheduleShootingStar();
      }, delay);
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isNightTheme) return;
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

      if (!isNightTheme) {
        return;
      }

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
        // Slow alpha fade so meteor glides smoothly across screen
        ss.alpha -= 0.0025;

        if (ss.x > width + 200 || ss.y > height + 200 || ss.alpha <= 0) {
          shootingStars.splice(i, 1);
          continue;
        }

        const tailX = ss.x - Math.cos(ss.angle) * ss.length;
        const tailY = ss.y - Math.sin(ss.angle) * ss.length;

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

      if (!isReducedMotion && isNightTheme) {
        animationFrameId = requestAnimationFrame(render);
      }
    };

    checkReducedMotion();
    checkTheme();
    initCanvasSize();
    scheduleShootingStar();
    render();

    // Listen for theme attribute changes on <html>
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === "attributes" && mutation.attributeName === "data-theme") {
          const wasNight = isNightTheme;
          checkTheme();
          if (!wasNight && isNightTheme) {
            cancelAnimationFrame(animationFrameId);
            render();
          } else if (!isNightTheme) {
            cancelAnimationFrame(animationFrameId);
            ctx.clearRect(0, 0, width, height);
          }
        }
      });
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    const handleResize = () => {
      initCanvasSize();
      if (isNightTheme) {
        render();
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        cancelAnimationFrame(animationFrameId);
      } else if (!isReducedMotion && isNightTheme) {
        render();
      }
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      cancelAnimationFrame(animationFrameId);
      if (shootingStarTimer) clearTimeout(shootingStarTimer);
      observer.disconnect();
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
