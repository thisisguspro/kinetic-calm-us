import nodemailer from 'nodemailer';
import fs from 'node:fs';
import path from 'node:path';

const STORE_CONFIG = {
  "brand": "Kinetic Calm",
  "tagline": "Tactile Desk Instruments & General Wellness Sensory Studio — US",
  "locale": "en-US",
  "currency": "USD",
  "accent": "#0f766e",
  "gold": "#eab308",
  "support_email": "thisisguspro@gmail.com",
  "site_url": "https://kineticcalm.com",
  "footer_note": "Kinetic Calm Concierge • General Wellness Studio (FTC 30-Day Guarantee). Reply here or visit Track & Help anytime."
};

function loadEnvFallback(rootDir) {
  try {
    const envPath = path.join(rootDir, '.env');
    if (!fs.existsSync(envPath)) return;
    for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
      const idx = trimmed.indexOf('=');
      const k = trimmed.slice(0, idx).trim();
      const v = trimmed.slice(idx + 1).trim().replace(/^['"]|['"]$/g, '');
      if (k && !process.env[k]) process.env[k] = v;
    }
  } catch {
    // Non-fatal env fallback
  }
}

function escapeHtml(val) {
  return String(val ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatMoney(amount) {
  const num = Number(amount || 0);
  if (STORE_CONFIG.currency === 'BRL') {
    return `R$ ${num.toFixed(2).replace('.', ',')}`;
  }
  return `$${num.toFixed(2)}`;
}

export function createEmailService({ rootDir, dataDir }) {
  loadEnvFallback(rootDir);
  const outboxPath = path.join(dataDir, 'email_outbox.json');
  fs.mkdirSync(dataDir, { recursive: true });

  function getCredentials() {
    const user = String(process.env.GMAIL_USER || '').trim();
    const pass = String(process.env.GMAIL_APP_PASSWORD || '').replace(/\s+/g, '').trim();
    return { user, pass, configured: Boolean(user && pass) };
  }

  let cachedTransporter = null;
  let cachedCredHash = '';

  function getTransporter() {
    const { user, pass, configured } = getCredentials();
    if (!configured) return null;
    const key = `${user}:${pass.length}`;
    if (!cachedTransporter || cachedCredHash !== key) {
      cachedCredHash = key;
      cachedTransporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: { user, pass },
      });
    }
    return cachedTransporter;
  }

  function readOutbox(limit = 100) {
    try {
      if (!fs.existsSync(outboxPath)) return [];
      const rows = JSON.parse(fs.readFileSync(outboxPath, 'utf8'));
      if (!Array.isArray(rows)) return [];
      return rows.slice(-limit).reverse();
    } catch {
      return [];
    }
  }

  function appendOutbox(entry) {
    try {
      let existing = [];
      if (fs.existsSync(outboxPath)) {
        const parsed = JSON.parse(fs.readFileSync(outboxPath, 'utf8'));
        if (Array.isArray(parsed)) existing = parsed;
      }
      existing.push(entry);
      if (existing.length > 300) existing = existing.slice(-300);
      const tmp = `${outboxPath}.tmp.${process.pid}`;
      fs.writeFileSync(tmp, JSON.stringify(existing, null, 2), 'utf8');
      fs.renameSync(tmp, outboxPath);
    } catch {
      // Never block order pipeline on telemetry write failure
    }
  }

  function wrapBrandedHtml(title, bodyHtml) {
    return `<!doctype html>
<html>
<body style="margin:0;padding:24px;background:#f6f4ef;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#18181b;">
  <div style="max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #e5e0d5;border-radius:12px;overflow:hidden;">
    <div style="background:${STORE_CONFIG.accent};color:#ffffff;padding:24px 28px;border-bottom:3px solid ${STORE_CONFIG.gold};">
      <div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;opacity:0.85;">${escapeHtml(STORE_CONFIG.tagline)}</div>
      <h1 style="margin:6px 0 0 0;font-size:22px;font-weight:600;letter-spacing:0.5px;">${escapeHtml(STORE_CONFIG.brand)}</h1>
    </div>
    <div style="padding:28px;">
      <h2 style="margin:0 0 16px 0;font-size:18px;color:#111827;">${escapeHtml(title)}</h2>
      ${bodyHtml}
    </div>
    <div style="padding:18px 28px;background:#faf8f4;border-top:1px solid #eee8dc;font-size:12px;line-height:1.5;color:#6b7280;">
      ${escapeHtml(STORE_CONFIG.footer_note)}<br/>
      <span style="color:#9ca3af;">${escapeHtml(STORE_CONFIG.brand)} • ${escapeHtml(STORE_CONFIG.support_email)}</span>
    </div>
  </div>
</body>
</html>`;
  }

  async function sendEmail({ type, to, subject, title, htmlBody, text, orderId = null, skipRealSend = false }) {
    const cleanTo = String(to || '').trim().toLowerCase();
    const { user, configured } = getCredentials();
    if (!cleanTo || !cleanTo.includes('@')) {
      const rec = {
        id: `eml_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        timestamp: new Date().toISOString(),
        type,
        to: cleanTo || 'missing',
        subject,
        order_id: orderId,
        status: 'SKIPPED',
        reason: 'invalid_recipient',
      };
      appendOutbox(rec);
      return rec;
    }

    const wrappedHtml = wrapBrandedHtml(title || subject, htmlBody);

    if (skipRealSend || process.env.DISABLE_OUTBOUND_EMAIL === '1' || !configured) {
      const rec = {
        id: `eml_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        timestamp: new Date().toISOString(),
        type,
        to: cleanTo,
        subject,
        order_id: orderId,
        status: configured ? 'DRY_RUN' : 'SKIPPED',
        reason: configured ? 'test_mode_dry_run' : 'smtp_not_configured',
      };
      appendOutbox(rec);
      return rec;
    }

    try {
      const transporter = getTransporter();
      const info = await transporter.sendMail({
        from: `"${STORE_CONFIG.brand}" <${user}>`,
        to: cleanTo,
        replyTo: user,
        subject,
        text: text || subject,
        html: wrappedHtml,
      });
      const rec = {
        id: `eml_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        timestamp: new Date().toISOString(),
        type,
        to: cleanTo,
        subject,
        order_id: orderId,
        status: 'SENT',
        message_id: info?.messageId || null,
      };
      appendOutbox(rec);
      return rec;
    } catch (err) {
      const rec = {
        id: `eml_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        timestamp: new Date().toISOString(),
        type,
        to: cleanTo,
        subject,
        order_id: orderId,
        status: 'FAILED',
        error: String(err?.message || 'smtp_send_error').slice(0, 180),
      };
      appendOutbox(rec);
      return rec;
    }
  }

  async function verifySmtp() {
    const transporter = getTransporter();
    if (!transporter) {
      return { ok: false, configured: false, reason: 'Missing GMAIL_USER or GMAIL_APP_PASSWORD' };
    }
    try {
      await transporter.verify();
      return { ok: true, configured: true, user: getCredentials().user };
    } catch (err) {
      return { ok: false, configured: true, error: String(err?.message || 'verify_failed').slice(0, 180) };
    }
  }

  function extractRecipientEmail(order) {
    return (
      order?.buyer_email ||
      order?.customer_email ||
      order?.email ||
      order?.shipping?.email ||
      order?.shipping_address?.email ||
      ''
    );
  }

  function normalizeItemsList(order) {
    if (Array.isArray(order?.items) && order.items.length > 0) {
      return order.items.map((it) => ({
        title: it.title || it.product_title || it.name || it.id || 'Item',
        qty: Number(it.quantity || it.qty || 1),
        price: Number(it.unit_price_brl ?? it.unit_price_usd ?? it.price ?? it.line_total ?? 0),
      }));
    }
    return [{
      title: order?.product_title || order?.title || order?.product_id || 'Curated Item',
      qty: Number(order?.quantity || 1),
      price: Number(order?.subtotal ?? order?.total ?? order?.total_paid ?? 0),
    }];
  }

  async function sendOrderConfirmation(order, opts = {}) {
    const to = opts.to || extractRecipientEmail(order);
    const orderId = order?.order_id || order?.id || 'PEDIDO';
    const isPt = STORE_CONFIG.locale === 'pt-BR';
    const hidePrice = Boolean(order?.gift_options?.hide_price_on_slip);
    const giftNote = String(order?.gift_options?.gift_note || '').trim();
    const items = normalizeItemsList(order);
    const totalAmt = Number(order?.total_paid ?? order?.total ?? order?.total_brl ?? order?.total_usd ?? 0);

    const rowsHtml = items.map((it) => `
      <tr>
        <td style="padding:8px 0;border-bottom:1px solid #f0ece3;">${escapeHtml(it.title)} × ${it.qty}</td>
        <td style="padding:8px 0;border-bottom:1px solid #f0ece3;text-align:right;">${hidePrice ? (isPt ? 'Presente (sem valor)' : 'Gift (Price Hidden)') : escapeHtml(formatMoney(it.price * it.qty))}</td>
      </tr>
    `).join('');

    const giftHtml = giftNote
      ? `<div style="margin:14px 0;padding:12px 14px;background:#faf8f4;border-left:3px solid ${STORE_CONFIG.gold};font-size:13px;">
           <strong>${isPt ? 'Cartão de Presente:' : 'Gift Message:'}</strong> ${escapeHtml(giftNote)}
         </div>`
      : '';

    const subject = isPt
      ? `Pedido confirmado #${orderId} — ${STORE_CONFIG.brand}`
      : `Order Confirmed #${orderId} — ${STORE_CONFIG.brand}`;

    const title = isPt
      ? `Obrigado pelo seu pedido #${orderId}`
      : `Thank you for your order #${orderId}`;

    const intro = isPt
      ? 'Seu pagamento foi aprovado com segurança e nossa equipe já iniciou a separação para envio.'
      : 'Your payment succeeded and our studio is preparing your order for fulfillment.';

    const htmlBody = `
      <p style="margin:0 0 14px 0;font-size:14px;line-height:1.6;">${escapeHtml(intro)}</p>
      ${giftHtml}
      <table style="width:100%;border-collapse:collapse;font-size:14px;margin:12px 0;">
        ${rowsHtml}
        <tr>
          <td style="padding:12px 0;font-weight:700;">${isPt ? 'Total Pago' : 'Order Total'}</td>
          <td style="padding:12px 0;font-weight:700;text-align:right;">${hidePrice ? (isPt ? 'Oculto a pedido (Presente)' : 'Hidden for Gift Recipient') : escapeHtml(formatMoney(totalAmt))}</td>
        </tr>
      </table>
      <p style="margin:14px 0 0 0;font-size:13px;color:#4b5563;">
        ${isPt ? 'Você pode acompanhar o envio, baixar seu recibo ou abrir uma solicitação a qualquer momento usando o código do pedido + seu e-mail em Track & Help.' : 'You can track your shipment, print a receipt, or request a return/support anytime using your Order ID + email in Track & Help.'}
      </p>
    `;

    return sendEmail({ type: 'ORDER_CONFIRMED', to, subject, title, htmlBody, orderId, skipRealSend: opts.skipRealSend });
  }

  async function sendShippingUpdate(order, opts = {}) {
    const to = opts.to || extractRecipientEmail(order);
    const orderId = order?.order_id || order?.id || 'PEDIDO';
    const isPt = STORE_CONFIG.locale === 'pt-BR';
    const trackingCode = order?.tracking_code || order?.tracking_number || order?.shipping?.tracking_code || '';
    const carrier = order?.carrier || order?.shipping_carrier || order?.shipping?.carrier || (isPt ? 'Transportadora / Correios' : 'Carrier');
    const status = String(order?.shipping_status || order?.status || order?.fulfillment_status || 'SHIPPED').toUpperCase();

    const subject = isPt
      ? `Atualização de envio (${status}) #${orderId} — ${STORE_CONFIG.brand}`
      : `Shipping Update (${status}) #${orderId} — ${STORE_CONFIG.brand}`;

    const htmlBody = `
      <p style="margin:0 0 14px 0;font-size:14px;line-height:1.6;">
        ${isPt ? `O status logístico do seu pedido #${escapeHtml(orderId)} foi atualizado para` : `Your order #${escapeHtml(orderId)} fulfillment status is now`}: <strong>${escapeHtml(status)}</strong>.
      </p>
      <div style="padding:14px;background:#faf8f4;border:1px solid #e5e0d5;border-radius:8px;font-size:14px;">
        <div><strong>${isPt ? 'Transportadora:' : 'Carrier:'}</strong> ${escapeHtml(carrier)}</div>
        <div style="margin-top:6px;"><strong>${isPt ? 'Código de Rastreio:' : 'Tracking Number:'}</strong> ${escapeHtml(trackingCode || (isPt ? 'Em processamento' : 'Generating label'))}</div>
      </div>
    `;

    return sendEmail({ type: 'SHIPPING_UPDATE', to, subject, title: subject, htmlBody, orderId, skipRealSend: opts.skipRealSend });
  }

  async function sendRmaStatusEmail(rma, order, opts = {}) {
    const to = opts.to || rma?.email || extractRecipientEmail(order);
    const orderId = rma?.order_id || order?.order_id || order?.id;
    const isPt = STORE_CONFIG.locale === 'pt-BR';
    const rmaId = rma?.rma_id || rma?.id;
    const status = String(rma?.status || 'PENDING').toUpperCase();

    const subject = isPt
      ? `Solicitação ${rmaId} (${status}) — Pedido #${orderId}`
      : `RMA Request ${rmaId} (${status}) — Order #${orderId}`;

    const htmlBody = `
      <p style="margin:0 0 14px 0;font-size:14px;line-height:1.6;">
        ${isPt ? `Atualização da sua solicitação <strong>${escapeHtml(rmaId)}</strong> (${escapeHtml(rma?.type || 'RETURN')})` : `Update for your request <strong>${escapeHtml(rmaId)}</strong> (${escapeHtml(rma?.type || 'RETURN')})`}: <strong>${escapeHtml(status)}</strong>.
      </p>
      ${rma?.resolution_note ? `<p style="font-size:13px;color:#374151;background:#faf8f4;padding:12px;border-radius:8px;">${escapeHtml(rma.resolution_note)}</p>` : ''}
      ${rma?.refund_amount ? `<p style="font-size:14px;"><strong>${isPt ? 'Valor estornado:' : 'Refunded Amount:'}</strong> ${escapeHtml(formatMoney(rma.refund_amount))}</p>` : ''}
    `;

    return sendEmail({ type: 'RMA_STATUS', to, subject, title: subject, htmlBody, orderId, skipRealSend: opts.skipRealSend });
  }

  async function sendSupportTicketEmail(ticket, opts = {}) {
    const to = opts.to || ticket?.email;
    const isPt = STORE_CONFIG.locale === 'pt-BR';
    const subject = isPt
      ? `Atendimento ${ticket?.ticket_id} recebido — ${STORE_CONFIG.brand}`
      : `Support Ticket ${ticket?.ticket_id} Received — ${STORE_CONFIG.brand}`;

    const htmlBody = `
      <p style="margin:0 0 14px 0;font-size:14px;line-height:1.6;">
        ${isPt ? 'Recebemos seu chamado e nossa equipe responderá em até 1 dia útil.' : 'We have received your support message and our concierge team will respond within 1 business day.'}
      </p>
      <div style="padding:14px;background:#faf8f4;border:1px solid #e5e0d5;border-radius:8px;font-size:13px;">
        <div><strong>${isPt ? 'Protocolo:' : 'Ticket ID:'}</strong> ${escapeHtml(ticket?.ticket_id)}</div>
        <div style="margin-top:4px;"><strong>${isPt ? 'Assunto:' : 'Topic:'}</strong> ${escapeHtml(ticket?.subject || ticket?.topic)}</div>
        ${ticket?.order_id ? `<div style="margin-top:4px;"><strong>${isPt ? 'Pedido:' : 'Order ID:'}</strong> ${escapeHtml(ticket.order_id)}</div>` : ''}
      </div>
    `;

    const res = await sendEmail({
      type: 'SUPPORT_TICKET',
      to,
      subject,
      title: subject,
      htmlBody,
      orderId: ticket?.order_id || null,
      skipRealSend: opts.skipRealSend,
    });

    // Notify merchant support inbox as well when real send enabled
    const { user, configured } = getCredentials();
    if (!opts.skipRealSend && configured && user && user !== String(to || '').toLowerCase() && process.env.DISABLE_OUTBOUND_EMAIL !== '1') {
      await sendEmail({
        type: 'SUPPORT_MERCHANT_ALERT',
        to: user,
        subject: `[${STORE_CONFIG.brand}] Ticket ${ticket?.ticket_id} from ${ticket?.email}`,
        title: `New Customer Support Ticket: ${ticket?.ticket_id}`,
        htmlBody: `<p><strong>From:</strong> ${escapeHtml(ticket?.name)} (${escapeHtml(ticket?.email)})</p><p><strong>Topic:</strong> ${escapeHtml(ticket?.topic || ticket?.subject)}</p><p><strong>Message:</strong> ${escapeHtml(ticket?.message)}</p>`,
        orderId: ticket?.order_id || null,
      });
    }
    return res;
  }

  async function sendSavedCartReminderEmail({ to, items, subtotal, opts = {} }) {
    const isPt = STORE_CONFIG.locale === 'pt-BR';
    const subject = isPt
      ? `Sua seleção salva na ${STORE_CONFIG.brand}`
      : `Your Saved Selection from ${STORE_CONFIG.brand}`;
    const listHtml = (items || []).map((it) => `<li>${escapeHtml(it.title || it.id)} × ${Number(it.quantity || it.qty || 1)}</li>`).join('');
    const htmlBody = `
      <p style="font-size:14px;">${isPt ? 'Aqui está o resumo dos itens que você separou:' : 'Here is a copy of the items currently saved in your bag:'}</p>
      <ul style="font-size:14px;line-height:1.7;">${listHtml}</ul>
      <p style="font-size:14px;"><strong>${isPt ? 'Subtotal estimado:' : 'Estimated Subtotal:'}</strong> ${escapeHtml(formatMoney(subtotal || 0))}</p>
    `;
    return sendEmail({ type: 'SAVED_CART_REMINDER', to, subject, title: subject, htmlBody, skipRealSend: opts.skipRealSend });
  }

  return {
    storeConfig: STORE_CONFIG,
    getCredentials,
    verifySmtp,
    readOutbox,
    sendEmail,
    sendOrderConfirmation,
    sendShippingUpdate,
    sendRmaStatusEmail,
    sendSupportTicketEmail,
    sendSavedCartReminderEmail,
  };
}
