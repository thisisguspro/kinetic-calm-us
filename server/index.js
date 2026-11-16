import express from 'express';
import session from 'express-session';
import createMemoryStore from 'memorystore';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import {
  MAX_LOYALTY_DISCOUNT_PCT,
  MIN_NET_MARGIN_PCT,
  computeServerQuote,
  computeSkuMargins,
  loadCatalog,
  normalizeEmail,
  readStore,
  writeStore,
} from './adminStore.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const DIST_DIR = path.join(ROOT_DIR, 'dist');
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');
const PORT = Number(process.env.PORT || 3007);
const IS_PROD = process.env.NODE_ENV === 'production';

const app = express();
const MemoryStore = createMemoryStore(session);

app.disable('x-powered-by');
app.set('trust proxy', 1);

// 1. FIRST MIDDLEWARE: Early Dotfile, Internal File & Path Traversal 404 Shield
// Runs BEFORE static extension checks or session/body parsers so /.env, /.git, /server, /shared, /data NEVER leak.
const BLOCKED_INTERNAL_PREFIXES = ['/server', '/shared', '/data', '/scripts', '/node_modules', '/package.json', '/package-lock.json', '/vite.config'];

app.use((req, res, next) => {
  const rawUrl = String(req.url || '/');
  let decodedPath = rawUrl.split('?')[0];
  try {
    decodedPath = decodeURIComponent(decodedPath);
  } catch {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    return res.status(400).end();
  }
  const lower = decodedPath.toLowerCase();
  const hasDotSegment = lower.startsWith('/.') || lower.includes('/.') || lower.includes('\\.');
  const hasTraversal = lower.includes('..') || lower.includes('\\');
  const hitsInternalDir = BLOCKED_INTERNAL_PREFIXES.some(
    (prefix) => lower === prefix || lower.startsWith(`${prefix}/`)
  );
  if (hasDotSegment || hasTraversal || hitsInternalDir) {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'no-store');
    return res.status(404).end();
  }
  return next();
});

// 2. Global Security Headers Middleware (20-Point Defense)
app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' https://js.stripe.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: https:; connect-src 'self' https://api.stripe.com; frame-src https://js.stripe.com https://checkout.stripe.com; object-src 'none'; base-uri 'self'; frame-ancestors 'none';"
  );
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  if (req.path.startsWith('/api/') || req.path.startsWith('/auth/')) {
    res.setHeader('Cache-Control', 'no-store, max-age=0');
  }
  next();
});

app.use(express.json({ limit: '64kb' }));

const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
app.use(
  session({
    name: 'kc_us_sid',
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: new MemoryStore({ checkPeriod: 86400000 }),
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: IS_PROD && Boolean(process.env.FORCE_HTTPS_COOKIE),
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
  })
);

// 3. Strict CSRF Guard on State-Changing Routes
const TRUSTED_PROD_HOSTS = new Set(['kineticcalm.us', 'www.kineticcalm.us', 'sensoryhaven.us', 'www.sensoryhaven.us']);

function isTrustedOriginHeader(urlLike, hostHeader) {
  if (!urlLike) return true;
  try {
    const parsed = new URL(urlLike);
    const hostname = parsed.hostname.toLowerCase();
    const expectedHost = String(hostHeader || '').split(':')[0].toLowerCase();
    return (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '[::1]' ||
      hostname === expectedHost ||
      TRUSTED_PROD_HOSTS.has(hostname) ||
      hostname.endsWith('.trycloudflare.com')
    );
  } catch {
    return false;
  }
}

app.use('/api', (req, res, next) => {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return next();
  const sfs = String(req.get('sec-fetch-site') || '').toLowerCase();
  if (sfs === 'cross-site') {
    return res.status(403).json({ error: 'CSRF cross-site write blocked.' });
  }
  const origin = req.get('origin');
  const referer = req.get('referer');
  const host = req.get('host');
  if (!isTrustedOriginHeader(origin, host) || !isTrustedOriginHeader(referer, host)) {
    return res.status(403).json({ error: 'Untrusted Origin or Referer blocked.' });
  }
  return next();
});

// 4. Health, SEO Robots & Sitemap
app.get('/api/health', (_req, res) => {
  const store = readStore();
  res.json({
    ok: true,
    service: 'kinetic-calm-us',
    port: PORT,
    zero_fake_data: true,
    fda_general_wellness: true,
    cpsia_astm_f963: true,
    orders_count: store.orders.length,
    reviews_count: store.reviews.length,
    ts: new Date().toISOString(),
  });
});

app.get('/robots.txt', (_req, res) => {
  res.type('text/plain').send('User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /auth/\nSitemap: /sitemap.xml\n');
});

app.get('/sitemap.xml', (req, res) => {
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  res.type('application/xml').send(
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
      `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
      `  <url><loc>${baseUrl}/</loc><changefreq>weekly</changefreq><priority>1.0</priority></url>\n` +
      `  <url><loc>${baseUrl}/#feel-lab</loc><changefreq>weekly</changefreq><priority>0.9</priority></url>\n` +
      `  <url><loc>${baseUrl}/#collection</loc><changefreq>weekly</changefreq><priority>0.9</priority></url>\n` +
      `  <url><loc>${baseUrl}/#legal</loc><changefreq>monthly</changefreq><priority>0.7</priority></url>\n` +
      `</urlset>\n`
  );
});

