import fs from 'fs';
import path from 'path';

const FETCH_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

const round2 = (n) => Math.round(Number(n || 0) * 100) / 100;

async function fetchJson(url, headers = {}) {
  const res = await fetch(url, {
    headers: { 'User-Agent': FETCH_UA, ...headers },
    redirect: 'follow',
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) return null;
  const txt = await res.text();
  if (!txt || (!txt.trim().startsWith('{') && !txt.trim().startsWith('['))) return null;
  try {
    return JSON.parse(txt);
  } catch {
    return null;
  }
}

async function probeVtexLive(sourceUrl, itemTitle = '') {
  const parsed = new URL(sourceUrl);
  const parts = parsed.pathname.split('/').filter(Boolean);
  const slug = parts.length >= 2 && parts[parts.length - 1] === 'p' ? parts[parts.length - 2] : parts[0] || '';
  let listPrice = 0;
  let bestPrice = 0;
  let pixPrice = 0;
  let inStock = true;

  if (slug) {
    const apiUrl = `${parsed.protocol}//${parsed.host}/api/catalog_system/pub/products/search/${slug}/p`;
    const arr = await fetchJson(apiUrl, { 'Accept-Language': 'pt-BR,pt;q=0.9' });
    if (Array.isArray(arr) && arr.length > 0) {
      const allSkus = Array.isArray(arr[0].items) ? arr[0].items : [];
      const volMatch = String(itemTitle || '').match(/\b(\d+)\s*ml\b/i);
      let candidateSkus = allSkus;
      if (allSkus.length > 1 && volMatch) {
        const volRe = new RegExp(`\\b${volMatch[1]}\\s*ml\\b`, 'i');
        const matched = allSkus.filter(
          (sk) => volRe.test(String(sk.name || '')) || volRe.test(String(sk.nameComplete || ''))
        );
        if (matched.length > 0) candidateSkus = matched;
      }

      const pickSellerOffer = (skusList, requireStock) => {
        const candidates = [];
        for (const item of skusList) {
          for (const seller of item.sellers || []) {
            const co = seller.commertialOffer || {};
            const pv = Number(co.Price || 0);
            const avail = Number(co.AvailableQuantity || 0);
            if (pv > 0 && (!requireStock || avail > 0)) {
              candidates.push({
                price: pv,
                co,
                avail,
                isDefault: seller.sellerDefault === true ? 0 : 1,
              });
            }
          }
        }
        if (!candidates.length) return null;
        candidates.sort((a, b) => (a.isDefault !== b.isDefault ? a.isDefault - b.isDefault : a.price - b.price));
        return candidates[0];
      };

      const bestOffer =
        pickSellerOffer(candidateSkus, true) ||
        pickSellerOffer(candidateSkus, false) ||
        (candidateSkus !== allSkus ? pickSellerOffer(allSkus, true) || pickSellerOffer(allSkus, false) : null);

      if (bestOffer) {
        bestPrice = bestOffer.price;
        inStock = bestOffer.avail > 0;
        listPrice = Number(bestOffer.co.ListPrice || bestPrice);
        const spot = Number(bestOffer.co.spotPrice || 0);
        if (spot > 0 && spot < bestPrice) pixPrice = spot;
        for (const t of [...(bestOffer.co.Teasers || []), ...(bestOffer.co.PromotionTeasers || [])]) {
          const name = String(t['<Name>k__BackingField'] || t.Name || '');
          const m = name.match(/(\d+)\s*%\s*pix/i);
          if (m) {
            const pct = Number(m[1]);
            if (pct >= 1 && pct <= 40) {
              const cand = round2(bestPrice * (1 - pct / 100));
              if (pixPrice <= 0 || cand < pixPrice) pixPrice = cand;
            }
          }
        }
      }
    }
  }

  if (bestPrice <= 0) return null;
  if (pixPrice <= 0 || pixPrice > bestPrice) pixPrice = bestPrice;
  return {
    currentPrice: round2(bestPrice),
    listPrice: listPrice > bestPrice + 0.01 ? round2(listPrice) : 0,
    pixPrice: round2(pixPrice),
    inStock,
  };
}

async function probeShopifyLive(sourceUrl, prevPrice) {
  const parsed = new URL(sourceUrl);
  const reqVid = parsed.searchParams.get('variant');
  const cleanPath = parsed.pathname.replace(/\/$/, '');
  const jsUrl = `${parsed.protocol}//${parsed.host}${cleanPath}.js`;
  const langHdr = parsed.host.endsWith('.br') ? 'pt-BR,pt;q=0.9' : 'en-US,en;q=0.9';
  const pj = await fetchJson(jsUrl, { 'Accept-Language': langHdr });

  if (pj && (pj.variants || pj.price)) {
    const variants = Array.isArray(pj.variants) ? pj.variants : [];
    let chosen = reqVid ? variants.find((v) => String(v.id) === String(reqVid)) : null;
    if (!chosen && variants.length > 0) {
      const avail = variants.filter((v) => v.available !== false && Number(v.price || 0) > 0);
      const pool = avail.length ? avail : variants.filter((v) => Number(v.price || 0) > 0);
      if (pool.length) {
        const maxP = Math.max(...pool.map((v) => Number(v.price || 0)));
        const nonRefill = pool.filter((v) => maxP < 4500 || Number(v.price || 0) >= maxP * 0.3);
        const cands = nonRefill.length ? nonRefill : pool;
        if (prevPrice > 0) {
          cands.sort((a, b) => {
            const am = Math.abs(Number(a.price || 0) / 100 - prevPrice) < 0.02 ? 0 : 1;
            const bm = Math.abs(Number(b.price || 0) / 100 - prevPrice) < 0.02 ? 0 : 1;
            return am !== bm ? am - bm : Number(a.price || 0) - Number(b.price || 0);
          });
        } else {
          cands.sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
        }
        chosen = cands[0];
      }
    }
    const curPrice = round2(Number((chosen ? chosen.price : pj.price) || 0) / 100);
    const cmpPrice = round2(Number((chosen ? chosen.compare_at_price : pj.compare_at_price) || 0) / 100);
    if (curPrice > 0) {
      return {
        currentPrice: curPrice,
        listPrice: cmpPrice > curPrice + 0.01 ? cmpPrice : 0,
        pixPrice: curPrice,
        inStock: chosen ? chosen.available !== false : pj.available !== false,
      };
    }
  }
  return null;
}

function replaceTextPrice(text, sym, val) {
  if (!text) return text;
  if (sym === 'R$') return String(text).replace(/R\$\s*[0-9]+(?:[.,][0-9]{3})*(?:[.,][0-9]{2})?/g, `R$ ${val.toFixed(2)}`);
  return String(text).replace(/\$[0-9]+(?:,[0-9]{3})*(?:\.[0-9]{2})?/g, `$${val.toFixed(2)}`);
}

function isAmazonPaApiConfigured() {
  return Boolean(
    String(process.env.AMAZON_PAAPI_ACCESS_KEY || '').trim() &&
      String(process.env.AMAZON_PAAPI_SECRET_KEY || '').trim() &&
      String(process.env.AMAZON_ASSOC_TAG || '').trim()
  );
}

export function createLivePriceSync({
  catalogPath,
  currency = 'BRL',
  isSensoryHaven = false,
  logTag = 'Store',
  intervalMs = 60 * 60 * 1000,
} = {}) {
  const liveOverrides = new Map();
  const skuSyncedAt = new Map();
  const state = {
    last_synced_at: null,
    updated_count: 0,
    total_skus: 0,
    syncing: false,
  };

  function computePatchForItem(it, live, today) {
    const patch = {};
    let changed = false;
    const oldCur =
      currency === 'BRL'
        ? Number(it.sale_price_brl || it.price_brl || it.base_price_brl || 0)
        : Number(it.sale_price_usd || it.price_usd || it.base_price_usd || 0);

    if (currency === 'BRL') {
      const isTrackADirect = String(it.fulfillment_track || it.track || '').toUpperCase() === 'TRACK_A_DIRECT';
      const cmpOut = live.listPrice > live.currentPrice + 0.01 ? live.listPrice : null;
      const pixOut = live.pixPrice > 0 && live.pixPrice < live.currentPrice - 0.01 ? live.pixPrice : live.currentPrice;
      patch.price_brl = live.currentPrice;
      patch.base_price_brl = live.currentPrice;
      patch.compare_at_brl = cmpOut;
      patch.sale_price_brl = cmpOut ? live.currentPrice : null;
      patch.pix_price_brl = pixOut;
      patch.on_sale = isTrackADirect ? Boolean(cmpOut) : Boolean(cmpOut || pixOut < live.currentPrice - 0.01);
      if (isTrackADirect && Number(it.wholesale_cost_ratio) > 0) {
        patch.cost_brl = round2(live.currentPrice * Number(it.wholesale_cost_ratio));
      }
      patch.price_verified_at = today;
      patch.in_stock_at_supplier = live.inStock;
      if (it.fixation_hours) {
        patch.fixation_hours = `Verificado R$ ${live.currentPrice.toFixed(2)}`;
      }
      if (it.tagline_pt) {
        patch.tagline_pt = replaceTextPrice(it.tagline_pt, 'R$', live.currentPrice);
      }
      changed =
        Math.abs(oldCur - live.currentPrice) > 0.01 ||
        Math.abs(Number(it.price_brl || 0) - live.currentPrice) > 0.01 ||
        Math.abs(Number(it.pix_price_brl || oldCur) - pixOut) > 0.01 ||
        Math.abs(Number(it.compare_at_brl || 0) - Number(cmpOut || 0)) > 0.01 ||
        (patch.fixation_hours && patch.fixation_hours !== it.fixation_hours) ||
        (patch.tagline_pt && patch.tagline_pt !== it.tagline_pt);
    } else if (isSensoryHaven) {
      const cmpOut = live.listPrice > live.currentPrice + 0.01 ? live.listPrice : null;
      patch.price_usd = cmpOut || live.currentPrice;
      patch.sale_price_usd = cmpOut ? live.currentPrice : null;
      patch.compare_at_usd = cmpOut;
      patch.is_on_promotion = Boolean(cmpOut);
      if (Number(it.wholesale_cost_ratio) > 0) {
        patch.cost_usd = round2(live.currentPrice * Number(it.wholesale_cost_ratio));
      }
      patch.price_verified_at = today;
      changed =
        Math.abs(oldCur - live.currentPrice) > 0.01 ||
        Math.abs(Number(it.compare_at_usd || 0) - Number(cmpOut || 0)) > 0.01;
    } else {
      const cmpOut = live.listPrice > live.currentPrice + 0.01 ? live.listPrice : null;
      patch.price_usd = live.currentPrice;
      patch.base_price_usd = live.currentPrice;
      patch.compare_at_usd = cmpOut;
      patch.sale_price_usd = cmpOut ? live.currentPrice : null;
      patch.on_sale = Boolean(cmpOut);
      if (Number(it.wholesale_cost_ratio) > 0) {
        patch.cost_usd = round2(live.currentPrice * Number(it.wholesale_cost_ratio));
      }
      patch.price_verified_at = today;
      if (it.tagline_en) {
        patch.tagline_en = replaceTextPrice(it.tagline_en, '$', live.currentPrice);
      }
      changed =
        Math.abs(oldCur - live.currentPrice) > 0.01 ||
        Math.abs(Number(it.compare_at_usd || 0) - Number(cmpOut || 0)) > 0.01;
    }
    return { patch, changed };
  }

  async function syncSingleItem(it, today) {
    const url = String(it?.verified_source_url || it?.supplier_links?.[0]?.url || it?.partner_url || '').trim();
    if (!url || !url.startsWith('http')) return null;
    const host = new URL(url).host.toLowerCase();
    // Never scrape Amazon HTML; Amazon pricing is gated cleanly behind PA-API 5.0 when configured.
    if (host.includes('amazon.')) return null;
    const isVtex = ['epocacosmeticos', 'santalolla', 'vivara', 'swarovski', 'keydesign', 'morana', 'montecarlo'].some((h) => host.includes(h));
    const oldCur =
      currency === 'BRL'
        ? Number(it.sale_price_brl || it.price_brl || it.base_price_brl || 0)
        : Number(it.sale_price_usd || it.price_usd || it.base_price_usd || 0);
    const live = isVtex
      ? await probeVtexLive(url, it.name || it.title || '')
      : await probeShopifyLive(url, oldCur);
    if (!live || live.currentPrice <= 0) return null;

    const { patch, changed } = computePatchForItem(it, live, today);
    liveOverrides.set(it.id, patch);
    skuSyncedAt.set(it.id, Date.now());
    return { patch, changed };
  }

  function persistCatalogSafe(items) {
    try {
      const tmp = `${catalogPath}.tmp.${process.pid}`;
      fs.writeFileSync(tmp, `${JSON.stringify(items, null, 2)}\n`, 'utf8');
      try {
        fs.renameSync(tmp, catalogPath);
      } catch {
        fs.writeFileSync(catalogPath, `${JSON.stringify(items, null, 2)}\n`, 'utf8');
        if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
      }
    } catch {
      // Read-only deployment FS safe fallback: in-memory liveOverrides remain active
    }
  }

  async function runSyncOnce() {
    if (state.syncing || !catalogPath || !fs.existsSync(catalogPath)) return state;
    state.syncing = true;
    try {
      const items = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
      state.total_skus = Array.isArray(items) ? items.length : 0;
      let changedCount = 0;
      const today = new Date().toISOString().slice(0, 10);

      let cursor = 0;
      const worker = async () => {
        while (cursor < items.length) {
          const idx = cursor++;
          const it = items[idx];
          try {
            const res = await syncSingleItem(it, today);
            if (!res) continue;
            Object.assign(items[idx], res.patch);
            if (res.changed) changedCount += 1;
          } catch {
            // Skip individual transient error cleanly
          }
        }
      };

      await Promise.all([worker(), worker(), worker(), worker()]);

      if (changedCount > 0) {
        persistCatalogSafe(items);
      }

      state.last_synced_at = new Date().toISOString();
      state.updated_count = changedCount;
      console.log(`[${logTag} LivePriceSync] synced ${state.total_skus} SKUs (${changedCount} updated)`);
    } catch (err) {
      console.warn(`[${logTag} LivePriceSync] warning:`, err?.message || err);
    } finally {
      state.syncing = false;
    }
    return state;
  }

  async function refreshSkuIfStale(itemId, maxAgeMs = 5 * 60 * 1000) {
    if (!itemId || !catalogPath || !fs.existsSync(catalogPath)) {
      return { updated: false, cached: false, itemId };
    }
    const items = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
    const idx = Array.isArray(items) ? items.findIndex((x) => x.id === itemId || x.sku === itemId) : -1;
    if (idx < 0) return { updated: false, cached: false, itemId };
    const canonicalId = items[idx].id;
    const lastTs = skuSyncedAt.get(canonicalId) || 0;
    if (Date.now() - lastTs < maxAgeMs) {
      return {
        updated: false,
        cached: true,
        itemId: canonicalId,
        syncedAt: new Date(lastTs).toISOString(),
        patch: liveOverrides.get(canonicalId) || null,
      };
    }
    const today = new Date().toISOString().slice(0, 10);
    try {
      const res = await syncSingleItem(items[idx], today);
      if (res?.changed) {
        Object.assign(items[idx], res.patch);
        persistCatalogSafe(items);
      }
      return {
        updated: Boolean(res?.changed),
        cached: false,
        itemId: canonicalId,
        syncedAt: new Date(skuSyncedAt.get(canonicalId) || Date.now()).toISOString(),
        patch: res?.patch || null,
      };
    } catch {
      return { updated: false, cached: false, itemId: canonicalId };
    }
  }

  function applyLivePriceOverrides(items) {
    if (!Array.isArray(items) || liveOverrides.size === 0) return items;
    return items.map((item) => {
      const ov = liveOverrides.get(item?.id);
      return ov ? { ...item, ...ov } : item;
    });
  }

  function start() {
    setTimeout(() => {
      void runSyncOnce();
    }, 3000).unref?.();
    setInterval(() => {
      void runSyncOnce();
    }, intervalMs).unref?.();
  }

  return {
    start,
    runSyncOnce,
    refreshSkuIfStale,
    applyLivePriceOverrides,
    getPriceSyncStatus: () => ({
      ...state,
      amazon_paapi_configured: isAmazonPaApiConfigured(),
    }),
  };
}
