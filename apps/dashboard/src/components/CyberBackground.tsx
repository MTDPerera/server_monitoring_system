'use client';

import { useEffect, useRef, useState } from 'react';
import styles from './CyberBackground.module.css';

const DEFAULT_VIDEO_ID = 'Hgg7M3kSqyE';
const FADE_INTERVAL = 55000;
const FADE_DURATION = 3000;

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

export function CyberBackground({ className = '', videoId = DEFAULT_VIDEO_ID, opacity = 0.30 }: { className?: string; videoId?: string; opacity?: number }) {
  const player1Ref = useRef<any>(null);
  const player2Ref = useRef<any>(null);
  const div1Ref = useRef<HTMLDivElement>(null);
  const div2Ref = useRef<HTMLDivElement>(null);
  const [activeFrame, setActiveFrame] = useState(0);
  const [fading, setFading] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function createPlayers() {
      const playerVars = {
        autoplay: 1, mute: 1, controls: 0, loop: 1,
        playlist: videoId, showinfo: 0, rel: 0,
        iv_load_policy: 3, modestbranding: 1, disablekb: 1, fs: 0,
      };

      player1Ref.current = new window.YT.Player(div1Ref.current, {
        videoId: videoId,
        playerVars: { ...playerVars, start: 1 },
        events: {
          onReady: (e: any) => { e.target.playVideo(); setVideoReady(true); },
        },
      });

      player2Ref.current = new window.YT.Player(div2Ref.current, {
        videoId: videoId,
        playerVars: { ...playerVars, start: 30 },
        events: { onReady: (e: any) => e.target.playVideo() },
      });
    }

    if (window.YT?.Player) {
      createPlayers();
    } else {
      window.onYouTubeIframeAPIReady = createPlayers;
      if (!document.getElementById('yt-api-script')) {
        const tag = document.createElement('script');
        tag.id = 'yt-api-script';
        tag.src = 'https://www.youtube.com/iframe_api';
        document.head.appendChild(tag);
      }
    }

    // Crossfade timer
    function scheduleSwap() {
      timerRef.current = setTimeout(() => {
        setFading(true);
        setTimeout(() => {
          setActiveFrame(prev => prev === 0 ? 1 : 0);
          setFading(false);
        }, FADE_DURATION);
        scheduleSwap();
      }, FADE_INTERVAL);
    }
    scheduleSwap();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      try { player1Ref.current?.destroy(); } catch {}
      try { player2Ref.current?.destroy(); } catch {}
    };
  }, []);

  const frameStyle = (idx: number): React.CSSProperties => ({
    position: 'absolute',
    top: '50%', left: '50%',
    width: '120%', height: '120%',
    transform: 'translate(-50%, -55%)',
    border: 'none',
    opacity: activeFrame === idx
      ? (fading ? 0 : opacity)
      : (fading ? opacity : 0),
    transition: `opacity ${FADE_DURATION}ms ease-in-out`,
    pointerEvents: 'none',
  });

  return (
    <div className={`pointer-events-none ${className}`} style={{ overflow: 'hidden' }}>
      <div className={styles.fallback} style={{ opacity: videoReady ? 0 : 1, zIndex: 1 }} />
      <div ref={div1Ref} style={{ ...frameStyle(0), zIndex: 2 }} />
      <div ref={div2Ref} style={{ ...frameStyle(1), zIndex: 2 }} />
      {/* Solid during load to hide YouTube controls, fades transparent once playing */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 10,
        background: videoReady ? 'transparent' : '#010912',
        transition: 'background 1.5s ease',
      }} />
    </div>
  );
}
