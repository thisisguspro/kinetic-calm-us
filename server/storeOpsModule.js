import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const PROFILE = {
  "slug": "sensory-haven-us",
  "brand": "Kinetic Calm",
  "locale": "en-US",
  "currency": "USD",
  "return_days": 30,
  "carrier_default": "USPS Ground Advantage / UPS Ground",
  "shipping_estimate": "3–6 Business Days across the US (Free US shipping at $65+)",
  "free_shipping_note": "Orders $65+ ship free within the US; $85+ unlock a complimentary travel calm strip pack.",
  "customs_note": "US warehouse dispatch following CPSIA & ASTM F963 general-wellness material standards.",
  "returns_note": "30-Day US satisfaction return or exchange under FTC guidelines. Defective hardware sliders or torn silicone tools are replaced at zero cost.",
  "faqs": [
    {
      "id": "f-track",
      "category": "Orders & Tracking",
      "q": "How do I look up my shipment without signing in?",
      "a": "Open Track & Help at the top of the page and enter your KC- Order ID plus your checkout email."
    },
    {
      "id": "f-cancel",
      "category": "Returns & Pre-Ship Cancel",
      "q": "How do cancellations and 30-day returns work?",
      "a": "Orders not yet shipped can be cancelled directly for an instant Stripe refund. Delivered items qualify for a 30-day return or exchange RMA."
    },
    {
      "id": "f-safety",
      "category": "Safety & General Wellness",
      "q": "Are Kinetic Calm products medical devices?",
      "a": "No. Kinetic Calm instruments are general-wellness tactile focus tools engineered to ASTM F963/CPSIA material standards for ages 14+ unless labeled."
    }
  ]
};

function normalizeEmailSafe(raw) {
  return String(raw || '').normalize('NFKC').trim().toLowerCase().slice(0, 128);
}

function isValidEmail(raw) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(normalizeEmailSafe(raw));
}

function defaultOpsState() {
  return {
    rmas: [],
    support_tickets: [],
    alerts: [],
    reviews: [],
    wishlists: {},
  };
}

