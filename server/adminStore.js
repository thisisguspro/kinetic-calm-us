import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const CATALOG_PATH = path.join(ROOT_DIR, 'shared', 'catalog.json');
const DATA_DIR = path.join(ROOT_DIR, 'data');
const STORE_PATH = path.join(DATA_DIR, 'kinetic_calm_store.json');

export const MIN_NET_MARGIN_PCT = 20.0;
export const MAX_LOYALTY_DISCOUNT_PCT = 30.0;
export const FRIEND_REFERRAL_WELCOME_PCT = 10.0;
export const REFERRER_REWARD_STEP_PCT = 10.0;
export const STRIPE_FEE_PCT = 0.029;
export const STRIPE_FIXED_USD = 0.30;
export const FREE_US_SHIPPING_THRESHOLD = 65.0;
export const FREE_GIFT_THRESHOLD_USD = 85.0;
export const STANDARD_US_SHIPPING_USD = 6.95;

export const SUPER_ADMIN_EMAILS = Object.freeze([
  'gmromeu13@gmail.com',
  'thisisguspro@gmail.com',
]);
export const MAIN_SUPER_ADMIN_EMAIL = 'gmromeu13@gmail.com';

export function normalizeEmail(raw) {
  return String(raw || '').normalize('NFKC').trim().toLowerCase().slice(0, 128);
}

export function defaultState() {
  return {
    brand: 'KINETIC CALM US',
    zero_fake_data: true,
    orders: [],
    reviews: [],
    users: {},
    customers: {},
    co_admin_emails: [],
    sku_overrides: {},
    custom_skus: [],
    waitlist_subscribers: [],
    bundle_config: {
      active: true,
      min_items: 3,
      discount_pct: 12,
      free_gift_threshold_usd: FREE_GIFT_THRESHOLD_USD,
      free_gift_label: 'Free Calm Strip Travel Pack ($85+ Orders)',
    },
    promo_codes: {
      CALM10: { discount_pct: 10, active: true, min_subtotal_usd: 25, non_stackable: true, label: 'Welcome 10% Off ($25+)' },
      DESK15: { discount_pct: 15, active: true, min_subtotal_usd: 55, non_stackable: true, label: 'Desk Kit 15% Off ($55+)' },
    },
    updated_at: new Date().toISOString(),
  };
}

export function readStore() {
  try {
    if (!fs.existsSync(STORE_PATH)) return defaultState();
    const raw = fs.readFileSync(STORE_PATH, 'utf8');
    const data = JSON.parse(raw);
    const base = defaultState();
    return {
      ...base,
      ...data,
      orders: Array.isArray(data?.orders) ? data.orders : [],
      reviews: Array.isArray(data?.reviews) ? data.reviews : [],
      users: data?.users && typeof data.users === 'object' ? data.users : {},
      customers: data?.customers && typeof data.customers === 'object' ? data.customers : {},
      co_admin_emails: Array.isArray(data?.co_admin_emails) ? data.co_admin_emails : [],
      sku_overrides: data?.sku_overrides && typeof data.sku_overrides === 'object' ? data.sku_overrides : {},
      custom_skus: Array.isArray(data?.custom_skus) ? data.custom_skus : [],
      waitlist_subscribers: Array.isArray(data?.waitlist_subscribers) ? data.waitlist_subscribers : [],
      bundle_config: {
        ...base.bundle_config,
        ...(data?.bundle_config && typeof data.bundle_config === 'object' ? data.bundle_config : {}),
      },
      promo_codes: {
        ...base.promo_codes,
        ...(data?.promo_codes && typeof data.promo_codes === 'object' ? data.promo_codes : {}),
      },
    };
  } catch {
    return defaultState();
  }
}

