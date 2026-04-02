"use client";

import { useEffect, useRef } from "react";

interface Fish {
  x: number;
  y: number;
  speed: number;
  size: number;
  flip: boolean;
  wobble: number;
  wobbleSpeed: number;
  color: string;
  isRemora: boolean;
  followIndex: number;
}

const COLORS = ["#60a5fa", "#818cf8", "#a78bfa", "#6ee7b7", "#5eead4"];
const REMORA_COLOR = "#f97316";

function createFish(width: number, height: number, isRemora: boolean, followIndex: number): Fish {
  const goingRight = Math.random() > 0.5;
  return {
    x: goingRight ? -30 : width + 30,
    y: Math.random() * (height - 40) + 20,
    speed: (0.4 + Math.random() * 0.8) * (goingRight ? 1 : -1),
    size: isRemora ? 8 + Math.random() * 4 : 12 + Math.random() * 10,
    flip: !goingRight,
    wobble: Math.random() * Math.PI * 2,
    wobbleSpeed: 0.02 + Math.random() * 0.03,
    color: isRemora ? REMORA_COLOR : COLORS[Math.floor(Math.random() * COLORS.length)],
    isRemora,
    followIndex,
  };
}

function drawFish(ctx: CanvasRenderingContext2D, fish: Fish, t: number) {
  const yOff = Math.sin(fish.wobble + t * fish.wobbleSpeed) * 3;
  const tailWag = Math.sin(t * 0.08 + fish.wobble) * 0.3;

  ctx.save();
  ctx.translate(fish.x, fish.y + yOff);
  if (fish.flip) ctx.scale(-1, 1);

  const s = fish.size;

  // body
  ctx.beginPath();
  ctx.ellipse(0, 0, s, s * 0.45, 0, 0, Math.PI * 2);
  ctx.fillStyle = fish.color;
  ctx.globalAlpha = 0.85;
  ctx.fill();

  // tail
  ctx.beginPath();
  ctx.moveTo(-s * 0.8, 0);
  ctx.lineTo(-s * 1.4, -s * 0.5 + tailWag * s);
  ctx.lineTo(-s * 1.4, s * 0.5 + tailWag * s);
  ctx.closePath();
  ctx.fillStyle = fish.color;
  ctx.globalAlpha = 0.7;
  ctx.fill();

  // eye
  ctx.beginPath();
  ctx.arc(s * 0.45, -s * 0.1, s * 0.12, 0, Math.PI * 2);
  ctx.fillStyle = "#fff";
  ctx.globalAlpha = 1;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(s * 0.48, -s * 0.1, s * 0.06, 0, Math.PI * 2);
  ctx.fillStyle = "#000";
  ctx.fill();

  // remora sucker marking
  if (fish.isRemora) {
    ctx.beginPath();
    for (let i = -2; i <= 2; i++) {
      ctx.moveTo(i * s * 0.2, -s * 0.15);
      ctx.lineTo(i * s * 0.2, s * 0.15);
    }
    ctx.strokeStyle = "#00000030";
    ctx.lineWidth = 0.5;
    ctx.stroke();
  }

  ctx.restore();
}

export function FishTank() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.offsetWidth;
    const height = canvas.offsetHeight;
    canvas.width = width;
    canvas.height = height;

    const fishes: Fish[] = [];

    // spawn a batch of fish
    for (let i = 0; i < 5; i++) {
      fishes.push(createFish(width, height, false, -1));
    }
    // a couple of remoras following the bigger fish
    fishes.push(createFish(width, height, true, 0));
    fishes.push(createFish(width, height, true, 2));

    let t = 0;
    let spawnTimer = 0;
    let animId: number;

    function animate() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, width, height);

      t++;
      spawnTimer++;

      // spawn new fish occasionally
      if (spawnTimer > 200 + Math.random() * 300) {
        spawnTimer = 0;
        const isRemora = Math.random() < 0.3;
        fishes.push(createFish(width, height, isRemora, isRemora ? Math.floor(Math.random() * fishes.length) : -1));
      }

      for (let i = fishes.length - 1; i >= 0; i--) {
        const fish = fishes[i];

        if (fish.isRemora && fish.followIndex >= 0 && fish.followIndex < fishes.length) {
          const leader = fishes[fish.followIndex];
          if (leader && !leader.isRemora) {
            const dx = leader.x - fish.size * 2 * (leader.flip ? -1 : 1) - fish.x;
            const dy = leader.y + leader.size * 0.4 - fish.y;
            fish.x += dx * 0.03;
            fish.y += dy * 0.03;
            fish.flip = leader.flip;
          } else {
            fish.x += fish.speed;
          }
        } else {
          fish.x += fish.speed;
        }

        drawFish(ctx, fish, t);

        // remove fish that swam off screen
        if ((fish.speed > 0 && fish.x > width + 50) || (fish.speed < 0 && fish.x < -50)) {
          fishes.splice(i, 1);
        }
      }

      // keep a minimum population
      if (fishes.filter((f) => !f.isRemora).length < 3) {
        fishes.push(createFish(width, height, false, -1));
      }

      animId = requestAnimationFrame(animate);
    }

    animate();
    return () => cancelAnimationFrame(animId);
  }, []);

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
      <canvas
        ref={canvasRef}
        className="w-full h-[180px]"
      />
    </div>
  );
}
