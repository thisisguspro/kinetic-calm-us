import React, { useEffect, useMemo, useState } from 'react';
import {
  ShoppingBag,
  Sun,
  Moon,
  Plus,
  Minus,
  Trash2,
  X,
  CheckCircle2,
  Lock,
  ChevronLeft,
  ChevronRight,
  Palette,
} from 'lucide-react';
import TactileFeelLab from './TactileFeelLab.jsx';
import LegalViews from './LegalViews.jsx';

const STYLE_PRESETS = [
  { id: 'clay', name: '1. Clay & Cloud', note: 'Soft 3D Toy Boutique' },
  { id: 'pop', name: '2. Neo-Pop Editorial', note: 'Crisp Ink & Marquee' },
  { id: 'glass', name: '3. Frosted Aero Glass', note: 'Aurora Glass Carousel' },
  { id: 'nordic', name: '4. Nordic Quiet Gallery', note: 'Warm Editorial Serif' },
];

const COLLECTIONS = [
  { id: 'all', label: 'All Toys' },
  { id: 'squishies_calm', label: 'Squishies' },
  { id: 'fidget_spinners', label: 'Spinners' },
  { id: 'clickers_sliders', label: 'Clickers' },
  { id: 'musical_plush', label: 'Musical Plush' },
];

/**
 * Custom SVG Happy Marshmallow Icon for Softness / Squishiness Meter (1..5)
 */
function HappyMarshmallowIcon({ filled, size = 20 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      style={{
        opacity: filled ? 1 : 0.25,
        transform: filled ? 'scale(1)' : 'scale(0.92)',
        transition: 'transform 0.18s ease, opacity 0.18s ease',
        flexShrink: 0,
      }}
    >
      {/* Plump marshmallow pillow body */}
      <rect
        x="3"
        y="4.5"
        width="18"
        height="15.5"
        rx="6.5"
        fill={filled ? 'var(--marshmallow-fill)' : 'transparent'}
        stroke="var(--marshmallow-stroke)"
        strokeWidth="1.75"
      />
      {/* Soft marshmallow top crown line */}
      <path
        d="M6.8 7.6 C9.5 6.5, 14.5 6.5, 17.2 7.6"
        fill="none"
        stroke="var(--marshmallow-stroke)"
        strokeWidth="1.1"
        strokeLinecap="round"
        opacity="0.45"
      />
      {/* Happy curved eyes */}
      <path d="M8.2 12.2 Q9.2 10.9 10.2 12.2" fill="none" stroke="var(--text)" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M13.8 12.2 Q14.8 10.9 15.8 12.2" fill="none" stroke="var(--text)" strokeWidth="1.5" strokeLinecap="round" />
      {/* Rosy marshmallow cheeks */}
      {filled && (
        <>
          <circle cx="7.4" cy="14.1" r="1.35" fill="#FB7185" opacity="0.65" />
          <circle cx="16.6" cy="14.1" r="1.35" fill="#FB7185" opacity="0.65" />
        </>
      )}
      {/* Tiny happy smile */}
      <path d="M10.4 14.1 Q12 15.8 13.6 14.1" fill="none" stroke="var(--text)" strokeWidth="1.45" strokeLinecap="round" />
    </svg>
  );
}

function MarshmallowMeter({ level = 5, label = '', size = 19 }) {
  const safe = Math.max(1, Math.min(5, Number(level) || 3));
  return (
    <div
      title={`Softness: ${safe}/5 Happy Marshmallows (${label})`}
      aria-label={`Softness ${safe} out of 5 marshmallows`}
      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
    >
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
        {[1, 2, 3, 4, 5].map((n) => (
          <HappyMarshmallowIcon key={n} filled={n <= safe} size={size} />
        ))}
      </span>
      {label && (
        <span style={{ fontSize: '0.73rem', fontWeight: 600, color: 'var(--text-muted)' }}>
          {label}
        </span>
      )}
    </div>
  );
}

/**
 * Yelp-Style Price Tier ($ / $$ / $$$) + Calm Feel Score Dots
 */
function YelpPriceSigns({ tier = 2 }) {
  const active = Math.max(1, Math.min(3, Number(tier) || 2));
  return (
    <span
      title={`Price tier: ${'$'.repeat(active)}`}
      aria-label={`Price tier ${active} of 3`}
      style={{ fontSize: '0.8rem', fontWeight: 800, letterSpacing: '0.02em' }}
    >
      <span style={{ color: 'var(--accent)' }}>{'$'.repeat(active)}</span>
      <span style={{ color: 'var(--text-muted)', opacity: 0.28 }}>{'$'.repeat(3 - active)}</span>
    </span>
  );
}

