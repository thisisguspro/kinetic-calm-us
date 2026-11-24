import React, { useEffect, useMemo, useRef, useState } from 'react';
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
  ArrowDown,
  PackageCheck,
  User,
  ShieldCheck,
  ExternalLink,
} from 'lucide-react';
import LegalViews from './LegalViews.jsx';
import {
  CustomerAccountModal,
  AdminConsoleModal,
} from './AccountAndAdminModals.jsx';
import {
  SensoryStatCluster,
  GroceryQtyStepper,
  classifySoundProfile,
} from './SensoryMetersAndQty.jsx';

const COLLECTIONS = [
  { id: 'all', label: 'All 12 Toys' },
  { id: 'squishies_calm', label: 'Slow-Rise Squishies' },
  { id: 'fidget_spinners', label: 'R188 Spinners' },
  { id: 'clickers_sliders', label: 'Tactile Clickers' },
  { id: 'musical_plush', label: 'Musical Plush' },
];

const SOUND_FILTERS = [
  { id: 'all', label: 'Any Sound' },
  { id: 'silent', label: '0 dB Library Silent' },
  { id: 'click', label: 'Crisp Click' },
  { id: 'melody', label: 'Plays Music' },
];

const HERO_SLIDE_THEMES = [
  {
    badge: '01 / 04 • TOUCH-TO-SING FAVORITE',
    cardBg: 'linear-gradient(135deg, #FFF7E8 0%, #FFE4EC 100%)',
    stageGlow: 'rgba(255, 77, 109, 0.14)',
    accentPill: '#FFE0E7',
  },
  {
    badge: '02 / 04 • 3.6s VISCOUS MOCHI REBOUND',
    cardBg: 'linear-gradient(135deg, #FFF0F5 0%, #FCE7F3 100%)',
    stageGlow: 'rgba(244, 114, 182, 0.15)',
    accentPill: '#FCE7F3',
  },
  {
    badge: '03 / 04 • 3+ MIN R188 CERAMIC SPIN',
    cardBg: 'linear-gradient(135deg, #ECFEFF 0%, #DCFCE7 100%)',
    stageGlow: 'rgba(13, 148, 136, 0.14)',
    accentPill: '#DCFCE7',
  },
  {
    badge: '04 / 04 • 4 CUSTOM KEYBOARD SWITCHES',
    cardBg: 'linear-gradient(135deg, #FEF9C3 0%, #E0E7FF 100%)',
    stageGlow: 'rgba(245, 158, 11, 0.15)',
    accentPill: '#FEF3C7',
  },
];

