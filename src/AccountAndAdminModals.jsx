import React, { useEffect, useState } from 'react';
import {
  X,
  Lock,
  ShieldCheck,
  Package,
  Gift,
  Copy,
  Check,
  LogOut,
  Plus,
  Trash2,
  Sliders,
  Users,
  ExternalLink,
} from 'lucide-react';

function GoogleMarkSVG({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" style={{ flexShrink: 0 }}>
      <path
        fill="#EA4335"
        d="M12 10.2v3.9h5.5c-.24 1.26-.96 2.33-2.04 3.05l3.3 2.56c1.92-1.77 3.04-4.38 3.04-7.49 0-.72-.06-1.41-.19-2.07H12z"
      />
      <path
        fill="#34A853"
        d="M12 22c2.75 0 5.06-.91 6.75-2.47l-3.3-2.56c-.91.61-2.08.98-3.45.98-2.65 0-4.9-1.79-5.7-4.2H2.89v2.64A9.99 9.99 0 0 0 12 22z"
      />
      <path
        fill="#4A90E2"
        d="M6.3 13.75A5.98 5.98 0 0 1 5.99 12c0-.61.11-1.2.31-1.75V7.61H2.89A9.99 9.99 0 0 0 2 12c0 1.61.39 3.14 1.09 4.39l3.21-2.64z"
      />
      <path
        fill="#FBBC05"
        d="M12 6.05c1.5 0 2.84.52 3.9 1.53l2.92-2.92C17.05 3.01 14.75 2 12 2A9.99 9.99 0 0 0 2.89 7.61l3.41 2.64c.8-2.41 3.05-4.2 5.7-4.2z"
      />
    </svg>
  );
}

export function GoogleSignInButton({ referralCode = '', asAdmin = false, label = 'Sign in with Google', compact = false }) {
  const qs = new URLSearchParams();
  if (referralCode) qs.set('ref', referralCode);
  if (asAdmin) {
    qs.set('admin', '1');
    qs.set('role', 'admin');
  }
  const href = `/api/auth/google${qs.toString() ? `?${qs.toString()}` : ''}`;
  return (
    <a
      href={href}
      className="btn-ghost"
      style={{
        textDecoration: 'none',
        padding: compact ? '0.45rem 0.8rem' : '0.68rem 1.15rem',
        fontSize: compact ? '0.78rem' : '0.86rem',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.48rem',
      }}
    >
      <GoogleMarkSVG size={compact ? 15 : 17} />
      <span>{label}</span>
    </a>
  );
}

/* ==========================================================================
   1. CUSTOMER GOOGLE ACCOUNT, ORDER HISTORY & CALM CLUB REFERRAL DRAWER
   ========================================================================== */
