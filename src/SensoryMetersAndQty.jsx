import React from 'react';
import { Plus, Minus, Trash2 } from 'lucide-react';

export const EMOTE_PACK_OPTIONS = [
  {
    id: 'mochi_chime',
    name: '1. Kawaii Mochi & Sound Buddies',
    note: 'Blushing Marshmallows + Zzz Cloud / Chime Bell / Keycap Buddy',
  },
  {
    id: 'paw_wave',
    name: '2. Jelly Toe-Paws & Acoustic Wave',
    note: 'Glossy Cat-Paw Squish + Mute Shield vs Studio Wave Bars',
  },
  {
    id: 'arcade_stamps',
    name: '3. Neo-Pop Sticker Stamps',
    note: 'Inked Gummy Hearts + High-Contrast Sound Sticker Pills',
  },
  {
    id: 'capsule_gauges',
    name: '4. Tactile Capsule Gauges',
    note: 'Segmented Squish & Decibel Noise Bars + Coin Tier',
  },
];

/**
 * Classifies any SKU's sound profile into an unmistakable visual category:
 *  - 'silent'  (0 dB Library & Classroom Silent)
 *  - 'whisper' (<18 dB Smooth Ceramic Hum / Soft Ripple)
 *  - 'click'   (Creamy Mechanical Thock / Magnetic Snap)
 *  - 'melody'  (Touch-to-Sing Musical Notes)
 */
export function classifySoundProfile(item) {
  const raw = String(item?.sound_db || '').toLowerCase();
  const col = String(item?.collection || '').toLowerCase();
  if (col === 'musical_plush' || raw.includes('chime') || raw.includes('note') || raw.includes('melod')) {
    return { kind: 'melody', shortLabel: 'Plays Music', pillBg: '#FFE0E7', pillInk: '#9F1239', level: 4 };
  }
  if (raw.includes('0 db') || raw.includes('whisper-silent') || raw.includes('completely silent') || raw.includes('air-soft') || raw.includes('invisible')) {
    return { kind: 'silent', shortLabel: '0 dB Silent', pillBg: '#DCFCE7', pillInk: '#065F46', level: 0 };
  }
  if (raw.includes('thock') || raw.includes('click') || raw.includes('ratchet')) {
    return { kind: 'click', shortLabel: 'Crisp Click', pillBg: '#FEF3C7', pillInk: '#92400E', level: 3 };
  }
  return { kind: 'whisper', shortLabel: 'Quiet Hum', pillBg: '#E0F2FE', pillInk: '#075985', level: 1 };
}

/* ---------------- SQUISH ICONS PER EMOTE PACK ---------------- */

function MarshmallowBuddySVG({ filled, size = 19 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      style={{ opacity: filled ? 1 : 0.24, transform: filled ? 'scale(1)' : 'scale(0.9)', flexShrink: 0 }}
    >
      <rect
        x="2.5"
        y="4"
        width="19"
        height="16"
        rx="6.5"
        fill={filled ? '#FFE4EC' : 'transparent'}
        stroke="currentColor"
        strokeWidth="1.9"
      />
      <path d="M7.8 11.8 Q9 10.4 10.2 11.8" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M13.8 11.8 Q15 10.4 16.2 11.8" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      {filled && (
        <>
          <circle cx="7" cy="14" r="1.4" fill="#FF4D6D" opacity="0.75" />
          <circle cx="17" cy="14" r="1.4" fill="#FF4D6D" opacity="0.75" />
        </>
      )}
      <path d="M10.3 14 Q12 15.7 13.7 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function JellyPawSVG({ filled, size = 19 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      style={{ opacity: filled ? 1 : 0.22, transform: filled ? 'scale(1)' : 'scale(0.9)', flexShrink: 0 }}
    >
      <circle cx="12" cy="13" r="9.2" fill={filled ? '#FFD6E4' : 'transparent'} stroke="currentColor" strokeWidth="1.8" />
      <ellipse cx="12" cy="15.2" rx="4.2" ry="3.1" fill={filled ? '#FF4D6D' : 'currentColor'} />
      <circle cx="7.4" cy="10.4" r="1.6" fill={filled ? '#FF4D6D' : 'currentColor'} />
      <circle cx="10.4" cy="8.5" r="1.65" fill={filled ? '#FF4D6D' : 'currentColor'} />
      <circle cx="13.8" cy="8.5" r="1.65" fill={filled ? '#FF4D6D' : 'currentColor'} />
      <circle cx="16.7" cy="10.4" r="1.6" fill={filled ? '#FF4D6D' : 'currentColor'} />
    </svg>
  );
}