export default function App() {
  const [stylePreset, setStylePreset] = useState(() => {
    if (typeof window !== 'undefined') {
      const q = new URLSearchParams(window.location.search).get('style');
      if (q && ['clay', 'pop', 'glass', 'nordic'].includes(q)) return q;
      try {
        const saved = localStorage.getItem('kc_style_preset');
        if (saved && ['clay', 'pop', 'glass', 'nordic'].includes(saved)) return saved;
      } catch {}
    }
    return 'clay';
  });

  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem('kc_theme') || 'light';
    } catch {
      return 'light';
    }
  });

  const [splashState, setSplashState] = useState(null);
  const [heroIdx, setHeroIdx] = useState(0);
  const [styleDockOpen, setStyleDockOpen] = useState(false);

  const [catalog, setCatalog] = useState([]);
  const [activeCollection, setActiveCollection] = useState('all');
  const [selectedProduct, setSelectedProduct] = useState(null);

  const [bag, setBag] = useState(() => {
    try {
      const saved = localStorage.getItem('kc_us_bag');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [bagOpen, setBagOpen] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [vaultDiscountPct, setVaultDiscountPct] = useState(0);
  const [quote, setQuote] = useState(null);
  const [checkoutStatus, setCheckoutStatus] = useState('');
  const [toastMsg, setToastMsg] = useState('');

  const [legalOpen, setLegalOpen] = useState(false);
  const [legalTab, setLegalTab] = useState('fda');

  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterMsg, setNewsletterMsg] = useState('');

  useEffect(() => {
    document.documentElement.setAttribute('data-style', stylePreset);
    try {
      localStorage.setItem('kc_style_preset', stylePreset);
    } catch {}
  }, [stylePreset]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem('kc_theme', theme);
    } catch {}
  }, [theme]);

  useEffect(() => {
    try {
      localStorage.setItem('kc_us_bag', JSON.stringify(bag));
    } catch {}
  }, [bag]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setSelectedProduct(null);
        setBagOpen(false);
        setStyleDockOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    fetch('/api/catalog')
      .then((r) => r.json())
      .then((catData) => {
        setCatalog(Array.isArray(catData?.items) ? catData.items : []);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!bag.length) {
      setQuote(null);
      return;
    }
    fetch('/api/quote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: bag.map((i) => ({ id: i.id, quantity: i.quantity })),
        promo_code: promoCode,
        vault_discount_pct: vaultDiscountPct,
      }),
    })
      .then((r) => r.json())
      .then((q) => setQuote(q))
      .catch(() => {});
  }, [bag, promoCode, vaultDiscountPct]);

  const triggerInkSplashTheme = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const xPct = (((rect.left + rect.width / 2) / window.innerWidth) * 100).toFixed(1) + '%';
    const yPct = (((rect.top + rect.height / 2) / window.innerHeight) * 100).toFixed(1) + '%';
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setSplashState({
      x: xPct,
      y: yPct,
      color: nextTheme === 'dark' ? '#0D1317' : '#FCF9F4',
      key: Date.now(),
    });
    setTheme(nextTheme);
    setTimeout(() => setSplashState(null), 650);
  };

  const addToBag = (item, e) => {
    if (e) e.stopPropagation();
    if (item.track !== 'TRACK_A_DIRECT') return;
    setBag((prev) => {
      const idx = prev.findIndex((p) => p.id === item.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], quantity: Math.min(20, next[idx].quantity + 1) };
        return next;
      }
      return [...prev, { id: item.id, name: item.name, price_usd: item.price_usd, image_url: item.image_url, quantity: 1 }];
    });
    setCheckoutStatus('');
    setToastMsg(`Added ${item.name}`);
    setTimeout(() => setToastMsg(''), 2400);
  };

  const updateBagQty = (id, delta) => {
    setBag((prev) =>
      prev
        .map((p) => (p.id === id ? { ...p, quantity: p.quantity + delta } : p))
        .filter((p) => p.quantity > 0)
    );
  };

  const bagCount = useMemo(() => bag.reduce((s, i) => s + i.quantity, 0), [bag]);
  const filteredItems = useMemo(() => {
    if (activeCollection === 'all') return catalog;
    return catalog.filter((item) => item.collection === activeCollection);
  }, [catalog, activeCollection]);

  const heroItems = useMemo(() => {
    if (!catalog.length) return [];
    const wanted = ['SH-MUSICAL-FRUIT-TRIO', 'SH-TABA-CAT-PAW', 'SH-GYRO-RING-SPINNER', 'SH-4KEY-CREAMY-CLICKER'];
    return wanted.map((id) => catalog.find((c) => c.id === id)).filter(Boolean);
  }, [catalog]);

  const featuredHero = heroItems[heroIdx % Math.max(1, heroItems.length)] || catalog[0] || null;

  const handleCheckout = async () => {
    setCheckoutStatus('');
    try {
      const r = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: bag.map((i) => ({ id: i.id, quantity: i.quantity })),
          promo_code: promoCode,
          vault_discount_pct: vaultDiscountPct,
          email: newsletterEmail,
        }),
      });
      const data = await r.json();
      setCheckoutStatus(data?.message || data?.error || 'Checkout ready.');
    } catch {
      setCheckoutStatus('Unable to connect right now.');
    }
  };

  const handleNewsletter = async (e) => {
    e.preventDefault();
    setNewsletterMsg('');
    try {
      const r = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newsletterEmail }),
      });
      const d = await r.json();
      setNewsletterMsg(d?.message || d?.error || '');
      if (r.ok) setNewsletterEmail('');
    } catch {
      setNewsletterMsg('Could not subscribe right now. Please try again.');
    }
  };

  return (
    <div style={{ minHeight: '100vh', position: 'relative' }}>
      {splashState && (
        <div
          key={splashState.key}
          className="ink-splash-layer"
          style={{
            '--splash-x': splashState.x,
            '--splash-y': splashState.y,
            '--splash-color': splashState.color,
          }}
        />
      )}

      {/* Subtle Spring Toast */}
      {toastMsg && (
        <div
          role="status"
          className="gooey-toast"
          style={{
            position: 'fixed',
            bottom: '1.4rem',
            right: '1.4rem',
            zIndex: 750,
            backgroundColor: 'var(--accent)',
            color: 'var(--accent-contrast)',
            padding: '0.72rem 1.1rem',
            borderRadius: '999px',
            fontWeight: 700,
            fontSize: '0.86rem',
            boxShadow: '0 12px 28px rgba(0,0,0,0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
          }}
        >
          <CheckCircle2 size={16} />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Clean, Breathable Header (Zero Clutter!) */}
      <header
        style={{
          position: 'sticky',
          top: stylePreset === 'glass' ? '12px' : 0,
          zIndex: 500,
          maxWidth: stylePreset === 'glass' ? '1180px' : 'none',
          margin: stylePreset === 'glass' ? '0 auto' : 0,
          padding: stylePreset === 'glass' ? '0 1rem' : 0,
        }}
      >
        <div
          style={{
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            backgroundColor:
              theme === 'dark'
                ? 'rgba(13, 19, 23, 0.86)'
                : stylePreset === 'glass'
                ? 'rgba(255, 255, 255, 0.72)'
                : 'rgba(252, 249, 244, 0.90)',
            borderBottom: stylePreset === 'glass' ? 'none' : '1px solid var(--border)',
            border: stylePreset === 'glass' ? '1px solid rgba(255,255,255,0.88)' : undefined,
            borderRadius: stylePreset === 'glass' ? '999px' : 0,
            boxShadow: stylePreset === 'glass' ? '0 10px 30px -12px rgba(15, 42, 74, 0.12)' : 'none',
          }}
        >
          <div
            style={{
              maxWidth: '1220px',
              margin: '0 auto',
              padding: '0.85rem 1.35rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '1rem',
            }}
          >
            <a
              href="#"
              style={{
                textDecoration: 'none',
                color: 'var(--text)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.6rem',
              }}
            >
              <span
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: stylePreset === 'nordic' ? '6px' : '10px',
                  backgroundColor: 'var(--accent)',
                  color: 'var(--accent-contrast)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '0.85rem',
                }}
              >
                KC
              </span>
              <span className="font-display" style={{ fontSize: '1.22rem', fontWeight: 700 }}>
                Kinetic Calm
              </span>
            </a>

            <nav aria-label="Main navigation" style={{ display: 'flex', alignItems: 'center', gap: '1.35rem' }}>
              <a href="#collection" style={{ textDecoration: 'none', color: 'var(--text)', fontWeight: 600, fontSize: '0.9rem' }}>
                Shop
              </a>
              <a href="#feel-lab" style={{ textDecoration: 'none', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.9rem' }}>
                Play Lab
              </a>
            </nav>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
              <button
                type="button"
                onClick={triggerInkSplashTheme}
                aria-label="Toggle dark or light theme"
                className="btn-ghost"
                style={{ width: '38px', height: '38px', padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
              >
                {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
              </button>
              <button
                type="button"
                onClick={() => setBagOpen(true)}
                className="btn-primary"
                style={{ padding: '0.55rem 1.05rem', fontSize: '0.86rem', display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}
              >
                <ShoppingBag size={15} />
                <span className="tabular-nums">Bag ({bagCount})</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main>
        {/* =================================================================
            HERO LAYOUT VARIANT 1: CLAY & CLOUD BOUTIQUE (Default)
            ================================================================= */}
        {stylePreset === 'clay' && (
          <section
            style={{
              maxWidth: '1220px',
              margin: '0 auto',
              padding: '2.8rem 1.25rem 2rem',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))',
              gap: '2.5rem',
              alignItems: 'center',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
              <h1
                className="font-display"
                style={{
                  margin: 0,
                  fontSize: 'clamp(2.4rem, 4.8vw, 3.8rem)',
                  lineHeight: 1.06,
                  fontWeight: 600,
                }}
              >
                Calm rituals for restless hands.
              </h1>
              <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '1.06rem', maxWidth: '470px' }}>
                Silky ceramic spinners, creamy mechanical clickers, slow-rise mochi squishies, and plushies that sing when you hold hands.
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.85rem', paddingTop: '0.25rem' }}>
                <a
                  href="#collection"
                  className="btn-primary"
                  style={{ padding: '0.88rem 1.65rem', textDecoration: 'none', fontSize: '0.95rem' }}
                >
                  Shop Collection
                </a>
                <a
                  href="#feel-lab"
                  className="btn-ghost"
                  style={{ padding: '0.88rem 1.4rem', textDecoration: 'none', fontSize: '0.95rem' }}
                >
                  Try the Play Lab
                </a>
              </div>
            </div>

            {featuredHero && (
              <div
                className="surface-card"
                onClick={() => setSelectedProduct(featuredHero)}
                style={{
                  padding: '1.35rem',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                }}
              >
                <div style={{ borderRadius: '1.25rem', overflow: 'hidden', aspectRatio: '16 / 11', backgroundColor: 'var(--surface-muted)' }}>
                  <img
                    src={featuredHero.image_url}
                    alt={featuredHero.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem' }}>
                  <div>
                    <div className="font-display" style={{ fontSize: '1.15rem', fontWeight: 600 }}>{featuredHero.name}</div>
                    <MarshmallowMeter level={featuredHero.squish_level} label={featuredHero.squish_label} size={18} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }} onClick={(e) => e.stopPropagation()}>
                    {heroItems.map((hi, idx) => (
                      <button
                        key={hi.id}
                        type="button"
                        onClick={() => setHeroIdx(idx)}
                        aria-label={`Preview ${hi.name}`}
                        style={{
                          width: '40px',
                          height: '40px',
                          padding: 0,
                          borderRadius: '0.65rem',
                          overflow: 'hidden',
                          border: idx === heroIdx ? '2.5px solid var(--accent)' : '1px solid var(--border)',
                          cursor: 'pointer',
                          background: 'none',
                        }}
                      >
                        <img src={hi.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {/* =================================================================
            HERO LAYOUT VARIANT 2: NEO-POP SWISS EDITORIAL (Ticker + Bento)
            ================================================================= */}
        {stylePreset === 'pop' && (
          <>
            <div style={{ borderBottom: '2px solid #141417', backgroundColor: '#FFF4CC', overflow: 'hidden', padding: '0.48rem 0' }}>
              <div className="pop-marquee-track" style={{ fontSize: '0.8rem', fontWeight: 800, letterSpacing: '0.06em', color: '#141417' }}>
                {Array(8)
                  .fill('R188 CERAMIC SPINNERS  •  CREAMY 4-KEY CLICKERS  •  MOCHI TABA SQUISHIES  •  MUSICAL TOUCH PLUSHIES  •  FREE US SHIPPING $65+  •  ')
                  .map((txt, idx) => (
                    <span key={idx} style={{ paddingRight: '0.4rem' }}>{txt}</span>
                  ))}
              </div>
            </div>
            <section style={{ maxWidth: '1220px', margin: '0 auto', padding: '2.6rem 1.25rem 1.8rem' }}>
              <div style={{ textAlign: 'center', maxWidth: '780px', margin: '0 auto 2rem' }}>
                <h1 className="font-display" style={{ margin: '0 0 0.75rem', fontSize: 'clamp(2.5rem, 5.2vw, 4.1rem)', lineHeight: 1.02, fontWeight: 700 }}>
                  Tactile joy you can spin, click &amp; squeeze.
                </h1>
                <div style={{ display: 'inline-flex', gap: '0.75rem', marginTop: '0.4rem' }}>
                  <a href="#collection" className="btn-primary" style={{ padding: '0.82rem 1.55rem', textDecoration: 'none', fontSize: '0.92rem' }}>
                    Explore All 12 Toys
                  </a>
                  <a href="#feel-lab" className="btn-ghost" style={{ padding: '0.82rem 1.35rem', textDecoration: 'none', fontSize: '0.92rem' }}>
                    Play Lab
                  </a>
                </div>
              </div>

              {heroItems.length >= 2 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem' }}>
                  {heroItems.slice(0, 2).map((item) => (
                    <div
                      key={item.id}
                      onClick={() => setSelectedProduct(item)}
                      className="surface-card product-card"
                      style={{ padding: '1.1rem', display: 'grid', gridTemplateColumns: '140px 1fr', gap: '1.1rem', alignItems: 'center' }}
                    >
                      <img src={item.image_url} alt={item.name} style={{ width: '140px', height: '140px', objectFit: 'cover', borderRadius: '0.8rem', border: '2px solid #141417' }} />
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                        <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--blush)', textTransform: 'uppercase' }}>{item.vibe_chip}</span>
                        <div className="font-display" style={{ fontSize: '1.2rem', fontWeight: 700, lineHeight: 1.2 }}>{item.name}</div>
                        <MarshmallowMeter level={item.squish_level} label={item.squish_label} size={18} />
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginTop: '0.2rem' }}>
                          <span className="tabular-nums" style={{ fontWeight: 800, fontSize: '1.1rem' }}>${item.price_usd}</span>
                          <YelpPriceSigns tier={item.price_tier} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}

        {/* =================================================================
            HERO LAYOUT VARIANT 3: FROSTED AERO GLASS CAROUSEL
            ================================================================= */}
        {stylePreset === 'glass' && featuredHero && (
          <section style={{ maxWidth: '1160px', margin: '0 auto', padding: '2.4rem 1.25rem 1.8rem' }}>
            <div
              className="surface-card"
              style={{
                padding: 'clamp(1.5rem, 3.5vw, 2.6rem)',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))',
                gap: '2rem',
                alignItems: 'center',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <span style={{ alignSelf: 'flex-start', padding: '0.28rem 0.75rem', borderRadius: '999px', backgroundColor: 'var(--accent-soft)', color: 'var(--accent)', fontSize: '0.76rem', fontWeight: 700 }}>
                  {featuredHero.vibe_chip}
                </span>
                <h1 className="font-display" style={{ margin: 0, fontSize: 'clamp(2.1rem, 4vw, 3.2rem)', lineHeight: 1.08, fontWeight: 800 }}>
                  {featuredHero.name}
                </h1>
                <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '1rem' }}>
                  {featuredHero.short_tagline}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <MarshmallowMeter level={featuredHero.squish_level} label={featuredHero.squish_label} size={20} />
                  <YelpPriceSigns tier={featuredHero.price_tier} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', paddingTop: '0.25rem' }}>
                  <button
                    type="button"
                    onClick={(e) => addToBag(featuredHero, e)}
                    className="btn-primary"
                    style={{ padding: '0.8rem 1.5rem', fontSize: '0.92rem' }}
                  >
                    Add to Bag — ${featuredHero.price_usd}
                  </button>
                  <button
                    type="button"
                    onClick={() => setHeroIdx((i) => (i - 1 + heroItems.length) % heroItems.length)}
                    aria-label="Previous spotlight"
                    className="btn-ghost"
                    style={{ width: '40px', height: '40px', padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setHeroIdx((i) => (i + 1) % heroItems.length)}
                    aria-label="Next spotlight"
                    className="btn-ghost"
                    style={{ width: '40px', height: '40px', padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>

              <div
                onClick={() => setSelectedProduct(featuredHero)}
                style={{ cursor: 'pointer', display: 'flex', justifyContent: 'center' }}
              >
                <img
                  src={featuredHero.image_url}
                  alt={featuredHero.name}
                  style={{ width: '100%', maxWidth: '340px', aspectRatio: '1 / 1', objectFit: 'cover', borderRadius: '1.5rem', boxShadow: '0 22px 44px -16px rgba(15,42,74,0.22)' }}
                />
              </div>
            </div>
          </section>
        )}

        {/* =================================================================
            HERO LAYOUT VARIANT 4: NORDIC WARM EDITORIAL GALLERY
            ================================================================= */}
        {stylePreset === 'nordic' && featuredHero && (
          <section style={{ maxWidth: '1220px', margin: '0 auto', padding: '2.5rem 1.25rem 1.8rem' }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))',
                border: '1px solid var(--border)',
                borderRadius: '0.75rem',
                overflow: 'hidden',
                backgroundColor: 'var(--surface)',
              }}
            >
              <div style={{ padding: 'clamp(2rem, 4vw, 3.4rem)', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '1.1rem' }}>
                <div style={{ fontSize: '0.76rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>
                  Small-Batch Tactile Objects
                </div>
                <h1 className="font-display" style={{ margin: 0, fontSize: 'clamp(2.2rem, 4vw, 3.3rem)', fontWeight: 500, lineHeight: 1.1 }}>
                  Thoughtfully weighted tools for quiet focus.
                </h1>
                <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.98rem', maxWidth: '430px' }}>
                  Crafted from platinum silicone, hybrid ceramic bearings, and soft velour for calm everyday rituals.
                </p>
                <div>
                  <a href="#collection" className="btn-primary" style={{ display: 'inline-block', padding: '0.82rem 1.6rem', textDecoration: 'none', fontSize: '0.9rem' }}>
                    View Objects
                  </a>
                </div>
              </div>
              <div style={{ minHeight: '340px', backgroundColor: 'var(--surface-muted)' }}>
                <img src={featuredHero.image_url} alt={featuredHero.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              </div>
            </div>
          </section>
        )}

        {/* =================================================================
            CLEAN, BREATHABLE PRODUCT CATALOG GRID
            (Photo + Title + Happy Marshmallow Softness + Yelp $ Tier + Add!)
            ================================================================= */}
        <section id="collection" aria-labelledby="collection-heading" style={{ maxWidth: '1220px', margin: '0 auto', padding: '2rem 1.25rem 2.6rem' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '1.4rem' }}>
            <h2 id="collection-heading" className="font-display" style={{ margin: 0, fontSize: 'clamp(1.55rem, 2.8vw, 2.15rem)', fontWeight: 700 }}>
              Sensory Collection
            </h2>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem' }}>
              {COLLECTIONS.map((col) => {
                const active = activeCollection === col.id;
                return (
                  <button
                    key={col.id}
                    type="button"
                    onClick={() => setActiveCollection(col.id)}
                    className={active ? 'btn-primary' : 'btn-ghost'}
                    style={{ padding: '0.5rem 0.95rem', fontSize: '0.83rem' }}
                  >
                    {col.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns:
                stylePreset === 'nordic'
                  ? 'repeat(auto-fill, minmax(255px, 1fr))'
                  : 'repeat(auto-fill, minmax(276px, 1fr))',
              gap: '1.35rem',
            }}
          >
            {filteredItems.map((item) => (
              <article
                key={item.id}
                onClick={() => setSelectedProduct(item)}
                className="surface-card product-card"
                style={{
                  padding: stylePreset === 'nordic' ? '0.85rem' : '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '0.85rem',
                }}
              >
                <div>
                  <div
                    style={{
                      backgroundColor: 'var(--surface-muted)',
                      borderRadius: stylePreset === 'nordic' ? '0.45rem' : '1.1rem',
                      aspectRatio: '1 / 1',
                      position: 'relative',
                      overflow: 'hidden',
                    }}
                  >
                    <img
                      src={item.image_url}
                      alt={item.name}
                      loading="lazy"
                      className="product-img-zoom"
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    />
                    {stylePreset !== 'nordic' && (
                      <span
                        style={{
                          position: 'absolute',
                          top: '0.65rem',
                          left: '0.65rem',
                          padding: '0.22rem 0.6rem',
                          borderRadius: '999px',
                          backgroundColor: 'rgba(255, 255, 255, 0.90)',
                          color: '#141417',
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          backdropFilter: 'blur(6px)',
                        }}
                      >
                        {item.vibe_chip}
                      </span>
                    )}
                  </div>

                  <div style={{ paddingTop: '0.8rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '0.5rem' }}>
                      <h3 className="font-display" style={{ margin: 0, fontSize: '1.06rem', fontWeight: 600, lineHeight: 1.25 }}>
                        {item.name}
                      </h3>
                      <span className="tabular-nums" style={{ fontWeight: 800, fontSize: '1.05rem', flexShrink: 0 }}>
                        ${Number(item.price_usd).toFixed(0)}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.81rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                      {item.subtitle}
                    </div>
                  </div>
                </div>

                {/* Yelp-Style Visual Rating Bar: Happy Marshmallows + $ Signs + Quick Add */}
                <div
                  style={{
                    paddingTop: '0.65rem',
                    borderTop: '1px solid var(--border)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                    <MarshmallowMeter level={item.squish_level} size={18} />
                    <span style={{ color: 'var(--border)' }}>•</span>
                    <YelpPriceSigns tier={item.price_tier} />
                  </div>

                  <button
                    type="button"
                    onClick={(e) => addToBag(item, e)}
                    className="btn-primary"
                    aria-label={`Add ${item.name} to bag`}
                    style={{
                      padding: '0.45rem 0.85rem',
                      fontSize: '0.8rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                    }}
                  >
                    <Plus size={14} />
                    <span>Add</span>
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* Interactive Play Lab */}
        <TactileFeelLab />

        {/* Clean, Human Newsletter Box (Zero Audit Jargon!) */}
        <section style={{ maxWidth: '720px', margin: '0 auto', padding: '2rem 1.25rem 3.5rem' }}>
          <div
            className="surface-card"
            style={{
              padding: 'clamp(1.6rem, 3.5vw, 2.3rem)',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.75rem',
            }}
          >
            <h3 className="font-display" style={{ margin: 0, fontSize: '1.55rem', fontWeight: 700 }}>
              Join the newsletter to be in the know
            </h3>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.92rem', maxWidth: '440px' }}>
              Get early access to small-batch squishies, new spinner finishes, and seasonal gift boxes.
            </p>
            <form
              onSubmit={handleNewsletter}
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'center',
                gap: '0.55rem',
                width: '100%',
                maxWidth: '440px',
                marginTop: '0.35rem',
              }}
            >
              <input
                type="email"
                required
                value={newsletterEmail}
                onChange={(e) => setNewsletterEmail(e.target.value)}
                placeholder="Enter your email"
                aria-label="Email address for newsletter"
                style={{
                  flex: 1,
                  minWidth: '200px',
                  padding: '0.72rem 1rem',
                  borderRadius: 'var(--btn-radius)',
                  border: '1px solid var(--border)',
                  backgroundColor: 'var(--surface-muted)',
                  color: 'var(--text)',
                  fontSize: '0.9rem',
                }}
              />
              <button type="submit" className="btn-primary" style={{ padding: '0.72rem 1.35rem', fontSize: '0.88rem' }}>
                Subscribe
              </button>
            </form>
            {newsletterMsg && (
              <div style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--accent)', marginTop: '0.2rem' }}>
                {newsletterMsg}
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Quiet, Standard Brand Footer */}
      <footer
        id="legal"
        style={{
          borderTop: '1px solid var(--border)',
          backgroundColor: 'var(--surface-muted)',
          padding: '2rem 1.25rem',
        }}
      >
        <div
          style={{
            maxWidth: '1220px',
            margin: '0 auto',
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '1rem',
            fontSize: '0.8rem',
            color: 'var(--text-muted)',
          }}
        >
          <div>
            <strong style={{ color: 'var(--text)' }}>Kinetic Calm</strong> • Everyday tactile comfort objects (general wellness, non-medical). Free US shipping over $65.
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
            <button type="button" onClick={() => { setLegalTab('terms'); setLegalOpen(true); }} style={{ background: 'none', border: 'none', padding: 0, color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.8rem' }}>
              Terms
            </button>
            <button type="button" onClick={() => { setLegalTab('privacy'); setLegalOpen(true); }} style={{ background: 'none', border: 'none', padding: 0, color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.8rem' }}>
              Privacy &amp; Data Deletion
            </button>
            <button type="button" onClick={() => { setLegalTab('refund'); setLegalOpen(true); }} style={{ background: 'none', border: 'none', padding: 0, color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.8rem' }}>
              14-Day Returns
            </button>
            <button type="button" onClick={() => { setLegalTab('cpsia'); setLegalOpen(true); }} style={{ background: 'none', border: 'none', padding: 0, color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.8rem' }}>
              CPSC &amp; Wellness Info
            </button>
          </div>
        </div>
      </footer>

      {/* =====================================================================
          DEDICATED PRODUCT DETAIL MODAL / SHEET
          (All detailed specs, materials, sound dB & safety live cleanly here!)
          ===================================================================== */}
      {selectedProduct && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={selectedProduct.name}
          onClick={() => setSelectedProduct(null)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 820,
            backgroundColor: 'rgba(12, 16, 20, 0.58)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
        >
          <div
            className="surface-card"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '780px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: 'clamp(1.25rem, 3vw, 2rem)',
              position: 'relative',
              backgroundColor: theme === 'dark' ? '#151E24' : '#FFFFFF',
            }}
          >
            <button
              type="button"
              onClick={() => setSelectedProduct(null)}
              aria-label="Close product details"
              className="btn-ghost"
              style={{ position: 'absolute', top: '1rem', right: '1rem', width: '36px', height: '36px', padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <X size={18} />
            </button>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.75rem', alignItems: 'start' }}>
              <div style={{ borderRadius: '1.15rem', overflow: 'hidden', backgroundColor: 'var(--surface-muted)', aspectRatio: '1 / 1' }}>
                <img src={selectedProduct.image_url} alt={selectedProduct.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.95rem' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {selectedProduct.collection_label} • {selectedProduct.age_grade}
                  </span>
                  <h2 className="font-display" style={{ margin: '0.25rem 0 0.2rem', fontSize: '1.65rem', fontWeight: 700, lineHeight: 1.18 }}>
                    {selectedProduct.name}
                  </h2>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span className="tabular-nums" style={{ fontSize: '1.4rem', fontWeight: 800 }}>
                      ${Number(selectedProduct.price_usd).toFixed(2)}
                    </span>
                    <YelpPriceSigns tier={selectedProduct.price_tier} />
                  </div>
                </div>

                {/* Visual Softness & Sound Specs Card */}
                <div style={{ padding: '0.85rem 1rem', borderRadius: '0.95rem', backgroundColor: 'var(--surface-muted)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>Squishiness</span>
                    <MarshmallowMeter level={selectedProduct.squish_level} label={selectedProduct.squish_label} size={20} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
                    <span style={{ fontWeight: 700 }}>Sound Profile</span>
                    <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>{selectedProduct.sound_db}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
                    <span style={{ fontWeight: 700 }}>Tactile Feel</span>
                    <span style={{ color: 'var(--text-muted)', fontWeight: 600, textAlign: 'right' }}>{selectedProduct.vibe_chip}</span>
                  </div>
                </div>

                <p style={{ margin: 0, fontSize: '0.92rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                  {selectedProduct.full_story || selectedProduct.short_tagline}
                </p>

                <button
                  type="button"
                  onClick={(e) => {
                    addToBag(selectedProduct, e);
                    setSelectedProduct(null);
                  }}
                  className="btn-primary"
                  style={{ padding: '0.88rem 1.25rem', fontSize: '0.94rem', width: '100%' }}
                >
                  Add to Bag — ${Number(selectedProduct.price_usd).toFixed(2)}
                </button>

                {/* Materials & Safety neatly tucked at bottom of Detail View */}
                <div style={{ paddingTop: '0.65rem', borderTop: '1px solid var(--border)', fontSize: '0.76rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  <div><strong>Materials:</strong> {selectedProduct.material_spec}</div>
                  <div><strong>Care &amp; Safety:</strong> {selectedProduct.cpsia_astm_note} {selectedProduct.fda_wellness_note}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Slide-Over Bag Drawer */}
      {bagOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Shopping Bag"
          onClick={() => setBagOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 830,
            backgroundColor: 'rgba(10, 14, 18, 0.55)',
            display: 'flex',
            justifyContent: 'flex-end',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '410px',
              height: '100%',
              backgroundColor: theme === 'dark' ? '#151E24' : '#FFFFFF',
              padding: '1.35rem',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 className="font-display" style={{ margin: 0, fontSize: '1.35rem', fontWeight: 700 }}>
                Your Bag ({bagCount})
              </h2>
              <button type="button" onClick={() => setBagOpen(false)} aria-label="Close bag" className="btn-ghost" style={{ padding: '0.4rem 0.6rem' }}>
                <X size={18} />
              </button>
            </div>

            {bag.length === 0 ? (
              <div style={{ padding: '2.5rem 1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.92rem' }}>
                Your bag is empty. Pick a spinner, clicker, squishy, or musical plush to get started.
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
                  {bag.map((item) => (
                    <div
                      key={item.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        padding: '0.65rem',
                        borderRadius: '0.85rem',
                        backgroundColor: 'var(--surface-muted)',
                      }}
                    >
                      <img src={item.image_url} alt={item.name} style={{ width: '52px', height: '52px', objectFit: 'cover', borderRadius: '0.55rem' }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>{item.name}</div>
                        <div className="tabular-nums" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>${Number(item.price_usd).toFixed(2)}</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <button type="button" onClick={() => updateBagQty(item.id, -1)} aria-label="Decrease quantity" className="btn-ghost" style={{ padding: '0.25rem' }}>
                          <Minus size={13} />
                        </button>
                        <span className="tabular-nums" style={{ fontWeight: 700, minWidth: '18px', textAlign: 'center', fontSize: '0.82rem' }}>{item.quantity}</span>
                        <button type="button" onClick={() => updateBagQty(item.id, 1)} aria-label="Increase quantity" className="btn-ghost" style={{ padding: '0.25rem' }}>
                          <Plus size={13} />
                        </button>
                        <button type="button" onClick={() => updateBagQty(item.id, -999)} aria-label="Remove item" className="btn-ghost" style={{ padding: '0.25rem' }}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ padding: '0.85rem', borderRadius: '0.9rem', backgroundColor: 'var(--surface-muted)', display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                  <input
                    type="text"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value)}
                    placeholder="Promo code (optional)"
                    aria-label="Promo code"
                    style={{
                      padding: '0.55rem 0.75rem',
                      borderRadius: '0.6rem',
                      border: '1px solid var(--border)',
                      backgroundColor: theme === 'dark' ? '#0D1317' : '#FFFFFF',
                      color: 'var(--text)',
                      fontSize: '0.84rem',
                    }}
                  />
                  {vaultDiscountPct > 0 && (
                    <div style={{ fontSize: '0.76rem', color: 'var(--accent)', fontWeight: 700 }}>
                      Calm Rewards applied: {vaultDiscountPct}%
                    </div>
                  )}
                </div>

                {quote && (
                  <div className="tabular-nums" style={{ padding: '0.95rem', borderRadius: '0.9rem', border: '1px solid var(--border)', fontSize: '0.86rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Subtotal</span>
                      <strong>${quote.subtotal_usd.toFixed(2)}</strong>
                    </div>
                    {quote.discount_usd > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--accent)' }}>
                        <span>Savings</span>
                        <strong>-${quote.discount_usd.toFixed(2)}</strong>
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Shipping</span>
                      <strong>{quote.shipping_usd === 0 ? 'Free' : `$${quote.shipping_usd.toFixed(2)}`}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border)', paddingTop: '0.45rem', fontSize: '1.04rem', fontWeight: 800 }}>
                      <span>Total</span>
                      <span>${quote.total_usd.toFixed(2)}</span>
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleCheckout}
                  className="btn-primary"
                  style={{ padding: '0.88rem', fontSize: '0.92rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.45rem' }}
                >
                  <Lock size={15} />
                  <span>Checkout</span>
                </button>

                {checkoutStatus && (
                  <div style={{ padding: '0.75rem', borderRadius: '0.75rem', backgroundColor: 'var(--blush-soft)', color: 'var(--blush)', fontSize: '0.8rem', fontWeight: 600 }}>
                    {checkoutStatus}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Discreet Studio Style & Layout Switcher Pill (Bottom-Left) */}
      <div style={{ position: 'fixed', bottom: '1rem', left: '1rem', zIndex: 740 }}>
        {styleDockOpen ? (
          <div
            className="surface-card"
            style={{
              padding: '0.75rem',
              width: '250px',
              backgroundColor: theme === 'dark' ? '#151E24' : '#FFFFFF',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.4rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.25rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 800 }}>Layout &amp; Style Options</span>
              <button type="button" onClick={() => setStyleDockOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0 }}>
                <X size={15} />
              </button>
            </div>
            {STYLE_PRESETS.map((sp) => {
              const active = stylePreset === sp.id;
              return (
                <button
                  key={sp.id}
                  type="button"
                  onClick={() => setStylePreset(sp.id)}
                  className={active ? 'btn-primary' : 'btn-ghost'}
                  style={{ padding: '0.5rem 0.7rem', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '1px' }}
                >
                  <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>{sp.name}</span>
                  <span style={{ fontSize: '0.68rem', opacity: 0.85, fontWeight: 500 }}>{sp.note}</span>
                </button>
              );
            })}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setStyleDockOpen(true)}
            className="btn-ghost"
            style={{
              padding: '0.5rem 0.85rem',
              fontSize: '0.78rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              backgroundColor: theme === 'dark' ? '#151E24' : '#FFFFFF',
              boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
            }}
          >
            <Palette size={14} style={{ color: 'var(--accent)' }} />
            <span>Preview 4 Styles</span>
          </button>
        )}
      </div>

      <LegalViews open={legalOpen} initialTab={legalTab} onClose={() => setLegalOpen(false)} />
    </div>
  );
}