export function CustomerAccountModal({
  open,
  onClose,
  authState,
  onLogout,
  onOpenAdmin,
  referralCodeFromUrl = '',
  vaultDiscountPct = 0,
  onApplyVaultDiscount,
}) {
  const [activeTab, setActiveTab] = useState('orders'); // 'orders' | 'referrals'
  const [ordersData, setOrdersData] = useState({ orders: [], loading: false });
  const [refData, setRefData] = useState(null);
  const [copied, setCopied] = useState(false);

  const user = authState?.user || null;

  useEffect(() => {
    if (!open || !user) return;
    setOrdersData((p) => ({ ...p, loading: true }));
    Promise.all([
      fetch('/api/my/orders').then((r) => (r.ok ? r.json() : { orders: [] })),
      fetch('/api/my/referrals').then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([ord, ref]) => {
        setOrdersData({ orders: Array.isArray(ord?.orders) ? ord.orders : [], loading: false });
        setRefData(ref);
      })
      .catch(() => setOrdersData({ orders: [], loading: false }));
  }, [open, user?.id]);

  if (!open) return null;

  const copyShareUrl = () => {
    if (!refData?.share_url) return;
    navigator.clipboard?.writeText(refData.share_url).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="My Orders and Calm Club Rewards"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 820,
        backgroundColor: 'rgba(20, 20, 23, 0.56)',
        backdropFilter: 'blur(5px)',
        display: 'flex',
        justifyContent: 'flex-end',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(100vw, 460px)',
          height: '100%',
          backgroundColor: 'var(--bg)',
          borderLeft: '2px solid var(--border)',
          padding: '1.35rem',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          overflowY: 'auto',
          gap: '1.1rem',
        }}
      >
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <div className="font-display" style={{ fontSize: '1.35rem', fontWeight: 800 }}>
                Orders &amp; Calm Club
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Track shipments &amp; share Give 10% / Get 10% rewards
              </div>
            </div>
            <button type="button" onClick={onClose} className="btn-ghost" aria-label="Close account drawer" style={{ padding: '0.38rem' }}>
              <X size={18} />
            </button>
          </div>

          {!user ? (
            <div className="surface-card" style={{ padding: '1.35rem', display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
              <div className="font-display" style={{ fontSize: '1.15rem', fontWeight: 800 }}>
                Sign in with Google to view your orders
              </div>
              <p style={{ margin: 0, fontSize: '0.86rem', color: 'var(--text-muted)' }}>
                One-tap Google Sign-In links your order history, live tracking numbers, and your personal Calm Club referral link (friends get 10% off; you unlock up to 30% off).
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                <GoogleSignInButton referralCode={referralCodeFromUrl} label="Continue with Google" />
                {authState?.localhost_dev_helper_enabled && (
                  <GoogleSignInButton
                    referralCode={referralCodeFromUrl}
                    asAdmin
                    label="Local Dev: Sign in as Founder Admin"
                  />
                )}
              </div>
            </div>
          ) : (
            <>
              {/* Signed-In User Header Card */}
              <div
                className="surface-card"
                style={{
                  padding: '0.9rem 1rem',
                  marginBottom: '1rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '0.75rem',
                  backgroundColor: 'var(--surface-mint)',
                  color: '#141417',
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div className="font-neo" style={{ fontWeight: 800, fontSize: '0.88rem' }}>
                    {user.name}
                  </div>
                  <div style={{ fontSize: '0.75rem', opacity: 0.82, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {user.email}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
                  {user.is_admin && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenAdmin();
                      }}
                      className="btn-primary"
                      style={{ padding: '0.38rem 0.7rem', fontSize: '0.74rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                    >
                      <ShieldCheck size={13} />
                      <span>Admin</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={onLogout}
                    className="btn-ghost"
                    title="Sign out"
                    style={{ padding: '0.38rem 0.55rem', fontSize: '0.74rem' }}
                  >
                    <LogOut size={14} />
                  </button>
                </div>
              </div>

              {/* Sub-tabs: My Orders vs Referrals & Promos */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setActiveTab('orders')}
                  className={activeTab === 'orders' ? 'btn-primary' : 'btn-ghost'}
                  style={{ padding: '0.52rem', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
                >
                  <Package size={14} />
                  <span>My Orders ({ordersData.orders.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('referrals')}
                  className={activeTab === 'referrals' ? 'btn-primary' : 'btn-ghost'}
                  style={{ padding: '0.52rem', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
                >
                  <Gift size={14} />
                  <span>Referrals &amp; Perks</span>
                </button>
              </div>

              {activeTab === 'orders' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {ordersData.loading ? (
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Loading your orders...</div>
                  ) : ordersData.orders.length === 0 ? (
                    <div className="surface-card" style={{ padding: '1.25rem', textAlign: 'center' }}>
                      <div className="font-display" style={{ fontWeight: 800, fontSize: '1rem', marginBottom: '0.3rem' }}>
                        No orders yet
                      </div>
                      <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                        Completed purchases placed with <strong>{user.email}</strong> will appear here automatically with live US tracking numbers.
                      </div>
                    </div>
                  ) : (
                    ordersData.orders.map((ord) => (
                      <div key={ord.id} className="surface-card" style={{ padding: '0.95rem', display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 800 }}>
                          <span className="font-neo">Order #{ord.id}</span>
                          <span>${Number(ord.total_usd || 0).toFixed(2)}</span>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          Status: <strong>{ord.status || 'PROCESSING'}</strong>
                          {ord.tracking_number ? ` • Tracking: ${ord.tracking_number}` : ''}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeTab === 'referrals' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  <div className="surface-card" style={{ padding: '1.05rem', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                    <div className="font-display" style={{ fontWeight: 800, fontSize: '1.05rem' }}>
                      Give 10% Off, Unlock Up to 30% Off
                    </div>
                    <div style={{ fontSize: '0.81rem', color: 'var(--text-muted)' }}>
                      Share your personal Calm Club link. Friends automatically get <strong>10% off</strong> their first order, and you unlock <strong>+10% Calm Club Credit</strong> per completed referral (up to 30% max).
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        gap: '0.45rem',
                        alignItems: 'center',
                        padding: '0.5rem 0.65rem',
                        borderRadius: '0.75rem',
                        backgroundColor: 'var(--surface-muted)',
                        border: '1.5px solid var(--border)',
                        fontSize: '0.75rem',
                      }}
                    >
                      <code style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 700 }}>
                        {refData?.share_url || `/?ref=${user.referral_code || ''}`}
                      </code>
                      <button
                        type="button"
                        onClick={copyShareUrl}
                        className="btn-primary"
                        style={{ padding: '0.35rem 0.65rem', fontSize: '0.73rem', display: 'inline-flex', alignItems: 'center', gap: '0.28rem' }}
                      >
                        {copied ? <Check size={13} /> : <Copy size={13} />}
                        <span>{copied ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', paddingTop: '0.3rem' }}>
                      <div style={{ padding: '0.55rem', borderRadius: '0.7rem', backgroundColor: 'var(--surface-butter)', color: '#141417', border: '1.5px solid #141417' }}>
                        <div style={{ fontSize: '0.68rem', fontWeight: 700 }}>REFERRALS COMPLETED</div>
                        <div className="font-neo" style={{ fontSize: '1.15rem', fontWeight: 800 }}>
                          {refData?.referrals_completed_count ?? 0}
                        </div>
                      </div>
                      <div style={{ padding: '0.55rem', borderRadius: '0.7rem', backgroundColor: 'var(--surface-blush)', color: '#141417', border: '1.5px solid #141417' }}>
                        <div style={{ fontSize: '0.68rem', fontWeight: 700 }}>UNLOCKED CREDIT</div>
                        <div className="font-neo" style={{ fontSize: '1.15rem', fontWeight: 800 }}>
                          {refData?.unlocked_vault_pct ?? 0}% / 30%
                        </div>
                      </div>
                    </div>

                    {Number(refData?.unlocked_vault_pct || 0) > 0 && (
                      <button
                        type="button"
                        onClick={() => onApplyVaultDiscount(vaultDiscountPct > 0 ? 0 : refData.unlocked_vault_pct)}
                        className={vaultDiscountPct > 0 ? 'btn-ghost' : 'btn-primary'}
                        style={{ padding: '0.58rem', fontSize: '0.8rem' }}
                      >
                        {vaultDiscountPct > 0
                          ? `Calm Club ${vaultDiscountPct}% Applied in Bag (Click to Remove)`
                          : `Apply My ${refData.unlocked_vault_pct}% Calm Club Credit to Bag`}
                      </button>
                    )}
                  </div>

                  <div className="surface-card" style={{ padding: '0.95rem', fontSize: '0.79rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    <div className="font-neo" style={{ fontWeight: 800 }}>Active Storewide Perks:</div>
                    <div>• <strong>3-Piece Calm Kit Bundle:</strong> Automatic 12% off when you add any 3+ toys</div>
                    <div>• <strong>Free US Shipping:</strong> Unlocked automatically at $65+</div>
                    <div>• <strong>Free Bonus Gift:</strong> Calm Strip Travel Pack unlocked at $85+</div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ==========================================================================
   2. LOGIN-PROTECTED LUNA-STYLE FOUNDER & CO-ADMIN CONSOLE MODAL
   ========================================================================== */
export function AdminConsoleModal({ open, onClose, authState, onCatalogRefresh }) {
  const [tab, setTab] = useState('promos'); // 'promos' | 'catalog' | 'orders' | 'admins'
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const [newPromoCode, setNewPromoCode] = useState('');
  const [newPromoPct, setNewPromoPct] = useState(15);
  const [newPromoMin, setNewPromoMin] = useState(40);
  const [coAdminInput, setCoAdminInput] = useState('');

  const user = authState?.user || null;
  const isAdmin = Boolean(user?.is_admin);

  const loadOverview = () => {
    if (!isAdmin) return;
    setBusy(true);
    setErr('');
    fetch('/api/admin/overview')
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d?.error || 'Admin authentication required.');
        setData(d);
      })
      .catch((e) => setErr(e.message))
      .finally(() => setBusy(false));
  };

  useEffect(() => {
    if (open && isAdmin) {
      loadOverview();
    }
  }, [open, isAdmin]);

  if (!open) return null;

  const handleCreatePromo = async (e) => {
    e.preventDefault();
    if (!newPromoCode.trim()) return;
    const r = await fetch('/api/admin/promos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: newPromoCode,
        discount_pct: Number(newPromoPct),
        min_subtotal_usd: Number(newPromoMin),
        active: true,
      }),
    });
    const d = await r.json();
    if (!r.ok) {
      setErr(d?.error || 'Failed to save promo code.');
      return;
    }
    setNewPromoCode('');
    loadOverview();
  };

  const handleTogglePromo = async (code, nextActive) => {
    await fetch('/api/admin/promos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'toggle', code, active: nextActive }),
    });
    loadOverview();
  };

  const handleDeletePromo = async (code) => {
    await fetch('/api/admin/promos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', code }),
    });
    loadOverview();
  };

  const handleUpdateBundle = async (patch) => {
    const r = await fetch('/api/admin/bundle-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    if (r.ok) {
      loadOverview();
      onCatalogRefresh?.();
    }
  };

  const handleSkuOverride = async (skuId, patch) => {
    setErr('');
    const r = await fetch('/api/admin/sku-override', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: skuId, ...patch }),
    });
    const d = await r.json();
    if (!r.ok) {
      setErr(d?.error || 'Margin floor rejected price change.');
      return;
    }
    loadOverview();
    onCatalogRefresh?.();
  };

  const handleCoAdmin = async (action, email) => {
    setErr('');
    const r = await fetch('/api/admin/co-admins', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, email }),
    });
    const d = await r.json();
    if (!r.ok) {
      setErr(d?.error || 'Could not update co-admins.');
      return;
    }
    setCoAdminInput('');
    loadOverview();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Kinetic Calm Admin Console"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 860,
        backgroundColor: 'rgba(20, 20, 23, 0.62)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="surface-card"
        style={{
          maxWidth: '940px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.1rem',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <ShieldCheck size={22} />
            <div>
              <h2 className="font-display" style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800 }}>
                Kinetic Calm — Founder Admin Console
              </h2>
              <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                Protected by Google Admin Authentication (20% Net Margin Floor &amp; 30% Loyalty Cap Enforced)
              </div>
            </div>
          </div>
          <button type="button" onClick={onClose} className="btn-ghost" aria-label="Close Admin Console" style={{ padding: '0.38rem' }}>
            <X size={18} />
          </button>
        </div>

        {/* STRICT LOGIN GATE IF NOT SIGNED IN AS ADMIN */}
        {!isAdmin ? (
          <div
            style={{
              padding: '1.6rem',
              borderRadius: '1rem',
              backgroundColor: 'var(--surface-muted)',
              border: '2px solid var(--border)',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.85rem',
            }}
          >
            <Lock size={28} />
            <div className="font-display" style={{ fontSize: '1.2rem', fontWeight: 800 }}>
              Admin Login Required
            </div>
            <p style={{ margin: 0, fontSize: '0.86rem', color: 'var(--text-muted)', maxWidth: '460px' }}>
              {user
                ? `You are signed in as ${user.email}, which does not have Admin permissions. Sign in with an authorized Founder/Co-Admin Google account.`
                : 'Just like La Petite Lune, Admin controls are locked behind Google authentication. Sign in with your Founder Google account to manage orders, promo codes, bundle discounts, and catalog pricing.'}
            </p>
            <GoogleSignInButton asAdmin label="Sign in with Google Admin" />
          </div>
        ) : (
          <>
            {err && (
              <div style={{ padding: '0.7rem 0.9rem', borderRadius: '0.75rem', backgroundColor: 'var(--surface-blush)', color: '#881337', border: '1.5px solid #141417', fontSize: '0.8rem', fontWeight: 700 }}>
                {err}
              </div>
            )}

            {/* Live Top Metrics */}
            {data?.metrics && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '0.65rem' }}>
                <div style={{ padding: '0.75rem', borderRadius: '0.85rem', backgroundColor: 'var(--surface-muted)', border: '1.5px solid var(--border)' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700 }}>VERIFIED ORDERS</div>
                  <div className="font-neo" style={{ fontSize: '1.3rem', fontWeight: 800 }}>{data.metrics.orders_count}</div>
                </div>
                <div style={{ padding: '0.75rem', borderRadius: '0.85rem', backgroundColor: 'var(--surface-muted)', border: '1.5px solid var(--border)' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700 }}>LIVE REVENUE</div>
                  <div className="font-neo" style={{ fontSize: '1.3rem', fontWeight: 800 }}>${Number(data.metrics.revenue_usd).toFixed(2)}</div>
                </div>
                <div style={{ padding: '0.75rem', borderRadius: '0.85rem', backgroundColor: 'var(--surface-muted)', border: '1.5px solid var(--border)' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700 }}>GOOGLE MEMBERS</div>
                  <div className="font-neo" style={{ fontSize: '1.3rem', fontWeight: 800 }}>{data.metrics.registered_members_count}</div>
                </div>
                <div style={{ padding: '0.75rem', borderRadius: '0.85rem', backgroundColor: 'var(--surface-muted)', border: '1.5px solid var(--border)' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700 }}>NEWSLETTER LIST</div>
                  <div className="font-neo" style={{ fontSize: '1.3rem', fontWeight: 800 }}>{data.metrics.waitlist_count}</div>
                </div>
              </div>
            )}

            {/* Admin Navigation Tabs */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem' }}>
              {[
                { id: 'promos', label: 'Promotions, Bundles & Referrals', icon: <Gift size={14} /> },
                { id: 'catalog', label: 'Catalog, Direct vs Affiliate & Margins', icon: <Sliders size={14} /> },
                { id: 'orders', label: `Orders & Waitlist (${data?.orders?.length || 0})`, icon: <Package size={14} /> },
                { id: 'admins', label: 'Authorized Google Admins', icon: <Users size={14} /> },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={tab === t.id ? 'btn-primary' : 'btn-ghost'}
                  style={{ padding: '0.48rem 0.85rem', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '0.38rem' }}
                >
                  {t.icon}
                  <span>{t.label}</span>
                </button>
              ))}
            </div>

            {busy && !data && <div style={{ fontSize: '0.84rem' }}>Loading Admin Console...</div>}

            {/* TAB 1: PROMOTIONS, BUNDLE BUILDER & LUNA REFERRAL VAULT */}
            {tab === 'promos' && data && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ padding: '1rem', borderRadius: '0.95rem', backgroundColor: 'var(--surface-muted)', border: '1.5px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div>
                      <div className="font-display" style={{ fontWeight: 800, fontSize: '1rem' }}>
                        3-Piece Calm Kit Auto-Bundle &amp; Free Gift Tier
                      </div>
                      <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                        Automatically applies {data.bundle_config?.discount_pct}% off when shoppers add {data.bundle_config?.min_items}+ toys (non-stackable with promo codes).
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleUpdateBundle({ active: !data.bundle_config?.active })}
                      className={data.bundle_config?.active ? 'btn-primary' : 'btn-ghost'}
                      style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }}
                    >
                      {data.bundle_config?.active ? 'Bundle Promo: ACTIVE' : 'Bundle Promo: PAUSED'}
                    </button>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {[10, 12, 15, 20].map((pct) => (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => handleUpdateBundle({ discount_pct: pct })}
                        className={Number(data.bundle_config?.discount_pct) === pct ? 'btn-primary' : 'btn-ghost'}
                        style={{ padding: '0.32rem 0.68rem', fontSize: '0.74rem' }}
                      >
                        3+ Items = {pct}% Off
                      </button>
                    ))}
                  </div>
                </div>

                {/* Create New Promo Code */}
                <form
                  onSubmit={handleCreatePromo}
                  style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'flex-end', padding: '0.95rem', borderRadius: '0.95rem', border: '1.5px solid var(--border)' }}
                >
                  <div>
                    <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 800 }}>CODE</label>
                    <input
                      type="text"
                      placeholder="SPRING20"
                      value={newPromoCode}
                      onChange={(e) => setNewPromoCode(e.target.value.toUpperCase())}
                      style={{ padding: '0.48rem 0.65rem', borderRadius: '0.6rem', border: '1.5px solid var(--border)', backgroundColor: 'var(--surface)', color: 'var(--text)', width: '130px' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 800 }}>DISCOUNT % (MAX 30%)</label>
                    <input
                      type="number"
                      min={5}
                      max={30}
                      value={newPromoPct}
                      onChange={(e) => setNewPromoPct(e.target.value)}
                      style={{ padding: '0.48rem 0.65rem', borderRadius: '0.6rem', border: '1.5px solid var(--border)', backgroundColor: 'var(--surface)', color: 'var(--text)', width: '110px' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 800 }}>MIN ORDER ($)</label>
                    <input
                      type="number"
                      min={0}
                      max={250}
                      value={newPromoMin}
                      onChange={(e) => setNewPromoMin(e.target.value)}
                      style={{ padding: '0.48rem 0.65rem', borderRadius: '0.6rem', border: '1.5px solid var(--border)', backgroundColor: 'var(--surface)', color: 'var(--text)', width: '110px' }}
                    />
                  </div>
                  <button type="submit" className="btn-primary" style={{ padding: '0.52rem 0.9rem', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                    <Plus size={14} />
                    <span>Save Code</span>
                  </button>
                </form>

                {/* Active Promo Codes Table */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '0.6rem' }}>
                  {Object.entries(data.promo_codes || {}).map(([code, cfg]) => (
                    <div key={code} style={{ padding: '0.8rem', borderRadius: '0.85rem', border: '1.5px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div className="font-neo" style={{ fontWeight: 800, fontSize: '0.9rem' }}>{code} • {cfg.discount_pct}% OFF</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Min ${cfg.min_subtotal_usd || 0} • Non-stackable</div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.35rem' }}>
                        <button
                          type="button"
                          onClick={() => handleTogglePromo(code, !cfg.active)}
                          className={cfg.active ? 'btn-primary' : 'btn-ghost'}
                          style={{ padding: '0.3rem 0.55rem', fontSize: '0.7rem' }}
                        >
                          {cfg.active ? 'ON' : 'OFF'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeletePromo(code)}
                          className="btn-ghost"
                          aria-label={`Delete ${code}`}
                          style={{ padding: '0.3rem 0.45rem' }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 2: CATALOG, DIRECT VS AFFILIATE TRACK & LIVE MARGIN GUARD */}
            {tab === 'catalog' && data && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  All 12 items run on <strong>Direct Checkout (Track A)</strong> so you keep ~64% gross margin and full promo/referral control — or switch any SKU to <strong>Partner Affiliate (Track B)</strong> anytime.
                </div>
                {data.catalog?.map((sku) => (
                  <div
                    key={sku.id}
                    style={{
                      padding: '0.7rem 0.85rem',
                      borderRadius: '0.8rem',
                      border: '1.5px solid var(--border)',
                      display: 'flex',
                      flexWrap: 'wrap',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '0.6rem',
                      fontSize: '0.8rem',
                    }}
                  >
                    <div style={{ minWidth: '210px', flex: 1 }}>
                      <div style={{ fontWeight: 800 }}>{sku.name}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        {sku.sku} • Retail ${sku.price_usd} • Full Margin {sku.margins?.full_price_margin_pct ?? '--'}% • @30% Cap: {sku.margins?.discounted_30_margin_pct ?? '--'}%
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <button
                        type="button"
                        onClick={() =>
                          handleSkuOverride(sku.id, {
                            is_on_promotion: !sku.is_on_promotion,
                            sale_price_usd: !sku.is_on_promotion ? Number((sku.price_usd * 0.88).toFixed(0)) : null,
                          })
                        }
                        className={sku.is_on_promotion ? 'btn-primary' : 'btn-ghost'}
                        style={{ padding: '0.32rem 0.65rem', fontSize: '0.72rem' }}
                      >
                        {sku.is_on_promotion ? `On Sale ($${sku.sale_price_usd})` : 'Trigger 12% Flash Sale'}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          handleSkuOverride(sku.id, {
                            track: sku.track === 'TRACK_B_PARTNER' ? 'TRACK_A_DIRECT' : 'TRACK_B_PARTNER',
                          })
                        }
                        className="btn-ghost"
                        style={{ padding: '0.32rem 0.65rem', fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                      >
                        <ExternalLink size={12} />
                        <span>{sku.track === 'TRACK_B_PARTNER' ? 'Affiliate Track B' : 'Direct Track A'}</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* TAB 3: ORDERS & WAITLIST */}
            {tab === 'orders' && data && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                <div className="font-neo" style={{ fontWeight: 800, fontSize: '0.84rem' }}>
                  Verified Orders ({data.orders?.length || 0}) — Zero Fake Data Enforced
                </div>
                {data.orders?.length === 0 ? (
                  <div style={{ padding: '1rem', borderRadius: '0.8rem', backgroundColor: 'var(--surface-muted)', fontSize: '0.82rem' }}>
                    0 paid orders recorded yet. Once `STRIPE_SECRET_KEY` is connected, live orders appear here for fulfillment &amp; tracking updates.
                  </div>
                ) : (
                  data.orders.map((o) => (
                    <div key={o.id} style={{ padding: '0.8rem', borderRadius: '0.8rem', border: '1.5px solid var(--border)', fontSize: '0.8rem' }}>
                      <strong>#{o.id}</strong> • {o.customer_email} • ${Number(o.total_usd || 0).toFixed(2)} • {o.status}
                    </div>
                  ))
                )}

                <div className="font-neo" style={{ fontWeight: 800, fontSize: '0.84rem', marginTop: '0.4rem' }}>
                  Newsletter Subscribers ({data.waitlist_subscribers?.length || 0})
                </div>
                {data.waitlist_subscribers?.length > 0 && (
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    {data.waitlist_subscribers.map((s) => s.email).join(', ')}
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: CO-ADMINS */}
            {tab === 'admins' && data && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.82rem' }}>
                <div>
                  <strong>Permanent Super-Admins:</strong> {(data.super_admin_emails || []).join(', ')}
                </div>
                <div>
                  <strong>Invited Co-Admins:</strong>{' '}
                  {(data.co_admin_emails || []).length ? data.co_admin_emails.join(', ') : 'None added yet'}
                </div>
                {user.is_super_admin && (
                  <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap' }}>
                    <input
                      type="email"
                      placeholder="partner@gmail.com"
                      value={coAdminInput}
                      onChange={(e) => setCoAdminInput(e.target.value)}
                      style={{ padding: '0.48rem 0.7rem', borderRadius: '0.6rem', border: '1.5px solid var(--border)', backgroundColor: 'var(--surface)', color: 'var(--text)', minWidth: '220px' }}
                    />
                    <button type="button" onClick={() => handleCoAdmin('add', coAdminInput)} className="btn-primary" style={{ padding: '0.48rem 0.85rem', fontSize: '0.78rem' }}>
                      Authorize Co-Admin
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
