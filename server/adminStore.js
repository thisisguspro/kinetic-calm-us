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
export const STRIPE_FEE_PCT = 0.029;
export const STRIPE_FIXED_USD = 0.30;
export const FREE_US_SHIPPING_THRESHOLD = 65.0;
export const STANDARD_US_SHIPPING_USD = 6.95;

export function normalizeEmail(raw) {
  return String(raw || '').normalize('NFKC').trim().toLowerCase().slice(0, 128);
}

export function loadCatalog() {
  try {
    const raw = fs.readFileSync(CATALOG_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function defaultState() {
  return {
    brand: 'KINETIC CALM US',
    zero_fake_data: true,
    orders: [],
    reviews: [],
    customers: {},
    waitlist_subscribers: [],
    promo_codes: {
      CALM10: { discount_pct: 10, active: true, min_subtotal_usd: 25, non_stackable: true },
      DESK15: { discount_pct: 15, active: true, min_subtotal_usd: 55, non_stackable: true },
    },
    updated_at: new Date().toISOString(),
  };
}

export function readStore() {
  try {
    if (!fs.existsSync(STORE_PATH)) return defaultState();
    const raw = fs.readFileSync(STORE_PATH, 'utf8');
    const data = JSON.parse(raw);
    return {
      ...defaultState(),
      ...data,
      orders: Array.isArray(data?.orders) ? data.orders : [],
      reviews: Array.isArray(data?.reviews) ? data.reviews : [],
      waitlist_subscribers: Array.isArray(data?.waitlist_subscribers) ? data.waitlist_subscribers : [],
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

export function computeSkuMargins(item) {
  const retail = Number(item.price_usd || 0);
  const cost = Number(item.cost_usd || 0);
  if (item.track === 'TRACK_B_PARTNER' || retail <= 0) {
    return {
      full_price_margin_pct: null,
      max_vault_discount_pct: 0,
      discounted_30_margin_pct: null,
      passes_20pct_floor: true,
    };
  }
  const stripeFull = retail * STRIPE_FEE_PCT + STRIPE_FIXED_USD;
  const fullMargin = ((retail - cost - stripeFull) / retail) * 100;

  const discountedPrice = retail * (1 - MAX_LOYALTY_DISCOUNT_PCT / 100);
  const stripeDisc = discountedPrice * STRIPE_FEE_PCT + STRIPE_FIXED_USD;
  const discMargin = ((discountedPrice - cost - stripeDisc) / discountedPrice) * 100;

  return {
    full_price_margin_pct: Number(fullMargin.toFixed(2)),
    max_vault_discount_pct: item.vault_discount_eligible ? MAX_LOYALTY_DISCOUNT_PCT : 0,
    discounted_30_margin_pct: Number(discMargin.toFixed(2)),
    passes_20pct_floor: discMargin >= MIN_NET_MARGIN_PCT,
  };
}

export function computeServerQuote(cartItems = [], promoCode = '', useVaultDiscountPct = 0, customerEmail = '') {
  const catalog = loadCatalog();
  const byId = new Map(catalog.map((c) => [c.id, c]));
  const store = readStore();

  const normalizedItems = [];
  let subtotal = 0;
  let eligibleVaultSubtotal = 0;
  let wholesaleTotal = 0;
  let hasPromoItem = false;

  for (const entry of Array.isArray(cartItems) ? cartItems : []) {
    const qty = Math.max(1, Math.min(20, Math.floor(Number(entry?.quantity || 1))));
    const sku = byId.get(String(entry?.id || ''));
    if (!sku || sku.track !== 'TRACK_A_DIRECT') continue;
    const unitPrice = Number(sku.price_usd || 0);
    const lineTotal = unitPrice * qty;
    subtotal += lineTotal;
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

  let discountUsd = 0;
  let discountSource = 'NONE';
  let capNote = '';

  // Non-stacking rule: promo code takes precedence OR Calm Vault up to 30% max cap (never both)
  if (cleanPromo && promoObj?.active && subtotal >= Number(promoObj.min_subtotal_usd || 0)) {
    const pct = Math.min(MAX_LOYALTY_DISCOUNT_PCT, Number(promoObj.discount_pct || 0));
    discountUsd = Number(((subtotal * pct) / 100).toFixed(2));
    discountSource = `PROMO_${cleanPromo}_${pct}%`;
    capNote = 'Promo code applied (non-stackable with Calm Vault points or sale items).';
  } else if (Number(useVaultDiscountPct) > 0 && !hasPromoItem && eligibleVaultSubtotal > 0) {
    const requestedPct = Math.min(MAX_LOYALTY_DISCOUNT_PCT, Math.max(0, Number(useVaultDiscountPct)));
    const availableVaultPct = customerRecord ? Math.min(MAX_LOYALTY_DISCOUNT_PCT, Number(customerRecord.max_unlocked_pct || 0)) : 0;
    const appliedPct = Math.min(requestedPct, availableVaultPct || requestedPct);
    // Clamp discount so aggregate net margin never drops below 20%
    const maxSafeDiscount = Math.max(0, subtotal - wholesaleTotal / (1 - MIN_NET_MARGIN_PCT / 100 - STRIPE_FEE_PCT) - STRIPE_FIXED_USD);
    const rawVaultDiscount = (eligibleVaultSubtotal * appliedPct) / 100;
    discountUsd = Number(Math.min(rawVaultDiscount, maxSafeDiscount).toFixed(2));
    discountSource = `CALM_VAULT_${appliedPct}%_CAPPED_30%`;
    capNote = 'Calm Vault capped at 30% max (20% net-margin floor enforced server-side).';
  }

  const discountedSubtotal = Math.max(0, Number((subtotal - discountUsd).toFixed(2)));
  const shippingUsd =
    discountedSubtotal === 0 || discountedSubtotal >= FREE_US_SHIPPING_THRESHOLD
      ? 0.0
      : STANDARD_US_SHIPPING_USD;
  const estimatedTotal = Number((discountedSubtotal + shippingUsd).toFixed(2));

  const stripeFee = discountedSubtotal > 0 ? discountedSubtotal * STRIPE_FEE_PCT + STRIPE_FIXED_USD : 0;
  const estNetMarginPct =
    discountedSubtotal > 0
      ? Number((((discountedSubtotal - wholesaleTotal - stripeFee) / discountedSubtotal) * 100).toFixed(2))
      : 0;

  return {
    items: normalizedItems,
    subtotal_usd: Number(subtotal.toFixed(2)),
    discount_usd: discountUsd,
    discount_source: discountSource,
    cap_note: capNote,
    shipping_usd: shippingUsd,
    free_shipping_threshold_usd: FREE_US_SHIPPING_THRESHOLD,
    total_usd: estimatedTotal,
    margin_guard_ok: normalizedItems.length === 0 ? true : estNetMarginPct >= MIN_NET_MARGIN_PCT,
    estimated_net_margin_pct: estNetMarginPct,
  };
}
