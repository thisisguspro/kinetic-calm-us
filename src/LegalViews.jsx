import React, { useState } from 'react';
import { ShieldCheck, Scale, AlertTriangle, X } from 'lucide-react';

export const LEGAL_TABS = [
  { id: 'fda', label: 'FDA General Wellness' },
  { id: 'cpsia', label: 'CPSC / ASTM F963 & Magnets' },
  { id: 'terms', label: 'Terms of Service' },
  { id: 'privacy', label: 'Privacy Policy & Data Deletion' },
  { id: 'refund', label: 'Refund & Hygiene Returns' },
  { id: 'cookies', label: 'Cookie Notice' },
];

export default function LegalViews({ open, initialTab = 'fda', onClose }) {
  const [activeTab, setActiveTab] = useState(initialTab);
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="KINETIC CALM US Legal, Safety and Regulatory Disclosures"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 850,
        backgroundColor: 'rgba(10, 14, 18, 0.72)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
    >
      <div
        className="surface-card"
        style={{
          width: '100%',
          maxWidth: '780px',
          maxHeight: '88vh',
          overflowY: 'auto',
          padding: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
            <Scale size={20} style={{ color: 'var(--accent)' }} />
            <h2 className="font-display" style={{ margin: 0, fontSize: '1.6rem' }}>
              US Legal, FDA Wellness &amp; CPSC Safety Center
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close legal disclosures"
            className="btn-ghost"
            style={{ padding: '0.45rem 0.65rem', display: 'inline-flex', alignItems: 'center' }}
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem' }}>
          {LEGAL_TABS.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={active ? 'btn-primary' : 'btn-ghost'}
                style={{ padding: '0.45rem 0.85rem', fontSize: '0.8rem' }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div
          style={{
            backgroundColor: 'var(--surface-muted)',
            borderRadius: '1rem',
            padding: '1.25rem',
            fontSize: '0.92rem',
            lineHeight: 1.65,
          }}
        >
          {activeTab === 'fda' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <ShieldCheck size={18} style={{ color: 'var(--accent)' }} /> FDA General Wellness Non-Medical Disclaimer
              </h3>
              <p style={{ margin: 0 }}>
                All KINETIC CALM squishy pads, magnetic sliders, textured strips, putty trays, and weighted lap companions are marketed strictly as general wellness lifestyle and everyday tactile comfort accessories under the US FDA 21st Century Cures Act General Wellness guidance.
              </p>
              <p style={{ margin: 0, fontWeight: 700 }}>
                Not a Medical Device: These statements and products have not been evaluated by the Food and Drug Administration. Our sensory comfort tools are NOT medical or occupational therapy devices and are NOT intended to diagnose, treat, cure, mitigate, or prevent Attention-Deficit/Hyperactivity Disorder (ADHD), Autism Spectrum Disorder, Anxiety Disorders, or Sensory Processing Disorder.
              </p>
            </div>
          )}

          {activeTab === 'cpsia' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <AlertTriangle size={18} style={{ color: 'var(--terracotta)' }} /> CPSC CPSIA, ASTM F963 &amp; Reese&apos;s Law Magnet Advisory
              </h3>
              <p style={{ margin: 0 }}>
                Every Track A product sold by KINETIC CALM US is curated to meet US Consumer Product Safety Commission (CPSC) CPSIA lead and phthalate limits and ASTM F963 physical/mechanical toy safety standards where applicable.
              </p>
              <ul style={{ margin: 0, paddingLeft: '1.2rem' }}>
                <li>
                  <strong>Choking &amp; Not-Food Warning:</strong> Silicone Taba squishies look and feel like soft confections but are NOT food. Do not ingest, chew, or tear. Keep strictly out of reach of children under 3 years and household pets.
                </li>
                <li>
                  <strong>Ages 14+ High-Strength Magnet Notice (CPSC):</strong> CNC Aluminum Magnetic Sliders (KC-US-004) and Speks Crags (KC-US-012) contain strong recessed or micro magnets and are graded exclusively for Teens &amp; Adults Ages 14+. Swallowed magnets can stick across intestines causing serious injury — seek immediate emergency care if swallowed. Keep away from pacemakers.
                </li>
                <li>
                  <strong>Weighted Glass-Bead Safety:</strong> Our 3.2 lb Lap Cloud uses double-stitched virgin glass microbeads inside an OEKO-TEX shell. Inspect seams periodically and discontinue use if bead leakage occurs.
                </li>
              </ul>
            </div>
          )}

          {activeTab === 'terms' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.05rem' }}>Terms of Service (United States)</h3>
              <p style={{ margin: 0 }}>
                Welcome to KINETIC CALM US (operated by Antonella Venture Studio LLC, US Storefront #5 on http://localhost:3007). By browsing our catalog or submitting an order quote, you agree to these Terms of Service and our age-grading guidelines.
              </p>
              <p style={{ margin: 0 }}>
                <strong>Track A Direct vs. Track B Partner Links:</strong> Track A products ship directly through our verified US fulfillment studio with Stripe USD checkout protection. Track B products (such as third-party branded rollers or cubes) link transparently to official external marketplaces where partner terms apply.
              </p>
              <p style={{ margin: 0 }}>
                <strong>Calm Vault Loyalty Rules:</strong> Calm Vault credits cannot stack on sale items or promo codes (such as CALM10 / DESK15) and are strictly capped at 30% maximum order discount so sustainability and quality inspections remain funded.
              </p>
            </div>
          )}

          {activeTab === 'privacy' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.05rem' }}>Privacy Policy, CCPA/CPRA Rights &amp; Data Deletion</h3>
              <p style={{ margin: 0 }}>
                KINETIC CALM practices Zero-Fake-Data and strict data minimization. We normalize email identifiers safely using Unicode NFKC and store only information necessary for order quotes, waitlist drop alerts you request, and transactional fulfillment.
              </p>
              <p style={{ margin: 0 }}>
                <strong>Self-Serve Data Deletion (Exclusão / Deletion of Personal Data):</strong> California residents (CCPA/CPRA) and all US customers have the right to request export or immediate deletion of their stored email or waitlist entry by contacting privacy@kineticcalm.us or using the Antonella Founder Privacy Hub. We never sell or rent customer personal data to third-party brokers.
              </p>
            </div>
          )}

          {activeTab === 'refund' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.05rem' }}>14-Day Refund &amp; Hygiene-Sealed Return Policy</h3>
              <p style={{ margin: 0 }}>
                Unused items in original unopened protective pouches or factory-sealed packaging qualify for a full refund within 14 calendar days of US delivery (less return label cost unless the item arrived damaged or defective).
              </p>
              <p style={{ margin: 0 }}>
                Because Taba platinum-silicone pads are tactile skin-contact objects, opened squishies are covered by a 7-day transit-defect or premature-seam-tear replacement guarantee rather than resale return.
              </p>
            </div>
          )}

          {activeTab === 'cookies' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.05rem' }}>Cookie Notice</h3>
              <p style={{ margin: 0 }}>
                We use strictly necessary HttpOnly session cookies (`kc_us_sid`, SameSite=Lax) to maintain your sensory bag session cleanly alongside local theme and typography preferences stored in your browser. Zero third-party advertising pixels or cross-site tracking cookies are loaded.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