export default function App() {
  const emotePack = 'paw_wave';

  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem('kc_theme') || 'light';
    } catch {
      return 'light';
    }
  });

  const [splashState, setSplashState] = useState(null);

  // Pinned 4-Slide Scroll Showcase State
  const heroTrackRef = useRef(null);
  const [heroIdx, setHeroIdx] = useState(0);
  const [heroScrollPct, setHeroScrollPct] = useState(0);
  const [cardTilt, setCardTilt] = useState({ rx: 0, ry: 0 });

  const [catalog, setCatalog] = useState([]);
  const [activeCollection, setActiveCollection] = useState('all');
  const [soundFilter, setSoundFilter] = useState('all');
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

  const [authState, setAuthState] = useState({ authenticated: false, user: null });
  const [accountOpen, setAccountOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [bundleConfig, setBundleConfig] = useState({ active: true, min_items: 3, discount_pct: 12 });
  const [referralCodeFromUrl, setReferralCodeFromUrl] = useState(() => {
    if (typeof window === 'undefined') return '';
    const qRef = new URLSearchParams(window.location.search).get('ref') || '';
    if (qRef) {
      try {
        localStorage.setItem('kc_pending_ref', qRef.trim().toUpperCase());
      } catch {}
      return qRef.trim().toUpperCase();
    }
    try {
      return localStorage.getItem('kc_pending_ref') || '';
    } catch {
      return '';
    }
  });
  const [referralBanner, setReferralBanner] = useState(null);

  const [legalOpen, setLegalOpen] = useState(false);
  const [legalTab, setLegalTab] = useState('fda');

  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterMsg, setNewsletterMsg] = useState('');

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
        setAccountOpen(false);
        setAdminOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const refreshCatalog = () => {
    fetch('/api/catalog')
      .then((r) => r.json())
      .then((catData) => {
        setCatalog(Array.isArray(catData?.items) ? catData.items : []);
        if (catData?.bundle_config) setBundleConfig(catData.bundle_config);
      })
      .catch(() => {});
  };

  const refreshAuth = () => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => {
        setAuthState(d || { authenticated: false, user: null });
      })
      .catch(() => {});
  };

  useEffect(() => {
    refreshCatalog();
    refreshAuth();
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const openTarget = params.get('open');
      if (openTarget === 'account') setAccountOpen(true);
      if (openTarget === 'admin') setAdminOpen(true);
      const checkoutFlag = params.get('checkout');
      const orderId = params.get('order');
      const sessionId = params.get('session_id');
      if (checkoutFlag === 'success' && orderId && sessionId) {
        fetch(`/api/checkout/verify?order=${encodeURIComponent(orderId)}&session_id=${encodeURIComponent(sessionId)}`)
          .then((r) => r.json())
          .then((v) => {
            if (v?.paid && v?.order) {
              setBag([]);
              setBagOpen(true);
              setCheckoutStatus(`Order ${v.order.id} paid & confirmed! ${v.order.offer_fulfillment_note || ''}`);
            }
          })
          .catch(() => {});
      }
      if ((openTarget || checkoutFlag) && window.history?.replaceState) {
        params.delete('open');
        params.delete('checkout');
        params.delete('order');
        params.delete('session_id');
        const qs = params.toString();
        window.history.replaceState({}, '', `${window.location.pathname}${qs ? `?${qs}` : ''}`);
      }
    }
  }, []);

  useEffect(() => {
    if (!referralCodeFromUrl) return;
    fetch(`/api/referral-verify?ref=${encodeURIComponent(referralCodeFromUrl)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d?.valid) setReferralBanner(d);
      })
      .catch(() => {});
  }, [referralCodeFromUrl]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    setAuthState({ authenticated: false, user: null });
    setVaultDiscountPct(0);
    setAdminOpen(false);
    setAccountOpen(false);
  };

  // Scroll-Driven Pinned 4-Item Top Carousel Listener (works across window & document scroll roots)
  useEffect(() => {
    const HEADER_H = 61;
    const handleScroll = () => {
      const el = heroTrackRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const stageH = Math.max(360, window.innerHeight - HEADER_H);
      const scrollable = Math.max(1, el.offsetHeight - stageH);
      const scrolled = Math.min(scrollable, Math.max(0, HEADER_H - rect.top));
      const pct = scrolled / scrollable;
      setHeroScrollPct(pct);
      const nextSlide = Math.min(3, Math.max(0, Math.floor(pct * 3.999)));
      setHeroIdx((prev) => (prev === nextSlide ? prev : nextSlide));
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    document.addEventListener('scroll', handleScroll, { passive: true, capture: true });
    window.addEventListener('resize', handleScroll, { passive: true });
    handleScroll();
    return () => {
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('scroll', handleScroll, { capture: true });
      window.removeEventListener('resize', handleScroll);
    };
  }, [catalog.length]);

  const jumpToHeroSlide = (targetIdx) => {
    const el = heroTrackRef.current;
    if (!el) {
      setHeroIdx(targetIdx);
      return;
    }
    const HEADER_H = 61;
    const stageH = Math.max(360, window.innerHeight - HEADER_H);
    const scrollable = Math.max(1, el.offsetHeight - stageH);
    const scrollRoot = document.scrollingElement || document.documentElement;
    const trackTop = el.getBoundingClientRect().top + (scrollRoot.scrollTop || window.scrollY || 0) - HEADER_H;
    const targetY = Math.max(0, trackTop + (targetIdx / 3.92) * scrollable + 8);
    window.scrollTo({ top: targetY, behavior: 'smooth' });
    setHeroIdx(targetIdx);
  };

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
        email: authState?.user?.email || newsletterEmail,
        referral_code: referralCodeFromUrl,
      }),
    })
      .then((r) => r.json())
      .then((q) => setQuote(q))
      .catch(() => {});
  }, [bag, promoCode, vaultDiscountPct, authState?.user?.email, referralCodeFromUrl]);

  const triggerInkSplashTheme = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const xPct = (((rect.left + rect.width / 2) / window.innerWidth) * 100).toFixed(1) + '%';
    const yPct = (((rect.top + rect.height / 2) / window.innerHeight) * 100).toFixed(1) + '%';
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setSplashState({
      x: xPct,
      y: yPct,
      color: nextTheme === 'dark' ? '#0F141A' : '#FCF8F2',
      key: Date.now(),
    });
    setTheme(nextTheme);
    setTimeout(() => setSplashState(null), 650);
  };

  const addToBag = (item, e) => {
    if (e) e.stopPropagation();
    if (!item || item.track !== 'TRACK_A_DIRECT') return;
    setBag((prev) => {
      const idx = prev.findIndex((p) => p.id === item.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], quantity: Math.min(20, next[idx].quantity + 1) };
        return next;
      }
      return [
        ...prev,
        { id: item.id, name: item.name, price_usd: item.price_usd, image_url: item.image_url, quantity: 1 },
      ];
    });
    setCheckoutStatus('');
    setToastMsg(`Added ${item.name}`);
    setTimeout(() => setToastMsg(''), 1900);
  };

  const updateBagQty = (id, delta) => {
    setBag((prev) =>
      prev
        .map((p) => (p.id === id ? { ...p, quantity: Math.min(20, p.quantity + delta) } : p))
        .filter((p) => p.quantity > 0)
    );
  };

  const bagCount = useMemo(() => bag.reduce((s, i) => s + i.quantity, 0), [bag]);
  const bagSubtotal = useMemo(() => bag.reduce((s, i) => s + Number(i.price_usd) * i.quantity, 0), [bag]);
  const freeShipRemaining = Math.max(0, 65 - bagSubtotal);

  const filteredItems = useMemo(() => {
    return catalog.filter((item) => {
      if (activeCollection !== 'all' && item.collection !== activeCollection) return false;
      if (soundFilter !== 'all') {
        const sp = classifySoundProfile(item);
        if (sp.kind !== soundFilter) return false;
      }
      return true;
    });
  }, [catalog, activeCollection, soundFilter]);

  const heroItems = useMemo(() => {
    if (!catalog.length) return [];
    const wanted = [
      'SH-REAL-01',
      'SH-REAL-04',
      'SH-REAL-08',
      'SH-REAL-10',
    ];
    const picked = wanted.map((id) => catalog.find((c) => c.id === id)).filter(Boolean);
    return picked.length ? picked : catalog.slice(0, 4);
  }, [catalog]);

  const activeHero = heroItems[heroIdx % Math.max(1, heroItems.length)] || catalog[0] || null;
  const activeHeroTheme = HERO_SLIDE_THEMES[heroIdx % HERO_SLIDE_THEMES.length];

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
      if (r.ok && data?.checkout_url) {
        setCheckoutStatus('Redirecting to secure Stripe Checkout...');
        window.location.assign(data.checkout_url);
        return;
      }
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

  const renderProductCard = (item, featuredWide = false, fullSpecHeader = false) => {
    const sound = classifySoundProfile(item);
    return (
      <article
        key={item.id}
        onClick={() => setSelectedProduct(item)}
        className="surface-card product-card"
        style={{
          padding: '1rem',
          gridColumn: featuredWide ? 'span 2' : undefined,
          display: featuredWide ? 'grid' : 'flex',
          gridTemplateColumns: featuredWide ? 'repeat(auto-fit, minmax(220px, 1fr))' : undefined,
          flexDirection: featuredWide ? undefined : 'column',
          justifyContent: 'space-between',
          gap: featuredWide ? '1.25rem' : '0.8rem',
          alignItems: featuredWide ? 'center' : 'stretch',
        }}
      >
        <div
          style={{
            backgroundColor: 'var(--surface-muted)',
            borderRadius: '1.05rem',
            border: '2px solid var(--border)',
            aspectRatio: featuredWide ? '16 / 12' : '1 / 1',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <img
            src={item.image_url}
            alt={item.name}
            loading="lazy"
            className="product-img-zoom"
            style={{ width: '100%', height: '100%', objectFit: 'contain', backgroundColor: '#ffffff', padding: '6px', display: 'block' }}
          />
          <span
            className="font-neo"
            style={{
              position: 'absolute',
              top: '0.6rem',
              left: '0.6rem',
              padding: '0.2rem 0.6rem',
              borderRadius: '999px',
              backgroundColor: '#FFF3C4',
              color: '#141417',
              border: '1.8px solid #141417',
              fontSize: '0.69rem',
              fontWeight: 800,
              boxShadow: '2px 2px 0px #141417',
            }}
          >
            {item.vibe_chip}
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '0.75rem', flex: 1 }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
              <h3 className="font-display" style={{ margin: 0, fontSize: featuredWide ? '1.35rem' : '1.08rem', fontWeight: 800, lineHeight: 1.2 }}>
                {item.name}
              </h3>
              <span
                className="tabular-nums font-neo"
                style={{
                  fontWeight: 800,
                  fontSize: featuredWide ? '1.25rem' : '1.08rem',
                  flexShrink: 0,
                  padding: '0.1rem 0.48rem',
                  borderRadius: '0.5rem',
                  backgroundColor: item.is_on_promotion ? 'var(--surface-blush)' : 'var(--surface-muted)',
                  color: item.is_on_promotion ? '#9F1239' : undefined,
                  border: '1.5px solid var(--border)',
                }}
              >
                {item.is_on_promotion && item.sale_price_usd ? (
                  <>
                    <span style={{ textDecoration: 'line-through', opacity: 0.55, marginRight: '0.28rem', fontSize: '0.84em' }}>
                      ${Number(item.price_usd).toFixed(2)}
                    </span>
                    ${Number(item.sale_price_usd).toFixed(2)}
                  </>
                ) : (
                  `$${Number(item.price_usd).toFixed(2)}`
                )}
              </span>
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.22rem' }}>
              {featuredWide ? item.short_tagline : item.subtitle}
            </div>

            {fullSpecHeader && (
              <div
                style={{
                  marginTop: '0.6rem',
                  padding: '0.5rem 0.65rem',
                  borderRadius: '0.75rem',
                  backgroundColor: 'var(--surface-muted)',
                  border: '1.5px solid var(--border-subtle)',
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '0.35rem',
                  fontSize: '0.72rem',
                }}
              >
                <div><strong>Feel:</strong> {item.squish_label}</div>
                <div><strong>Audio:</strong> {sound.shortLabel}</div>
              </div>
            )}
          </div>

          <div
            style={{
              paddingTop: '0.68rem',
              borderTop: '1.5px dashed var(--border-subtle)',
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '0.55rem',
            }}
          >
            <SensoryStatCluster item={item} emotePack={emotePack} compact={!featuredWide} />
            {item.track === 'TRACK_B_PARTNER' ? (
              <a
                href={item.partner_url || '#'}
                target="_blank"
                rel="noopener noreferrer sponsored"
                onClick={(e) => e.stopPropagation()}
                className="btn-ghost"
                style={{
                  textDecoration: 'none',
                  padding: '0.44rem 0.85rem',
                  borderRadius: '999px',
                  fontSize: '0.78rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.32rem',
                }}
              >
                <span>Shop Partner</span>
                <ExternalLink size={13} />
              </a>
            ) : (
              <GroceryQtyStepper item={item} bag={bag} onAdd={addToBag} onUpdateQty={updateBagQty} />
            )}
          </div>
        </div>
      </article>
    );
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

      {/* Subtle Toast */}
      {toastMsg && (
        <div
          role="status"
          className="font-neo"
          style={{
            position: 'fixed',
            top: '5rem',
            right: '1.25rem',
            zIndex: 760,
            backgroundColor: '#A7F3D0',
            color: '#064E3B',
            border: '2px solid #141417',
            boxShadow: '4px 4px 0px #141417',
            padding: '0.58rem 0.95rem',
            borderRadius: '0.85rem',
            fontWeight: 800,
            fontSize: '0.82rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
          }}
        >
          <CheckCircle2 size={15} />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* NEO-POP × CLAY-CLOUD STICKY HEADER */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 520,
          backgroundColor: theme === 'dark' ? 'rgba(15, 20, 26, 0.92)' : 'rgba(252, 248, 242, 0.94)',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          borderBottom: '2px solid var(--border)',
        }}
      >
        <div
          style={{
            maxWidth: '1260px',
            margin: '0 auto',
            padding: '0.72rem 1.25rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '0.75rem',
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
              className="font-neo"
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '0.75rem',
                backgroundColor: 'var(--accent)',
                color: '#FFFFFF',
                border: '2px solid var(--border)',
                boxShadow: '2px 2px 0px var(--border)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: '0.88rem',
              }}
            >
              KC
            </span>
            <span className="font-display" style={{ fontSize: '1.3rem', fontWeight: 800 }}>
              Kinetic Calm
            </span>
          </a>

          <nav aria-label="Main navigation" style={{ display: 'flex', alignItems: 'center', gap: '1.1rem' }}>
            <a href="#collection" className="font-neo" style={{ textDecoration: 'none', color: 'var(--text)', fontWeight: 700, fontSize: '0.88rem' }}>
              Shop ({catalog.length || 12})
            </a>
          </nav>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.48rem' }}>
            {authState?.user?.is_admin && (
              <button
                type="button"
                onClick={() => setAdminOpen(true)}
                className="btn-ghost"
                style={{ padding: '0.46rem 0.78rem', fontSize: '0.76rem', display: 'inline-flex', alignItems: 'center', gap: '0.32rem' }}
              >
                <ShieldCheck size={14} />
                <span>Admin</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setAccountOpen(true)}
              className="btn-ghost"
              style={{ padding: '0.46rem 0.82rem', fontSize: '0.79rem', display: 'inline-flex', alignItems: 'center', gap: '0.38rem' }}
            >
              <User size={15} />
              <span>{authState?.user ? 'Orders' : 'Sign In'}</span>
            </button>
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
              style={{ padding: '0.52rem 1rem', fontSize: '0.84rem', display: 'inline-flex', alignItems: 'center', gap: '0.42rem' }}
            >
              <ShoppingBag size={15} />
              <span className="tabular-nums">Bag ({bagCount})</span>
            </button>
          </div>
        </div>

        {referralBanner && (
          <div
            style={{
              borderTop: '1.5px solid var(--border)',
              backgroundColor: 'var(--surface-mint)',
              color: '#141417',
              padding: '0.36rem 1rem',
              textAlign: 'center',
              fontSize: '0.77rem',
              fontWeight: 700,
            }}
          >
            Invited by {referralBanner.referrer_first_name}: 10% Friend Referral Discount applies automatically to your first order!
          </div>
        )}
      </header>

      <main>
        {/* ===================================================================
            PINNED 4-ITEM SCROLL-DRIVEN TOP SHOWCASE CAROUSEL (280vh Sticky Stage)
            Scrolls smoothly through ALL 4 signature items before releasing!
            =================================================================== */}
        <div
          ref={heroTrackRef}
          style={{
            position: 'relative',
            height: heroItems.length >= 4 ? '280vh' : 'auto',
          }}
        >
          <section
            aria-label="Featured 4-item scroll showcase"
            style={{
              position: heroItems.length >= 4 ? 'sticky' : 'relative',
              top: '61px',
              height: heroItems.length >= 4 ? 'calc(100vh - 61px)' : 'auto',
              minHeight: '520px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              padding: '1.15rem 1.25rem 1.35rem',
              background:
                theme === 'dark'
                  ? `radial-gradient(circle at 68% 44%, ${activeHeroTheme.stageGlow}, transparent 58%)`
                  : `radial-gradient(circle at 68% 44%, ${activeHeroTheme.stageGlow}, transparent 62%)`,
              transition: 'background 0.35s ease',
            }}
          >
            <div style={{ maxWidth: '1240px', width: '100%', margin: '0 auto' }}>
              {activeHero && (
                <div key={activeHero.id} className="pinned-hero-grid hero-slide-enter">
                  {/* LEFT: Clay-Cloud Spacious Copy + Neo-Pop Typography, Emotes & Inline Stepper */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.5rem' }}>
                      <span
                        className="font-neo"
                        style={{
                          padding: '0.28rem 0.78rem',
                          borderRadius: '999px',
                          backgroundColor: activeHeroTheme.accentPill,
                          color: '#141417',
                          border: '2px solid #141417',
                          boxShadow: '2px 2px 0px #141417',
                          fontSize: '0.74rem',
                          fontWeight: 800,
                        }}
                      >
                        {activeHeroTheme.badge}
                      </span>
                      <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                        Scroll to preview all 4 icons ({Math.min(4, heroIdx + 1)}/4)
                      </span>
                    </div>

                    <h1
                      className="font-display"
                      style={{
                        margin: 0,
                        fontSize: 'clamp(2.25rem, 4.6vw, 3.85rem)',
                        lineHeight: 1.03,
                        fontWeight: 800,
                      }}
                    >
                      {activeHero.name}
                    </h1>

                    <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '1.05rem', maxWidth: '500px' }}>
                      {activeHero.short_tagline}
                    </p>

                    {/* Live Sensory Emotes Box (Squish + Sound/Noise + $ Tier) */}
                    <div
                      className="surface-card"
                      style={{
                        alignSelf: 'flex-start',
                        padding: '0.68rem 0.95rem',
                        borderRadius: '1rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                      }}
                    >
                      <SensoryStatCluster item={activeHero} emotePack={emotePack} />
                    </div>

                    {/* Inline Grocery Stepper + Explore / Skip Controls */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.75rem', paddingTop: '0.2rem' }}>
                      <GroceryQtyStepper
                        item={activeHero}
                        bag={bag}
                        onAdd={addToBag}
                        onUpdateQty={updateBagQty}
                        size="lg"
                      />
                      <button
                        type="button"
                        onClick={() => setSelectedProduct(activeHero)}
                        className="btn-ghost"
                        style={{ padding: '0.78rem 1.2rem', fontSize: '0.88rem' }}
                      >
                        Full Specs
                      </button>
                      <a
                        href="#collection"
                        className="btn-ghost"
                        style={{
                          padding: '0.78rem 1.1rem',
                          fontSize: '0.84rem',
                          textDecoration: 'none',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                        }}
                      >
                        <span>Shop All 12 Toys</span>
                        <ArrowDown size={14} />
                      </a>
                    </div>

                    {/* 4-Slide Scroll Progress Rail & Clickable Jump Thumbnails */}
                    <div style={{ paddingTop: '0.45rem' }}>
                      <div
                        style={{
                          height: '8px',
                          width: '100%',
                          maxWidth: '420px',
                          borderRadius: '999px',
                          border: '2px solid var(--border)',
                          backgroundColor: 'var(--surface)',
                          overflow: 'hidden',
                          marginBottom: '0.65rem',
                        }}
                      >
                        <div
                          style={{
                            height: '100%',
                            width: `${Math.max(12, Math.min(100, heroScrollPct * 100)).toFixed(1)}%`,
                            backgroundColor: 'var(--accent)',
                            transition: 'width 0.08s linear',
                          }}
                        />
                      </div>

                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.55rem' }}>
                        {heroItems.map((hi, idx) => {
                          const isCurrent = idx === heroIdx;
                          return (
                            <button
                              key={hi.id}
                              type="button"
                              onClick={() => jumpToHeroSlide(idx)}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.45rem',
                                padding: '0.32rem 0.65rem 0.32rem 0.36rem',
                                borderRadius: '0.8rem',
                                border: '2px solid var(--border)',
                                backgroundColor: isCurrent ? 'var(--surface-butter)' : 'var(--surface)',
                                color: isCurrent ? '#141417' : 'var(--text)',
                                boxShadow: isCurrent ? '3px 3px 0px var(--border)' : 'none',
                                cursor: 'pointer',
                                fontWeight: 800,
                                fontSize: '0.75rem',
                              }}
                            >
                              <img
                                src={hi.image_url}
                                alt=""
                                style={{
                                  width: '32px',
                                  height: '32px',
                                  borderRadius: '0.5rem',
                                  objectFit: 'contain',
                                  backgroundColor: '#ffffff',
                                  border: '1.5px solid #141417',
                                }}
                              />
                              <span className="font-neo">0{idx + 1}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* RIGHT: 3D Tilt Clay-Cloud × Neo-Pop Showcase Card */}
                  <div
                    onMouseMove={(e) => {
                      const r = e.currentTarget.getBoundingClientRect();
                      const nx = (e.clientX - r.left) / r.width - 0.5;
                      const ny = (e.clientY - r.top) / r.height - 0.5;
                      setCardTilt({ rx: (-ny * 8).toFixed(2), ry: (nx * 10).toFixed(2) });
                    }}
                    onMouseLeave={() => setCardTilt({ rx: 0, ry: 0 })}
                    onClick={() => setSelectedProduct(activeHero)}
                    className="surface-card"
                    style={{
                      padding: '1.25rem',
                      background: theme === 'dark' ? 'var(--surface)' : activeHeroTheme.cardBg,
                      cursor: 'pointer',
                      transform: `perspective(950px) rotateX(${cardTilt.rx}deg) rotateY(${cardTilt.ry}deg)`,
                      transition: 'transform 0.14s ease-out, background 0.35s ease',
                    }}
                  >
                    <div
                      style={{
                        borderRadius: '1.15rem',
                        border: '2px solid #141417',
                        overflow: 'hidden',
                        aspectRatio: '16 / 12',
                        backgroundColor: '#FFFFFF',
                        position: 'relative',
                      }}
                    >
                      <img
                        key={activeHero.id}
                        src={activeHero.image_url}
                        alt={activeHero.name}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'contain',
                          backgroundColor: '#ffffff',
                          padding: '6px',
                          display: 'block',
                        }}
                      />
                      <span
                        className="font-neo"
                        style={{
                          position: 'absolute',
                          bottom: '0.75rem',
                          right: '0.75rem',
                          padding: '0.32rem 0.78rem',
                          borderRadius: '999px',
                          backgroundColor: '#FFFFFF',
                          color: '#141417',
                          border: '2px solid #141417',
                          boxShadow: '3px 3px 0px #141417',
                          fontWeight: 800,
                          fontSize: '0.95rem',
                        }}
                      >
                        ${Number(activeHero.price_usd).toFixed(2)}
                      </span>
                    </div>

                    <div
                      style={{
                        marginTop: '0.9rem',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '0.6rem',
                        color: theme === 'dark' ? 'var(--text)' : '#141417',
                      }}
                    >
                      <span className="font-neo" style={{ fontSize: '0.8rem', fontWeight: 800 }}>
                        {activeHero.subtitle}
                      </span>
                      <span className="font-neo" style={{ fontSize: '0.76rem', fontWeight: 800, textDecoration: 'underline' }}>
                        Tap for Details →
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* ===================================================================
            COLLECTIBLE STAT-CARD & LIVE 3-PIECE CALM KIT BUNDLE DECK
            =================================================================== */}
        <section style={{ maxWidth: '1240px', margin: '0 auto', padding: '2rem 1.25rem 0.5rem' }}>
              <div
                className="surface-card"
                style={{
                  padding: '1.25rem 1.5rem',
                  background: theme === 'dark' ? 'var(--surface)' : 'linear-gradient(120deg, #DCFCE7 0%, #FFF3C4 100%)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                  color: theme === 'dark' ? 'var(--text)' : '#141417',
                }}
              >
                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                    <PackageCheck size={28} />
                    <div>
                      <div className="font-display" style={{ fontSize: '1.28rem', fontWeight: 800 }}>
                        Build Your 3-Piece Desk &amp; Travel Calm Kit
                        {bundleConfig?.active && (
                          <span
                            className="font-neo"
                            style={{
                              marginLeft: '0.55rem',
                              padding: '0.15rem 0.52rem',
                              borderRadius: '999px',
                              backgroundColor: '#FFFFFF',
                              border: '1.5px solid #141417',
                              fontSize: '0.74rem',
                              verticalAlign: 'middle',
                            }}
                          >
                            {bagCount >= (bundleConfig.min_items || 3)
                              ? `${bundleConfig.discount_pct || 12}% Bundle Unlocked!`
                              : `Add ${(bundleConfig.min_items || 3) - bagCount} more for ${bundleConfig.discount_pct || 12}% Off`}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.84rem', opacity: 0.88 }}>
                        Click <strong>+ Add</strong> on any card below — automatic {bundleConfig?.discount_pct || 12}% off 3+ items, Free US Shipping at $65+ ({freeShipRemaining <= 0 ? 'Unlocked!' : `$${freeShipRemaining.toFixed(0)} away`}), &amp; Give 10% / Get 10% Referrals.
                      </div>
                    </div>
                  </div>

                  {/* Live 3-Slot Bundle Visual Tray */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {[0, 1, 2].map((slotIdx) => {
                      const expandedBag = bag.flatMap((bi) => Array(bi.quantity).fill(bi));
                      const filledItem = expandedBag[slotIdx];
                      return (
                        <div
                          key={slotIdx}
                          title={filledItem ? filledItem.name : `Slot ${slotIdx + 1} empty`}
                          style={{
                            width: '46px',
                            height: '46px',
                            borderRadius: '0.8rem',
                            border: filledItem ? '2px solid #141417' : '2px dashed rgba(20, 20, 23, 0.38)',
                            backgroundColor: filledItem ? '#FFFFFF' : 'rgba(255, 255, 255, 0.55)',
                            boxShadow: filledItem ? '2px 2px 0px #141417' : 'none',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            overflow: 'hidden',
                            fontSize: '0.72rem',
                            fontWeight: 800,
                          }}
                        >
                          {filledItem ? (
                            <img src={filledItem.image_url} alt={filledItem.name} style={{ width: '100%', height: '100%', objectFit: 'contain', backgroundColor: '#ffffff', padding: '2px' }} />
                          ) : (
                            <span className="font-neo" style={{ opacity: 0.55 }}>0{slotIdx + 1}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Category + Sound Filter Bar */}
                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '0.65rem', paddingTop: '0.75rem', borderTop: '1.5px dashed rgba(20, 20, 23, 0.2)' }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                    {COLLECTIONS.map((col) => (
                      <button
                        key={col.id}
                        type="button"
                        onClick={() => setActiveCollection(col.id)}
                        className={activeCollection === col.id ? 'btn-primary' : 'btn-ghost'}
                        style={{ padding: '0.38rem 0.78rem', fontSize: '0.76rem' }}
                      >
                        {col.label}
                      </button>
                    ))}
                  </div>

                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    <span className="font-neo" style={{ fontSize: '0.72rem', fontWeight: 800 }}>Sound:</span>
                    {SOUND_FILTERS.map((sf) => (
                      <button
                        key={sf.id}
                        type="button"
                        onClick={() => setSoundFilter(sf.id)}
                        className={soundFilter === sf.id ? 'btn-primary' : 'btn-ghost'}
                        style={{ padding: '0.34rem 0.68rem', fontSize: '0.73rem' }}
                      >
                        {sf.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            <section id="collection" style={{ maxWidth: '1240px', margin: '0 auto', padding: '1.4rem 1.25rem 2rem' }}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(285px, 1fr))',
                  gap: '1.3rem',
                }}
              >
                {filteredItems.map((item) => renderProductCard(item, false, true))}
              </div>
            </section>

        {/* CLEAN HUMAN NEWSLETTER BOX */}
        <section style={{ maxWidth: '720px', margin: '0 auto', padding: '1.6rem 1.25rem 4.5rem' }}>
          <div
            className="surface-card"
            style={{
              padding: 'clamp(1.6rem, 3.5vw, 2.2rem)',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.75rem',
              background: theme === 'dark' ? 'var(--surface)' : 'linear-gradient(135deg, #FFFFFF 0%, #FFF7ED 100%)',
            }}
          >
            <span
              className="font-neo"
              style={{
                padding: '0.2rem 0.65rem',
                borderRadius: '999px',
                backgroundColor: 'var(--surface-blush)',
                border: '1.5px solid var(--border)',
                fontSize: '0.7rem',
                fontWeight: 800,
              }}
            >
              SMALL-BATCH DROPS
            </span>
            <h3 className="font-display" style={{ margin: 0, fontSize: '1.6rem', fontWeight: 800 }}>
              Join the newsletter to be in the know
            </h3>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.92rem', maxWidth: '440px' }}>
              First dibs on limited mochi taba squishies, anodized R188 spinner runs, and seasonal sensory gift boxes.
            </p>
            <form
              onSubmit={handleNewsletter}
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'center',
                gap: '0.55rem',
                width: '100%',
                maxWidth: '450px',
                marginTop: '0.3rem',
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
                  border: '2px solid var(--border)',
                  backgroundColor: 'var(--surface)',
                  color: 'var(--text)',
                  fontSize: '0.9rem',
                }}
              />
              <button type="submit" className="btn-primary" style={{ padding: '0.72rem 1.35rem', fontSize: '0.88rem' }}>
                Subscribe
              </button>
            </form>
            {newsletterMsg && (
              <div style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--mint-strong)', marginTop: '0.2rem' }}>
                {newsletterMsg}
              </div>
            )}
          </div>
        </section>
      </main>

      {/* FLOATING GROCERY MINI-BAG BAR (Shows live total + free shipping progress without opening cart!) */}
      {bagCount > 0 && !bagOpen && (
        <div
          style={{
            position: 'fixed',
            bottom: '1.1rem',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 730,
            width: 'min(92vw, 540px)',
          }}
        >
          <div
            className="surface-card"
            style={{
              padding: '0.65rem 0.9rem',
              borderRadius: '999px',
              backgroundColor: theme === 'dark' ? '#182029' : '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.75rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', minWidth: 0 }}>
              <div style={{ display: 'flex' }}>
                {bag.slice(0, 3).map((bi, i) => (
                  <img
                    key={bi.id}
                    src={bi.image_url}
                    alt=""
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      objectFit: 'contain',
                      backgroundColor: '#ffffff',
                      border: '2px solid #141417',
                      marginLeft: i === 0 ? 0 : '-8px',
                    }}
                  />
                ))}
              </div>
              <div style={{ fontSize: '0.78rem', lineHeight: 1.2 }}>
                <div className="font-neo" style={{ fontWeight: 800 }}>
                  {bagCount} {bagCount === 1 ? 'item' : 'items'} • ${bagSubtotal.toFixed(2)}
                </div>
                <div style={{ fontSize: '0.69rem', color: 'var(--mint-strong)', fontWeight: 700 }}>
                  {freeShipRemaining <= 0 ? 'Free US Shipping Unlocked!' : `Add $${freeShipRemaining.toFixed(0)} for Free US Shipping`}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setBagOpen(true)}
              className="btn-primary"
              style={{ padding: '0.5rem 1rem', borderRadius: '999px', fontSize: '0.8rem', flexShrink: 0 }}
            >
              Checkout →
            </button>
          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer
        id="legal"
        style={{
          borderTop: '2px solid var(--border)',
          backgroundColor: 'var(--surface-muted)',
          padding: '2rem 1.25rem 5rem',
        }}
      >
        <div
          style={{
            maxWidth: '1240px',
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
            <button type="button" onClick={() => { setLegalTab('terms'); setLegalOpen(true); }} style={{ background: 'none', border: 'none', padding: 0, color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>
              Terms
            </button>
            <button type="button" onClick={() => { setLegalTab('privacy'); setLegalOpen(true); }} style={{ background: 'none', border: 'none', padding: 0, color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>
              Privacy &amp; Data Deletion
            </button>
            <button type="button" onClick={() => { setLegalTab('refund'); setLegalOpen(true); }} style={{ background: 'none', border: 'none', padding: 0, color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>
              14-Day Returns
            </button>
            <button type="button" onClick={() => { setLegalTab('cpsia'); setLegalOpen(true); }} style={{ background: 'none', border: 'none', padding: 0, color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>
              CPSC &amp; Wellness Info
            </button>
            <button type="button" onClick={() => setAdminOpen(true)} style={{ background: 'none', border: 'none', padding: 0, color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>
              Admin Login
            </button>
          </div>
        </div>
      </footer>

      {/* PRODUCT DETAIL MODAL */}
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
              backgroundColor: 'var(--surface)',
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

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.65rem', alignItems: 'start' }}>
              <div style={{ borderRadius: '1.15rem', border: '2px solid var(--border)', overflow: 'hidden', backgroundColor: '#ffffff', padding: '8px', aspectRatio: '1 / 1' }}>
                <img src={selectedProduct.image_url} alt={selectedProduct.name} style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
                <div>
                  <span className="font-neo" style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--accent)', textTransform: 'uppercase' }}>
                    {selectedProduct.collection_label} • {selectedProduct.age_grade}
                  </span>
                  <h2 className="font-display" style={{ margin: '0.22rem 0', fontSize: '1.65rem', fontWeight: 800, lineHeight: 1.15 }}>
                    {selectedProduct.name}
                  </h2>
                  <div className="tabular-nums font-neo" style={{ fontSize: '1.4rem', fontWeight: 800 }}>
                    ${Number(selectedProduct.price_usd).toFixed(2)}
                  </div>
                </div>

                <div style={{ padding: '0.85rem 1rem', borderRadius: '0.95rem', border: '2px solid var(--border)', backgroundColor: 'var(--surface-muted)', display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                  <SensoryStatCluster item={selectedProduct} emotePack={emotePack} />
                  <div style={{ fontSize: '0.8rem' }}>
                    <strong>Sound Profile:</strong> {selectedProduct.sound_db}
                  </div>
                  <div style={{ fontSize: '0.8rem' }}>
                    <strong>Texture &amp; Action:</strong> {selectedProduct.texture_profile}
                  </div>
                </div>

                <p style={{ margin: 0, fontSize: '0.92rem', color: 'var(--text-muted)', lineHeight: 1.58 }}>
                  {selectedProduct.full_story || selectedProduct.short_tagline}
                </p>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                  {selectedProduct.track === 'TRACK_B_PARTNER' && selectedProduct.partner_url ? (
                    <a
                      href={selectedProduct.partner_url}
                      target="_blank"
                      rel="noopener noreferrer sponsored"
                      className="btn-primary"
                      style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                    >
                      <span>Shop Official Store ({selectedProduct.partner_name || selectedProduct.brand})</span>
                      <ExternalLink size={15} />
                    </a>
                  ) : (
                    <GroceryQtyStepper
                      item={selectedProduct}
                      bag={bag}
                      onAdd={addToBag}
                      onUpdateQty={updateBagQty}
                      size="lg"
                    />
                  )}
                </div>

                <div style={{ paddingTop: '0.65rem', borderTop: '1.5px dashed var(--border-subtle)', fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  <div><strong>Materials:</strong> {selectedProduct.material_spec}</div>
                  <div><strong>Care &amp; Safety:</strong> {selectedProduct.cpsia_astm_note} {selectedProduct.fda_wellness_note}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SLIDE-OVER BAG DRAWER */}
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
              maxWidth: '420px',
              height: '100%',
              backgroundColor: 'var(--surface)',
              borderLeft: '2px solid var(--border)',
              padding: '1.35rem',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 className="font-display" style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800 }}>
                Your Bag ({bagCount})
              </h2>
              <button type="button" onClick={() => setBagOpen(false)} aria-label="Close bag" className="btn-ghost" style={{ padding: '0.4rem 0.6rem' }}>
                <X size={18} />
              </button>
            </div>

            {bag.length === 0 ? (
              <div style={{ padding: '2.5rem 1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.92rem' }}>
                Your bag is empty. Click + Add on any spinner, clicker, squishy, or musical plush.
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
                        borderRadius: '0.9rem',
                        border: '2px solid var(--border)',
                        backgroundColor: 'var(--surface-muted)',
                      }}
                    >
                      <img src={item.image_url} alt={item.name} style={{ width: '52px', height: '52px', objectFit: 'contain', backgroundColor: '#ffffff', padding: '2px', borderRadius: '0.55rem', border: '1.5px solid #141417' }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 800, fontSize: '0.85rem' }}>{item.name}</div>
                        <div className="tabular-nums font-neo" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          ${Number(item.price_usd).toFixed(2)} each
                        </div>
                      </div>
                      <GroceryQtyStepper item={{ ...item, track: 'TRACK_A_DIRECT' }} bag={bag} onAdd={addToBag} onUpdateQty={updateBagQty} />
                    </div>
                  ))}
                </div>

                <input
                  type="text"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value)}
                  placeholder="Promo code (optional)"
                  aria-label="Promo code"
                  style={{
                    padding: '0.65rem 0.85rem',
                    borderRadius: '0.75rem',
                    border: '2px solid var(--border)',
                    backgroundColor: 'var(--surface)',
                    color: 'var(--text)',
                    fontSize: '0.85rem',
                  }}
                />

                {quote && (
                  <div className="tabular-nums" style={{ padding: '0.95rem', borderRadius: '0.95rem', border: '2px solid var(--border)', fontSize: '0.86rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Subtotal</span>
                      <strong>${quote.subtotal_usd.toFixed(2)}</strong>
                    </div>
                    {quote.discount_usd > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--mint-strong)' }}>
                        <span>Savings</span>
                        <strong>-${quote.discount_usd.toFixed(2)}</strong>
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Shipping</span>
                      <strong>{quote.shipping_usd === 0 ? 'Free' : `$${quote.shipping_usd.toFixed(2)}`}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1.5px dashed var(--border-subtle)', paddingTop: '0.45rem', fontSize: '1.06rem', fontWeight: 800 }}>
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
                  <div style={{ padding: '0.75rem', borderRadius: '0.75rem', border: '1.5px solid var(--border)', backgroundColor: 'var(--accent-soft)', color: 'var(--text)', fontSize: '0.8rem', fontWeight: 700 }}>
                    {checkoutStatus}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      <CustomerAccountModal
        open={accountOpen}
        onClose={() => setAccountOpen(false)}
        authState={authState}
        onLogout={handleLogout}
        onOpenAdmin={() => setAdminOpen(true)}
        referralCodeFromUrl={referralCodeFromUrl}
        vaultDiscountPct={vaultDiscountPct}
        onApplyVaultDiscount={(pct) => setVaultDiscountPct(pct)}
      />

      <AdminConsoleModal
        open={adminOpen}
        onClose={() => setAdminOpen(false)}
        authState={authState}
        onCatalogRefresh={refreshCatalog}
      />

      <LegalViews open={legalOpen} initialTab={legalTab} onClose={() => setLegalOpen(false)} />
    </div>
  );
}
