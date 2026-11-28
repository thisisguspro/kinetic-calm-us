import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Mail, RotateCcw, MessageSquare } from 'lucide-react';

export function AdminStoreOpsTab() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [smtpResult, setSmtpResult] = useState(null);
  const [msg, setMsg] = useState('');
  const [replyDrafts, setReplyDrafts] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/store-ops');
      const d = await res.json().catch(() => ({}));
      if (res.ok && d.ok) setData(d);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleVerifySmtp = async () => {
    setMsg('Verifying Gmail SMTP...');
    const res = await fetch('/api/admin/email/verify', { method: 'POST' });
    const d = await res.json().catch(() => ({}));
    setSmtpResult(d.smtp || d);
    setMsg(d.ok ? `SMTP Live: ${d.smtp?.user}` : `SMTP Auth Error: ${d.smtp?.error || 'Check App Password'}`);
  };

  const handleRmaAction = async (rmaId, action) => {
    const res = await fetch(`/api/admin/rmas/${encodeURIComponent(rmaId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });
    const d = await res.json().catch(() => ({}));
    setMsg(res.ok ? `RMA ${rmaId} updated -> ${d.rma?.status}` : d.error || 'RMA update failed.');
    await load();
  };

  const handleTicketReply = async (ticketId, status) => {
    const res = await fetch(`/api/admin/support/tickets/${encodeURIComponent(ticketId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, staff_reply: replyDrafts[ticketId] || '' }),
    });
    const d = await res.json().catch(() => ({}));
    setMsg(res.ok ? `Ticket ${ticketId} -> ${d.ticket?.status}` : d.error || 'Ticket update failed.');
    await load();
  };

  if (loading && !data) return <div className="club-box">Loading Post-Purchase Ops &amp; Transactional Email...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      <div className="club-box" style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--ruby)' }}>TRANSACTIONAL GMAIL SMTP DISPATCHER</div>
          <div style={{ fontSize: '13.5px', fontWeight: 700, marginTop: '2px' }}>
            Sender: {data?.email_config?.sender || 'Not Configured'} • Configured: {data?.email_config?.configured ? 'Yes' : 'No'}
          </div>
          {msg && <div style={{ fontSize: '12px', color: 'var(--ruby)', marginTop: '4px', fontWeight: 600 }}>{msg}</div>}
          {smtpResult && !smtpResult.ok && (
            <div style={{ fontSize: '11.5px', color: '#991b1b', marginTop: '4px' }}>
              SMTP Detail: {smtpResult.error || smtpResult.reason}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button type="button" className="btn-ghost" style={{ width: 'auto', padding: '8px 14px', fontSize: '11px' }} onClick={handleVerifySmtp}>
            <Mail size={13} /> <span>Test SMTP Connection</span>
          </button>
          <button type="button" className="founder-pill-btn" style={{ padding: '8px 14px' }} onClick={load}>
            <RefreshCw size={13} /> <span>Refresh</span>
          </button>
        </div>
      </div>

      <div className="club-box">
        <h3 style={{ fontSize: '15px', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <RotateCcw size={15} /> Return, Exchange &amp; Cancel RMAs ({data?.rmas?.length || 0})
        </h3>
        {(data?.rmas || []).length === 0 ? (
          <p style={{ fontSize: '12.5px', color: 'var(--muted)' }}>0 RMA requests logged yet (Zero Fake Data).</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {data.rmas.map((r) => (
              <div key={r.rma_id} style={{ padding: '12px', border: '1px solid #d6cec2', background: '#fff', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ fontSize: '12.5px' }}>
                  <strong>{r.rma_id}</strong> ({r.type}) • Order <strong>{r.order_id}</strong> • {r.email}<br />
                  <span style={{ color: 'var(--muted)' }}>Status: <strong>{r.status}</strong> — {r.reason}</span>
                </div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <button type="button" className="share-chip" onClick={() => handleRmaAction(r.rma_id, 'approve')}>Approve</button>
                  <button type="button" className="share-chip" style={{ borderColor: '#9f1239', color: '#9f1239' }} onClick={() => handleRmaAction(r.rma_id, 'refund')}>Refund via Stripe</button>
                  <button type="button" className="share-chip" onClick={() => handleRmaAction(r.rma_id, 'exchange_shipped')}>Exchange Shipped</button>
                  <button type="button" className="share-chip" onClick={() => handleRmaAction(r.rma_id, 'reject')}>Decline</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="club-box">
        <h3 style={{ fontSize: '15px', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <MessageSquare size={15} /> Guest &amp; Member Support Tickets ({data?.support_tickets?.length || 0}) • Alerts ({data?.alerts?.length || 0}) • Reviews ({data?.reviews?.length || 0})
        </h3>
        {(data?.support_tickets || []).length === 0 ? (
          <p style={{ fontSize: '12.5px', color: 'var(--muted)' }}>0 open support tickets.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {data.support_tickets.map((t) => (
              <div key={t.ticket_id} style={{ padding: '12px', border: '1px solid #d6cec2', background: '#fff' }}>
                <div style={{ fontSize: '12.5px', fontWeight: 700 }}>{t.ticket_id} • {t.name} ({t.email}) • Status: {t.status}</div>
                <div style={{ fontSize: '12px', marginTop: '4px' }}>{t.subject}: {t.message}</div>
                <div style={{ display: 'flex', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}>
                  <input className="lux-input" style={{ maxWidth: '320px' }} placeholder="Reply note..." value={replyDrafts[t.ticket_id] || ''} onChange={(e) => setReplyDrafts((p) => ({ ...p, [t.ticket_id]: e.target.value }))} />
                  <button type="button" className="share-chip" onClick={() => handleTicketReply(t.ticket_id, 'IN_PROGRESS')}>In Progress</button>
                  <button type="button" className="share-chip" style={{ borderColor: '#15803d', color: '#15803d' }} onClick={() => handleTicketReply(t.ticket_id, 'RESOLVED')}>Resolve</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="club-box">
        <h3 style={{ fontSize: '15px', marginBottom: '10px' }}>Transactional Email Outbox ({data?.outbox?.length || 0})</h3>
        {(data?.outbox || []).length === 0 ? (
          <p style={{ fontSize: '12.5px', color: 'var(--muted)' }}>0 outbound emails logged yet.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--ink)', textAlign: 'left' }}>
                  <th style={{ padding: '6px' }}>Type</th>
                  <th style={{ padding: '6px' }}>Recipient</th>
                  <th style={{ padding: '6px' }}>Subject</th>
                  <th style={{ padding: '6px' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {data.outbox.slice(0, 25).map((e) => (
                  <tr key={e.id} style={{ borderBottom: '1px solid #ece5db' }}>
                    <td style={{ padding: '6px', fontWeight: 700 }}>{e.type}</td>
                    <td style={{ padding: '6px' }}>{e.to}</td>
                    <td style={{ padding: '6px' }}>{e.subject}</td>
                    <td style={{ padding: '6px', fontWeight: 700, color: e.status === 'SENT' ? '#15803d' : e.status === 'FAILED' ? '#991b1b' : '#5e524c' }}>{e.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