export function registerStoreOpsRoutes(app, deps) {
  const {
    dataDir,
    requireAuth,
    requireAdmin,
    getCatalog,
    emailService,
    getOrdersList,
    findOrderById,
    saveOrderMutation,
    refundOrderWithClawback,
    getOrderStatusMeta,
    checkUserDeliveredProduct,
  } = deps;

  const isPt = PROFILE.locale === 'pt-BR';
  const opsPath = path.join(dataDir, 'store_ops.json');
  fs.mkdirSync(dataDir, { recursive: true });

  const opsRateBuckets = new Map();
  function opsRateLimiter(maxRequests = 40, windowMs = 60000) {
    return (req, res, next) => {
      const ip = req.ip || req.socket?.remoteAddress || '127.0.0.1';
      const key = `${req.path}:${ip}`;
      const now = Date.now();
      const rec = opsRateBuckets.get(key);
      if (!rec || now - rec.start >= windowMs) {
        opsRateBuckets.set(key, { start: now, count: 1 });
        return next();
      }
      rec.count += 1;
      if (rec.count > maxRequests) {
        return res.status(429).json({
          error: isPt
            ? 'Muitas solicitações seguidas. Aguarde alguns segundos.'
            : 'Too many requests in a short window. Please wait a few seconds.',
        });
      }
      return next();
    };
  }

  function readOps() {
    try {
      if (!fs.existsSync(opsPath)) return defaultOpsState();
      const parsed = JSON.parse(fs.readFileSync(opsPath, 'utf8'));
      return {
        rmas: Array.isArray(parsed.rmas) ? parsed.rmas : [],
        support_tickets: Array.isArray(parsed.support_tickets) ? parsed.support_tickets : [],
        alerts: Array.isArray(parsed.alerts) ? parsed.alerts : [],
        reviews: Array.isArray(parsed.reviews) ? parsed.reviews : [],
        wishlists: parsed.wishlists && typeof parsed.wishlists === 'object' ? parsed.wishlists : {},
      };
    } catch {
      return defaultOpsState();
    }
  }

  function writeOps(state) {
    fs.mkdirSync(dataDir, { recursive: true });
    const tmp = `${opsPath}.tmp.${process.pid}.${Date.now()}`;
    fs.writeFileSync(tmp, JSON.stringify(state, null, 2), 'utf8');
    fs.renameSync(tmp, opsPath);
  }

  function formatMoney(amount) {
    const num = Number(amount || 0);
    return PROFILE.currency === 'BRL' ? `R$ ${num.toFixed(2).replace('.', ',')}` : `$${num.toFixed(2)}`;
  }

  function buildOrderTimeline(meta) {
    const steps = [
      {
        key: 'PAID',
        label: isPt ? 'Pagamento Confirmado' : 'Payment Verified',
        done: Boolean(meta.isPaid),
        timestamp: meta.paidAt || meta.createdAt || null,
      },
      {
        key: 'PROCESSING',
        label: isPt ? 'Separação & Solicitação de Envio' : 'Fulfillment & Packaging',
        done: Boolean(meta.isPaid),
        timestamp: meta.fulfillmentRequestedAt || meta.paidAt || null,
      },
      {
        key: 'SHIPPED',
        label: isPt ? 'Despachado / Em Trânsito' : 'Shipped / In Transit',
        done: Boolean(meta.isShipped || meta.isDelivered),
        timestamp: meta.shippedAt || null,
      },
      {
        key: 'DELIVERED',
        label: isPt ? 'Entregue ao Destinatário' : 'Delivered',
        done: Boolean(meta.isDelivered),
        timestamp: meta.deliveredAt || null,
      },
    ];
    if (meta.isCancelledOrRefunded) {
      steps.push({
        key: 'CLOSED',
        label: isPt ? 'Cancelado / Reembolsado' : 'Cancelled / Refunded',
        done: true,
        timestamp: meta.refundedAt || meta.updatedAt || null,
      });
    }
    return steps;
  }

  function buildCarrierTrackingUrl(carrier, code) {
    const c = String(code || '').trim();
    if (!c) return null;
    const lc = String(carrier || '').toLowerCase();
    if (lc.includes('ups')) return `https://www.ups.com/track?tracknum=${encodeURIComponent(c)}`;
    if (lc.includes('fedex')) return `https://www.fedex.com/fedextrack/?trknbr=${encodeURIComponent(c)}`;
    if (lc.includes('usps')) return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${encodeURIComponent(c)}`;
    if (lc.includes('correios')) return `https://rastreamento.correios.com.br/app/index.php?objetos=${encodeURIComponent(c)}`;
    return null;
  }

  // 1. Public Categorized Help Center, Searchable FAQ & Shipping Policy
  app.get('/api/store-ops/help-content', (_req, res) => {
    res.json({
      ok: true,
      brand: PROFILE.brand,
      locale: PROFILE.locale,
      currency: PROFILE.currency,
      return_window_days: PROFILE.return_days,
      shipping_policy: {
        carrier_default: PROFILE.carrier_default,
        estimated_delivery: PROFILE.shipping_estimate,
        shipping_protection: PROFILE.free_shipping_note,
        customs_and_duties: PROFILE.customs_note,
        returns_guarantee: PROFILE.returns_note,
      },
      faqs: PROFILE.faqs,
    });
  });

  // 2. Public Self-Service Order Tracking (Confirmed Orders Only — Uniform 404 on mismatch)
  app.post('/api/orders/track', opsRateLimiter(30, 60000), (req, res) => {
    const orderId = String(req.body?.order_id || '').trim().slice(0, 64);
    const email = normalizeEmailSafe(req.body?.email);
    if (!orderId || !isValidEmail(email)) {
      return res.status(400).json({
        error: isPt
          ? 'Informe um código de pedido e e-mail válidos.'
          : 'Please provide both a valid Order ID and email address.',
      });
    }

    const order = findOrderById(orderId);
    if (!order) {
      return res.status(404).json({
        error: isPt
          ? 'Pedido confirmado não encontrado para este código e e-mail.'
          : 'No confirmed order matched that Order ID and email.',
      });
    }

    const meta = getOrderStatusMeta(order);
    if (meta.isUnpaidDraft || !meta.buyerEmail || meta.buyerEmail !== email) {
      return res.status(404).json({
        error: isPt
          ? 'Pedido confirmado não encontrado para este código e e-mail.'
          : 'No confirmed order matched that Order ID and email.',
      });
    }

    const ops = readOps();
    const orderRmas = ops.rmas.filter((r) => r.order_id === meta.orderId);

    return res.json({
      ok: true,
      order: {
        order_id: meta.orderId,
        status: meta.status,
        status_label: meta.statusLabel,
        carrier: meta.carrier || PROFILE.carrier_default,
        tracking_code: meta.trackingCode || null,
        tracking_url: buildCarrierTrackingUrl(meta.carrier, meta.trackingCode),
        shipping_estimate: PROFILE.shipping_estimate,
        estimated_window_days: PROFILE.return_days,
        created_at: meta.createdAt,
        shipped_at: meta.shippedAt,
        delivered_at: meta.deliveredAt,
        can_cancel_pre_ship: Boolean(meta.isPreShipment && !meta.isCancelledOrRefunded),
        can_request_return: Boolean((meta.isShipped || meta.isDelivered) && !meta.isCancelledOrRefunded),
        items: meta.items,
        total_amount: meta.totalAmount,
        total_formatted: formatMoney(meta.totalAmount),
        gift_options: meta.giftOptions || null,
        shipping_city_region: meta.shippingCityRegion || null,
        timeline: buildOrderTimeline(meta),
        rmas: orderRmas,
      },
    });
  });

  // 3. Self-Service RMA (Cancel Pre-Ship, Return, Exchange) — Guest or Signed-In
  app.get('/api/orders/rma', (req, res) => {
    const orderId = String(req.query?.order_id || '').trim().slice(0, 64);
    const email = normalizeEmailSafe(req.query?.email || req.user?.email || '');
    const ops = readOps();
    if (req.isAuthenticated?.() && req.user?.email) {
      const mine = ops.rmas.filter(
        (r) =>
          (r.user_id && r.user_id === req.user.id) ||
          r.email === normalizeEmailSafe(req.user.email)
      );
      return res.json({ ok: true, rmas: orderId ? mine.filter((r) => r.order_id === orderId) : mine });
    }
    if (!orderId || !isValidEmail(email)) {
      return res.status(401).json({ error: isPt ? 'Autenticação ou pedido + e-mail necessários.' : 'Sign in or provide Order ID and email.' });
    }
    const order = findOrderById(orderId);
    if (!order) return res.json({ ok: true, rmas: [] });
    const meta = getOrderStatusMeta(order);
    if (meta.buyerEmail !== email) return res.json({ ok: true, rmas: [] });
    return res.json({ ok: true, rmas: ops.rmas.filter((r) => r.order_id === meta.orderId) });
  });

  app.post('/api/orders/rma', opsRateLimiter(20, 60000), async (req, res, next) => {
    try {
      const orderId = String(req.body?.order_id || '').trim().slice(0, 64);
      const suppliedEmail = normalizeEmailSafe(req.body?.email || req.user?.email || '');
      const rmaType = String(req.body?.type || 'RETURN').trim().toUpperCase();
      const reason = String(req.body?.reason || '').trim().slice(0, 800);
      const preferredResolution = String(req.body?.preferred_resolution || (rmaType === 'EXCHANGE' ? 'EXCHANGE_ITEM' : 'ORIGINAL_PAYMENT_REFUND')).trim().slice(0, 64);
      const exchangeVariant = String(req.body?.exchange_variant || '').trim().slice(0, 140);

      if (!orderId || !['CANCEL', 'RETURN', 'EXCHANGE'].includes(rmaType) || reason.length < 3) {
        return res.status(400).json({
          error: isPt
            ? 'Informe pedido, tipo válido (CANCEL/RETURN/EXCHANGE) e motivo detalhado.'
            : 'Provide order_id, valid type (CANCEL, RETURN, or EXCHANGE), and reason.',
        });
      }

      const order = findOrderById(orderId);
      if (!order) {
        return res.status(404).json({ error: isPt ? 'Pedido não encontrado.' : 'Confirmed order not found.' });
      }
      const meta = getOrderStatusMeta(order);
      if (meta.isUnpaidDraft) {
        return res.status(400).json({ error: isPt ? 'Apenas pedidos pagos aceitam RMA.' : 'Only confirmed paid orders accept RMA requests.' });
      }
      const authedUser = req.isAuthenticated?.() && req.user?.id ? req.user : null;
      const isAuthorized =
        (authedUser && ((order.user_id && order.user_id === authedUser.id) || normalizeEmailSafe(authedUser.email) === meta.buyerEmail)) ||
        (suppliedEmail && suppliedEmail === meta.buyerEmail);

      if (!isAuthorized) {
        return res.status(403).json({
          error: isPt ? 'E-mail ou sessão não corresponde ao titular do pedido.' : 'Order verification failed for that email or account.',
        });
      }
      if (meta.isCancelledOrRefunded) {
        return res.status(400).json({
          error: isPt ? 'Este pedido já foi cancelado ou estornado.' : 'This order has already been cancelled or refunded.',
        });
      }

      const ops = readOps();
      const duplicate = ops.rmas.find(
        (r) => r.order_id === meta.orderId && ['PENDING_REVIEW', 'APPROVED', 'REFUNDED_IMMEDIATELY'].includes(r.status)
      );
      if (duplicate) {
        return res.status(409).json({
          error: isPt
            ? `Já existe uma solicitação ativa (${duplicate.rma_id}) para este pedido.`
            : `An active RMA (${duplicate.rma_id}) already exists for this order.`,
        });
      }

      const now = new Date();
      const nowIso = now.toISOString();
      const rmaId = `RMA-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;

      if (rmaType === 'CANCEL') {
        if (!meta.isPreShipment) {
          return res.status(400).json({
            error: isPt
              ? 'Este pedido já entrou em transporte; solicite Devolução ou Troca após o recebimento.'
              : 'This order is already in transit or delivered; please select Return or Exchange instead.',
          });
        }
        const refundRes = await refundOrderWithClawback(order, nowIso);
        if (!refundRes.ok) {
          return res.status(502).json({
            error: refundRes.error || (isPt ? 'Falha ao processar estorno automático no Stripe.' : 'Unable to execute Stripe refund right now.'),
          });
        }
        const rmaRecord = {
          rma_id: rmaId,
          order_id: meta.orderId,
          user_id: order.user_id || authedUser?.id || null,
          email: meta.buyerEmail,
          type: 'CANCEL',
          status: 'REFUNDED_IMMEDIATELY',
          reason,
          preferred_resolution: 'ORIGINAL_PAYMENT_REFUND',
          exchange_variant: null,
          refund_amount: meta.totalAmount,
          stripe_refund_id: refundRes.stripeRefundId || null,
          resolution_note: isPt
            ? 'Cancelamento pré-envio aprovado imediatamente com estorno e restauração de saldo.'
            : 'Pre-shipment cancellation approved immediately with refund & loyalty balance restoration.',
          created_at: nowIso,
          updated_at: nowIso,
        };
        ops.rmas.unshift(rmaRecord);
        writeOps(ops);
        emailService.sendRmaStatusEmail(rmaRecord, order, { to: meta.buyerEmail }).catch(() => {});
        return res.status(201).json({ ok: true, rma: rmaRecord, refund: refundRes });
      }

      const isDefectClaim = /defe|broken|damag|defect|avari|quebr/i.test(reason);
      if (meta.deliveredAt && !isDefectClaim) {
        const delTs = Date.parse(meta.deliveredAt);
        const maxMs = PROFILE.return_days * 24 * 60 * 60 * 1000;
        if (!Number.isNaN(delTs) && now.getTime() > delTs + maxMs) {
          return res.status(400).json({
            error: isPt
              ? `O prazo de arrependimento (${PROFILE.return_days} dias corridos) foi encerrado. Para defeito de fabricação, mencione a avaria na descrição ou abra atendimento.`
              : `The ${PROFILE.return_days}-day return window has closed. For defective/damaged items, mention the issue or contact concierge support.`,
          });
        }
      }

      saveOrderMutation(meta.orderId, (o) => {
        if (o.status !== 'REFUNDED_CLAWBACK' && o.status !== 'REFUNDED') {
          o.rma_status = 'PENDING_REVIEW';
          o.rma_id = rmaId;
          o.updated_at = nowIso;
        }
      });

      const rmaRecord = {
        rma_id: rmaId,
        order_id: meta.orderId,
        user_id: order.user_id || authedUser?.id || null,
        email: meta.buyerEmail,
        type: rmaType,
        status: 'PENDING_REVIEW',
        reason,
        preferred_resolution: preferredResolution,
        exchange_variant: exchangeVariant || null,
        refund_amount: null,
        stripe_refund_id: null,
        resolution_note: isPt
          ? 'Solicitação recebida pela equipe de logística para autorização de etiqueta reversa.'
          : 'Request logged with fulfillment & concierge for return/exchange label review.',
        created_at: nowIso,
        updated_at: nowIso,
      };
      ops.rmas.unshift(rmaRecord);
      writeOps(ops);
      emailService.sendRmaStatusEmail(rmaRecord, order, { to: meta.buyerEmail }).catch(() => {});
      return res.status(201).json({ ok: true, rma: rmaRecord });
    } catch (err) {
      return next(err);
    }
  });

  // 4. Guest & Authenticated Support / Assistance Ticketing
  app.post('/api/support/tickets', opsRateLimiter(20, 60000), (req, res) => {
    const name = String(req.body?.name || req.user?.name || '').trim().slice(0, 120);
    const email = normalizeEmailSafe(req.body?.email || req.user?.email || '');
    const orderId = String(req.body?.order_id || '').trim().slice(0, 64) || null;
    const topic = String(req.body?.topic || 'GENERAL').trim().slice(0, 64);
    const subject = String(req.body?.subject || topic).trim().slice(0, 140);
    const message = String(req.body?.message || '').trim().slice(0, 2000);

    if (!name || !isValidEmail(email) || message.length < 5) {
      return res.status(400).json({
        error: isPt
          ? 'Informe nome, e-mail válido e sua mensagem (mínimo 5 caracteres).'
          : 'Please provide your name, a valid email, and a message (at least 5 characters).',
      });
    }

    const nowIso = new Date().toISOString();
    const ticket = {
      ticket_id: `SUP-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`,
      user_id: req.user?.id || null,
      name,
      email,
      order_id: orderId,
      topic,
      subject,
      message,
      status: 'OPEN',
      staff_reply: null,
      created_at: nowIso,
      updated_at: nowIso,
    };

    const ops = readOps();
    ops.support_tickets.unshift(ticket);
    writeOps(ops);
    emailService.sendSupportTicketEmail(ticket).catch(() => {});

    return res.status(201).json({
      ok: true,
      ticket,
      sla_badge: isPt ? 'Resposta garantida em até 1 dia útil' : '1 Business Day Concierge SLA',
    });
  });

  app.get('/api/support/tickets/my', requireAuth, (req, res) => {
    const userEmail = normalizeEmailSafe(req.currentUser?.email);
    const ops = readOps();
    const tickets = ops.support_tickets.filter(
      (t) => t.user_id === req.currentUser?.id || (userEmail && t.email === userEmail)
    );
    return res.json({ ok: true, tickets });
  });

  // 5. Back-in-Stock & Price-Drop Alerts (Zero-Spam Deduplicated)
  app.post('/api/alerts/subscribe', opsRateLimiter(30, 60000), (req, res) => {
    const email = normalizeEmailSafe(req.body?.email || req.user?.email || '');
    const productId = String(req.body?.product_id || '').trim().slice(0, 80);
    const alertType = String(req.body?.alert_type || 'PRICE_DROP').trim().toUpperCase();
    if (!isValidEmail(email) || !productId || !['BACK_IN_STOCK', 'PRICE_DROP'].includes(alertType)) {
      return res.status(400).json({
        error: isPt ? 'E-mail, produto e tipo de alerta válidos são obrigatórios.' : 'Valid email, product_id, and alert_type are required.',
      });
    }
    const catalog = getCatalog() || [];
    const prod = catalog.find((p) => p.id === productId || p.sku === productId);
    const ops = readOps();
    const existing = ops.alerts.find((a) => a.email === email && a.product_id === productId && a.alert_type === alertType);
    if (existing) {
      return res.status(200).json({ ok: true, already_subscribed: true, alert: existing });
    }
    const alert = {
      id: `alt-${crypto.randomBytes(4).toString('hex')}`,
      email,
      product_id: productId,
      product_name: prod?.name || String(req.body?.product_name || productId).slice(0, 120),
      alert_type: alertType,
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
    };
    ops.alerts.unshift(alert);
    writeOps(ops);
    return res.status(201).json({ ok: true, alert });
  });

  // 6. Wishlist / Favorites Account Sync
  app.get('/api/wishlist', requireAuth, (req, res) => {
    const key = req.currentUser?.id || normalizeEmailSafe(req.currentUser?.email);
    const ops = readOps();
    return res.json({ ok: true, product_ids: Array.isArray(ops.wishlists[key]) ? ops.wishlists[key] : [] });
  });

  app.post('/api/wishlist/toggle', requireAuth, (req, res) => {
    const productId = String(req.body?.product_id || '').trim().slice(0, 80);
    const mergeIds = Array.isArray(req.body?.merge_ids) ? req.body.merge_ids.map((x) => String(x || '').trim().slice(0, 80)).filter(Boolean) : [];
    const key = req.currentUser?.id || normalizeEmailSafe(req.currentUser?.email);
    const ops = readOps();
    const cur = new Set(Array.isArray(ops.wishlists[key]) ? ops.wishlists[key] : []);
    for (const mid of mergeIds) cur.add(mid);
    let added = false;
    if (productId) {
      if (cur.has(productId)) {
        cur.delete(productId);
        added = false;
      } else {
        cur.add(productId);
        added = true;
      }
    }
    ops.wishlists[key] = Array.from(cur).slice(0, 120);
    writeOps(ops);
    return res.json({ ok: true, added, product_ids: ops.wishlists[key] });
  });

  // 7. Verified-Buyer Reviews (STRICTLY Zero Fake Data; DELIVERED Order Required)
  app.get('/api/reviews', (req, res) => {
    const productId = String(req.query?.product_id || '').trim().slice(0, 80);
    const ops = readOps();
    const filtered = productId ? ops.reviews.filter((r) => r.product_id === productId) : ops.reviews;
    const count = filtered.length;
    const average = count > 0 ? Number((filtered.reduce((s, r) => s + Number(r.rating || 0), 0) / count).toFixed(2)) : 0;
    const countsByProduct = {};
    for (const r of ops.reviews) {
      countsByProduct[r.product_id] = (countsByProduct[r.product_id] || 0) + 1;
    }
    return res.json({
      ok: true,
      zero_fake_data: true,
      product_id: productId || null,
      count,
      average_rating: average,
      reviews: filtered.slice(0, 50),
      counts_by_product: countsByProduct,
    });
  });

  app.post('/api/reviews', requireAuth, opsRateLimiter(15, 60000), (req, res) => {
    const productId = String(req.body?.product_id || '').trim().slice(0, 80);
    const rating = Math.round(Number(req.body?.rating || 0));
    const title = String(req.body?.title || '').trim().slice(0, 120);
    const body = String(req.body?.comment || req.body?.body || '').trim().slice(0, 1200);

    if (!productId || rating < 1 || rating > 5 || body.length < 5) {
      return res.status(400).json({
        error: isPt
          ? 'Informe produto, nota de 1 a 5 e comentário de compra verificada (mín. 5 caracteres).'
          : 'Provide product_id, 1–5 rating, and review text (min 5 chars).',
      });
    }

    const verifiedBuyer = checkUserDeliveredProduct(req.currentUser.id, normalizeEmailSafe(req.currentUser.email), productId);
    if (!verifiedBuyer) {
      return res.status(403).json({
        error: isPt
          ? 'Apenas clientes com pedido ENTREGUE deste item podem publicar avaliação verificada.'
          : 'Verified buyer & delivered order status required to review this item.',
      });
    }

    const ops = readOps();
    const dup = ops.reviews.find((r) => r.product_id === productId && r.user_id === req.currentUser.id);
    if (dup) {
      return res.status(409).json({
        error: isPt ? 'Você já avaliou este produto.' : 'You have already reviewed this verified purchase.',
      });
    }

    const review = {
      review_id: `REV-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
      product_id: productId,
      user_id: req.currentUser.id,
      author_display: String(req.currentUser.name || 'Verified Buyer').split(' ')[0],
      verified_purchase: true,
      rating,
      title: title || (isPt ? 'Compra Verificada' : 'Verified Purchase'),
      comment: body,
      created_at: new Date().toISOString(),
    };
    ops.reviews.unshift(review);
    writeOps(ops);
    return res.status(201).json({ ok: true, review });
  });

  // 8. Saved-Cart Reminder Email (Catalog-Verified Totals Only)
  app.post('/api/cart/email-reminder', opsRateLimiter(15, 60000), async (req, res) => {
    const email = normalizeEmailSafe(req.body?.email || req.user?.email || '');
    const rawItems = Array.isArray(req.body?.items) ? req.body.items : [];
    if (!isValidEmail(email) || rawItems.length === 0) {
      return res.status(400).json({
        error: isPt ? 'Informe um e-mail válido e ao menos 1 item na sacola.' : 'Provide a valid email and at least 1 cart item.',
      });
    }
    const catalog = getCatalog() || [];
    const safeItems = [];
    let subtotal = 0;
    for (const line of rawItems.slice(0, 20)) {
      const id = String(line?.product_id || line?.id || '').trim();
      const qty = Math.max(1, Math.min(20, Math.floor(Number(line?.quantity || line?.qty || 1))));
      const prod = catalog.find((p) => p.id === id || p.sku === id);
      if (prod) {
        const unit = Number(prod.base_price_brl ?? prod.price_brl ?? prod.base_price_usd ?? prod.price_usd ?? 0);
        subtotal += unit * qty;
        safeItems.push({ id: prod.id, title: prod.name, quantity: qty, unit_price: unit });
      }
    }
    if (!safeItems.length) {
      return res.status(400).json({ error: isPt ? 'Nenhum produto válido encontrado.' : 'No valid catalog items provided.' });
    }
    const sendRes = await emailService.sendSavedCartReminderEmail({ to: email, items: safeItems, subtotal });
    return res.json({ ok: true, email_status: sendRes.status, items_count: safeItems.length });
  });

  // 9. Printable Receipt / Gift Slip Data
  app.post('/api/orders/:orderId/receipt', opsRateLimiter(30, 60000), (req, res) => {
    const { orderId } = req.params;
    const suppliedEmail = normalizeEmailSafe(req.body?.email || req.user?.email || '');
    const forceGiftHidePrice = Boolean(req.body?.gift_slip);
    const order = findOrderById(orderId);
    if (!order) {
      return res.status(404).json({ error: isPt ? 'Pedido não encontrado.' : 'Order not found.' });
    }
    const meta = getOrderStatusMeta(order);
    const authedUser = req.isAuthenticated?.() && req.user?.id ? req.user : null;
    const allowed =
      (authedUser && ((order.user_id && order.user_id === authedUser.id) || normalizeEmailSafe(authedUser.email) === meta.buyerEmail)) ||
      (suppliedEmail && suppliedEmail === meta.buyerEmail);

    if (!allowed || meta.isUnpaidDraft) {
      return res.status(403).json({ error: isPt ? 'Sem permissão para emitir recibo deste pedido.' : 'Not authorized for this receipt.' });
    }
    const hidePrices = forceGiftHidePrice || Boolean(meta.giftOptions?.hide_price_on_slip);
    return res.json({
      ok: true,
      receipt: {
        brand: PROFILE.brand,
        locale: PROFILE.locale,
        currency: PROFILE.currency,
        order_id: meta.orderId,
        issued_at: meta.paidAt || meta.createdAt,
        status_label: meta.statusLabel,
        buyer_name: meta.buyerName,
        buyer_email: meta.buyerEmail,
        shipping_city_region: meta.shippingCityRegion,
        carrier: meta.carrier || PROFILE.carrier_default,
        tracking_code: meta.trackingCode || null,
        hide_prices: hidePrices,
        gift_note: meta.giftOptions?.gift_note || null,
        items: meta.items.map((it) => ({
          ...it,
          unit_price: hidePrices ? null : it.unit_price,
          line_total: hidePrices ? null : it.line_total,
        })),
        subtotal: hidePrices ? null : meta.subtotal,
        discount: hidePrices ? null : meta.discount,
        shipping: hidePrices ? null : meta.shipping,
        tax: hidePrices ? null : meta.tax,
        total: hidePrices ? null : meta.totalAmount,
      },
    });
  });

  // 10. Admin Operations Hub
  app.get('/api/admin/store-ops', requireAdmin, (_req, res) => {
    const ops = readOps();
    const creds = emailService.getCredentials();
    return res.json({
      ok: true,
      email_config: {
        configured: creds.configured,
        sender: creds.user || null,
      },
      outbox: emailService.readOutbox(100),
      rmas: ops.rmas,
      support_tickets: ops.support_tickets,
      alerts: ops.alerts,
      reviews: ops.reviews,
      orders: (getOrdersList() || []).filter((o) => !getOrderStatusMeta(o).isUnpaidDraft).slice(0, 120),
    });
  });

  app.post('/api/admin/email/verify', requireAdmin, async (_req, res) => {
    const status = await emailService.verifySmtp();
    return res.json({ ok: status.ok, smtp: status });
  });

  app.patch('/api/admin/rmas/:rmaId', requireAdmin, async (req, res, next) => {
    try {
      const { rmaId } = req.params;
      const action = String(req.body?.action || '').trim().toLowerCase();
      const note = String(req.body?.resolution_note || '').trim().slice(0, 500);
      if (!['approve', 'reject', 'refund', 'exchange_shipped'].includes(action)) {
        return res.status(400).json({ error: 'Invalid action. Use approve, reject, refund, or exchange_shipped.' });
      }
      const ops = readOps();
      const rma = ops.rmas.find((r) => r.rma_id === rmaId);
      if (!rma) return res.status(404).json({ error: 'RMA not found.' });

      const order = findOrderById(rma.order_id);
      const nowIso = new Date().toISOString();

      if (action === 'refund') {
        if (!order) return res.status(404).json({ error: 'Associated order not found.' });
        if (rma.status === 'REFUNDED' || rma.status === 'REFUNDED_IMMEDIATELY') {
          return res.status(400).json({ error: 'This RMA has already been refunded.' });
        }
        const refundRes = await refundOrderWithClawback(order, nowIso);
        if (!refundRes.ok) {
          return res.status(502).json({ error: refundRes.error || 'Stripe refund failed.' });
        }
        const meta = getOrderStatusMeta(order);
        rma.status = 'REFUNDED';
        rma.refund_amount = meta.totalAmount;
        rma.stripe_refund_id = refundRes.stripeRefundId || null;
        rma.resolution_note = note || (isPt ? 'Reembolso processado via Stripe e saldo estornado.' : 'Refund processed via Stripe and loyalty balance reversed.');
      } else if (action === 'approve') {
        rma.status = 'APPROVED';
        rma.resolution_note = note || (isPt ? 'Devolução/Troca autorizada pela administração.' : 'Return/Exchange approved by admin.');
      } else if (action === 'exchange_shipped') {
        rma.status = 'EXCHANGE_SHIPPED';
        rma.resolution_note = note || (isPt ? 'Item de troca despachado.' : 'Exchange replacement shipped.');
      } else {
        rma.status = 'REJECTED';
        rma.resolution_note = note || (isPt ? 'Solicitação encerrada sem elegibilidade.' : 'Request closed by admin review.');
      }
      rma.updated_at = nowIso;
      writeOps(ops);
      emailService.sendRmaStatusEmail(rma, order || { order_id: rma.order_id }, { to: rma.email }).catch(() => {});
      return res.json({ ok: true, rma });
    } catch (err) {
      return next(err);
    }
  });

  app.patch('/api/admin/support/tickets/:ticketId', requireAdmin, (req, res) => {
    const { ticketId } = req.params;
    const status = String(req.body?.status || '').trim().toUpperCase();
    const staffReply = String(req.body?.staff_reply || '').trim().slice(0, 1500);
    const ops = readOps();
    const ticket = ops.support_tickets.find((t) => t.ticket_id === ticketId);
    if (!ticket) return res.status(404).json({ error: 'Support ticket not found.' });
    if (['OPEN', 'IN_PROGRESS', 'RESOLVED'].includes(status)) {
      ticket.status = status;
    }
    if (staffReply) {
      ticket.staff_reply = staffReply;
    }
    ticket.updated_at = new Date().toISOString();
    writeOps(ops);
    return res.json({ ok: true, ticket });
  });
}
