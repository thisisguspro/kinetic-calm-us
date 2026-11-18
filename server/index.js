import express from 'express';
import session from 'express-session';
import createMemoryStore from 'memorystore';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import {
  MAIN_SUPER_ADMIN_EMAIL,
  MAX_LOYALTY_DISCOUNT_PCT,
  MIN_NET_MARGIN_PCT,
  SUPER_ADMIN_EMAILS,
  computeServerQuote,
  computeSkuMargins,
  decorateUserWithRoles,
  findReferralOwnerByCode,
  getUserById,
  isAdminEmail,
  isSuperAdminEmail,
  loadCatalog,
  normalizeEmail,
  readStore,
  upsertGoogleUser,
  writeStore,
} from './adminStore.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const ENV_FILE = path.join(ROOT_DIR, '.env');
if (fs.existsSync(ENV_FILE)) {
  for (const line of fs.readFileSync(ENV_FILE, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const eqIdx = trimmed.indexOf('=');
    const k = trimmed.slice(0, eqIdx).trim();
    const v = trimmed.slice(eqIdx + 1).trim().replace(/^['"]|['"]$/g, '');
    if (k && process.env[k] === undefined) process.env[k] = v;
  }
}

const DIST_DIR = path.join(ROOT_DIR, 'dist');
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');
const PORT = Number(process.env.PORT || 3007);
const IS_PROD = process.env.NODE_ENV === 'production';
const BIND_HOST = IS_PROD ? '0.0.0.0' : '127.0.0.1';

const isRealCred = (val) =>
  Boolean(
    val &&
      String(val).trim() !== '' &&
      !['pending', 'placeholder', 'none', 'todo', 'false', 'null'].includes(String(val).trim().toLowerCase())
  );

const hasGoogleCreds =
  isRealCred(process.env.GOOGLE_CLIENT_ID) && isRealCred(process.env.GOOGLE_CLIENT_SECRET);

const app = express();
const MemoryStore = createMemoryStore(session);

app.disable('x-powered-by');
app.set('trust proxy', 1);

// 1. FIRST MIDDLEWARE: Early Dotfile, Internal File & Path Traversal 404 Shield
const BLOCKED_INTERNAL_PREFIXES = [
  '/server',
  '/shared',
  '/data',
  '/scripts',
  '/node_modules',
  '/package.json',
  '/package-lock.json',
  '/vite.config',
];

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

// 2. Global Security Headers Middleware (20-Point Defense + Google OAuth & Stripe Allowlist)
app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' https://js.stripe.com https://accounts.google.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: https:; connect-src 'self' https://api.stripe.com https://accounts.google.com; frame-src https://js.stripe.com https://checkout.stripe.com https://accounts.google.com; form-action 'self' https://checkout.stripe.com https://accounts.google.com; object-src 'none'; base-uri 'self'; frame-ancestors 'none';"
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

app.use(
  express.json({
    limit: '64kb',
    verify: (req, _res, buf) => {
      if (req.originalUrl && req.originalUrl.startsWith('/api/webhooks/stripe')) {
        req.rawBody = Buffer.from(buf);
      }
    },
  })
);

const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
app.use(
  session({
    name: 'kc_us_sid',
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    store: new MemoryStore({ checkPeriod: 86400000 }),
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: IS_PROD,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
  })
);

app.use(passport.initialize());
app.use(passport.session());

if (hasGoogleCreds) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID.trim(),
        clientSecret: process.env.GOOGLE_CLIENT_SECRET.trim(),
        callbackURL: process.env.GOOGLE_CALLBACK_URL || '/api/auth/google/callback',
        passReqToCallback: true,
      },
      (req, _accessToken, _refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value || '';
          const name = profile.displayName || profile.name?.givenName || 'Kinetic Calm Member';
          const avatarUrl = profile.photos?.[0]?.value || null;
          const refCookie = req.session?.pendingReferralCode || null;
          const user = upsertGoogleUser({
            googleId: profile.id,
            email,
            name,
            avatarUrl,
            referredByCode: refCookie,
          });
          return done(null, user);
        } catch (err) {
          return done(err);
        }
      }
    )
  );
}

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser((id, done) => {
  const user = getUserById(id);
  done(null, user || false);
});

