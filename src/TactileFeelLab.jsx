import React, { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';

function ensureAudioCtx(ctxRef) {
  if (typeof window === 'undefined') return null;
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return null;
  if (!ctxRef.current) ctxRef.current = new AudioCtx();
  if (ctxRef.current.state === 'suspended') {
    ctxRef.current.resume().catch(() => {});
  }
  return ctxRef.current;
}

function playNotes(ctxRef, enabled, freqs = [523.25]) {
  if (!enabled) return;
  try {
    const ctx = ensureAudioCtx(ctxRef);
    if (!ctx) return;
    const now = ctx.currentTime;
    freqs.forEach((f, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      const t0 = now + idx * 0.08;
      osc.frequency.setValueAtTime(f, t0);
      osc.frequency.exponentialRampToValueAtTime(f * 1.008, t0 + 0.16);
      gain.gain.setValueAtTime(0.001, t0);
      gain.gain.linearRampToValueAtTime(0.085, t0 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.32);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + 0.34);
    });
  } catch {
    // ignore
  }
}

function playSwitch(ctxRef, enabled, k) {
  if (!enabled) return;
  try {
    const ctx = ensureAudioCtx(ctxRef);
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = k.wave;
    osc.frequency.setValueAtTime(k.fStart, now);
    osc.frequency.exponentialRampToValueAtTime(k.fEnd, now + 0.04);
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.048);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.052);
  } catch {
    // ignore
  }
}

const PLUSH_TRIO = [
  { id: 'carrot', label: 'Carrot', note: 'Do', bg: '#FB923C', leaf: '#22C55E', freqs: [523.25, 659.25] },
  { id: 'banana', label: 'Banana', note: 'Mi', bg: '#FACC15', leaf: '#A16207', darkText: true, freqs: [659.25, 783.99] },
  { id: 'berry', label: 'Berry', note: 'Sol', bg: '#F43F5E', leaf: '#16A34A', freqs: [783.99, 1046.5] },
];

const KEYS = [
  { id: 'mint', label: 'Thock', bg: '#A7F3D0', rim: '#10B981', fStart: 240, fEnd: 118, wave: 'triangle' },
  { id: 'butter', label: 'Creamy', bg: '#FDE68A', rim: '#F59E0B', fStart: 310, fEnd: 155, wave: 'sine' },
  { id: 'sky', label: 'Tactile', bg: '#BAE6FD', rim: '#0284C7', fStart: 420, fEnd: 195, wave: 'triangle' },
  { id: 'coral', label: 'Clicky', bg: '#FECDD3', rim: '#F43F5E', fStart: 680, fEnd: 280, wave: 'square' },
];