export function writeStore(nextState) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const payload = {
    ...nextState,
    updated_at: new Date().toISOString(),
  };
  const tmpPath = `${STORE_PATH}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(payload, null, 2), 'utf8');
  fs.renameSync(tmpPath, STORE_PATH);
  return payload;
}

export function isSuperAdminEmail(email) {
  const clean = normalizeEmail(email);
  return Boolean(clean && SUPER_ADMIN_EMAILS.includes(clean));
}

export function isAdminEmail(email) {
  const clean = normalizeEmail(email);
  if (!clean) return false;
  if (isSuperAdminEmail(clean)) return true;
  const envAdmins = String(process.env.OWNER_GOOGLE_EMAILS || '')
    .split(',')
    .map((e) => normalizeEmail(e))
    .filter(Boolean);
  if (envAdmins.includes(clean)) return true;
  const store = readStore();
  return store.co_admin_emails.map((e) => normalizeEmail(e)).includes(clean);
}

export function decorateUserWithRoles(user) {
  if (!user) return null;
  const email = normalizeEmail(user.email);
  return {
    ...user,
    email,
    is_super_admin: isSuperAdminEmail(email),
    is_admin: isAdminEmail(email),
  };
}

function generateReferralCode(nameOrEmail) {
  const stem = String(nameOrEmail || 'CALM')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 4)
    .padEnd(3, 'K');
  const suffix = crypto.randomBytes(2).toString('hex').toUpperCase();
  return `KC-${stem}${suffix}`;
}

export function upsertGoogleUser({ googleId, email, name, avatarUrl = null, referredByCode = null }) {
  const cleanEmail = normalizeEmail(email);
  const store = readStore();
  const id = String(googleId || `g-${crypto.createHash('sha1').update(cleanEmail).digest('hex').slice(0, 14)}`);
  const nowIso = new Date().toISOString();

  let existing = store.users[id];
  if (!existing && cleanEmail) {
    existing = Object.values(store.users).find((u) => normalizeEmail(u.email) === cleanEmail) || null;
  }

  const cleanRef = String(referredByCode || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, '')
    .slice(0, 24);

  if (!existing) {
    const newCode = generateReferralCode(name || cleanEmail);
    const validRefOwner =
      cleanRef &&
      Object.values(store.users).find((u) => u.referral_code === cleanRef && normalizeEmail(u.email) !== cleanEmail);
    existing = {
      id,
      email: cleanEmail,
      name: String(name || 'Kinetic Calm Member').slice(0, 80),
      avatar_url: avatarUrl,
      referral_code: newCode,
      referred_by_code: validRefOwner ? cleanRef : null,
      friend_welcome_used: false,
      referrals_completed_count: 0,
      unlocked_vault_pct: 0,
      pending_escrow_pct: 0,
      created_at: nowIso,
      updated_at: nowIso,
    };
  } else {
    existing.name = String(name || existing.name || 'Kinetic Calm Member').slice(0, 80);
    existing.avatar_url = avatarUrl || existing.avatar_url || null;
    if (!existing.referral_code) {
      existing.referral_code = generateReferralCode(existing.name || cleanEmail);
    }
    if (!existing.referred_by_code && cleanRef && cleanRef !== existing.referral_code) {
      const validRefOwner = Object.values(store.users).find(
        (u) => u.referral_code === cleanRef && normalizeEmail(u.email) !== cleanEmail
      );
      if (validRefOwner) {
        existing.referred_by_code = cleanRef;
      }
    }
    existing.updated_at = nowIso;
  }

  store.users[existing.id] = existing;
  if (cleanEmail) {
    store.customers[cleanEmail] = {
      ...(store.customers[cleanEmail] || {}),
      user_id: existing.id,
      referral_code: existing.referral_code,
      max_unlocked_pct: Math.min(MAX_LOYALTY_DISCOUNT_PCT, Number(existing.unlocked_vault_pct || 0)),
      friend_welcome_eligible: Boolean(existing.referred_by_code && !existing.friend_welcome_used),
    };
  }
  writeStore(store);
  return decorateUserWithRoles(existing);
}

export function getUserById(userId) {
  if (!userId) return null;
  const store = readStore();
  const u = store.users?.[userId] || null;
  return decorateUserWithRoles(u);
}

export function findReferralOwnerByCode(refCode) {
  const clean = String(refCode || '').trim().toUpperCase().slice(0, 24);
  if (!clean) return null;
  const store = readStore();
  return Object.values(store.users || {}).find((u) => u.referral_code === clean) || null;
}

export function loadCatalog() {
  try {
    const raw = fs.readFileSync(CATALOG_PATH, 'utf8');
    const base = JSON.parse(raw);
    const list = Array.isArray(base) ? base : [];
    const store = readStore();
    const overrides = store.sku_overrides || {};
    const merged = list.map((sku) => {
      const ov = overrides[sku.id];
      if (!ov) return sku;
      return {
        ...sku,
        ...ov,
        id: sku.id,
        sku: sku.sku,
      };
    });
    const extras = Array.isArray(store.custom_skus) ? store.custom_skus : [];
    return [...merged, ...extras];
  } catch {
    return [];
  }
}

export function computeSkuMargins(item) {
  const effectiveRetail =
    item.is_on_promotion && Number(item.sale_price_usd) > 0
      ? Number(item.sale_price_usd)
      : Number(item.price_usd || 0);
  const cost = Number(item.cost_usd || 0);
  if (item.track === 'TRACK_B_PARTNER' || effectiveRetail <= 0) {
    return {
      full_price_margin_pct: null,
      max_vault_discount_pct: 0,
      discounted_30_margin_pct: null,
      passes_20pct_floor: true,
    };
  }
  const stripeFull = effectiveRetail * STRIPE_FEE_PCT + STRIPE_FIXED_USD;
  const fullMargin = ((effectiveRetail - cost - stripeFull) / effectiveRetail) * 100;

  const appliedMaxDisc =
    item.vault_discount_eligible && !item.is_on_promotion ? MAX_LOYALTY_DISCOUNT_PCT : 0;
  const discountedPrice = effectiveRetail * (1 - appliedMaxDisc / 100);
  const stripeDisc = discountedPrice * STRIPE_FEE_PCT + STRIPE_FIXED_USD;
  const discMargin = ((discountedPrice - cost - stripeDisc) / discountedPrice) * 100;

  return {
    full_price_margin_pct: Number(fullMargin.toFixed(2)),
    max_vault_discount_pct: appliedMaxDisc,
    discounted_30_margin_pct: Number(discMargin.toFixed(2)),
    passes_20pct_floor: fullMargin >= MIN_NET_MARGIN_PCT && discMargin >= MIN_NET_MARGIN_PCT,
  };
}

export function computeServerQuote(
  cartItems = [],
  promoCode = '',
  useVaultDiscountPct = 0,
  customerEmail = '',
  referralCode = ''
) {
  const catalog = loadCatalog();
  const byId = new Map(catalog.map((c) => [c.id, c]));
  const store = readStore();

  const normalizedItems = [];
  let subtotal = 0;
  let eligibleVaultSubtotal = 0;
  let wholesaleTotal = 0;
  let hasPromoItem = false;
  let totalDirectQty = 0;

  for (const entry of Array.isArray(cartItems) ? cartItems : []) {
    const qty = Math.max(1, Math.min(20, Math.floor(Number(entry?.quantity || 1))));
    const sku = byId.get(String(entry?.id || ''));
    if (!sku || sku.track !== 'TRACK_A_DIRECT') continue;
    const unitPrice =
      sku.is_on_promotion && Number(sku.sale_price_usd) > 0
        ? Number(sku.sale_price_usd)
        : Number(sku.price_usd || 0);
    const lineTotal = unitPrice * qty;
    subtotal += lineTotal;
    totalDirectQty += qty;
    wholesaleTotal += Number(sku.cost_usd || 0) * qty;
    if (sku.is_on_promotion) hasPromoItem = true;
    if (sku.vault_discount_eligible && !sku.is_on_promotion) {
      eligibleVaultSubtotal += lineTotal;
    }
    normalizedItems.push({
      id: sku.id,
      sku: sku.sku,
      name: sku.name,
      quantity: qty,
      unit_price_usd: unitPrice,
      line_total_usd: Number(lineTotal.toFixed(2)),
      age_grade: sku.age_grade,
    });
  }

  const cleanPromo = String(promoCode || '').trim().toUpperCase().slice(0, 32);
  const promoObj = store.promo_codes?.[cleanPromo];
  const email = normalizeEmail(customerEmail);
  const customerRecord = email ? store.customers?.[email] : null;
  const cleanRef = String(referralCode || '').trim().toUpperCase().slice(0, 24);
  const validRefOwner = cleanRef ? findReferralOwnerByCode(cleanRef) : null;
  const selfReferral = validRefOwner && email && normalizeEmail(validRefOwner.email) === email;

  // Max safe dollar discount that keeps aggregate net margin >= 20.0%
  const maxSafeDiscount = Math.max(
    0,
    subtotal - wholesaleTotal / (1 - MIN_NET_MARGIN_PCT / 100 - STRIPE_FEE_PCT) - STRIPE_FIXED_USD
  );

  let discountUsd = 0;
  let discountSource = 'NONE';
  let capNote = '';

  // Priority (strictly non-stackable so discounts never compound past 30% or 20% margin floor):
  // 1) Explicit Promo Code -> 2) Calm Club Vault Credit -> 3) Friend Referral Welcome (10%) -> 4) Automatic 3-Piece Calm Kit Bundle (12%)
  if (cleanPromo && promoObj?.active && !hasPromoItem && subtotal >= Number(promoObj.min_subtotal_usd || 0)) {
    const pct = Math.min(MAX_LOYALTY_DISCOUNT_PCT, Number(promoObj.discount_pct || 0));
    discountUsd = Number(Math.min((subtotal * pct) / 100, maxSafeDiscount).toFixed(2));
    discountSource = `PROMO_${cleanPromo}_${pct}%`;
    capNote = `Promo code ${cleanPromo} (${pct}% off) applied — non-stackable with bundle or referral credits.`;
  } else if (Number(useVaultDiscountPct) > 0 && !hasPromoItem && eligibleVaultSubtotal > 0) {
    const requestedPct = Math.min(MAX_LOYALTY_DISCOUNT_PCT, Math.max(0, Number(useVaultDiscountPct)));
    const availableVaultPct = customerRecord
      ? Math.min(MAX_LOYALTY_DISCOUNT_PCT, Number(customerRecord.max_unlocked_pct || 0))
      : 0;
    const appliedPct = Math.min(requestedPct, availableVaultPct);
    if (appliedPct > 0) {
      const rawVaultDiscount = (eligibleVaultSubtotal * appliedPct) / 100;
      discountUsd = Number(Math.min(rawVaultDiscount, maxSafeDiscount).toFixed(2));
      discountSource = `CALM_VAULT_${appliedPct}%`;
      capNote = `Calm Club Referral Credit (${appliedPct}% off, 30% max cap) applied.`;
    }
  } else if (
    !hasPromoItem &&
    subtotal > 0 &&
    ((validRefOwner && !selfReferral) || customerRecord?.friend_welcome_eligible)
  ) {
    const pct = FRIEND_REFERRAL_WELCOME_PCT;
    discountUsd = Number(Math.min((subtotal * pct) / 100, maxSafeDiscount).toFixed(2));
    discountSource = `FRIEND_REFERRAL_${pct}%`;
    capNote = `Friend Referral Welcome (${pct}% off first order) applied automatically.`;
  } else if (
    store.bundle_config?.active &&
    !hasPromoItem &&
    totalDirectQty >= Number(store.bundle_config?.min_items || 3)
  ) {
    const pct = Math.min(MAX_LOYALTY_DISCOUNT_PCT, Number(store.bundle_config?.discount_pct || 12));
    discountUsd = Number(Math.min((subtotal * pct) / 100, maxSafeDiscount).toFixed(2));
    discountSource = `CALM_KIT_BUNDLE_${pct}%`;
    capNote = `${store.bundle_config.min_items}-Piece Calm Kit Bundle (${pct}% off) unlocked automatically!`;
  }

  const discountedSubtotal = Math.max(0, Number((subtotal - discountUsd).toFixed(2)));
  const shippingUsd =
    discountedSubtotal === 0 || discountedSubtotal >= FREE_US_SHIPPING_THRESHOLD
      ? 0.0
      : STANDARD_US_SHIPPING_USD;
  const estimatedTotal = Number((discountedSubtotal + shippingUsd).toFixed(2));
  const freeGiftThreshold = Number(store.bundle_config?.free_gift_threshold_usd || FREE_GIFT_THRESHOLD_USD);
  const freeGiftUnlocked = discountedSubtotal >= freeGiftThreshold;

  const stripeFee = discountedSubtotal > 0 ? discountedSubtotal * STRIPE_FEE_PCT + STRIPE_FIXED_USD : 0;
  const estNetMarginPct =
    discountedSubtotal > 0
      ? Number((((discountedSubtotal - wholesaleTotal - stripeFee) / discountedSubtotal) * 100).toFixed(2))
      : 0;

  return {
    items: normalizedItems,
    total_direct_qty: totalDirectQty,
    subtotal_usd: Number(subtotal.toFixed(2)),
    discount_usd: discountUsd,
    discount_source: discountSource,
    cap_note: capNote,
    shipping_usd: shippingUsd,
    free_shipping_threshold_usd: FREE_US_SHIPPING_THRESHOLD,
    free_gift_threshold_usd: freeGiftThreshold,
    free_gift_unlocked: freeGiftUnlocked,
    free_gift_label: store.bundle_config?.free_gift_label || 'Free Calm Strip Travel Pack',
    bundle_config: store.bundle_config,
    total_usd: estimatedTotal,
    margin_guard_ok: normalizedItems.length === 0 ? true : estNetMarginPct >= MIN_NET_MARGIN_PCT,
    estimated_net_margin_pct: estNetMarginPct,
  };
}
