import React, { useState, useEffect } from 'react';
import { X, Heart, Bell, ShieldCheck, Star, ChevronDown, CheckCircle2, Truck, Copy, Check } from 'lucide-react';
import { SensoryStatCluster, GroceryQtyStepper } from './SensoryMetersAndQty.jsx';

export function ProductDetailDrawer({
  item,
  isOpen,
  onClose,
  bag = [],
  onAdd,
  onUpdateQty,
  wishlist = [],
  onToggleWishlist,
  authState,
  emotePack = 'kinetic',
  onOpenHelpTab
}) {
  const [reviewsData, setReviewsData] = useState({ count: 0, average_rating: 0, reviews: [] });
  const [alertEmail, setAlertEmail] = useState('');
  const [alertType, setAlertType] = useState('PRICE_DROP');
  const [alertStatus, setAlertStatus] = useState('');
  const [revRating, setRevRating] = useState(5);
  const [revTitle, setRevTitle] = useState('');
  const [revBody, setRevBody] = useState('');
  const [revStatus, setRevStatus] = useState('');
  const [openFaq, setOpenFaq] = useState('ship');
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    if (!isOpen || !item?.id) return;
    setAlertStatus('');
    setRevStatus('');
    setCopiedLink(false);
    if (authState?.user?.email) setAlertEmail(authState.user.email);
    fetch(`/api/reviews?product_id=${encodeURIComponent(item.id)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d?.ok) setReviewsData({ count: Number(d.count || 0), average_rating: Number(d.average_rating || 0), reviews: Array.isArray(d.reviews) ? d.reviews : [] });
      })
      .catch(() => {});
  }, [isOpen, item?.id, authState?.user?.email]);

  if (!isOpen || !item) return null;
  const isSaved = wishlist.includes(item.id);
  const act = item.is_on_promotion && item.sale_price_usd ? Number(item.sale_price_usd) : Number(item.price_usd || 0);

  const copyShareUrl = () => {
    const ref = authState?.user?.referral_code ? `&ref=${encodeURIComponent(authState.user.referral_code)}` : '';
    const u = `${window.location.origin}/?item=${encodeURIComponent(item.id)}${ref}`;
    navigator.clipboard?.writeText(u).catch(() => {});
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="lux-drawer-backdrop" role="dialog" aria-modal="true" aria-label={item.name} onClick={onClose}>
      <div className="lux-drawer-panel" onClick={(e) => e.stopPropagation()}>
        <div className="lux-drawer-head">
          <div>
            <div className="lux-eyebrow">{item.collection_label} • {item.age_grade || 'Ages 14+'}</div>
            <h2 className="font-display lux-drawer-title">{item.name}</h2>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="button" onClick={() => onToggleWishlist?.(item.id)} className={`lux-icon-btn ${isSaved ? 'active' : ''}`} aria-label={isSaved ? 'Remove from Saved' : 'Save Item'}>
              <Heart size={16} fill={isSaved ? 'currentColor' : 'none'} />
            </button>
            <button type="button" onClick={onClose} className="lux-icon-btn" aria-label="Close product details">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="lux-drawer-body">
          <div className="lux-drawer-hero">
            <img src={item.pedestal_transparent_url || item.image_url} alt={item.name} />
          </div>

          <div className="lux-price-panel">
            <div>
              {item.is_on_promotion && item.sale_price_usd && (
                <span className="lux-strike">${Number(item.price_usd).toFixed(2)}</span>
              )}
              <div className="font-display lux-main-price">${act.toFixed(2)}</div>
            </div>
            <button type="button" className="cta-secondary" style={{ width: 'auto', padding: '6px 12px', fontSize: '11px' }} onClick={copyShareUrl}>
              {copiedLink ? <Check size={12} /> : <Copy size={12} />} <span>{copiedLink ? 'Link Copied' : 'Share Link'}</span>
            </button>
          </div>

          <p className="lux-lead">{item.full_story || item.short_tagline}</p>

          <div className="lux-info-card">
            <SensoryStatCluster item={item} emotePack={emotePack} />
            <div style={{ fontSize: '12px' }}><strong>Sound Profile:</strong> {item.sound_db}</div>
            <div style={{ fontSize: '12px' }}><strong>Texture &amp; Action:</strong> {item.texture_profile}</div>
            <div className="lux-info-row"><ShieldCheck size={14} /> <span>General-wellness tactile focus tools crafted under US CPSIA & ASTM F963 material safety standards (non-medical).</span></div>
            <div className="lux-info-row"><Truck size={14} /> <span>Free US shipping at $65+ • Free Calm Strip Gift at $85+ • 30-Day Return Guarantee.</span></div>
          </div>

          <div className="lux-section-box">
            <div className="lux-section-kicker">QUICK ANSWERS</div>
            {[
              { id: 'ship', q: 'How fast does it ship in the US?', a: 'Ships in 1–2 business days via USPS Ground Advantage / UPS Ground (3–6 business days transit). Free shipping automatically unlocks at $65+.' },
              { id: 'ret', q: 'Can I return or exchange within 30 days?', a: 'Yes! Pre-ship orders cancel immediately, and delivered items qualify for our 30-day US return/exchange guarantee.' },
            ].map((f) => (
              <div key={f.id} className="lux-acc-item">
                <button type="button" className="lux-acc-btn" onClick={() => setOpenFaq((v) => (v === f.id ? '' : f.id))}>
                  <span>{f.q}</span>
                  <ChevronDown size={14} style={{ transform: openFaq === f.id ? 'rotate(180deg)' : 'none' }} />
                </button>
                {openFaq === f.id && <p className="lux-acc-body">{f.a}</p>}
              </div>
            ))}
          </div>

          <div className="lux-section-box">
            <div className="lux-section-kicker"><Bell size={13} /> BACK-IN-STOCK OR PRICE ALERTS</div>
            <form
              className="lux-inline-form"
              onSubmit={async (e) => {
                e.preventDefault();
                const r = await fetch('/api/alerts/subscribe', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ email: alertEmail, product_id: item.id, product_name: item.name, alert_type: alertType }),
                });
                const d = await r.json().catch(() => ({}));
                setAlertStatus(r.ok ? 'Alert saved for this email!' : d.error || 'Enter a valid email.');
              }}
            >
              <select aria-label="Alert type" value={alertType} onChange={(e) => setAlertType(e.target.value)} className="lux-input" style={{ width: 'auto' }}>
                <option value="PRICE_DROP">Price Drop</option>
                <option value="BACK_IN_STOCK">Back in Stock</option>
              </select>
              <input type="email" required value={alertEmail} onChange={(e) => setAlertEmail(e.target.value)} placeholder="you@email.com" className="lux-input" />
              <button type="submit" className="btn-ghost" style={{ padding: '7px 12px', fontSize: '11px' }}>Notify Me</button>
            </form>
            {alertStatus && <div className="lux-hint">{alertStatus}</div>}
          </div>

          <div className="lux-section-box">
            <div className="lux-section-kicker"><Star size={13} /> VERIFIED BUYER REVIEWS ({reviewsData.count})</div>
            {reviewsData.count === 0 ? (
              <p className="lux-hint">0 reviews yet — strictly limited to verified customers with delivered orders.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                {reviewsData.reviews.map((r) => (
                  <div key={r.review_id} className="lux-review-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', fontWeight: 700 }}>
                      <span>{r.title} • {'★'.repeat(Math.max(1, Math.min(5, Number(r.rating || 5))))}</span>
                      <span style={{ color: '#0d9488' }}><CheckCircle2 size={11} style={{ display: 'inline' }} /> Verified Delivery</span>
                    </div>
                    <p style={{ fontSize: '12px', marginTop: '4px' }}>{r.comment}</p>
                  </div>
                ))}
              </div>
            )}
            {authState?.authenticated && (
              <form
                style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}
                onSubmit={async (e) => {
                  e.preventDefault();
                  const r = await fetch('/api/reviews', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ product_id: item.id, rating: revRating, title: revTitle, comment: revBody }),
                  });
                  const d = await r.json().catch(() => ({}));
                  if (r.ok && d.review) {
                    setRevStatus('Verified review published!');
                    setRevTitle('');
                    setRevBody('');
                    setReviewsData((prev) => ({ count: prev.count + 1, average_rating: prev.average_rating, reviews: [d.review, ...prev.reviews] }));
                  } else {
                    setRevStatus(d.error || 'Delivered order required before reviewing.');
                  }
                }}
              >
                <div style={{ display: 'flex', gap: '6px' }}>
                  <select aria-label="Rating" value={revRating} onChange={(e) => setRevRating(Number(e.target.value))} className="lux-input" style={{ width: '105px' }}>
                    {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} Stars</option>)}
                  </select>
                  <input type="text" value={revTitle} onChange={(e) => setRevTitle(e.target.value)} placeholder="Review title" className="lux-input" />
                </div>
                <textarea rows={2} value={revBody} onChange={(e) => setRevBody(e.target.value)} placeholder="How does the desk tool feel? (Verified delivered order required)" className="lux-input" />
                <button type="submit" className="btn-ghost" style={{ padding: '7px 12px', fontSize: '11px', width: 'fit-content' }}>Post Review</button>
                {revStatus && <div className="lux-hint">{revStatus}</div>}
              </form>
            )}
          </div>
        </div>

        <div className="lux-drawer-foot" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
          <GroceryQtyStepper item={item} bag={bag} onAdd={onAdd} onUpdateQty={onUpdateQty} />
          <button type="button" className="btn-ghost" style={{ padding: '8px 12px', fontSize: '11.5px' }} onClick={() => { onClose(); onOpenHelpTab?.('support'); }}>
            Need Help?
          </button>
        </div>
      </div>
    </div>
  );
}
