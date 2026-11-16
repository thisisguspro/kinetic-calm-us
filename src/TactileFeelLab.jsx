import React, { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX, Sparkles } from 'lucide-react';

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
      const t0 = now + idx * 0.075;
      osc.frequency.setValueAtTime(f, t0);
      osc.frequency.exponentialRampToValueAtTime(f * 1.008, t0 + 0.18);
      gain.gain.setValueAtTime(0.001, t0);
      gain.gain.linearRampToValueAtTime(0.095, t0 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.36);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + 0.38);
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
    osc.frequency.exponentialRampToValueAtTime(k.fEnd, now + 0.042);
    gain.gain.setValueAtTime(0.095, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.052);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.056);
  } catch {
    // ignore
  }
}

const PLUSH_SPOTS = [
  { id: 'carrot', label: 'Carrot (Do)', left: '6%', width: '30%', pillBg: '#FFEDD5', pillInk: '#9A3412', freqs: [523.25, 659.25] },
  { id: 'banana', label: 'Banana (Mi)', left: '36%', width: '28%', pillBg: '#FEF3C7', pillInk: '#854D0E', freqs: [659.25, 783.99] },
  { id: 'berry', label: 'Berry (Sol)', left: '65%', width: '30%', pillBg: '#FFE4E6', pillInk: '#9F1239', freqs: [783.99, 1046.5] },
];

const SWITCH_KEYS = [
  { id: 'mint', keyNum: '1', label: 'Thock', bg: '#A7F3D0', ink: '#065F46', fStart: 235, fEnd: 112, wave: 'triangle' },
  { id: 'butter', keyNum: '2', label: 'Creamy', bg: '#FDE68A', ink: '#78350F', fStart: 315, fEnd: 152, wave: 'sine' },
  { id: 'sky', keyNum: '3', label: 'Tactile', bg: '#BAE6FD', ink: '#075985', fStart: 430, fEnd: 198, wave: 'triangle' },
  { id: 'coral', keyNum: '4', label: 'Clicky', bg: '#FECDD3', ink: '#881337', fStart: 690, fEnd: 285, wave: 'square' },
];

