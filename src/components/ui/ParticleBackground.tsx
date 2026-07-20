'use client';

import { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
  type: 'confetti' | 'sparkle' | 'bubble';
  rotation: number;
  rotationSpeed: number;
}

const COLORS = [
  '#e94560', '#FF3366', '#FF6B6B', // Reds
  '#FFFFFF', '#F0F0F0', '#E8E8E8', // Whites
  '#0f3460', '#1a5276', '#2196F3', // Blues
  '#FFD700', '#FFA500', // Gold accents
];

export default function ParticleBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    function createParticle(): Particle {
      const type = Math.random() < 0.4 ? 'confetti' : Math.random() < 0.7 ? 'sparkle' : 'bubble';
      return {
        x: Math.random() * canvas!.width,
        y: -10 - Math.random() * 50,
        vx: (Math.random() - 0.5) * 2,
        vy: 0.5 + Math.random() * 2,
        size: type === 'confetti' ? 4 + Math.random() * 6 : type === 'sparkle' ? 1 + Math.random() * 3 : 2 + Math.random() * 4,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        alpha: 0.3 + Math.random() * 0.7,
        life: 0,
        maxLife: 200 + Math.random() * 300,
        type,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 4,
      };
    }

    // Initialize particles
    for (let i = 0; i < 60; i++) {
      const p = createParticle();
      p.y = Math.random() * canvas.height;
      p.life = Math.random() * p.maxLife;
      particlesRef.current.push(p);
    }

    function animate() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Add new particles
      if (particlesRef.current.length < 80 && Math.random() < 0.3) {
        particlesRef.current.push(createParticle());
      }

      particlesRef.current = particlesRef.current.filter((p) => {
        p.life++;
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.rotationSpeed;

        // Add wobble to confetti
        if (p.type === 'confetti') {
          p.vx += (Math.random() - 0.5) * 0.1;
          p.vx *= 0.99;
        }

        const fadeOut = p.life > p.maxLife * 0.8
          ? 1 - (p.life - p.maxLife * 0.8) / (p.maxLife * 0.2)
          : 1;

        ctx!.save();
        ctx!.globalAlpha = p.alpha * fadeOut;
        ctx!.translate(p.x, p.y);
        ctx!.rotate((p.rotation * Math.PI) / 180);

        if (p.type === 'confetti') {
          ctx!.fillStyle = p.color;
          ctx!.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        } else if (p.type === 'sparkle') {
          ctx!.fillStyle = p.color;
          ctx!.beginPath();
          for (let i = 0; i < 4; i++) {
            const angle = (i * Math.PI) / 2;
            ctx!.moveTo(0, 0);
            ctx!.lineTo(
              Math.cos(angle) * p.size,
              Math.sin(angle) * p.size
            );
          }
          ctx!.stroke();
          ctx!.strokeStyle = p.color;
          ctx!.lineWidth = 0.5;
          ctx!.stroke();
          ctx!.beginPath();
          ctx!.arc(0, 0, p.size * 0.3, 0, Math.PI * 2);
          ctx!.fill();
        } else {
          ctx!.strokeStyle = p.color;
          ctx!.lineWidth = 1;
          ctx!.beginPath();
          ctx!.arc(0, 0, p.size, 0, Math.PI * 2);
          ctx!.stroke();
          ctx!.globalAlpha = p.alpha * fadeOut * 0.3;
          ctx!.fillStyle = p.color;
          ctx!.fill();
        }

        ctx!.restore();

        return p.life < p.maxLife && p.y < canvas!.height + 20;
      });

      animationRef.current = requestAnimationFrame(animate);
    }

    animate();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationRef.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ opacity: 0.6 }}
    />
  );
}
