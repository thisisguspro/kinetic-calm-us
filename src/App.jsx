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
  MapPin
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

const KC_US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'DC', 'FL',
  'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME',
  'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH',
  'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI',
  'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
];

function validateKcUsShipping(addr) {
  if (!addr || typeof addr !== 'object') return 'Please enter your US shipping information.';
  if (String(addr.full_name || '').trim().length < 2) return 'Please enter recipient full name.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(addr.email || '').trim())) return 'Please enter a valid email address for tracking updates.';
  if (String(addr.phone || '').replace(/\D/g, '').length < 10) return 'Please enter a valid 10-digit US phone number.';
  if (String(addr.street || '').trim().length < 4) return 'Please enter your street address.';
  if (String(addr.city || '').trim().length < 2) return 'Please enter your city.';
  if (!KC_US_STATES.includes(String(addr.state || '').trim().toUpperCase())) return 'Please select a valid US state.';
  if (!/^\d{5}(-\d{4})?$/.test(String(addr.zip || '').trim())) return 'Please enter a valid 5-digit US ZIP code.';
  return '';
}

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

  const [gusproArrived] = useState(() => {
    if (typeof window === 'undefined') return false;
    const sp = new URLSearchParams(window.location.search);
    return sp.get('guspro_filter') === 'eligible' || sp.get('from') === 'guspro';
  });
  const [gusproEligibleOnly, setGusproEligibleOnly] = useState(gusproArrived);
  const [gusproPopupOpen, setGusproPopupOpen] = useState(gusproArrived);
  const gusproHubUrl = 'https://guspro-district.onrender.com/?region=US';
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
  const [searchQuery, setSearchQuery] = useState('');
  const [helpOpen, setHelpOpen] = useState(false);
  const [helpTab, setHelpTab] = useState('track');
  const [helpOrderId, setHelpOrderId] = useState('');
  const [receiptModal, setReceiptModal] = useState({ open: false, orderId: '', email: '' });
  const [showWishlistOnly, setShowWishlistOnly] = useState(false);
  const [wishlist, setWishlist] = useState(() => {
    try {
      const s = JSON.parse(localStorage.getItem('kc_wishlist_v1') || '[]');
      return Array.isArray(s) ? s : [];
    } catch { return []; }
  });
  const [isGift, setIsGift] = useState(false);
  const [giftNote, setGiftNote] = useState('');
  const [hidePriceOnSlip, setHidePriceOnSlip] = useState(false);
  const [saveBagEmail, setSaveBagEmail] = useState('');
  const [saveBagMsg, setSaveBagMsg] = useState('');
  const [faqBagOpen, setFaqBagOpen] = useState(false);

  useEffect(() => {
    try { localStorage.setItem('kc_wishlist_v1', JSON.stringify(wishlist)); } catch {}
  }, [wishlist]);

  useEffect(() => {
    if (!authState?.authenticated) return;
    fetch('/api/wishlist')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.ok && Array.isArray(d.product_ids) && d.product_ids.length) {
          setWishlist((prev) => Array.from(new Set([...prev, ...d.product_ids])));
        }
      })
      .catch(() => {});
  }, [authState?.authenticated]);

  const toggleWishlistItem = (productId) => {
    setWishlist((prev) => (prev.includes(productId) ? prev.filter((x) => x !== productId) : [...prev, productId]));
    if (authState?.authenticated) {
      fetch('/api/wishlist/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: productId }),
      }).catch(() => {});
    }
  };

  const openHelpCenter = (t = 'track', ordId = '') => {
    setHelpTab(t);
    setHelpOrderId(ordId || '');
    setHelpOpen(true);
  };
  const [promoCode, setPromoCode] = useState('');
  const [vaultDiscountPct, setVaultDiscountPct] = useState(0);
  const [quote, setQuote] = useState(null);
  const [checkoutStatus, setCheckoutStatus] = useState('');
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [shipping, setShipping] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('kc_shipping_v1') || '{}');
      if (saved && typeof saved === 'object') {
        return {
          full_name: saved.full_name || '',
          email: saved.email || '',
          phone: saved.phone || '',
          street: saved.street || '',
          apt: saved.apt || '',
          city: saved.city || '',
          state: saved.state || 'CA',
          zip: saved.zip || '',
        };
      }
    } catch {}
    return {
      full_name: '',
      email: '',
      phone: '',
      street: '',
      apt: '',
      city: '',
      state: 'CA',
      zip: '',
    };
  });

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
    try {
      localStorage.setItem('kc_shipping_v1', JSON.stringify(shipping));
    } catch {}
  }, [shipping]);

  useEffect(() => {
    if (authState?.user) {
      setShipping((prev) => ({
        ...prev,
        full_name: prev.full_name || authState.user.name || '',
        email: prev.email || authState.user.email || '',
      }));
    }
  }, [authState?.user]);

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
              try {
                localStorage.removeItem('kc_us_bag');
              } catch {}
              setBagOpen(true);
              setCheckoutStatus(`Payment confirmed! Order ${v.order.id} is recorded in Order History and sent to fulfillment.`);
            } else {
              setBagOpen(true);
              setCheckoutStatus(`Payment has not completed yet (${orderId}). Your bag items remain saved.`);
            }
          })
          .catch(() => {
            setBagOpen(true);
            setCheckoutStatus('Unable to verify Stripe session right now. Please refresh.');
          });
      } else if (checkoutFlag === 'cancelled') {
        if (orderId) {
          fetch('/api/checkout/abandon', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ order_id: orderId }),
          }).catch(() => {});
        }
        setBagOpen(true);
        setCheckoutStatus('Checkout cancelled before payment — no charge occurred and your bag items are saved.');
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
      const effectivePrice =
        item.is_on_promotion && Number(item.sale_price_usd) > 0
          ? Number(item.sale_price_usd)
          : Number(item.price_usd || 0);
      return [
        ...prev,
        { id: item.id, name: item.name, price_usd: effectivePrice, image_url: item.image_url, quantity: 1 },
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
      if (
        gusproEligibleOnly &&
        (item.is_on_promotion ||
          item.on_sale ||
          item.vault_discount_eligible === false ||
          item.vault_qualified === false ||
          ((item.track || item.fulfillment_track) && (item.track || item.fulfillment_track) !== 'TRACK_A_DIRECT'))
      ) {
        return false;
      }
      if (soundFilter !== 'all') {
        const sp = classifySoundProfile(item);
        if (sp.kind !== soundFilter) return false;
      }
      if (showWishlistOnly && !wishlist.includes(item.id)) return false;
      const sq = searchQuery.trim().toLowerCase();
      if (sq && !`${item.name} ${item.subtitle || ''} ${item.collection_label || ''}`.toLowerCase().includes(sq)) return false;
      return true;
    });
  }, [catalog, activeCollection, soundFilter, gusproEligibleOnly, showWishlistOnly, wishlist, searchQuery]);

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

  const handleCheckout = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (bag.length === 0 || checkoutBusy) return;
    setCheckoutStatus('');

    const addrErr = validateKcUsShipping(shipping);
    if (addrErr) {
      setCheckoutStatus(addrErr);
      return;
    }

    setCheckoutBusy(true);
    try {
      const r = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: bag.map((i) => ({ id: i.id, quantity: i.quantity })),
          promo_code: promoCode,
          vault_discount_pct: vaultDiscountPct,
          email: shipping.email.trim(),
          referral_code: referralCodeFromUrl || undefined,
          gift_options: { is_gift: Boolean(isGift || giftNote.trim()), gift_note: giftNote.trim(), hide_price_on_slip: Boolean(hidePriceOnSlip) },
          shipping_address: {
            full_name: shipping.full_name.trim(),
            email: shipping.email.trim(),
            phone: shipping.phone.trim(),
            street: shipping.street.trim(),
            apt: shipping.apt.trim(),
            city: shipping.city.trim(),
            state: shipping.state.trim().toUpperCase(),
            zip: shipping.zip.trim(),
          },
        }),
      });
      const data = await r.json();
      if (r.ok && data?.checkout_url) {
        setCheckoutStatus('Redirecting to secure Stripe Checkout...');
        window.location.assign(data.checkout_url);
        return;
      }
      setCheckoutStatus(data?.message || data?.error || 'Unable to start Stripe Checkout.');
    } catch {
      setCheckoutStatus('Unable to connect right now. Your bag items remain saved.');
    } finally {
      setCheckoutBusy(false);
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

  const renderProductCard = (item) => {
    const qtyInBag = bag.find((b) => b.id === item.id)?.quantity || 0;
    const isPartner = item.track === 'TRACK_B_PARTNER' || item.fulfillment_track === 'TRACK_B_PARTNER';
    const actPrice = item.is_on_promotion && item.sale_price_usd ? Number(item.sale_price_usd) : Number(item.price_usd || 0);
    const saved = wishlist.includes(item.id);
    return (
      <article
        key={item.id}
        onClick={() => setSelectedProduct(item)}
        className="surface-card product-card"
        style={{
          padding: '1rem',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: '0.8rem',
          cursor: 'pointer',
        }}
      >
        <div
          style={{
            background: '#efe8de',
            borderRadius: '1.05rem',
            border: '2px solid var(--border)',
            aspectRatio: '1 / 1',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <img
            src={item.pedestal_transparent_url || item.image_url}
            alt={item.name}
            loading="lazy"
            className="product-img-zoom"
            style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center bottom', display: 'block' }}
          />
          <button
            type="button"
            className={`card-wish-btn ${saved ? 'active' : ''}`}
            aria-label={saved ? `Remove ${item.name} from saved` : `Save ${item.name}`}
            onClick={(e) => { e.stopPropagation(); toggleWishlistItem(item.id); }}
          >
            <Heart size={14} fill={saved ? 'currentColor' : 'none'} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '0.65rem', flex: 1 }}>
          <div>
            <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--mint-strong)', textTransform: 'uppercase' }}>
              {item.collection_label || 'Kinetic Calm Studio'}
            </div>
            <h3 className="font-display" style={{ margin: '0.2rem 0 0', fontSize: '1.08rem', fontWeight: 800, lineHeight: 1.2 }}>
              {item.name}
            </h3>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderTop: '1.5px dashed var(--border-subtle)', paddingTop: '0.6rem' }}>
            <span className="tabular-nums font-neo" style={{ fontWeight: 800, fontSize: '1.12rem' }}>
              {item.is_on_promotion && item.sale_price_usd && (
                <span style={{ textDecoration: 'line-through', opacity: 0.55, marginRight: '0.35rem', fontSize: '0.82em' }}>
                  ${Number(item.price_usd).toFixed(2)}
                </span>
              )}
              ${actPrice.toFixed(2)}
            </span>
            <span style={{ fontSize: '0.73rem', fontWeight: 700, textDecoration: 'underline', color: 'var(--text-muted)' }}>
              Details
            </span>
          </div>

          <button
            type="button"
            className="btn-primary"
            style={{ width: '100%', padding: '0.6rem 0.9rem', fontSize: '0.82rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
            onClick={(e) => {
              e.stopPropagation();
              if (isPartner) {
                setSelectedProduct(item);
              } else {
                addToBag(item);
              }
            }}
          >
            <ShoppingBag size={14} />
            <span>{isPartner ? 'View Details' : qtyInBag > 0 ? `In Bag (${qtyInBag}) • Add +1` : 'Add to Cart'}</span>
          </button>
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

      <div
        className="guspro-network-strip"
        style={{
          background: '#111827',
          color: '#f8fafc',
          borderBottom: '1px solid rgba(245, 208, 97, 0.35)',
          padding: '6px 18px',
          fontSize: '0.72rem',
          letterSpacing: '0.05em',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '8px',
        }}
      >
        <a
          href={gusproHubUrl}
          style={{
            color: '#fbbf24',
            fontWeight: 700,
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span
            style={{
              border: '1px solid rgba(251, 191, 36, 0.55)',
              padding: '1px 7px',
              borderRadius: '4px',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              fontSize: '0.66rem',
            }}
          >
            by GusPro
          </span>
          <span style={{ color: '#f1f5f9', fontWeight: 500 }}>
            Shared GusPro % Rewards Network • View all accumulating boutiques
          </span>
        </a>
        <a
          href={gusproHubUrl}
          style={{ color: '#fbbf24', textDecoration: 'underline', fontWeight: 700, fontSize: '0.72rem' }}
        >
          GusPro District US
        </a>
      </div>

      {gusproPopupOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="GusPro Filter Notice"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1400,
            background: 'rgba(15, 20, 26, 0.68)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
        >
          <div
            className="surface-card"
            style={{
              maxWidth: '500px',
              width: '100%',
              background: '#fffaf3',
              color: '#18181b',
              border: '2px solid #18181b',
              borderRadius: '1.1rem',
              padding: '1.35rem 1.5rem',
              boxShadow: '0 24px 60px rgba(0, 0, 0, 0.35)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.68rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#9a3412' }}>
                FILTER ACTIVE • % POINTS BY GUSPRO
              </span>
              <button
                type="button"
                aria-label="Close notice"
                onClick={() => setGusproPopupOpen(false)}
                style={{ background: 'transparent', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#18181b', lineHeight: 1 }}
              >
                ✕
              </button>
            </div>
            <h3 className="font-neo" style={{ fontSize: '1.22rem', fontWeight: 800, margin: '0 0 8px', color: '#18181b' }}>
              Showing only % discount-eligible items
            </h3>
            <p style={{ fontSize: '0.84rem', lineHeight: 1.55, color: '#3f3f46', margin: '0 0 16px' }}>
              Because you arrived from the GusPro portal, we filtered this boutique to show only items that accept your shared % discount points (each qualifying SKU enforces up to its listed cap). Not every product participates. Remove the filter anytime to browse all items.
            </p>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn-primary"
                style={{ padding: '0.58rem 1rem', fontSize: '0.78rem' }}
                onClick={() => setGusproPopupOpen(false)}
              >
                Keep % Eligible Filter
              </button>
              <button
                type="button"
                className="btn-ghost"
                style={{ padding: '0.58rem 1rem', fontSize: '0.78rem' }}
                onClick={() => {
                  setGusproEligibleOnly(false);
                  setGusproPopupOpen(false);
                }}
              >
                Show All Items
              </button>
            </div>
          </div>
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
              onClick={() => setShowWishlistOnly((v) => !v)}
              className={showWishlistOnly ? 'btn-primary' : 'btn-ghost'}
              style={{ padding: '0.46rem 0.72rem', fontSize: '0.76rem', display: 'inline-flex', alignItems: 'center', gap: '0.32rem' }}
              title="Saved items"
            >
              <Heart size={14} fill={showWishlistOnly ? 'currentColor' : 'none'} />
              <span>Saved ({wishlist.length})</span>
            </button>
            <button
              type="button"
              onClick={() => openHelpCenter('track')}
              className="btn-ghost"
              style={{ padding: '0.46rem 0.78rem', fontSize: '0.76rem', display: 'inline-flex', alignItems: 'center', gap: '0.32rem' }}
              title="Track Order, Returns, FAQ & Support"
            >
              <HelpCircle size={14} />
              <span>Track &amp; Help</span>
            </button>
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
        {bagCount > 0 && !bagOpen && (
          <div className="saved-cart-banner" role="region" aria-label="Saved bag reminder">
            <span><strong>Your sensory bag is saved ({bagCount} {bagCount === 1 ? 'item' : 'items'}):</strong> free US shipping at $65+.</span>
            <button type="button" className="btn-ghost" style={{ padding: '0.32rem 0.8rem', fontSize: '0.76rem' }} onClick={() => setBagOpen(true)}>
              Open Bag &amp; Checkout
            </button>
          </div>
        )}
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
                                src={hi.pedestal_transparent_url || hi.image_url}
                                alt=""
                                style={{
                                  width: '32px',
                                  height: '32px',
                                  borderRadius: '0.5rem',
                                  objectFit: 'cover',
                                  background: '#efe8de',
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
                        aspectRatio: '1 / 1',
                        background: '#efe8de',
                        position: 'relative',
                      }}
                    >
                      <img
                        key={activeHero.id}
                        src={activeHero.pedestal_transparent_url || activeHero.image_url}
                        alt={activeHero.name}
                        style={{
                          position: 'relative',
                          zIndex: 1,
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          objectPosition: 'center bottom',
                          backgroundColor: 'transparent',
                          padding: 0,
                          filter: 'none',
                          display: 'block',
                        }}
                      />
                      <span
                        className="font-neo"
                        style={{
                          position: 'absolute',
                          bottom: '0.75rem',
                          right: '0.75rem',
                          zIndex: 2,
                          padding: '0.32rem 0.78rem',
                          borderRadius: '999px',
                          backgroundColor: '#FFF7E8',
                          color: '#141417',
                          border: '2px solid #141417',
                          boxShadow: '3px 3px 0px #141417',
                          fontWeight: 800,
                          fontSize: '0.95rem',
                        }}
                      >
                        {activeHero.is_on_promotion && activeHero.sale_price_usd ? (
                          <>
                            <span style={{ textDecoration: 'line-through', opacity: 0.55, marginRight: '0.35rem', fontSize: '0.84em' }}>
                              ${Number(activeHero.price_usd).toFixed(2)}
                            </span>
                            ${Number(activeHero.sale_price_usd).toFixed(2)}
                          </>
                        ) : (
                          `$${Number(activeHero.price_usd).toFixed(2)}`
                        )}
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
                            <img src={filledItem.pedestal_transparent_url || filledItem.image_url} alt={filledItem.name} style={{ width: '100%', height: '100%', objectFit: 'cover', background: '#efe8de', padding: 0 }} />
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
                    <div style={{ position: 'relative' }}>
                      <Search size={13} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                      <input
                        type="search"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search tactile tools..."
                        aria-label="Search tactile tools"
                        style={{ padding: '0.34rem 0.7rem 0.34rem 28px', borderRadius: '0.75rem', border: '1.5px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: '0.74rem' }}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setGusproEligibleOnly((prev) => !prev)}
                      className={gusproEligibleOnly ? 'btn-primary' : 'btn-ghost'}
                      style={{ padding: '0.34rem 0.78rem', fontSize: '0.73rem' }}
                    >
                      {gusproEligibleOnly ? '% Eligible Only (On)' : '% Eligible Filter'}
                    </button>
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
                      objectFit: 'cover',
                      backgroundColor: '#efe8de',
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

      <ProductDetailDrawer
        item={selectedProduct}
        isOpen={Boolean(selectedProduct)}
        onClose={() => setSelectedProduct(null)}
        bag={bag}
        onAdd={addToBag}
        onUpdateQty={updateBagQty}
        wishlist={wishlist}
        onToggleWishlist={toggleWishlistItem}
        authState={authState}
        emotePack={emotePack}
        onOpenHelpTab={(t) => openHelpCenter(t)}
      />

      <StoreHelpAndTrackModal
        isOpen={helpOpen}
        initialTab={helpTab}
        initialOrderId={helpOrderId}
        onClose={() => setHelpOpen(false)}
        authState={authState}
        onOpenReceipt={(ordId, eml) => {
          setHelpOpen(false);
          setReceiptModal({ open: true, orderId: ordId, email: eml });
        }}
      />

      <PrintableInvoiceModal
        isOpen={receiptModal.open}
        orderId={receiptModal.orderId}
        email={receiptModal.email}
        onClose={() => setReceiptModal({ open: false, orderId: '', email: '' })}
      />

      <StoreConciergeWidget
        onOpenHelpTab={(t) => openHelpCenter(t)}
        wishlistCount={wishlist.length}
        onToggleWishlistFilter={() => setShowWishlistOnly((v) => !v)}
      />

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
              maxWidth: '460px',
              height: '100%',
              backgroundColor: 'var(--surface)',
              borderLeft: '2px solid var(--border)',
              padding: '1.35rem',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.95rem',
              boxSizing: 'border-box',
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
                      <img src={item.pedestal_transparent_url || item.image_url} alt={item.name} style={{ width: '52px', height: '52px', objectFit: 'cover', background: '#efe8de', padding: 0, borderRadius: '0.55rem', border: '1.5px solid #141417' }} />
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

                <form onSubmit={handleCheckout} style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
                  <div
                    style={{
                      padding: '0.85rem',
                      borderRadius: '0.85rem',
                      border: '2px solid var(--border)',
                      backgroundColor: 'var(--surface-muted)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.55rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.78rem', fontWeight: 800 }}>
                      <MapPin size={14} />
                      <span>US SHIPPING DETAILS (REQUIRED BEFORE PAYMENT)</span>
                    </div>

                    <input
                      type="text"
                      required
                      value={shipping.full_name}
                      onChange={(e) => setShipping((p) => ({ ...p, full_name: e.target.value }))}
                      placeholder="Full Name *"
                      aria-label="Recipient full name"
                      style={{ width: '100%', boxSizing: 'border-box', padding: '0.55rem 0.7rem', borderRadius: '0.6rem', border: '1.5px solid var(--border)', backgroundColor: 'var(--surface)', color: 'var(--text)', fontSize: '0.82rem' }}
                    />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.45rem' }}>
                      <input
                        type="email"
                        required
                        value={shipping.email}
                        onChange={(e) => setShipping((p) => ({ ...p, email: e.target.value }))}
                        placeholder="Email for Receipt *"
                        aria-label="Shipping receipt email"
                        style={{ width: '100%', boxSizing: 'border-box', padding: '0.55rem 0.7rem', borderRadius: '0.6rem', border: '1.5px solid var(--border)', backgroundColor: 'var(--surface)', color: 'var(--text)', fontSize: '0.82rem' }}
                      />
                      <input
                        type="tel"
                        required
                        value={shipping.phone}
                        onChange={(e) => setShipping((p) => ({ ...p, phone: e.target.value }))}
                        placeholder="Phone (10 digits) *"
                        aria-label="Shipping phone number"
                        style={{ width: '100%', boxSizing: 'border-box', padding: '0.55rem 0.7rem', borderRadius: '0.6rem', border: '1.5px solid var(--border)', backgroundColor: 'var(--surface)', color: 'var(--text)', fontSize: '0.82rem' }}
                      />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.45rem' }}>
                      <input
                        type="text"
                        required
                        value={shipping.street}
                        onChange={(e) => setShipping((p) => ({ ...p, street: e.target.value }))}
                        placeholder="Street Address *"
                        aria-label="Street address"
                        style={{ width: '100%', boxSizing: 'border-box', padding: '0.55rem 0.7rem', borderRadius: '0.6rem', border: '1.5px solid var(--border)', backgroundColor: 'var(--surface)', color: 'var(--text)', fontSize: '0.82rem' }}
                      />
                      <input
                        type="text"
                        value={shipping.apt}
                        onChange={(e) => setShipping((p) => ({ ...p, apt: e.target.value }))}
                        placeholder="Apt / Unit"
                        aria-label="Apartment or unit"
                        style={{ width: '100%', boxSizing: 'border-box', padding: '0.55rem 0.7rem', borderRadius: '0.6rem', border: '1.5px solid var(--border)', backgroundColor: 'var(--surface)', color: 'var(--text)', fontSize: '0.82rem' }}
                      />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1fr 1.2fr', gap: '0.45rem' }}>
                      <input
                        type="text"
                        required
                        value={shipping.city}
                        onChange={(e) => setShipping((p) => ({ ...p, city: e.target.value }))}
                        placeholder="City *"
                        aria-label="City"
                        style={{ width: '100%', boxSizing: 'border-box', padding: '0.55rem 0.7rem', borderRadius: '0.6rem', border: '1.5px solid var(--border)', backgroundColor: 'var(--surface)', color: 'var(--text)', fontSize: '0.82rem' }}
                      />
                      <select
                        required
                        value={shipping.state}
                        onChange={(e) => setShipping((p) => ({ ...p, state: e.target.value }))}
                        aria-label="US State"
                        style={{ width: '100%', boxSizing: 'border-box', padding: '0.55rem 0.45rem', borderRadius: '0.6rem', border: '1.5px solid var(--border)', backgroundColor: 'var(--surface)', color: 'var(--text)', fontSize: '0.82rem' }}
                      >
                        {KC_US_STATES.map((st) => (
                          <option key={st} value={st}>
                            {st}
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        required
                        value={shipping.zip}
                        onChange={(e) => setShipping((p) => ({ ...p, zip: e.target.value }))}
                        placeholder="ZIP *"
                        aria-label="ZIP code"
                        style={{ width: '100%', boxSizing: 'border-box', padding: '0.55rem 0.7rem', borderRadius: '0.6rem', border: '1.5px solid var(--border)', backgroundColor: 'var(--surface)', color: 'var(--text)', fontSize: '0.82rem' }}
                      />
                    </div>
                  </div>

                  <div style={{ padding: '0.75rem', borderRadius: '0.85rem', border: '1.5px solid var(--border)', background: 'var(--surface-muted)', display: 'flex', flexDirection: 'column', gap: '0.45rem', fontSize: '0.78rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontWeight: 700, cursor: 'pointer' }}>
                      <input type="checkbox" checked={isGift} onChange={(e) => setIsGift(e.target.checked)} />
                      <span>Add Gift Note &amp; Optional Price-Hidden Gift Slip</span>
                    </label>
                    {isGift && (
                      <>
                        <textarea rows={2} value={giftNote} onChange={(e) => setGiftNote(e.target.value)} placeholder="Gift message (optional)..." style={{ width: '100%', padding: '0.45rem', borderRadius: '0.5rem', border: '1.5px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: '0.78rem' }} />
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', cursor: 'pointer' }}>
                          <input type="checkbox" checked={hidePriceOnSlip} onChange={(e) => setHidePriceOnSlip(e.target.checked)} />
                          <span>Hide prices on gift packing slip</span>
                        </label>
                      </>
                    )}
                    <div style={{ display: 'flex', gap: '0.4rem', borderTop: '1px dashed var(--border-subtle)', paddingTop: '0.45rem' }}>
                      <input type="email" value={saveBagEmail} onChange={(e) => setSaveBagEmail(e.target.value)} placeholder="Email me this saved bag..." style={{ flex: 1, padding: '0.4rem 0.6rem', borderRadius: '0.55rem', border: '1.5px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: '0.76rem' }} />
                      <button
                        type="button"
                        className="btn-ghost"
                        style={{ padding: '0.35rem 0.7rem', fontSize: '0.72rem' }}
                        onClick={async () => {
                          setSaveBagMsg('Sending...');
                          const r = await fetch('/api/cart/email-reminder', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ email: saveBagEmail, items: bag.map((b) => ({ product_id: b.id, quantity: b.quantity })) }),
                          });
                          const d = await r.json().catch(() => ({}));
                          setSaveBagMsg(r.ok ? 'Saved bag reminder sent/logged!' : d.error || 'Enter a valid email.');
                        }}
                      >
                        Email Bag
                      </button>
                    </div>
                    {saveBagMsg && <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--mint-strong)' }}>{saveBagMsg}</div>}
                    <button type="button" onClick={() => setFaqBagOpen((v) => !v)} style={{ background: 'none', border: 'none', padding: 0, textAlign: 'left', fontSize: '0.73rem', fontWeight: 700, textDecoration: 'underline', cursor: 'pointer', color: 'var(--text)' }}>
                      {faqBagOpen ? 'Hide checkout FAQ' : 'Shipping, pre-ship cancel & 30-day return FAQ'}
                    </button>
                    {faqBagOpen && (
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: 1.45 }}>
                        • Orders confirm strictly after Stripe payment succeeds.<br />
                        • Pre-ship orders cancel directly for an instant refund.<br />
                        • Backed by our 30-day US FTC guarantee &amp; CPSIA safety.
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)', lineHeight: 1.45 }}>
                    Orders confirm in Order History and dispatch to fulfillment only after Stripe payment succeeds.
                  </div>

                  <button
                    type="submit"
                    disabled={checkoutBusy}
                    className="btn-primary"
                    style={{ padding: '0.88rem', fontSize: '0.92rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.45rem' }}
                  >
                    <Lock size={15} />
                    <span>{checkoutBusy ? 'Opening Stripe Checkout...' : 'Pay Securely with Stripe'}</span>
                  </button>
                </form>

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
        onOpenReceipt={(ordId, eml) => setReceiptModal({ open: true, orderId: ordId, email: eml })}
        onOpenRma={(ordId) => { setAccountOpen(false); openHelpCenter('rma', ordId); }}
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