export default function TactileFeelLab({ compactSidebar = false }) {
  const [audioOn, setAudioOn] = useState(true);
  const audioCtxRef = useRef(null);

  const [activePlush, setActivePlush] = useState('');
  const [noteRipples, setNoteRipples] = useState([]);

  const [spinnerRpm, setSpinnerRpm] = useState(0);
  const [spinnerAngle, setSpinnerAngle] = useState(0);
  const rpmRef = useRef(0);
  const angleRef = useRef(0);

  const [pressedKey, setPressedKey] = useState('');
  const [clickCount, setClickCount] = useState(0);

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
        rpmRef.current = Math.max(0, rpmRef.current * Math.pow(0.86, dt) - 4.0 * dt);
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
    const id = setInterval(() => setCompressionPct((p) => Math.min(94, p + 8)), 28);
    return () => clearInterval(id);
  }, [squishHeld]);

  const triggerPlushNote = (spot) => {
    setActivePlush(spot.id);
    playNotes(audioCtxRef, audioOn, spot.freqs);
    const id = Date.now() + Math.random();
    setNoteRipples((prev) => [...prev.slice(-4), { id, left: spot.left, label: spot.label.split(' ')[0] }]);
    setTimeout(() => setActivePlush(''), 280);
    setTimeout(() => setNoteRipples((prev) => prev.filter((n) => n.id !== id)), 840);
  };

  const triggerKeySwitch = (k) => {
    setPressedKey(k.id);
    setClickCount((c) => c + 1);
    playSwitch(audioCtxRef, audioOn, k);
    setTimeout(() => setPressedKey(''), 125);
  };

  const scaleX = 1 + (compressionPct / 100) * 0.25;
  const scaleY = 1 - (compressionPct / 100) * 0.34;

  return (
    <section
      id="feel-lab"
      aria-labelledby="play-lab-title"
      style={{
        maxWidth: compactSidebar ? 'none' : '1240px',
        margin: '0 auto',
        padding: compactSidebar ? '0' : '2.2rem 1.25rem 1.8rem',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '0.75rem',
          marginBottom: '1.15rem',
        }}
      >
        <div>
          <div
            className="font-neo"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.2rem 0.65rem',
              borderRadius: '999px',
              backgroundColor: 'var(--surface-butter)',
              border: '2px solid var(--border)',
              fontSize: '0.72rem',
              fontWeight: 800,
              marginBottom: '0.35rem',
              color: '#141417',
            }}
          >
            <Sparkles size={12} />
            <span>INTERACTIVE TACTILE SOUND &amp; PHYSICS DECK</span>
          </div>
          <h2
            id="play-lab-title"
            className="font-display"
            style={{ margin: 0, fontSize: compactSidebar ? '1.35rem' : 'clamp(1.65rem, 2.8vw, 2.25rem)', fontWeight: 800 }}
          >
            Test-Drive the Real Toys
          </h2>
          <p style={{ margin: '0.2rem 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Tap a plush palm pad, flick the CNC R188 spinner, press all 4 switch profiles, or hold down the mochi cat paw.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setAudioOn((v) => !v)}
          className="btn-ghost"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.42rem', padding: '0.52rem 0.95rem', fontSize: '0.8rem' }}
        >
          {audioOn ? <Volume2 size={15} /> : <VolumeX size={15} />}
          <span>{audioOn ? 'Lab Sound: ON' : 'Lab Muted'}</span>
        </button>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: compactSidebar ? '1fr' : 'repeat(auto-fit, minmax(268px, 1fr))',
          gap: '1.15rem',
        }}
      >
        {/* 1. REAL STUDIO MUSICAL PLUSH TRIO */}
        <div className="surface-card" style={{ padding: '1.05rem', display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.4rem' }}>
            <div>
              <div className="font-display" style={{ fontWeight: 800, fontSize: '1rem' }}>Musical Touch Plush</div>
              <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>Tap Carrot, Banana, or Berry</div>
            </div>
            <button
              type="button"
              onClick={() => {
                setActivePlush('all');
                playNotes(audioCtxRef, audioOn, [523.25, 659.25, 783.99, 1046.5]);
                setTimeout(() => setActivePlush(''), 380);
              }}
              className="btn-ghost"
              style={{ padding: '0.32rem 0.65rem', fontSize: '0.72rem' }}
            >
              Play Chord
            </button>
          </div>

          <div
            style={{
              position: 'relative',
              height: '188px',
              borderRadius: '1.05rem',
              border: '2px solid var(--border)',
              background: 'radial-gradient(circle at 50% 60%, #FFFDF8 0%, #FFE9F0 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
            }}
          >
            <img
              src="/products/playlab-musical-plush.png"
              alt="Carrot, Banana and Strawberry musical touch plushies"
              style={{
                width: '92%',
                height: '92%',
                objectFit: 'contain',
                transform: activePlush ? 'translateY(-4px) scale(1.03)' : 'scale(1)',
                transition: 'transform 0.16s cubic-bezier(0.22, 1.35, 0.36, 1)',
                pointerEvents: 'none',
                userSelect: 'none',
              }}
            />

            {noteRipples.map((r) => (
              <span
                key={r.id}
                className="musical-ripple-note font-neo"
                style={{
                  position: 'absolute',
                  top: '22%',
                  left: `calc(${r.left} + 8%)`,
                  padding: '0.16rem 0.45rem',
                  borderRadius: '999px',
                  backgroundColor: '#FF4D6D',
                  color: '#FFFFFF',
                  border: '1.5px solid #141417',
                  fontSize: '0.68rem',
                  fontWeight: 800,
                }}
              >
                ♪ {r.label}
              </span>
            ))}

            {/* 3 Clickable Plush Zones + Bottom Pill Triggers */}
            {PLUSH_SPOTS.map((sp) => (
              <button
                key={sp.id}
                type="button"
                onClick={() => triggerPlushNote(sp)}
                aria-label={`Play ${sp.label}`}
                style={{
                  position: 'absolute',
                  top: '12%',
                  bottom: '22%',
                  left: sp.left,
                  width: sp.width,
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                }}
              />
            ))}

            <div
              style={{
                position: 'absolute',
                bottom: '0.45rem',
                left: '0.45rem',
                right: '0.45rem',
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '0.35rem',
              }}
            >
              {PLUSH_SPOTS.map((sp) => (
                <button
                  key={sp.id}
                  type="button"
                  onClick={() => triggerPlushNote(sp)}
                  className="font-neo"
                  style={{
                    padding: '0.24rem 0.3rem',
                    borderRadius: '0.55rem',
                    border: '1.5px solid #141417',
                    backgroundColor: activePlush === sp.id || activePlush === 'all' ? '#FF4D6D' : sp.pillBg,
                    color: activePlush === sp.id || activePlush === 'all' ? '#FFFFFF' : sp.pillInk,
                    fontWeight: 800,
                    fontSize: '0.68rem',
                    cursor: 'pointer',
                  }}
                >
                  {sp.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 2. REAL STUDIO CNC GYRO SPINNER */}
        <div className="surface-card" style={{ padding: '1.05rem', display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div className="font-display" style={{ fontWeight: 800, fontSize: '1rem' }}>R188 Ceramic Spinner</div>
              <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>Tap repeatedly to boost RPM</div>
            </div>
            <span
              className="tabular-nums font-neo"
              style={{
                padding: '0.22rem 0.6rem',
                borderRadius: '999px',
                border: '1.5px solid #141417',
                backgroundColor: spinnerRpm > 0 ? '#A7F3D0' : '#E0F2FE',
                color: '#0F172A',
                fontSize: '0.73rem',
                fontWeight: 800,
              }}
            >
              {spinnerRpm > 0 ? `${spinnerRpm} RPM` : 'Flick Me'}
            </span>
          </div>

          <div
            onClick={() => {
              const next = Math.min(2200, rpmRef.current + 560);
              rpmRef.current = next;
              setSpinnerRpm(Math.round(next));
              playNotes(audioCtxRef, audioOn, [Math.min(680, 210 + next * 0.14)]);
            }}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                const next = Math.min(2200, rpmRef.current + 560);
                rpmRef.current = next;
                setSpinnerRpm(Math.round(next));
              }
            }}
            aria-label="Flick CNC tri-wing fidget spinner"
            style={{
              height: '188px',
              borderRadius: '1.05rem',
              border: '2px solid var(--border)',
              background: 'radial-gradient(circle at 50% 50%, #FFFFFF 0%, #E0F2FE 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              position: 'relative',
              overflow: 'hidden',
              userSelect: 'none',
            }}
          >
            {spinnerRpm > 350 && (
              <div
                style={{
                  position: 'absolute',
                  width: '146px',
                  height: '146px',
                  borderRadius: '50%',
                  border: '3px dashed rgba(14, 165, 233, 0.45)',
                  transform: `rotate(${(-spinnerAngle * 0.6).toFixed(1)}deg)`,
                  pointerEvents: 'none',
                }}
              />
            )}
            <img
              src="/products/playlab-spinner-rotor.png"
              alt="Top-down anodized tri-wing ceramic spinner"
              style={{
                width: '148px',
                height: '148px',
                objectFit: 'contain',
                transform: `rotate(${spinnerAngle.toFixed(1)}deg)`,
                filter: spinnerRpm > 950 ? 'blur(0.45px) saturate(1.12)' : 'none',
                pointerEvents: 'none',
              }}
            />
          </div>
        </div>

        {/* 3. REAL STUDIO 4-KEY MECHANICAL CLICKER */}
        <div className="surface-card" style={{ padding: '1.05rem', display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div className="font-display" style={{ fontWeight: 800, fontSize: '1rem' }}>4-Key Switch Clicker</div>
              <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>Tap any pastel PBT switch</div>
            </div>
            <span
              className="tabular-nums font-neo"
              style={{
                padding: '0.22rem 0.58rem',
                borderRadius: '999px',
                border: '1.5px solid #141417',
                backgroundColor: '#FEF3C7',
                color: '#78350F',
                fontSize: '0.72rem',
                fontWeight: 800,
              }}
            >
              {clickCount > 0 ? `${clickCount} Clicks` : '38 dB Thock'}
            </span>
          </div>

          <div
            style={{
              height: '188px',
              borderRadius: '1.05rem',
              border: '2px solid var(--border)',
              background: 'radial-gradient(circle at 50% 45%, #FFFDF9 0%, #FEF3C7 100%)',
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.5rem',
              overflow: 'hidden',
            }}
          >
            <img
              src="/products/playlab-4key-clicker.png"
              alt="4-key pastel mechanical keyboard switch clicker"
              style={{
                width: '92%',
                height: '126px',
                objectFit: 'contain',
                transform: pressedKey ? 'translateY(3px) scale(0.985)' : 'translateY(0) scale(1)',
                transition: 'transform 0.06s ease',
                pointerEvents: 'none',
                userSelect: 'none',
              }}
            />

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.35rem', width: '100%' }}>
              {SWITCH_KEYS.map((k) => {
                const down = pressedKey === k.id;
                return (
                  <button
                    key={k.id}
                    type="button"
                    onPointerDown={() => triggerKeySwitch(k)}
                    className="font-neo"
                    style={{
                      padding: '0.34rem 0.2rem',
                      borderRadius: '0.6rem',
                      border: '1.8px solid #141417',
                      backgroundColor: k.bg,
                      color: k.ink,
                      fontWeight: 800,
                      fontSize: '0.7rem',
                      cursor: 'pointer',
                      transform: down ? 'translate(1.5px, 2px)' : 'translate(0, 0)',
                      boxShadow: down ? '0px 0px 0px #141417' : '2px 2px 0px #141417',
                      transition: 'transform 0.05s ease, box-shadow 0.05s ease',
                    }}
                  >
                    {k.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* 4. REAL STUDIO FROSTED MOCHI CAT-PAW SQUISHY */}
        <div className="surface-card" style={{ padding: '1.05rem', display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div className="font-display" style={{ fontWeight: 800, fontSize: '1rem' }}>Mochi Cat-Paw Taba</div>
              <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>Press &amp; hold for 3.6s slow-rise</div>
            </div>
            <span
              className="tabular-nums font-neo"
              style={{
                padding: '0.22rem 0.58rem',
                borderRadius: '999px',
                border: '1.5px solid #141417',
                backgroundColor: '#FFE4EC',
                color: '#9F1239',
                fontSize: '0.72rem',
                fontWeight: 800,
              }}
            >
              {compressionPct > 0 ? `${compressionPct}% Squished` : '0 dB Silent'}
            </span>
          </div>

          <div
            onPointerDown={() => {
              setRebounding(false);
              setSquishHeld(true);
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
            role="button"
            tabIndex={0}
            aria-label="Press and hold mochi cat-paw squishy"
            style={{
              height: '188px',
              borderRadius: '1.05rem',
              border: '2px solid var(--border)',
              background: 'radial-gradient(circle at 50% 52%, #FFFFFF 0%, #FFE4EC 100%)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              userSelect: 'none',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <img
              src="/products/playlab-mochi-catpaw.png"
              alt="Translucent pink jelly toe-bean mochi cat-paw squishy"
              className={`squish-elastic ${rebounding ? 'rebounding' : ''}`}
              style={{
                width: '146px',
                height: '146px',
                objectFit: 'contain',
                transformOrigin: '50% 78%',
                transform: `scale(${scaleX.toFixed(3)}, ${scaleY.toFixed(3)})`,
                pointerEvents: 'none',
              }}
            />
            <span
              className="font-neo"
              style={{
                position: 'absolute',
                bottom: '0.5rem',
                padding: '0.18rem 0.65rem',
                borderRadius: '999px',
                backgroundColor: squishHeld ? '#FF4D6D' : '#FFFFFF',
                color: squishHeld ? '#FFFFFF' : '#141417',
                border: '1.5px solid #141417',
                fontSize: '0.7rem',
                fontWeight: 800,
              }}
            >
              {squishHeld ? 'Release to Watch Slow-Rise!' : 'Hold Down to Squish'}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