function GummyHeartStampSVG({ filled, size = 18 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      style={{ opacity: filled ? 1 : 0.22, flexShrink: 0 }}
    >
      <path
        d="M12 20.4 C12 20.4 3.5 14.9 3.5 8.9 C3.5 5.9 5.9 3.8 8.6 3.8 C10.3 3.8 11.5 4.7 12 5.7 C12.5 4.7 13.7 3.8 15.4 3.8 C18.1 3.8 20.5 5.9 20.5 8.9 C20.5 14.9 12 20.4 12 20.4 Z"
        fill={filled ? '#FF4D6D' : 'transparent'}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      {filled && <path d="M7.2 7.4 Q8.4 6.2 9.8 6.8" fill="none" stroke="#FFFFFF" strokeWidth="1.6" strokeLinecap="round" />}
    </svg>
  );
}

/* ---------------- SOUND / NOISE BADGES PER EMOTE PACK ---------------- */

function SoundBuddyIcon({ kind }) {
  if (kind === 'silent') {
    // Sleeping Zzz Cloud Buddy
    return (
      <svg width="17" height="17" viewBox="0 0 24 24" aria-hidden="true" style={{ flexShrink: 0 }}>
        <path
          d="M6.5 18.5 H17.5 A4 4 0 0 0 18 10.6 A5.5 5.5 0 0 0 7.6 9.6 A4.4 4.4 0 0 0 6.5 18.5 Z"
          fill="#A7F3D0"
          stroke="#065F46"
          strokeWidth="1.8"
        />
        <path d="M9.5 13.8 Q10.4 14.6 11.3 13.8" fill="none" stroke="#065F46" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M13.2 13.8 Q14.1 14.6 15 13.8" fill="none" stroke="#065F46" strokeWidth="1.5" strokeLinecap="round" />
        <text x="17.2" y="7.5" fontSize="6.5" fontWeight="800" fill="#065F46">z</text>
      </svg>
    );
  }
  if (kind === 'melody') {
    // Singing Chime Bell Buddy
    return (
      <svg width="17" height="17" viewBox="0 0 24 24" aria-hidden="true" style={{ flexShrink: 0 }}>
        <circle cx="9" cy="16.5" r="3.4" fill="#FF4D6D" stroke="#881337" strokeWidth="1.7" />
        <circle cx="17.5" cy="14.5" r="3.1" fill="#FB7185" stroke="#881337" strokeWidth="1.7" />
        <path d="M12.2 16.5 V5.5 L20.4 4 V14.5" fill="none" stroke="#881337" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (kind === 'click') {
    // Tactile Mechanical Keycap Buddy
    return (
      <svg width="17" height="17" viewBox="0 0 24 24" aria-hidden="true" style={{ flexShrink: 0 }}>
        <rect x="3" y="6" width="18" height="14" rx="4" fill="#FDE68A" stroke="#78350F" strokeWidth="1.9" />
        <rect x="6" y="4" width="12" height="9" rx="2.5" fill="#FFFBEB" stroke="#78350F" strokeWidth="1.7" />
        <path d="M9.5 8.8 H14.5" stroke="#78350F" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    );
  }
  // Smooth Whisper Hum
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" aria-hidden="true" style={{ flexShrink: 0 }}>
      <circle cx="12" cy="12" r="8.5" fill="#BAE6FD" stroke="#075985" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="3.2" fill="#FFFFFF" stroke="#075985" strokeWidth="1.6" />
    </svg>
  );
}

function AcousticWaveBadge({ kind }) {
  if (kind === 'silent') {
    return (
      <svg width="17" height="17" viewBox="0 0 24 24" aria-hidden="true" style={{ flexShrink: 0 }}>
        <path d="M4 9.5 H8 L13 5 V19 L8 14.5 H4 Z" fill="#10B981" stroke="#064E3B" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M16.5 9.5 L20.5 14.5 M20.5 9.5 L16.5 14.5" stroke="#064E3B" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }
  const bars = kind === 'melody' ? [8, 15, 11, 17] : kind === 'click' ? [7, 14, 9, 12] : [5, 8, 6, 5];
  const barColor = kind === 'melody' ? '#E11D48' : kind === 'click' ? '#D97706' : '#0284C7';
  return (
    <svg width="18" height="17" viewBox="0 0 22 20" aria-hidden="true" style={{ flexShrink: 0 }}>
      {bars.map((bh, idx) => (
        <rect
          key={idx}
          x={2 + idx * 5}
          y={10 - bh / 2}
          width="3.2"
          height={bh}
          rx="1.6"
          fill={barColor}
        />
      ))}
    </svg>
  );
}

/**
 * Unified Sensory Stat Row (renders Squishiness + Sound/Noise + Yelp $ Price Tier
 * in whichever of the 4 Emote Packs the user selects!)
 */
export function SensoryStatCluster({ item, emotePack = 'mochi_chime', compact = false }) {
  const squish = Math.max(1, Math.min(5, Number(item?.squish_level) || 3));
  const priceTier = Math.max(1, Math.min(3, Number(item?.price_tier) || 2));
  const sound = classifySoundProfile(item);

  if (emotePack === 'capsule_gauges') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.36rem', width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', fontSize: '0.72rem', fontWeight: 800 }}>
          <span style={{ color: 'var(--text-muted)' }}>SQUISH</span>
          <div style={{ display: 'flex', gap: '3px', flex: 1, maxWidth: '108px' }}>
            {[1, 2, 3, 4, 5].map((n) => (
              <span
                key={n}
                style={{
                  flex: 1,
                  height: '7px',
                  borderRadius: '99px',
                  border: '1.2px solid var(--border)',
                  backgroundColor: n <= squish ? '#FF4D6D' : 'transparent',
                }}
              />
            ))}
          </div>
          <span className="font-neo" style={{ fontSize: '0.75rem' }}>
            {'$'.repeat(priceTier)}
            <span style={{ opacity: 0.25 }}>{'$'.repeat(3 - priceTier)}</span>
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.4rem', fontSize: '0.71rem', fontWeight: 800 }}>
          <span style={{ color: 'var(--text-muted)' }}>SOUND</span>
          <span
            style={{
              padding: '0.12rem 0.5rem',
              borderRadius: '999px',
              backgroundColor: sound.pillBg,
              color: sound.pillInk,
              border: '1.5px solid #141417',
              fontSize: '0.68rem',
            }}
          >
            {sound.shortLabel}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: compact ? '0.38rem' : '0.48rem' }}>
      {/* 1. Squishiness Visual Emotes */}
      <span
        title={`Softness: ${squish}/5 (${item?.squish_label || ''})`}
        style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', color: 'var(--text)' }}
      >
        {[1, 2, 3, 4, 5].map((n) => {
          const filled = n <= squish;
          if (emotePack === 'paw_wave') return <JellyPawSVG key={n} filled={filled} size={compact ? 16 : 18} />;
          if (emotePack === 'arcade_stamps') return <GummyHeartStampSVG key={n} filled={filled} size={compact ? 15 : 17} />;
          return <MarshmallowBuddySVG key={n} filled={filled} size={compact ? 16 : 18} />;
        })}
      </span>

      {/* 2. Sound / Noise Badge (Makes Noise vs 0dB Silent!) */}
      <span
        title={`Sound Profile: ${item?.sound_db || sound.shortLabel}`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.28rem',
          padding: emotePack === 'arcade_stamps' ? '0.16rem 0.52rem' : '0.14rem 0.46rem',
          borderRadius: emotePack === 'arcade_stamps' ? '0.45rem' : '999px',
          backgroundColor: sound.pillBg,
          color: sound.pillInk,
          border: '1.5px solid #141417',
          fontSize: '0.69rem',
          fontWeight: 800,
          lineHeight: 1.1,
          whiteSpace: 'nowrap',
        }}
      >
        {emotePack === 'paw_wave' ? (
          <AcousticWaveBadge kind={sound.kind} />
        ) : emotePack === 'arcade_stamps' ? null : (
          <SoundBuddyIcon kind={sound.kind} />
        )}
        <span>{emotePack === 'arcade_stamps' ? sound.shortLabel.toUpperCase() : sound.shortLabel}</span>
      </span>

      {/* 3. Yelp-Style $ Price Tier */}
      <span
        title={`Price tier: ${'$'.repeat(priceTier)}`}
        className="font-neo"
        style={{ fontSize: '0.78rem', fontWeight: 800 }}
      >
        <span style={{ color: 'var(--mint-strong)' }}>{'$'.repeat(priceTier)}</span>
        <span style={{ color: 'var(--text-muted)', opacity: 0.26 }}>{'$'.repeat(3 - priceTier)}</span>
      </span>
    </div>
  );
}