export default function TactileFeelLab() {
  const [audioOn, setAudioOn] = useState(true);
  const audioCtxRef = useRef(null);

  const [activePlush, setActivePlush] = useState('');
  const [spinnerRpm, setSpinnerRpm] = useState(0);
  const [spinnerAngle, setSpinnerAngle] = useState(0);
  const rpmRef = useRef(0);
  const angleRef = useRef(0);

  const [pressedKey, setPressedKey] = useState('');
  const [squishHeld, setSquishHeld] = useState(false);
  const [compressionPct, setCompressionPct] = useState(0);
  const [rebounding, setRebounding] = useState(false);

  useEffect(() => {
    let raf = 0;
    let prev = performance.now();
    const tick = (now) => {
      const dt = Math.min(0.05, Math.max(0.001, (now - prev) / 1000));
      prev = now;
      if (rpmRef.current > 0.4) {
        angleRef.current = (angleRef.current + (rpmRef.current / 60) * 360 * dt) % 360;
        rpmRef.current = Math.max(0, rpmRef.current * Math.pow(0.84, dt) - 4.5 * dt);
        setSpinnerAngle(angleRef.current);
        setSpinnerRpm(Math.round(rpmRef.current));
      } else if (rpmRef.current !== 0) {
        rpmRef.current = 0;
        setSpinnerRpm(0);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    if (!squishHeld) return;
    const id = setInterval(() => setCompressionPct((p) => Math.min(92, p + 8)), 30);
    return () => clearInterval(id);
  }, [squishHeld]);

  const scaleX = 1 + (compressionPct / 100) * 0.24;
  const scaleY = 1 - (compressionPct / 100) * 0.34;

  return (
    <section id="feel-lab" aria-labelledby="play-lab-title" style={{ maxWidth: '1220px', margin: '0 auto', padding: '2rem 1.25rem 1.5rem' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', marginBottom: '1.15rem' }}>
        <div>
          <h2 id="play-lab-title" className="font-display" style={{ margin: 0, fontSize: 'clamp(1.45rem, 2.5vw, 1.95rem)', fontWeight: 700 }}>
            Try the Play Lab
          </h2>
          <p style={{ margin: '0.15rem 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Tap a plush, flick the spinner, click a switch, or hold the mochi paw.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setAudioOn((v) => !v)}
          className="btn-ghost"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.48rem 0.85rem', fontSize: '0.8rem' }}
        >
          {audioOn ? <Volume2 size={15} /> : <VolumeX size={15} />}
          <span>{audioOn ? 'Sound On' : 'Muted'}</span>
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(255px, 1fr))', gap: '1rem' }}>
        {/* 1. Musical Touch Plush */}
        <div className="surface-card" style={{ padding: '1.1rem', display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.84rem', fontWeight: 700 }}>
            <span>Musical Plush</span>
            <button
              type="button"
              onClick={() => {
                setActivePlush('all');
                playNotes(audioCtxRef, audioOn, [523.25, 659.25, 783.99, 1046.5]);
                setTimeout(() => setActivePlush(''), 380);
              }}
              style={{ background: 'none', border: 'none', color: 'var(--accent)', fontWeight: 700, fontSize: '0.76rem', cursor: 'pointer', padding: 0 }}
            >
              Play Trio Chord
            </button>
          </div>
          <div style={{ height: '124px', backgroundColor: 'var(--surface-muted)', borderRadius: '1rem', padding: '0.65rem', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.45rem', alignItems: 'center' }}>
            {PLUSH_TRIO.map((pl) => {
              const up = activePlush === pl.id || activePlush === 'all';
              return (
                <button
                  key={pl.id}
                  type="button"
                  onClick={() => {
                    setActivePlush(pl.id);
                    playNotes(audioCtxRef, audioOn, pl.freqs);
                    setTimeout(() => setActivePlush(''), 240);
                  }}
                  style={{
                    height: '92px',
                    border: 'none',
                    borderRadius: '0.9rem',
                    backgroundColor: pl.bg,
                    color: pl.darkText ? '#1E293B' : '#FFFFFF',
                    cursor: 'pointer',
                    transform: up ? 'translateY(-4px) scale(1.04)' : 'scale(1)',
                    transition: 'transform 0.14s ease',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.25rem',
                    fontWeight: 700,
                    fontSize: '0.76rem',
                  }}
                >
                  <span style={{ width: '16px', height: '6px', borderRadius: '99px', backgroundColor: pl.leaf }} />
                  <span>{pl.label}</span>
                  <span style={{ fontSize: '0.66rem', opacity: 0.9 }}>{pl.note}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. R188 Fidget Spinner */}
        <div className="surface-card" style={{ padding: '1.1rem', display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.84rem', fontWeight: 700 }}>
            <span>Gyro Spinner</span>
            <span className="tabular-nums" style={{ color: 'var(--accent)', fontSize: '0.78rem' }}>
              {spinnerRpm > 0 ? `${spinnerRpm} RPM` : 'Tap to Spin'}
            </span>
          </div>
          <div style={{ height: '124px', backgroundColor: 'var(--surface-muted)', borderRadius: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <button
              type="button"
              onClick={() => {
                const next = Math.min(1850, rpmRef.current + 480);
                rpmRef.current = next;
                setSpinnerRpm(Math.round(next));
                playNotes(audioCtxRef, audioOn, [Math.min(640, 220 + next * 0.16)]);
              }}
              aria-label="Flick fidget spinner"
              style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 0 }}
            >
              <svg width="96" height="96" viewBox="0 0 108 108" style={{ transform: `rotate(${spinnerAngle.toFixed(1)}deg)` }}>
                <defs>
                  <linearGradient id="kcWing" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#14B8A6" />
                    <stop offset="55%" stopColor="#38BDF8" />
                    <stop offset="100%" stopColor="#F472B6" />
                  </linearGradient>
                </defs>
                {[0, 120, 240].map((deg) => (
                  <g key={deg} transform={`rotate(${deg} 54 54)`}>
                    <rect x="44" y="10" width="20" height="44" rx="10" fill="url(#kcWing)" />
                    <circle cx="54" cy="21" r="8.5" fill="#1E293B" />
                    <circle cx="54" cy="21" r="5" fill="#F8FAFC" />
                  </g>
                ))}
                <circle cx="54" cy="54" r="15" fill="#F59E0B" stroke="#FEF3C7" strokeWidth="2.5" />
                <circle cx="54" cy="54" r="8" fill="#FDE68A" />
              </svg>
            </button>
          </div>
        </div>

        {/* 3. 4-Key Creamy Clicker */}
        <div className="surface-card" style={{ padding: '1.1rem', display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.84rem', fontWeight: 700 }}>
            <span>4-Key Switch Clicker</span>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.76rem' }}>4 Profiles</span>
          </div>
          <div style={{ height: '124px', backgroundColor: 'var(--surface-muted)', borderRadius: '1rem', padding: '0.7rem', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.4rem', alignItems: 'center' }}>
            {KEYS.map((k) => {
              const down = pressedKey === k.id;
              return (
                <button
                  key={k.id}
                  type="button"
                  onPointerDown={() => {
                    setPressedKey(k.id);
                    playSwitch(audioCtxRef, audioOn, k);
                    setTimeout(() => setPressedKey(''), 120);
                  }}
                  style={{
                    height: '72px',
                    borderRadius: '0.75rem',
                    border: `2px solid ${k.rim}`,
                    backgroundColor: k.bg,
                    color: '#0F172A',
                    cursor: 'pointer',
                    transform: down ? 'translateY(4px)' : 'translateY(0)',
                    boxShadow: down ? `0 1px 0 ${k.rim}` : `0 5px 0 ${k.rim}`,
                    transition: 'transform 0.06s ease, box-shadow 0.06s ease',
                    fontWeight: 700,
                    fontSize: '0.72rem',
                  }}
                >
                  {k.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 4. Mochi Cat-Paw Squishy */}
        <div className="surface-card" style={{ padding: '1.1rem', display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.84rem', fontWeight: 700 }}>
            <span>Mochi Cat Paw</span>
            <span className="tabular-nums" style={{ color: 'var(--text-muted)', fontSize: '0.76rem' }}>
              {compressionPct > 0 ? `${compressionPct}%` : 'Hold to Squish'}
            </span>
          </div>
          <div style={{ height: '124px', backgroundColor: 'var(--surface-muted)', borderRadius: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', userSelect: 'none' }}>
            <button
              type="button"
              onPointerDown={() => {
                setRebounding(false);
                setSquishHeld(true);
                playNotes(audioCtxRef, audioOn, [196]);
              }}
              onPointerUp={() => {
                if (!squishHeld) return;
                setSquishHeld(false);
                setRebounding(true);
                setTimeout(() => setCompressionPct(0), 20);
              }}
              onPointerLeave={() => {
                if (!squishHeld) return;
                setSquishHeld(false);
                setRebounding(true);
                setTimeout(() => setCompressionPct(0), 20);
              }}
              className={`squish-elastic ${rebounding ? 'rebounding' : ''}`}
              style={{
                border: '2px solid #FBCFE8',
                background: 'linear-gradient(145deg, #FFF1F2, #FBCFE8)',
                color: '#9F1239',
                width: '122px',
                height: '82px',
                borderRadius: '46% 46% 50% 50%',
                cursor: 'pointer',
                transform: `scale(${scaleX.toFixed(3)}, ${scaleY.toFixed(3)})`,
                fontWeight: 700,
                fontSize: '0.76rem',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.2rem',
              }}
            >
              <span style={{ display: 'flex', gap: '4px' }}>
                <span style={{ width: '9px', height: '9px', borderRadius: '50%', backgroundColor: '#FB7185' }} />
                <span style={{ width: '11px', height: '11px', borderRadius: '50%', backgroundColor: '#F43F5E', marginTop: '-2px' }} />
                <span style={{ width: '11px', height: '11px', borderRadius: '50%', backgroundColor: '#F43F5E', marginTop: '-2px' }} />
                <span style={{ width: '9px', height: '9px', borderRadius: '50%', backgroundColor: '#FB7185' }} />
              </span>
              <span>{squishHeld ? 'Squishing...' : 'Hold Paw'}</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
