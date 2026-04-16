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

  function extractIds(url) {
    const match = url.match(/product\/(\d+)\/(\d+)/);
    if (!match) return null;

    return {
      shopid: match[1],
      itemid: match[2]
    };
  }

  const ids = extractIds(affiliateUrl);
  if (!ids) return null;

  const apiUrl = `https://shopee.com.br/api/v4/item/get?itemid=${ids.itemid}&shopid=${ids.shopid}`;

  const response = await axios.get(apiUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0",
      "Accept": "application/json"
    }
  });

  const item = response.data?.data;
  if (!item) return null;

  return {
    externalId: `${item.itemid}`,
    title: item.name,
    productUrl: affiliateUrl,
    affiliateUrl,
    imageUrl: `https://cf.shopee.com.br/file/${item.image}`,
    campaign: listMeta.name || 'Lista afiliada',
    category: listMeta.category || 'Geral',
    chatId: listMeta.chatId,
    subId: listMeta.subId || '',
    price: item.price / 100000,
    oldPrice: item.price_before_discount
      ? item.price_before_discount / 100000
      : null,
    discount: item.raw_discount || null
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
