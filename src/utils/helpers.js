export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function safeJsonParse(text, fallback = null) {
  try {
    return JSON.parse(text);
  } catch {
    return fallback;
  }
}

export function formatCurrency(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return null;
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value));
}

export function normalizeWhitespace(text) {
  return String(text || '').replace(/\s+/g, ' ').trim();
}

export function escapeHtml(text) {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function slugify(text) {
  return String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function nowIso() {
  return new Date().toISOString();
}
