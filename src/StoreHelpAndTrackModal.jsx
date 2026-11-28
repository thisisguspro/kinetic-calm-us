import React, { useState, useEffect } from 'react';
import {
  X,
  Truck,
  RotateCcw,
  HelpCircle,
  MessageSquare,
  Search,
  Printer,
  CheckCircle2,
  AlertCircle,
  ExternalLink
} from 'lucide-react';

export function StoreHelpAndTrackModal({
  isOpen,
  initialTab = 'track',
  initialOrderId = '',
  onClose,
  authState,
  brand = 'Kinetic Calm',
  placeholderOrderId = 'e.g., KC-...',
  onOpenReceipt
}) {
  const [tab, setTab] = useState(initialTab);
  const [helpData, setHelpData] = useState(null);
  const [faqQuery, setFaqQuery] = useState('');

  const [trackOrderId, setTrackOrderId] = useState(initialOrderId || '');
  const [trackEmail, setTrackEmail] = useState('');
  const [trackLoading, setTrackLoading] = useState(false);
  const [trackResult, setTrackResult] = useState(null);
  const [trackError, setTrackError] = useState('');

  const [rmaOrderId, setRmaOrderId] = useState(initialOrderId || '');
  const [rmaEmail, setRmaEmail] = useState('');
  const [rmaType, setRmaType] = useState('RETURN');
  const [rmaReason, setRmaReason] = useState('');
  const [rmaVariant, setRmaVariant] = useState('');
  const [rmaBusy, setRmaBusy] = useState(false);
  const [rmaMsg, setRmaMsg] = useState('');
  const [rmaErr, setRmaErr] = useState('');

  const [supName, setSupName] = useState('');
  const [supEmail, setSupEmail] = useState('');
  const [supOrderId, setSupOrderId] = useState('');
  const [supTopic, setSupTopic] = useState('ORDER_TRACKING');
  const [supMessage, setSupMessage] = useState('');
  const [supBusy, setSupBusy] = useState(false);
  const [supTicket, setSupTicket] = useState(null);
  const [supErr, setSupErr] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setTab(initialTab || 'track');
    if (initialOrderId) {
      setTrackOrderId(initialOrderId);
      setRmaOrderId(initialOrderId);
      setSupOrderId(initialOrderId);
    }
    if (authState?.user?.email) {
      setTrackEmail((v) => v || authState.user.email);
      setRmaEmail((v) => v || authState.user.email);
      setSupEmail((v) => v || authState.user.email);
      setSupName((v) => v || authState.user.name || '');
    }
    fetch('/api/store-ops/help-content')
      .then((r) => r.json())
      .then((d) => {
        if (d?.ok) setHelpData(d);
      })
      .catch(() => {});
  }, [isOpen, initialTab, initialOrderId, authState?.user?.email, authState?.user?.name]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleTrackSubmit = async (e) => {
    e.preventDefault();
    setTrackError('');
    setTrackResult(null);
    setTrackLoading(true);
    try {
      const res = await fetch('/api/orders/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: trackOrderId.trim(), email: trackEmail.trim() }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) setTrackError(d.error || 'No confirmed order found for that ID and email.');
      else setTrackResult(d.order);
    } catch {
      setTrackError('Connection error looking up order.');
    } finally {
      setTrackLoading(false);
    }
  };

  const handleRmaSubmit = async (e) => {
    e.preventDefault();
    setRmaErr('');
    setRmaMsg('');
    setRmaBusy(true);
    try {
      const res = await fetch('/api/orders/rma', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: rmaOrderId.trim(),
          email: rmaEmail.trim(),
          type: rmaType,
          reason: rmaReason.trim(),
          exchange_variant: rmaType === 'EXCHANGE' ? rmaVariant.trim() : undefined,
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) setRmaErr(d.error || 'Unable to submit RMA request.');
      else {
        setRmaMsg(`RMA ${d.rma?.rma_id} logged (${d.rma?.status}). Confirmation sent via email.`);
        setRmaReason('');
      }
    } catch {
      setRmaErr('Connection error submitting request.');
    } finally {
      setRmaBusy(false);
    }
  };

  const handleSupportSubmit = async (e) => {
    e.preventDefault();
    setSupErr('');
    setSupTicket(null);
    setSupBusy(true);
    try {
      const res = await fetch('/api/support/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: supName.trim(),
          email: supEmail.trim(),
          order_id: supOrderId.trim() || undefined,
          topic: supTopic,
          subject: `${supTopic} — ${brand}`,
          message: supMessage.trim(),
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) setSupErr(d.error || 'Check required fields.');
      else {
        setSupTicket(d.ticket);
        setSupMessage('');
      }
    } catch {
      setSupErr('Connection error opening ticket.');
    } finally {
      setSupBusy(false);
    }
  };

  const filteredFaqs = (helpData?.faqs || []).filter((f) => {
    const q = faqQuery.trim().toLowerCase();
    if (!q) return true;
    return `${f.category} ${f.q} ${f.a}`.toLowerCase().includes(q);
  });

  return (
    <div className="lux-modal-backdrop" role="dialog" aria-modal="true" aria-label={`${brand} Order Tracking & Help Hub`} onClick={onClose}>
      <div className="lux-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="lux-modal-head">
          <div>
            <div className="lux-eyebrow">CLIENT CONCIERGE &amp; ORDER CARE • {brand}</div>
            <h2 className="font-display" style={{ fontSize: '24px', marginTop: '2px' }}>Track Order, Returns &amp; Help Center</h2>
          </div>
          <button type="button" onClick={onClose} className="lux-icon-btn" aria-label="Close Help Hub">
            <X size={18} />
          </button>
        </div>

        <div className="lux-modal-tabs">
          <button type="button" className={`lux-tab-btn ${tab === 'track' ? 'active' : ''}`} onClick={() => setTab('track')}>
            <Truck size={14} /> <span>Track Order</span>
          </button>
          <button type="button" className={`lux-tab-btn ${tab === 'rma' ? 'active' : ''}`} onClick={() => setTab('rma')}>
            <RotateCcw size={14} /> <span>Returns &amp; Cancel (RMA)</span>
          </button>
          <button type="button" className={`lux-tab-btn ${tab === 'help' ? 'active' : ''}`} onClick={() => setTab('help')}>
            <HelpCircle size={14} /> <span>FAQ &amp; US Shipping Policy</span>
          </button>
          <button type="button" className={`lux-tab-btn ${tab === 'support' ? 'active' : ''}`} onClick={() => setTab('support')}>
            <MessageSquare size={14} /> <span>Contact Support</span>
          </button>
        </div>

        <div className="lux-modal-body">
          {tab === 'track' && (
            <div>
              <form onSubmit={handleTrackSubmit} className="lux-form-grid">
                <div>
                  <label className="lux-label">Order ID *</label>
                  <input className="lux-input" required value={trackOrderId} onChange={(e) => setTrackOrderId(e.target.value)} placeholder={placeholderOrderId} />
                </div>
                <div>
                  <label className="lux-label">Checkout Email *</label>
                  <input type="email" className="lux-input" required value={trackEmail} onChange={(e) => setTrackEmail(e.target.value)} placeholder="you@email.com" />
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                  <button type="submit" disabled={trackLoading} className="btn-primary" style={{ padding: '10px 18px', fontSize: '11px' }}>
                    {trackLoading ? 'Searching...' : 'Look Up Order'}
                  </button>
                </div>
              </form>

              {trackError && <div className="lux-alert-err"><AlertCircle size={14} /> <span>{trackError}</span></div>}

              {trackResult && (
                <div className="lux-result-box">
                  <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '14px' }}>Order {trackResult.order_id} • {trackResult.total_formatted}</div>
                      <div style={{ fontSize: '12px', color: 'var(--muted)' }}>{trackResult.status_label}</div>
                    </div>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {onOpenReceipt && (
                        <button type="button" className="btn-ghost" style={{ width: 'auto', padding: '7px 12px', fontSize: '10.5px' }} onClick={() => onOpenReceipt(trackResult.order_id, trackEmail)}>
                          <Printer size={12} /> <span>Receipt / Gift Slip</span>
                        </button>
                      )}
                      {trackResult.can_cancel_pre_ship && (
                        <button type="button" className="btn-ghost" style={{ width: 'auto', padding: '7px 12px', fontSize: '10.5px', borderColor: '#9f1239', color: '#9f1239' }} onClick={() => { setRmaOrderId(trackResult.order_id); setRmaEmail(trackEmail); setRmaType('CANCEL'); setTab('rma'); }}>
                          Cancel Before Ship
                        </button>
                      )}
                      {trackResult.can_request_return && (
                        <button type="button" className="btn-ghost" style={{ width: 'auto', padding: '7px 12px', fontSize: '10.5px' }} onClick={() => { setRmaOrderId(trackResult.order_id); setRmaEmail(trackEmail); setRmaType('RETURN'); setTab('rma'); }}>
                          Request Return / Exchange
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="lux-timeline">
                    {(trackResult.timeline || []).map((st) => (
                      <div key={st.key} className={`lux-tl-step ${st.done ? 'done' : ''}`}>
                        <span className="lux-tl-dot" />
                        <div>
                          <div style={{ fontSize: '11.5px', fontWeight: 700 }}>{st.label}</div>
                          <div style={{ fontSize: '10px', color: 'var(--muted)' }}>{st.timestamp ? new Date(st.timestamp).toLocaleString('en-US') : 'Pending'}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {trackResult.tracking_code && (
                    <div style={{ marginTop: '10px', fontSize: '12px' }}>
                      Carrier: <strong>{trackResult.carrier}</strong> • Tracking #: <strong>{trackResult.tracking_code}</strong>{' '}
                      {trackResult.tracking_url && (
                        <a href={trackResult.tracking_url} target="_blank" rel="noopener noreferrer" style={{ marginLeft: '8px', color: 'var(--ruby)', fontWeight: 700 }}>
                          Open Carrier Tracking <ExternalLink size={11} style={{ display: 'inline' }} />
                        </a>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {tab === 'rma' && (
            <form onSubmit={handleRmaSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div className="lux-form-grid">
                <div>
                  <label className="lux-label">Order ID *</label>
                  <input className="lux-input" required value={rmaOrderId} onChange={(e) => setRmaOrderId(e.target.value)} placeholder={placeholderOrderId} />
                </div>
                <div>
                  <label className="lux-label">Checkout Email *</label>
                  <input type="email" className="lux-input" required value={rmaEmail} onChange={(e) => setRmaEmail(e.target.value)} placeholder="you@email.com" />
                </div>
                <div>
                  <label className="lux-label">Request Type *</label>
                  <select className="lux-input" value={rmaType} onChange={(e) => setRmaType(e.target.value)}>
                    <option value="CANCEL">Pre-Ship Cancellation (Instant Refund)</option>
                    <option value="RETURN">30-Day Return</option>
                    <option value="EXCHANGE">Replacement / Exchange</option>
                  </select>
                </div>
              </div>
              {rmaType === 'EXCHANGE' && (
                <div>
                  <label className="lux-label">Preferred Replacement / Finish</label>
                  <input className="lux-input" value={rmaVariant} onChange={(e) => setRmaVariant(e.target.value)} placeholder="e.g., Same SKU or variant" />
                </div>
              )}
              <div>
                <label className="lux-label">Reason *</label>
                <textarea className="lux-input" rows={3} required value={rmaReason} onChange={(e) => setRmaReason(e.target.value)} placeholder="Tell us what happened (pre-ship cancel, 30-day guarantee, or transit damage)..." />
              </div>
              {rmaErr && <div className="lux-alert-err"><AlertCircle size={14} /> <span>{rmaErr}</span></div>}
              {rmaMsg && <div className="lux-alert-ok"><CheckCircle2 size={14} /> <span>{rmaMsg}</span></div>}
              <button type="submit" disabled={rmaBusy} className="btn-primary" style={{ width: 'fit-content', padding: '11px 20px' }}>
                {rmaBusy ? 'Submitting...' : 'Submit RMA Request'}
              </button>
            </form>
          )}

          {tab === 'help' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {helpData?.shipping_policy && (
                <div className="lux-info-card">
                  <div className="lux-section-kicker">OFFICIAL US SHIPPING, CARRIER &amp; 30-DAY RETURN POLICY</div>
                  <p style={{ fontSize: '12.5px', lineHeight: 1.55, marginTop: '6px' }}>
                    <strong>Transit &amp; Carriers:</strong> {helpData.shipping_policy.estimated_delivery} ({helpData.shipping_policy.carrier_default}).<br />
                    <strong>Protection:</strong> {helpData.shipping_policy.shipping_protection}<br />
                    <strong>Domestic Fulfillment:</strong> {helpData.shipping_policy.customs_and_duties}<br />
                    <strong>Returns &amp; FTC Rule:</strong> {helpData.shipping_policy.returns_guarantee}
                  </p>
                </div>
              )}

              <div style={{ position: 'relative' }}>
                <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
                <input
                  type="search"
                  className="lux-input"
                  style={{ paddingLeft: '32px' }}
                  placeholder="Search FAQ (tracking, gift receipt, Stripe, 30-day return...)"
                  value={faqQuery}
                  onChange={(e) => setFaqQuery(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {filteredFaqs.map((f) => (
                  <div key={f.id} className="lux-result-box">
                    <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--ruby)', textTransform: 'uppercase' }}>{f.category}</div>
                    <div style={{ fontWeight: 700, fontSize: '13px', marginTop: '2px' }}>{f.q}</div>
                    <p style={{ fontSize: '12.5px', color: 'var(--muted)', marginTop: '4px', lineHeight: 1.5 }}>{f.a}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'support' && (
            <form onSubmit={handleSupportSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div className="lux-form-grid">
                <div>
                  <label className="lux-label">Your Name *</label>
                  <input className="lux-input" required value={supName} onChange={(e) => setSupName(e.target.value)} placeholder="Full name" />
                </div>
                <div>
                  <label className="lux-label">Reply Email *</label>
                  <input type="email" className="lux-input" required value={supEmail} onChange={(e) => setSupEmail(e.target.value)} placeholder="you@email.com" />
                </div>
                <div>
                  <label className="lux-label">Order ID (Optional)</label>
                  <input className="lux-input" value={supOrderId} onChange={(e) => setSupOrderId(e.target.value)} placeholder={placeholderOrderId} />
                </div>
              </div>
              <div>
                <label className="lux-label">Topic</label>
                <select className="lux-input" value={supTopic} onChange={(e) => setSupTopic(e.target.value)}>
                  <option value="ORDER_TRACKING">Order Status or Tracking</option>
                  <option value="RETURN_EXCHANGE">30-Day Return or Exchange</option>
                  <option value="PRODUCT_SPECS">Materials &amp; Care Questions</option>
                  <option value="CUSTOM_REQUEST">Product Request or Feedback</option>
                </select>
              </div>
              <div>
                <label className="lux-label">Message *</label>
                <textarea className="lux-input" rows={3} required value={supMessage} onChange={(e) => setSupMessage(e.target.value)} placeholder="How can our concierge assist you today?" />
              </div>
              {supErr && <div className="lux-alert-err"><AlertCircle size={14} /> <span>{supErr}</span></div>}
              {supTicket && (
                <div className="lux-alert-ok">
                  <CheckCircle2 size={14} />
                  <span>Ticket <strong>{supTicket.ticket_id}</strong> received! 1 business day SLA confirmation sent to {supTicket.email}.</span>
                </div>
              )}
              <button type="submit" disabled={supBusy} className="btn-primary" style={{ width: 'fit-content', padding: '11px 20px' }}>
                {supBusy ? 'Submitting...' : 'Open Support Ticket'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
