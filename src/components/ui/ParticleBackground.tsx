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
  type: 'sparkle' | 'dust';
  pulsePhase: number;
  pulseSpeed: number;
}

const GOLD_COLORS = [
  '#D4AF37',
  '#F4E5B0',
  '#C5963A',
  '#B8860B',
  '#FFD700',
  '#FFFFFF', // for sparkle highlights
];

const CONNECTION_DISTANCE = 120;
const CONNECTION_OPACITY = 0.06;

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
      const type = Math.random() < 0.4 ? 'sparkle' : 'dust';
      return {
        x: Math.random() * canvas!.width,
        y: canvas!.height + 10 + Math.random() * 30,
        vx: (Math.random() - 0.5) * 0.3,
        vy: -(0.15 + Math.random() * 0.4),
        size: type === 'sparkle' ? 1.5 + Math.random() * 2.5 : 0.5 + Math.random() * 1.5,
        color: type === 'sparkle'
          ? GOLD_COLORS[Math.floor(Math.random() * GOLD_COLORS.length)]
          : GOLD_COLORS[Math.floor(Math.random() * (GOLD_COLORS.length - 1))], // dust avoids pure white
        alpha: type === 'sparkle' ? 0.4 + Math.random() * 0.5 : 0.2 + Math.random() * 0.3,
        life: 0,
        maxLife: 400 + Math.random() * 400,
        type,
        pulsePhase: Math.random() * Math.PI * 2,
        pulseSpeed: 0.02 + Math.random() * 0.03,
      };
    }

    // Initialize particles scattered across canvas
    for (let i = 0; i < 40; i++) {
      const p = createParticle();
      p.y = Math.random() * canvas.height;
      p.life = Math.random() * p.maxLife;
      particlesRef.current.push(p);
    }

    function drawConnections(particles: Particle[]) {
      if (!ctx) return;
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < CONNECTION_DISTANCE) {
            const opacity = (1 - dist / CONNECTION_DISTANCE) * CONNECTION_OPACITY;
            ctx.strokeStyle = `rgba(212, 175, 55, ${opacity})`;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }
    }

    function animate() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Add new particles gently
      if (particlesRef.current.length < 45 && Math.random() < 0.1) {
        particlesRef.current.push(createParticle());
      }

      // Draw constellation connections first (behind particles)
      drawConnections(particlesRef.current);

      particlesRef.current = particlesRef.current.filter((p) => {
        p.life++;
        p.x += p.vx;
        p.y += p.vy;
        p.pulsePhase += p.pulseSpeed;

        // Gentle horizontal drift
        p.vx += (Math.random() - 0.5) * 0.01;
        p.vx *= 0.995;

        // Fade in and fade out
        let lifeFactor = 1;
        if (p.life < 60) {
          lifeFactor = p.life / 60; // fade in
        } else if (p.life > p.maxLife * 0.8) {
          lifeFactor = 1 - (p.life - p.maxLife * 0.8) / (p.maxLife * 0.2); // fade out
        }

        // Pulse/twinkle effect for sparkles
        const pulse = p.type === 'sparkle'
          ? 0.6 + 0.4 * Math.sin(p.pulsePhase)
          : 0.8 + 0.2 * Math.sin(p.pulsePhase);

        const finalAlpha = p.alpha * lifeFactor * pulse;

        ctx!.save();
        ctx!.globalAlpha = finalAlpha;

        if (p.type === 'sparkle') {
          // Draw a 4-point star sparkle
          const s = p.size;
          ctx!.fillStyle = p.color;
          ctx!.strokeStyle = p.color;
          ctx!.lineWidth = 0.5;
          ctx!.beginPath();

          // Vertical line
          ctx!.moveTo(p.x, p.y - s * 1.2);
          ctx!.lineTo(p.x, p.y + s * 1.2);
          ctx!.moveTo(p.x - s * 1.2, p.y);
          ctx!.lineTo(p.x + s * 1.2, p.y);

          // Diagonal lines (shorter)
          const d = s * 0.7;
          ctx!.moveTo(p.x - d, p.y - d);
          ctx!.lineTo(p.x + d, p.y + d);
          ctx!.moveTo(p.x + d, p.y - d);
          ctx!.lineTo(p.x - d, p.y + d);

          ctx!.stroke();

          // Center glow dot
          ctx!.beginPath();
          ctx!.arc(p.x, p.y, s * 0.35, 0, Math.PI * 2);
          ctx!.fill();
        } else {
          // Dust: simple soft circle
          const gradient = ctx!.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
          gradient.addColorStop(0, p.color);
          gradient.addColorStop(1, 'transparent');
          ctx!.fillStyle = gradient;
          ctx!.beginPath();
          ctx!.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx!.fill();
        }

        ctx!.restore();

        return p.life < p.maxLife && p.y > -20;
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
      style={{ opacity: 0.4 }}
    />
  );
}
