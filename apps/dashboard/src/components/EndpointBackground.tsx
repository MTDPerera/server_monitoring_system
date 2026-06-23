'use client';

import { useEffect, useRef } from 'react';

const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD'];
const METHOD_COLORS: Record<string, string> = {
  GET:    '#22d3ee',
  POST:   '#4ade80',
  PUT:    '#fbbf24',
  PATCH:  '#fb923c',
  DELETE: '#f87171',
  HEAD:   '#c084fc',
};
const PATHS = [
  '/api/v1/health', '/api/auth/token', '/api/users/me', '/api/data/stream',
  '/api/endpoints/check', '/api/metrics', '/api/v2/status', '/api/logs/tail',
  '/api/sessions', '/api/monitor/ping', '/api/nodes/sync', '/api/events/push',
  '/api/cache/flush', '/api/queue/jobs', '/api/reports/export', '/api/v1/verify',
];
const STATUSES = [
  { code: 200, color: '#4ade80' },
  { code: 200, color: '#4ade80' },
  { code: 200, color: '#4ade80' },
  { code: 201, color: '#4ade80' },
  { code: 204, color: '#4ade80' },
  { code: 401, color: '#fbbf24' },
  { code: 404, color: '#fb923c' },
  { code: 500, color: '#f87171' },
];

interface LogLine {
  x: number;
  y: number;
  method: string;
  path: string;
  status: { code: number; color: string };
  ms: number;
  ip: string;
  opacity: number;
  speed: number;
}

function randIP() {
  return `${10 + ~~(Math.random() * 245)}.${~~(Math.random() * 255)}.${~~(Math.random() * 255)}.${1 + ~~(Math.random() * 254)}`;
}

export function EndpointBackground({ className = '' }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let lines: LogLine[] = [];
    let frame = 0;

    function resize() {
      canvas!.width  = canvas!.offsetWidth;
      canvas!.height = canvas!.offsetHeight;
    }

    function spawnLine() {
      const method = METHODS[~~(Math.random() * METHODS.length)];
      const status = STATUSES[~~(Math.random() * STATUSES.length)];
      lines.push({
        x: 40 + Math.random() * (canvas!.width * 0.6),
        y: canvas!.height + 10,
        method,
        path: PATHS[~~(Math.random() * PATHS.length)],
        status,
        ms: 20 + ~~(Math.random() * 1800),
        ip: randIP(),
        opacity: 0,
        speed: 0.25 + Math.random() * 0.4,
      });
    }

    function draw() {
      frame++;
      ctx!.clearRect(0, 0, canvas!.width, canvas!.height);

      // Spawn new lines
      if (frame % 28 === 0) spawnLine();

      lines = lines.filter(l => l.y > -20);

      for (const l of lines) {
        l.y -= l.speed;
        // Fade in from bottom, fade out at top
        const fromBottom = (canvas!.height - l.y) / canvas!.height;
        l.opacity = Math.min(fromBottom * 3, 1, (l.y / (canvas!.height * 0.25)));

        const alpha = l.opacity * 0.55;
        if (alpha < 0.01) continue;

        const mColor = METHOD_COLORS[l.method];
        let cx = l.x;
        ctx!.font = 'bold 10px monospace';

        // Method badge
        ctx!.fillStyle = `${mColor}${Math.floor(alpha * 255).toString(16).padStart(2,'0')}`;
        ctx!.fillText(l.method, cx, l.y);
        cx += ctx!.measureText(l.method + '  ').width;

        // Path
        ctx!.font = '10px monospace';
        ctx!.fillStyle = `rgba(148,163,184,${alpha * 0.8})`;
        ctx!.fillText(l.path, cx, l.y);
        cx += ctx!.measureText(l.path + '  ').width;

        // Status code
        ctx!.font = 'bold 10px monospace';
        ctx!.fillStyle = `${l.status.color}${Math.floor(alpha * 255).toString(16).padStart(2,'0')}`;
        ctx!.fillText(String(l.status.code), cx, l.y);
        cx += ctx!.measureText(l.status.code + '  ').width;

        // Response time
        ctx!.font = '10px monospace';
        ctx!.fillStyle = `rgba(100,116,139,${alpha * 0.7})`;
        ctx!.fillText(`${l.ms}ms`, cx, l.y);
        cx += ctx!.measureText(`${l.ms}ms  `).width;

        // IP
        ctx!.fillStyle = `rgba(71,85,105,${alpha * 0.5})`;
        ctx!.fillText(l.ip, cx, l.y);
      }

      animId = requestAnimationFrame(draw);
    }

    resize();
    // Pre-seed some lines spread across the screen
    for (let i = 0; i < 12; i++) {
      spawnLine();
      lines[lines.length - 1].y = Math.random() * canvas.height;
    }
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    draw();

    return () => {
      cancelAnimationFrame(animId);
      ro.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full ${className}`}
      style={{ opacity: 0.25 }}
    />
  );
}