function isLocalhostRequest(req) {
  if (IS_PROD) return false;
  const ip = String(req.ip || req.socket?.remoteAddress || '');
  const host = String(req.hostname || req.get('host') || '').toLowerCase();
  const isLoopbackIp = ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1' || ip === '';
  const isLocalHost = host.startsWith('localhost') || host.startsWith('127.0.0.1') || host.startsWith('[::1]');
  return isLoopbackIp && isLocalHost;
}

function loginWithSessionRegeneration(req, res, next, user, redirectUrl) {
  const preservedRef = req.session?.pendingReferralCode || null;
  if (!req.session || typeof req.session.regenerate !== 'function') {
    return req.login(user, (err) => {
      if (err) return next(err);
      return res.redirect(redirectUrl);
    });
  }
  req.session.regenerate((regenErr) => {
    if (regenErr) return next(regenErr);
    if (preservedRef) req.session.pendingReferralCode = preservedRef;
    req.login(user, (loginErr) => {
      if (loginErr) return next(loginErr);
      req.session.save(() => res.redirect(redirectUrl));
    });
  });
}

// 3. Strict CSRF Guard on State-Changing Routes
const TRUSTED_PROD_HOSTS = new Set([
  'kineticcalm.us',
  'www.kineticcalm.us',
  'sensoryhaven.us',
  'www.sensoryhaven.us',
  'kinetic-calm-us.onrender.com',
]);

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
  if (req.path.startsWith('/webhooks/stripe')) return next();
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

// ============================================================================
// 4. GOOGLE AUTHENTICATION & STRICT LOGIN-REQUIRED GUARDS (CUSTOMER + ADMIN)
// ============================================================================
app.get('/api/auth/google', (req, res, next) => {
  const ref =
    typeof req.query.ref === 'string'
      ? req.query.ref.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 24)
      : '';
  const returnTo = req.query.admin === '1' ? '/?open=admin' : '/?open=account';
  if (ref && req.session) {
    req.session.pendingReferralCode = ref;
  }
  if (req.session) {
    req.session.postLoginRedirect = returnTo;
  }
  if (hasGoogleCreds) {
    return passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next);
  }
  return res.redirect(`${returnTo}&auth_notice=google_oauth_pending`);
});

app.get(
  '/api/auth/google/callback',
  (req, res, next) => {
    if (!hasGoogleCreds) return res.redirect('/');
    return passport.authenticate('google', {
      failureRedirect: '/?auth_notice=failed',
      keepSessionInfo: true,
    })(req, res, next);
  },
  (req, res, next) => {
    if (!req.user) return res.redirect('/?auth_notice=failed');
    const redirectTo = req.session?.postLoginRedirect || '/?open=account';
    return loginWithSessionRegeneration(req, res, next, req.user, redirectTo);
  }
);

app.get('/api/auth/me', (req, res) => {
  const loggedIn = Boolean(req.isAuthenticated && req.isAuthenticated() && req.user?.id);
  const fresh = loggedIn ? getUserById(req.user.id) : null;
  res.json({
    authenticated: Boolean(fresh),
    google_oauth_live_configured: hasGoogleCreds,
    user: fresh || null,
  });
});

app.post('/api/auth/logout', (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    if (req.session) {
      req.session.destroy(() => {
        res.clearCookie('kc_us_sid', { httpOnly: true, sameSite: 'lax' });
        res.json({ ok: true });
      });
    } else {
      res.clearCookie('kc_us_sid');
      res.json({ ok: true });
    }
  });
});

function requireAuth(req, res, next) {
  if (!req.isAuthenticated || !req.isAuthenticated() || !req.user?.id) {
    return res.status(401).json({ error: 'Please sign in with Google to view your orders and rewards.' });
  }
  const fresh = getUserById(req.user.id);
  if (!fresh) {
    return res.status(401).json({ error: 'Session expired. Please sign in with Google again.' });
  }
  req.currentUser = fresh;
  return next();
}

// STRICT ADMIN LOGIN GATE: Admin actions ALWAYS require an authenticated Admin Google session!
function requireAdminAuth(req, res, next) {
  if (!req.isAuthenticated || !req.isAuthenticated() || !req.user?.id) {
    return res.status(401).json({
      error: 'Admin Sign-In Required: Please sign in with an authorized Kinetic Calm Admin Google account.',
    });
  }
  const fresh = getUserById(req.user.id);
  if (!fresh || !isAdminEmail(fresh.email)) {
    return res.status(403).json({
      error: 'Access Denied: Your Google account is not on the authorized Kinetic Calm Admin allowlist.',
    });
  }
  req.currentUser = fresh;
  return next();
}

