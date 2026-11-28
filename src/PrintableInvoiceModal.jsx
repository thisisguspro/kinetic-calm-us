import React, { useState, useEffect } from 'react';
import { X, Printer, Gift } from 'lucide-react';

function formatUSD(val) {
  return `$${Number(val || 0).toFixed(2)}`;
}

export function PrintableInvoiceModal({ isOpen, orderId, email = '', onClose }) {
  const [receipt, setReceipt] = useState(null);
  const [hidePriceSlip, setHidePriceSlip] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen || !orderId) return;
    setLoading(true);
    setError('');
    fetch(`/api/orders/${encodeURIComponent(orderId)}/receipt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email || undefined, gift_slip: hidePriceSlip }),
    })
      .then(async (r) => {
        const d = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(d.error || 'Unable to load receipt.');
        setReceipt(d.receipt);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [isOpen, orderId, email, hidePriceSlip]);

  if (!isOpen || !orderId) return null;

  return (
    <div className="lux-modal-backdrop" role="dialog" aria-modal="true" aria-label="Printable Receipt" onClick={onClose}>
      <div className="lux-modal-card lux-print-sheet" style={{ maxWidth: '640px' }} onClick={(e) => e.stopPropagation()}>
        <div className="lux-modal-head no-print">
          <div style={{ fontWeight: 700, fontSize: '14px' }}>Order Receipt / Gift Packing Slip</div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button type="button" className="btn-ghost" style={{ width: 'auto', padding: '7px 12px', fontSize: '11px' }} onClick={() => setHidePriceSlip((v) => !v)}>
              <Gift size={13} /> <span>{hidePriceSlip ? 'Show Prices' : 'Gift Slip (Hide Prices)'}</span>
            </button>
            <button type="button" className="btn-primary" style={{ width: 'auto', padding: '7px 14px', fontSize: '11px' }} onClick={() => window.print()}>
              <Printer size={13} /> <span>Print / Save PDF</span>
            </button>
            <button type="button" onClick={onClose} className="lux-icon-btn" aria-label="Close receipt"><X size={16} /></button>
          </div>
        </div>

        <div className="lux-modal-body">
          {loading && <div>Loading receipt...</div>}
          {error && <div className="lux-alert-err">{error}</div>}
          {receipt && (
            <div style={{ padding: '10px 4px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid var(--ink)', paddingBottom: '10px' }}>
                <div>
                  <h2 className="font-display" style={{ fontSize: '26px' }}>{receipt.brand}</h2>
                  <div style={{ fontSize: '11.5px', color: 'var(--muted)' }}>Official US Order Receipt &amp; Care Summary</div>
                </div>
                <div style={{ textAlign: 'right', fontSize: '12px' }}>
                  <div><strong>Order:</strong> {receipt.order_id}</div>
                  <div><strong>Date:</strong> {receipt.issued_at ? new Date(receipt.issued_at).toLocaleDateString('en-US') : '—'}</div>
                  <div><strong>Status:</strong> {receipt.status_label}</div>
                </div>
              </div>

              <div style={{ fontSize: '12.5px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <strong>Recipient:</strong><br />
                  {receipt.buyer_name || receipt.buyer_email}<br />
                  {receipt.shipping_city_region || ''}
                </div>
                <div>
                  <strong>Fulfillment:</strong><br />
                  {receipt.carrier}<br />
                  Tracking: {receipt.tracking_code || 'Generating label'}
                </div>
              </div>

              {receipt.gift_note && (
                <div style={{ padding: '12px', background: 'var(--alabaster)', borderLeft: '3px solid var(--vermeil)', fontSize: '13px' }}>
                  <strong>Gift Message:</strong> {receipt.gift_note}
                </div>
              )}

              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--ink)', textAlign: 'left' }}>
                    <th style={{ padding: '6px 0' }}>Item</th>
                    <th style={{ padding: '6px 0', textAlign: 'center' }}>Qty</th>
                    <th style={{ padding: '6px 0', textAlign: 'right' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {(receipt.items || []).map((it, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #ece5db' }}>
                      <td style={{ padding: '8px 0' }}>{it.name} {it.size ? `(${it.size})` : ''}</td>
                      <td style={{ padding: '8px 0', textAlign: 'center' }}>{it.quantity}</td>
                      <td style={{ padding: '8px 0', textAlign: 'right' }}>
                        {receipt.hide_prices ? 'Gift Item' : formatUSD(it.line_total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {!receipt.hide_prices && (
                <div style={{ borderTop: '1.5px solid var(--ink)', paddingTop: '10px', textAlign: 'right', fontSize: '13px', lineHeight: 1.7 }}>
                  <div>Subtotal: {formatUSD(receipt.subtotal)}</div>
                  {receipt.discount > 0 && <div style={{ color: '#15803d' }}>Savings: -{formatUSD(receipt.discount)}</div>}
                  <div>Shipping + US Tax: {formatUSD(Number(receipt.shipping || 0) + Number(receipt.tax || 0))}</div>
                  <div style={{ fontSize: '16px', fontWeight: 700, marginTop: '4px' }}>Total Paid: {formatUSD(receipt.total)}</div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
