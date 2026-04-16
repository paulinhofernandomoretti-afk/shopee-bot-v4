import axios from 'axios';
import * as cheerio from 'cheerio';
import { normalizeWhitespace, slugify } from '../utils/helpers.js';

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36';

function parsePrice(text) {
  if (!text) return null;
  const cleaned = String(text).replace(/\s+/g, ' ');
  const match = cleaned.match(/R\$\s*([\d.]+,\d{2})/);
  if (!match) return null;
  return Number(match[1].replace(/\./g, '').replace(',', '.'));
}

function parseDiscount(text) {
  if (!text) return null;
  const match = String(text).match(/(\d{1,3})%/);
  return match ? Number(match[1]) : null;
}

function normalizeImage(url) {
  if (!url) return null;
  if (url.startsWith('//')) return `https:${url}`;
  return url;
}

function appendSubId(link, subId) {
  if (!subId) return link;
  try {
    const url = new URL(link);
    if (!url.searchParams.get('sub_id')) {
      url.searchParams.set('sub_id', subId);
    }
    return url.toString();
  } catch {
    return link;
  }
}

export async function fetchOfferFromAffiliateLink(link, listMeta) {
  const affiliateUrl = appendSubId(link, listMeta.subId);
const response = await axios.get(url, {
  headers: {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36",
    "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Referer": "https://shopee.com.br/"
  },
  maxRedirects: 5,
  timeout: 25000
});

console.log("URL buscada:", url);
console.log("Status:", response.status);
console.log("Final URL:", response.request?.res?.responseUrl || url);
console.log("HTML início:", String(response.data).slice(0, 500));

const html = response.data;
const finalUrl = response.request?.res?.responseUrl || url;

// 👉 SÓ UMA VEZ
const $ = cheerio.load(html);

  const title = normalizeWhitespace(
    $('meta[property="og:title"]').attr('content') ||
    $('title').text() ||
    $('h1').first().text()
  );

  const description = normalizeWhitespace(
    $('meta[property="og:description"]').attr('content') ||
    $('meta[name="description"]').attr('content') ||
    $('body').text().slice(0, 1000)
  );

  const imageUrl = normalizeImage(
    $('meta[property="og:image"]').attr('content') ||
    $('img').first().attr('src') ||
    ''
  );

  const price = parsePrice(description) || parsePrice($.text());
  const discount = parseDiscount(description) || parseDiscount($.text());
  const oldPrice = null;

  if (!title) {
    return null;
  }

  return {
    externalId: `${slugify(title)}::${finalUrl}`,
    title,
    productUrl: finalUrl,
    affiliateUrl,
    imageUrl,
    campaign: listMeta.name || 'Lista afiliada',
    category: listMeta.category || 'Geral',
    chatId: listMeta.chatId,
    subId: listMeta.subId || '',
    price,
    oldPrice,
    discount
  };
}

export async function fetchOffersFromLists(lists, logger) {
  const items = [];

  for (const list of lists.filter(item => item.enabled !== false)) {
    for (const link of list.links || []) {
      try {
        const item = await fetchOfferFromAffiliateLink(link, list);
        if (item) items.push(item);
      } catch (error) {
        logger.warn(`Falha ao processar link afiliado ${link}: ${error.message}`);
      }
    }
  }

  return items;
}