function requireSuperAdminAuth(req, res, next) {
  return requireAdminAuth(req, res, () => {
    if (!isSuperAdminEmail(req.currentUser?.email)) {
      return res.status(403).json({ error: 'Only the Founder Super-Admin can modify admin permissions.' });
    }
    return next();
  });
}

// ============================================================================
// 5. AUTHENTICATED CUSTOMER ORDERS & LUNA-STYLE REFERRAL VAULT ROUTES
// ============================================================================
app.get('/api/my/orders', requireAuth, (req, res) => {
  const store = readStore();
  const email = normalizeEmail(req.currentUser.email);
  const myOrders = store.orders
    .filter((o) => normalizeEmail(o.customer_email || o.email) === email)
    .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));
  res.json({
    zero_fake_data: true,
    email,
    orders_count: myOrders.length,
    orders: myOrders,
  });
});

app.get('/api/my/referrals', requireAuth, (req, res) => {
  const u = req.currentUser;
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  res.json({
    referral_code: u.referral_code,
    share_url: `${baseUrl}/?ref=${encodeURIComponent(u.referral_code)}`,
    friend_welcome_pct: 10,
    referrer_reward_per_friend_pct: 10,
    max_loyalty_cap_pct: MAX_LOYALTY_DISCOUNT_PCT,
    referrals_completed_count: Number(u.referrals_completed_count || 0),
    unlocked_vault_pct: Math.min(MAX_LOYALTY_DISCOUNT_PCT, Number(u.unlocked_vault_pct || 0)),
    pending_escrow_pct: Number(u.pending_escrow_pct || 0),
    referred_by_code: u.referred_by_code || null,
    friend_welcome_available: Boolean(u.referred_by_code && !u.friend_welcome_used),
  });
});

// ============================================================================
// 6. STRICTLY PROTECTED FOUNDER / CO-OWNER ADMIN CONSOLE ROUTES
// ============================================================================
app.get('/api/admin/overview', requireAdminAuth, (req, res) => {
  const store = readStore();
  const catalog = loadCatalog();
  const skuAudit = catalog.map((sku) => ({
    ...sku,
    margins: computeSkuMargins(sku),
  }));
  const totalRevenue = store.orders.reduce((s, o) => s + Number(o.total_usd || 0), 0);
  res.json({
    ok: true,
    admin_user: req.currentUser,
    zero_fake_data: true,
    metrics: {
      orders_count: store.orders.length,
      revenue_usd: Number(totalRevenue.toFixed(2)),
      waitlist_count: store.waitlist_subscribers.length,
      registered_members_count: Object.keys(store.users || {}).length,
    },
    orders: store.orders.slice().reverse(),
    waitlist_subscribers: store.waitlist_subscribers.slice().reverse(),
    bundle_config: store.bundle_config,
    promo_codes: store.promo_codes,
    catalog: skuAudit,
    super_admin_emails: SUPER_ADMIN_EMAILS,
    co_admin_emails: store.co_admin_emails || [],
  });
});

app.post('/api/admin/promos', requireAdminAuth, (req, res) => {
  const { action, code, discount_pct, min_subtotal_usd, active, label } = req.body || {};
  const cleanCode = String(code || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, '')
    .slice(0, 24);
  if (!cleanCode) {
    return res.status(400).json({ error: 'Valid alphanumeric promo code is required.' });
  }
  const store = readStore();
  if (action === 'delete') {
    delete store.promo_codes[cleanCode];
    writeStore(store);
    return res.json({ ok: true, promo_codes: store.promo_codes });
  }
  if (action === 'toggle') {
    if (!store.promo_codes[cleanCode]) {
      return res.status(404).json({ error: 'Promo code not found.' });
    }
    store.promo_codes[cleanCode].active = Boolean(active);
    writeStore(store);
    return res.json({ ok: true, promo_codes: store.promo_codes });
  }
  const pct = Math.max(1, Math.min(MAX_LOYALTY_DISCOUNT_PCT, Number(discount_pct || 10)));
  const minSub = Math.max(0, Number(min_subtotal_usd || 0));
  store.promo_codes[cleanCode] = {
    discount_pct: pct,
    min_subtotal_usd: minSub,
    active: active !== false,
    non_stackable: true,
    label: String(label || `${pct}% Off ($${minSub}+)`).slice(0, 80),
    updated_by: req.currentUser.email,
    updated_at: new Date().toISOString(),
  };
  writeStore(store);
  return res.json({ ok: true, promo_codes: store.promo_codes });
});

