import React, { useState } from 'react';
import { Sparkles, Truck, RotateCcw, HelpCircle, MessageSquare, Heart, X } from 'lucide-react';

export function StoreConciergeWidget({ onOpenHelpTab, wishlistCount = 0, onToggleWishlistFilter }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="lux-concierge-wrap">
      {open && (
        <div className="lux-concierge-menu" role="menu" aria-label="Concierge Quick Actions">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', color: 'var(--ruby)' }}>CLIENT CONCIERGE</span>
            <button type="button" onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }} aria-label="Close concierge">
              <X size={14} />
            </button>
          </div>
          <button type="button" className="lux-concierge-item" onClick={() => { setOpen(false); onOpenHelpTab('track'); }}>
            <Truck size={14} /> <span>Track My Order</span>
          </button>
          <button type="button" className="lux-concierge-item" onClick={() => { setOpen(false); onOpenHelpTab('rma'); }}>
            <RotateCcw size={14} /> <span>Returns &amp; Cancel (RMA)</span>
          </button>
          <button type="button" className="lux-concierge-item" onClick={() => { setOpen(false); onOpenHelpTab('help'); }}>
            <HelpCircle size={14} /> <span>FAQ &amp; US Shipping Policy</span>
          </button>
          <button type="button" className="lux-concierge-item" onClick={() => { setOpen(false); onOpenHelpTab('support'); }}>
            <MessageSquare size={14} /> <span>Contact Support</span>
          </button>
          {onToggleWishlistFilter && (
            <button type="button" className="lux-concierge-item" onClick={() => { setOpen(false); onToggleWishlistFilter(); }}>
              <Heart size={14} /> <span>Saved Items ({wishlistCount})</span>
            </button>
          )}
        </div>
      )}
      <button type="button" className="lux-concierge-fab" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        <Sparkles size={14} />
        <span>Help &amp; Track</span>
      </button>
    </div>
  );
}