/**
 * Grocery-Store Inline Morphing Quantity Control:
 *  - When qty === 0: crisp Neo-Pop [+ Add] button
 *  - When qty >= 1: morphs right on the card into [- / Trash | qty | +] without opening the cart!
 */
export function GroceryQtyStepper({ item, bag, onAdd, onUpdateQty, size = 'md' }) {
  const found = Array.isArray(bag) ? bag.find((b) => b.id === item?.id) : null;
  const qty = found ? found.quantity : 0;
  const isLg = size === 'lg';

  if (qty <= 0) {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onAdd(item, e);
        }}
        className="btn-primary"
        aria-label={`Add ${item?.name} to bag`}
        style={{
          padding: isLg ? '0.78rem 1.45rem' : '0.48rem 0.92rem',
          fontSize: isLg ? '0.92rem' : '0.8rem',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.32rem',
          whiteSpace: 'nowrap',
        }}
      >
        <Plus size={isLg ? 16 : 14} strokeWidth={2.6} />
        <span>{isLg ? `Add to Bag — $${Number(item?.price_usd || 0).toFixed(0)}` : 'Add'}</span>
      </button>
    );
  }

  return (
    <div
      className="grocery-stepper"
      onClick={(e) => e.stopPropagation()}
      style={{
        padding: isLg ? '0.3rem 0.42rem' : '0.18rem 0.26rem',
        gap: isLg ? '0.45rem' : '0.28rem',
      }}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onUpdateQty(item.id, -1);
        }}
        aria-label={qty === 1 ? `Remove ${item.name}` : `Decrease ${item.name} quantity`}
        className="grocery-step-btn"
        style={{ width: isLg ? '34px' : '27px', height: isLg ? '34px' : '27px' }}
      >
        {qty === 1 ? <Trash2 size={isLg ? 15 : 13} color="#E11D48" /> : <Minus size={isLg ? 15 : 13} strokeWidth={2.6} />}
      </button>

      <span
        className="tabular-nums font-neo"
        style={{
          minWidth: isLg ? '28px' : '22px',
          textAlign: 'center',
          fontWeight: 800,
          fontSize: isLg ? '0.98rem' : '0.84rem',
        }}
      >
        {qty}
      </span>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onUpdateQty(item.id, 1);
        }}
        aria-label={`Increase ${item.name} quantity`}
        className="grocery-step-btn"
        style={{ width: isLg ? '34px' : '34px', maxWidth: isLg ? '34px' : '27px', height: isLg ? '34px' : '27px' }}
      >
        <Plus size={isLg ? 15 : 13} strokeWidth={2.6} />
      </button>
    </div>
  );
}