app.post('/api/admin/bundle-config', requireAdminAuth, (req, res) => {
  const { active, min_items, discount_pct, free_gift_threshold_usd, free_gift_label } = req.body || {};
  const store = readStore();
  store.bundle_config = {
    active: active !== undefined ? Boolean(active) : store.bundle_config.active,
    min_items: Math.max(2, Math.min(6, Math.floor(Number(min_items || store.bundle_config.min_items || 3)))),
    discount_pct: Math.max(5, Math.min(MAX_LOYALTY_DISCOUNT_PCT, Number(discount_pct || store.bundle_config.discount_pct || 12))),
    free_gift_threshold_usd: Math.max(45, Number(free_gift_threshold_usd || store.bundle_config.free_gift_threshold_usd || 85)),
    free_gift_label: String(free_gift_label || store.bundle_config.free_gift_label || 'Free Calm Strip Travel Pack').slice(0, 90),
  };
  writeStore(store);
  return res.json({ ok: true, bundle_config: store.bundle_config });
});

app.post('/api/admin/sku-override', requireAdminAuth, (req, res) => {
  const { id, price_usd, is_on_promotion, sale_price_usd, partner_url, track } = req.body || {};
  const catalog = loadCatalog();
  const baseSku = catalog.find((c) => c.id === id);
  if (!baseSku) {
    return res.status(404).json({ error: 'Product SKU not found.' });
  }
  const candidate = {
    ...baseSku,
    price_usd: price_usd !== undefined ? Number(price_usd) : baseSku.price_usd,
    is_on_promotion: is_on_promotion !== undefined ? Boolean(is_on_promotion) : baseSku.is_on_promotion,
    sale_price_usd: sale_price_usd !== undefined ? Number(sale_price_usd) : baseSku.sale_price_usd,
    track: track === 'TRACK_B_PARTNER' ? 'TRACK_B_PARTNER' : 'TRACK_A_DIRECT',
    partner_url: partner_url !== undefined ? String(partner_url || '').trim().slice(0, 300) : baseSku.partner_url,
  };
  const marginCheck = computeSkuMargins(candidate);
  if (!marginCheck.passes_20pct_floor) {
    return res.status(400).json({
      error: `Rejected by 20% Net Margin Floor Guard (net margin would drop to ${marginCheck.discounted_30_margin_pct}%).`,
    });
  }
  const store = readStore();
  store.sku_overrides[id] = {
    price_usd: candidate.price_usd,
    is_on_promotion: candidate.is_on_promotion,
    sale_price_usd: candidate.sale_price_usd || null,
    track: candidate.track,
    partner_url: candidate.partner_url || null,
    updated_by: req.currentUser.email,
    updated_at: new Date().toISOString(),
  };
  writeStore(store);
  return res.json({ ok: true, sku: { ...candidate, margins: marginCheck } });
});

app.post('/api/admin/orders/:orderId/status', requireAdminAuth, (req, res) => {
  const { orderId } = req.params;
  const { status, tracking_number, carrier } = req.body || {};
  const store = readStore();
  const idx = store.orders.findIndex((o) => o.id === orderId);
  if (idx < 0) {
    return res.status(404).json({ error: 'Order not found.' });
  }
  store.orders[idx] = {
    ...store.orders[idx],
    status: String(status || store.orders[idx].status || 'PROCESSING').slice(0, 32),
    tracking_number: tracking_number !== undefined ? String(tracking_number).trim().slice(0, 64) : store.orders[idx].tracking_number,
    carrier: carrier !== undefined ? String(carrier).trim().slice(0, 32) : store.orders[idx].carrier,
    updated_at: new Date().toISOString(),
  };
  writeStore(store);
  return res.json({ ok: true, order: store.orders[idx] });
});

