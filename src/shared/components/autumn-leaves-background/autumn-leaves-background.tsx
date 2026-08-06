"use client";

import { useEffect, useRef } from "react";
import styles from "./autumn-leaves-background.module.css";

interface MapleLeaf {
  x: number;
  y: number;
  vx: number;
  vy: number;
  baseVy: number;
  size: number;
  color: string;
  rotation: number;
  rotationSpeed: number;
  flipAngle: number;
  flipSpeed: number;
  swingTimer: number;
  swingSpeed: number;
  swingAmplitude: number;
}

interface WindStreak {
  x: number;
  y: number;
  length: number;
  speed: number;
  alpha: number;
}

const LEAF_COLORS = [
  "#c65d32", // Rust red
  "#e9a23b", // Amber yellow
  "#991b1b", // Deep burgundy
  "#f59e0b", // Warm gold
  "#d97706", // Terracotta
  "#b45309", // Ochre brown
];

export function AutumnLeavesBackground() {
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

    let leaves: MapleLeaf[] = [];
    let windStreaks: WindStreak[] = [];

    let isReducedMotion = false;
    let isAutumnTheme = false;

    // Wind gust state
    let windForce = 0.2;
    let targetWindForce = 0.2;
    let gustTimer: ReturnType<typeof setTimeout> | null = null;

    const checkTheme = () => {
      const theme = document.documentElement.getAttribute("data-theme");
      isAutumnTheme = theme === "autumn";
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
      generateLeaves();
    };

    const createLeaf = (initialY?: number): MapleLeaf => {
      const size = Math.random() * 12 + 10;
      const baseVy = Math.random() * 0.8 + 0.6;
      return {
        x: Math.random() * (width + 200) - 100,
        y: initialY !== undefined ? initialY : -30 - Math.random() * 50,
        vx: (Math.random() - 0.2) * 0.5,
        vy: baseVy,
        baseVy,
        size,
        color: LEAF_COLORS[Math.floor(Math.random() * LEAF_COLORS.length)],
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.04,
        flipAngle: Math.random() * Math.PI * 2,
        flipSpeed: Math.random() * 0.05 + 0.02,
        swingTimer: Math.random() * Math.PI * 2,
        swingSpeed: Math.random() * 0.02 + 0.015,
        swingAmplitude: Math.random() * 1.5 + 0.8,
      };
    };

    const generateLeaves = () => {
      leaves = [];
      const count = Math.floor(Math.min((width * height) / 24000, 45));
      for (let i = 0; i < count; i++) {
        leaves.push(createLeaf(Math.random() * height));
      }
    };

    const triggerWindGust = () => {
      if (isReducedMotion || !isAutumnTheme || document.hidden) return;

      // Gentle breeze blowing softly from left to right
      targetWindForce = Math.random() * 0.9 + 0.5;

      // Add subtle visual breeze streaks
      const streakCount = Math.floor(Math.random() * 4) + 3;
      for (let i = 0; i < streakCount; i++) {
        windStreaks.push({
          x: -100 - Math.random() * 200,
          y: Math.random() * height,
          length: Math.random() * 160 + 100,
          speed: Math.random() * 3.5 + 2.0,
          alpha: Math.random() * 0.25 + 0.1,
        });
      }

      // Calm down breeze after 3.5 - 5 seconds
      setTimeout(() => {
        targetWindForce = 0.15;
      }, Math.random() * 1500 + 3500);
    };

    const scheduleWindGust = () => {
      // Wind comes infrequently (every 15 to 33 seconds)
      const delay = Math.random() * 18000 + 15000;
      gustTimer = setTimeout(() => {
        triggerWindGust();
        scheduleWindGust();
      }, delay);
    };

    const drawMapleLeafPath = (leafCtx: CanvasRenderingContext2D, size: number) => {
      const s = size / 2;
      leafCtx.beginPath();
      // Stem base
      leafCtx.moveTo(0, s * 0.8);
      leafCtx.lineTo(0, s * 1.2);
      leafCtx.moveTo(0, s * 0.8);

      // Central lobe top
      leafCtx.bezierCurveTo(-s * 0.3, s * 0.4, -s * 0.4, 0, -s * 0.3, -s * 0.5);
      leafCtx.lineTo(-s * 0.15, -s * 0.6);
      leafCtx.lineTo(0, -s * 1.1); // Tip
      leafCtx.lineTo(s * 0.15, -s * 0.6);
      leafCtx.lineTo(s * 0.3, -s * 0.5);
      leafCtx.bezierCurveTo(s * 0.4, 0, s * 0.3, s * 0.4, 0, s * 0.8);

      // Left lobe
      leafCtx.moveTo(-s * 0.2, s * 0.2);
      leafCtx.bezierCurveTo(-s * 0.6, s * 0.1, -s * 0.9, -s * 0.2, -s * 1.0, -s * 0.1);
      leafCtx.lineTo(-s * 0.7, 0);
      leafCtx.lineTo(-s * 0.9, s * 0.3);
      leafCtx.bezierCurveTo(-s * 0.5, s * 0.4, -s * 0.2, s * 0.5, 0, s * 0.8);

      // Right lobe
      leafCtx.moveTo(s * 0.2, s * 0.2);
      leafCtx.bezierCurveTo(s * 0.6, s * 0.1, s * 0.9, -s * 0.2, s * 1.0, -s * 0.1);
      leafCtx.lineTo(s * 0.7, 0);
      leafCtx.lineTo(s * 0.9, s * 0.3);
      leafCtx.bezierCurveTo(s * 0.5, s * 0.4, s * 0.2, s * 0.5, 0, s * 0.8);

      leafCtx.closePath();
    };

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      if (!isAutumnTheme) return;

      // Smoothly adjust current wind force towards target wind force
      windForce += (targetWindForce - windForce) * 0.015;

      // Render Wind Streaks
      for (let i = windStreaks.length - 1; i >= 0; i--) {
        const streak = windStreaks[i];
        streak.x += streak.speed;
        streak.alpha -= 0.002;

        if (streak.x > width + streak.length || streak.alpha <= 0) {
          windStreaks.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.globalAlpha = streak.alpha;
        const grad = ctx.createLinearGradient(
          streak.x,
          streak.y,
          streak.x + streak.length,
          streak.y
        );
        grad.addColorStop(0, "transparent");
        grad.addColorStop(0.5, "rgba(255, 235, 200, 0.3)");
        grad.addColorStop(1, "transparent");

        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.0;
        ctx.beginPath();
        ctx.moveTo(streak.x, streak.y);
        ctx.lineTo(streak.x + streak.length, streak.y - 6);
        ctx.stroke();
        ctx.restore();
      }

      // Render Leaves
      leaves.forEach((leaf) => {
        if (!isReducedMotion) {
          // Physics update
          leaf.swingTimer += leaf.swingSpeed;
          leaf.rotation += leaf.rotationSpeed + windForce * 0.008;
          leaf.flipAngle += leaf.flipSpeed;

          // Side-to-side sway combined with wind velocity
          const swingDx = Math.sin(leaf.swingTimer) * leaf.swingAmplitude;
          leaf.x += swingDx + leaf.vx + windForce * 0.5;
          leaf.y += leaf.vy - Math.abs(windForce * 0.08);

          // Reset when off screen
          if (leaf.y > height + 40 || leaf.x > width + 120) {
            Object.assign(leaf, createLeaf());
          }
        }

        const flipFactor = Math.cos(leaf.flipAngle); // 3D tumbling flip ratio [-1, 1]

        ctx.save();
        ctx.translate(leaf.x, leaf.y);
        ctx.rotate(leaf.rotation + (windForce * 0.1));
        ctx.scale(flipFactor, 1);

        ctx.fillStyle = leaf.color;
        ctx.shadowBlur = 4;
        ctx.shadowColor = "rgba(138, 83, 42, 0.25)";

        drawMapleLeafPath(ctx, leaf.size);
        ctx.fill();

        // Draw leaf central vein line
        ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(0, leaf.size * 0.5);
        ctx.lineTo(0, -leaf.size * 0.45);
        ctx.stroke();

        ctx.restore();
      });

      if (!isReducedMotion && isAutumnTheme) {
        animationFrameId = requestAnimationFrame(render);
      }
    };

    checkReducedMotion();
    checkTheme();
    initCanvasSize();
    scheduleWindGust();
    render();

    // Listen for data-theme change
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === "attributes" && mutation.attributeName === "data-theme") {
          const wasAutumn = isAutumnTheme;
          checkTheme();
          if (!wasAutumn && isAutumnTheme) {
            cancelAnimationFrame(animationFrameId);
            render();
          } else if (!isAutumnTheme) {
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
      if (isAutumnTheme) render();
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        cancelAnimationFrame(animationFrameId);
      } else if (!isReducedMotion && isAutumnTheme) {
        render();
      }
    };

    window.addEventListener("resize", handleResize);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      cancelAnimationFrame(animationFrameId);
      if (gustTimer) clearTimeout(gustTimer);
      observer.disconnect();
      window.removeEventListener("resize", handleResize);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  return (
    <div aria-hidden="true" className={styles.container}>
      <canvas ref={canvasRef} className={styles.canvas} />
      <div className={styles.vignette} />
    </div>
  );
}