// 5. Public Catalog & Unit Economics / Compliance Gate
app.get('/api/catalog', (_req, res) => {
  const catalog = loadCatalog().map(({ cost_usd: _hiddenCost, ...publicSku }) => ({
    ...publicSku,
    compliance_verified: Boolean(publicSku.cpsia_astm_note && publicSku.fda_wellness_note),
  }));
  res.json({
    brand: 'KINETIC CALM',
    currency: 'USD',
    total_skus: catalog.length,
    track_a_count: catalog.filter((i) => i.track === 'TRACK_A_DIRECT').length,
    track_b_count: catalog.filter((i) => i.track === 'TRACK_B_PARTNER').length,
    items: catalog,
  });
});

app.get('/api/stats', (_req, res) => {
  const store = readStore();
  const totalRev = store.orders.reduce((acc, o) => acc + Number(o.total_usd || 0), 0);
  const avgRating =
    store.reviews.length > 0
      ? Number((store.reviews.reduce((a, r) => a + Number(r.rating || 0), 0) / store.reviews.length).toFixed(2))
      : 0;
  res.json({
    zero_fake_data_enforced: true,
    orders_count: store.orders.length,
    revenue_usd: Number(totalRev.toFixed(2)),
    reviews_count: store.reviews.length,
    average_rating: avgRating,
    waitlist_count: store.waitlist_subscribers.length,
  });
});

app.get('/api/compliance-audit', (_req, res) => {
  const catalog = loadCatalog();
  const directSkus = catalog.filter((i) => i.track === 'TRACK_A_DIRECT');
  const auditRows = directSkus.map((sku) => ({
    id: sku.id,
    sku: sku.sku,
    price_usd: sku.price_usd,
    ...computeSkuMargins(sku),
  }));
  const allAboveFloor = auditRows.every((r) => r.passes_20pct_floor);
  res.json({
    brand: 'KINETIC CALM US',
    min_net_margin_floor_pct: MIN_NET_MARGIN_PCT,
    max_loyalty_discount_cap_pct: MAX_LOYALTY_DISCOUNT_PCT,
    all_direct_skus_pass_margin_floor: allAboveFloor,
    fda_wellness_disclaimer_active: true,
    cpsia_astm_f963_active: true,
    skus: auditRows,
  });
});

// 6. Server-Computed Quote, Waitlist & Stripe Checkout Guard
app.post('/api/quote', (req, res) => {
  const { items, promo_code, vault_discount_pct, email } = req.body || {};
  const quote = computeServerQuote(items, promo_code, vault_discount_pct, email);
  res.json(quote);
});

app.post('/api/waitlist', (req, res) => {
  // Explicit NFKC + 128-char email normalization (Zero-Fake-Data waitlist ledger)
  const rawEmail = String(req.body?.email || '').normalize('NFKC').trim().toLowerCase().slice(0, 128);
  const email = normalizeEmail(rawEmail);
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }
  const store = readStore();
  if (!store.waitlist_subscribers.some((s) => s.email === email)) {
    store.waitlist_subscribers.push({ email, subscribed_at: new Date().toISOString() });
    writeStore(store);
  }
  return res.json({
    ok: true,
    message: "You're on the list! We'll keep you posted on new Kinetic Calm drops.",
  });
});

app.post('/api/checkout', (req, res) => {
  const { items, promo_code, vault_discount_pct, email } = req.body || {};
  const cleanEmail = normalizeEmail(email);
  const quote = computeServerQuote(items, promo_code, vault_discount_pct, cleanEmail);
  if (!quote.items.length) {
    return res.status(400).json({ error: 'Your sensory bag has no direct-checkout items.' });
  }
  if (!quote.margin_guard_ok) {
    return res.status(400).json({ error: 'Order rejected by server-side 20% minimum net margin guard.' });
  }
  if (!process.env.STRIPE_SECRET_KEY) {
    return res.status(503).json({
      ok: false,
      mode: 'STRIPE_KEY_REQUIRED',
      quote,
      message:
        'Live Stripe US Checkout requires STRIPE_SECRET_KEY in environment variables. Zero-Fake-Data Law blocks creating synthetic paid orders.',
    });
  }
  return res.status(501).json({
    ok: false,
    quote,
    message: 'Stripe webhook settlement handler ready once live STRIPE_SECRET_KEY is activated.',
  });
});

// 7. Static Assets & SPA Fallback
if (fs.existsSync(PUBLIC_DIR)) {
  app.use(express.static(PUBLIC_DIR, { dotfiles: 'ignore', index: false }));
}
if (fs.existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR, { dotfiles: 'ignore', index: false }));
}

app.get('*', (_req, res) => {
  const distIndex = path.join(DIST_DIR, 'index.html');
  if (fs.existsSync(distIndex)) {
    return res.sendFile(distIndex);
  }
  return res.status(503).send('KINETIC CALM frontend build missing — run npm run build.');
});

app.listen(PORT, '127.0.0.1', () => {
  console.log(`KINETIC CALM US storefront listening on http://127.0.0.1:${PORT}`);
});