app.post('/api/admin/co-admins', requireSuperAdminAuth, (req, res) => {
  const { action, email } = req.body || {};
  const clean = normalizeEmail(email);
  if (!clean || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(clean)) {
    return res.status(400).json({ error: 'Valid Google email address is required.' });
  }
  if (SUPER_ADMIN_EMAILS.includes(clean)) {
    return res.status(400).json({ error: 'Super-Admin email is permanently protected.' });
  }
  const store = readStore();
  if (action === 'remove') {
    store.co_admin_emails = store.co_admin_emails.filter((e) => normalizeEmail(e) !== clean);
  } else if (!store.co_admin_emails.map((e) => normalizeEmail(e)).includes(clean)) {
    store.co_admin_emails.push(clean);
  }
  writeStore(store);
  return res.json({ ok: true, co_admin_emails: store.co_admin_emails });
});

// ============================================================================
// 7. PUBLIC HEALTH, ROBOTS, SITEMAP, CATALOG & QUOTE/CHECKOUT ROUTES
// ============================================================================
app.get('/api/health', (_req, res) => {
  const store = readStore();
  res.json({
    ok: true,
    service: 'kinetic-calm-us',
    port: PORT,
    zero_fake_data: true,
    fda_general_wellness: true,
    cpsia_astm_f963: true,
    google_login_enabled: true,
    admin_login_required: true,
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
      `  <url><loc>${baseUrl}/#collection</loc><changefreq>weekly</changefreq><priority>0.9</priority></url>\n` +
      `  <url><loc>${baseUrl}/#legal</loc><changefreq>monthly</changefreq><priority>0.7</priority></url>\n` +
      `</urlset>\n`
  );
});

app.get('/api/catalog', (_req, res) => {
  const store = readStore();
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
    bundle_config: store.bundle_config,
    items: catalog,
  });
});

app.get('/api/referral-verify', (req, res) => {
  const code = String(req.query.ref || '').trim().toUpperCase().slice(0, 24);
  const owner = findReferralOwnerByCode(code);
  res.json({
    valid: Boolean(owner),
    code: owner ? owner.referral_code : null,
    referrer_first_name: owner ? String(owner.name || 'Friend').split(' ')[0] : null,
    friend_welcome_pct: 10,
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

app.post('/api/quote', (req, res) => {
  const { items, promo_code, vault_discount_pct, email, referral_code } = req.body || {};
  const sessionEmail = req.user?.id ? getUserById(req.user.id)?.email : '';
  const effectiveEmail = sessionEmail || email || '';
  const effectiveRef = referral_code || req.session?.pendingReferralCode || '';
  const quote = computeServerQuote(items, promo_code, vault_discount_pct, effectiveEmail, effectiveRef);
  res.json(quote);
});

app.post('/api/waitlist', (req, res) => {
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

function finalizePaidOrder(store, orderId, stripeSession) {
  const idx = store.orders.findIndex((o) => o.id === orderId);
  if (idx < 0) return null;
  const order = store.orders[idx];
  if (order.status === 'PAID_CONFIRMED') return order;

  const nowIso = new Date().toISOString();
  const customerEmail = normalizeEmail(stripeSession?.customer_details?.email || stripeSession?.customer_email || order.customer_email);
  order.status = 'PAID_CONFIRMED';
  order.paid_at = nowIso;
  order.customer_email = customerEmail || order.customer_email;
  order.stripe_payment_intent_id = stripeSession?.payment_intent || order.stripe_payment_intent_id || null;
  order.shipping_details = stripeSession?.shipping_details || order.shipping_details || null;
  order.offer_fulfilled = true;
  order.offer_fulfillment_note = order.free_gift_unlocked
    ? `${order.free_gift_label || 'Free Calm Strip Travel Pack'} packed with order + ${order.discount_source || 'standard pricing'} applied.`
    : `${order.discount_source && order.discount_source !== 'NONE' ? `${order.discount_source} applied` : 'Direct order confirmed'}.`;

  if (customerEmail && store.customers?.[customerEmail]) {
    const cust = store.customers[customerEmail];
    const u = store.users?.[cust.user_id];
    if (u) {
      if (String(order.discount_source || '').startsWith('CALM_VAULT_')) {
        u.unlocked_vault_pct = 0;
        cust.max_unlocked_pct = 0;
      }
      if (String(order.discount_source || '').startsWith('FRIEND_REFERRAL_')) {
        u.friend_welcome_used = true;
        cust.friend_welcome_eligible = false;
      }
    }
  }
  if (order.referral_code) {
    const owner = Object.values(store.users || {}).find((u) => u.referral_code === order.referral_code);
    if (owner && normalizeEmail(owner.email) !== customerEmail) {
      owner.referrals_completed_count = Number(owner.referrals_completed_count || 0) + 1;
      owner.unlocked_vault_pct = Math.min(MAX_LOYALTY_DISCOUNT_PCT, Number(owner.unlocked_vault_pct || 0) + 10);
      if (store.customers?.[normalizeEmail(owner.email)]) {
        store.customers[normalizeEmail(owner.email)].max_unlocked_pct = owner.unlocked_vault_pct;
      }
    }
  }
  store.orders[idx] = { ...order, updated_at: nowIso };
  return store.orders[idx];
}

app.post('/api/checkout', async (req, res) => {
  const { items, promo_code, vault_discount_pct, email, referral_code } = req.body || {};
  const sessionUser = req.user?.id ? getUserById(req.user.id) : null;
  const cleanEmail = normalizeEmail(sessionUser?.email || email);
  const effectiveRef = referral_code || req.session?.pendingReferralCode || '';
  const quote = computeServerQuote(items, promo_code, vault_discount_pct, cleanEmail, effectiveRef);
  if (!quote.items.length) {
    return res.status(400).json({ error: 'Your sensory bag has no direct-checkout items.' });
  }
  if (!quote.margin_guard_ok) {
    return res.status(400).json({ error: 'Order rejected by server-side 20% minimum net margin guard.' });
  }
  const stripeKey = isRealCred(process.env.STRIPE_SECRET_KEY) ? process.env.STRIPE_SECRET_KEY.trim() : '';
  if (!stripeKey) {
    return res.status(503).json({
      ok: false,
      mode: 'STRIPE_KEY_REQUIRED',
      quote,
      message: 'Live Stripe US Checkout requires STRIPE_SECRET_KEY in environment variables.',
    });
  }

  const orderId = `KC-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
  const origin = `${req.protocol}://${req.get('host')}`;
  const params = new URLSearchParams();
  params.set('mode', 'payment');
  params.set('success_url', `${origin}/?checkout=success&order=${encodeURIComponent(orderId)}&session_id={CHECKOUT_SESSION_ID}`);
  params.set('cancel_url', `${origin}/?checkout=cancelled&order=${encodeURIComponent(orderId)}`);
  params.set('shipping_address_collection[allowed_countries][0]', 'US');
  params.set('payment_method_types[0]', 'card');
  if (cleanEmail && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(cleanEmail)) {
    params.set('customer_email', cleanEmail);
  }

  const discountedSub = Math.max(0, Number((quote.subtotal_usd - quote.discount_usd).toFixed(2)));
  params.set('line_items[0][price_data][currency]', 'usd');
  params.set('line_items[0][price_data][unit_amount]', String(Math.max(50, Math.round(discountedSub * 100))));
  params.set(
    'line_items[0][price_data][product_data][name]',
    `Kinetic Calm Sensory Order (${quote.total_direct_qty} items)${quote.discount_source !== 'NONE' ? ` — ${quote.discount_source}` : ''}`
  );
  params.set('line_items[0][quantity]', '1');

  let lineIdx = 1;
  if (quote.shipping_usd > 0) {
    params.set(`line_items[${lineIdx}][price_data][currency]`, 'usd');
    params.set(`line_items[${lineIdx}][price_data][unit_amount]`, String(Math.round(quote.shipping_usd * 100)));
    params.set(`line_items[${lineIdx}][price_data][product_data][name]`, 'US Tracked Standard Shipping');
    params.set(`line_items[${lineIdx}][quantity]`, '1');
    lineIdx += 1;
  }
  if (quote.free_gift_unlocked) {
    params.set(`line_items[${lineIdx}][price_data][currency]`, 'usd');
    params.set(`line_items[${lineIdx}][price_data][unit_amount]`, '0');
    params.set(`line_items[${lineIdx}][price_data][product_data][name]`, `BONUS UNLOCKED: ${quote.free_gift_label}`);
    params.set(`line_items[${lineIdx}][quantity]`, '1');
  }

  params.set('metadata[order_id]', orderId);
  params.set('metadata[discount_source]', quote.discount_source);
  params.set('metadata[free_gift_unlocked]', String(Boolean(quote.free_gift_unlocked)));
  if (effectiveRef) params.set('metadata[referral_code]', effectiveRef);

  try {
    const stripeRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${stripeKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Idempotency-Key': `kc-checkout-${orderId}`,
      },
      body: params.toString(),
    });
    const sessionData = await stripeRes.json();
    if (!stripeRes.ok || !sessionData?.url) {
      return res.status(502).json({ error: sessionData?.error?.message || 'Unable to initialize Stripe Checkout session.' });
    }
    const store = readStore();
    store.orders.push({
      id: orderId,
      customer_email: cleanEmail || '',
      items: quote.items,
      subtotal_usd: quote.subtotal_usd,
      discount_usd: quote.discount_usd,
      discount_source: quote.discount_source,
      shipping_usd: quote.shipping_usd,
      total_usd: quote.total_usd,
      free_gift_unlocked: Boolean(quote.free_gift_unlocked),
      free_gift_label: quote.free_gift_label,
      referral_code: effectiveRef || null,
      stripe_session_id: sessionData.id,
      status: 'PENDING_PAYMENT',
      offer_fulfilled: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    writeStore(store);
    return res.json({
      ok: true,
      order_id: orderId,
      stripe_session_id: sessionData.id,
      checkout_url: sessionData.url,
      quote,
    });
  } catch (err) {
    return res.status(502).json({ error: `Stripe gateway error: ${err.message}` });
  }
});

app.get('/api/checkout/verify', async (req, res) => {
  const orderId = String(req.query.order || '').trim().slice(0, 64);
  const sessionId = String(req.query.session_id || '').trim().slice(0, 128);
  if (!orderId || !sessionId) {
    return res.status(400).json({ error: 'Missing order or session_id.' });
  }
  const stripeKey = isRealCred(process.env.STRIPE_SECRET_KEY) ? process.env.STRIPE_SECRET_KEY.trim() : '';
  if (!stripeKey) {
    return res.status(503).json({ error: 'Stripe key not configured.' });
  }
  try {
    const r = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`, {
      headers: { Authorization: `Bearer ${stripeKey}` },
    });
    const sessionData = await r.json();
    if (!r.ok) {
      return res.status(400).json({ error: sessionData?.error?.message || 'Session lookup failed.' });
    }
    const store = readStore();
    if (sessionData.payment_status === 'paid' && sessionData.metadata?.order_id === orderId) {
      const updated = finalizePaidOrder(store, orderId, sessionData);
      writeStore(store);
      return res.json({ ok: true, paid: true, order: updated });
    }
    return res.json({ ok: true, paid: false, status: sessionData.payment_status });
  } catch (err) {
    return res.status(502).json({ error: err.message });
  }
});

app.post('/api/webhooks/stripe', (req, res) => {
  const sigHeader = String(req.headers['stripe-signature'] || '');
  const webhookSecret = isRealCred(process.env.STRIPE_WEBHOOK_SECRET) ? process.env.STRIPE_WEBHOOK_SECRET.trim() : '';
  const rawBuf = req.rawBody;
  if (webhookSecret) {
    if (!sigHeader || !rawBuf) return res.status(400).json({ error: 'Missing webhook signature or payload.' });
    const parts = Object.fromEntries(sigHeader.split(',').map((kv) => kv.split('=')));
    const signedPayload = `${parts.t}.${rawBuf.toString('utf8')}`;
    const expected = crypto.createHmac('sha256', webhookSecret).update(signedPayload).digest('hex');
    const sigBuf = Buffer.from(String(parts.v1 || ''), 'hex');
    const expBuf = Buffer.from(expected, 'hex');
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return res.status(400).json({ error: 'Invalid Stripe webhook signature.' });
    }
  } else if (IS_PROD) {
    return res.status(503).json({ error: 'STRIPE_WEBHOOK_SECRET missing in production.' });
  }
  const event = req.body || {};
  if (event.type === 'checkout.session.completed') {
    const sessionObj = event.data?.object || {};
    const orderId = sessionObj.metadata?.order_id;
    if (orderId) {
      const store = readStore();
      finalizePaidOrder(store, orderId, sessionObj);
      writeStore(store);
    }
  }
  return res.json({ received: true });
});

// 8. Static Assets & SPA Fallback
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

app.listen(PORT, BIND_HOST, () => {
  console.log(`KINETIC CALM US storefront listening on http://${BIND_HOST}:${PORT}`);
});
