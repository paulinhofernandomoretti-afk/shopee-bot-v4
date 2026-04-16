import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { config } from '../config.js';

fs.mkdirSync(path.dirname(config.sqlitePath), { recursive: true });

const db = new DatabaseSync(config.sqlitePath);
db.exec('PRAGMA journal_mode = WAL;');

db.exec(`
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  started_at TEXT NOT NULL,
  finished_at TEXT,
  checked_count INTEGER DEFAULT 0,
  accepted_count INTEGER DEFAULT 0,
  published_count INTEGER DEFAULT 0,
  status TEXT NOT NULL,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS offers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  external_id TEXT UNIQUE,
  title TEXT NOT NULL,
  product_url TEXT,
  affiliate_url TEXT,
  image_url TEXT,
  category TEXT,
  campaign TEXT,
  sub_id TEXT,
  price REAL,
  old_price REAL,
  discount INTEGER,
  ai_score INTEGER,
  ai_approved INTEGER DEFAULT 0,
  ai_reasons TEXT,
  ai_risks TEXT,
  approved_reason TEXT,
  first_seen_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  last_status TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  offer_external_id TEXT NOT NULL,
  telegram_chat_id TEXT NOT NULL,
  telegram_message_id TEXT,
  sent_at TEXT NOT NULL,
  status TEXT NOT NULL,
  note TEXT
);
`);

const defaultSettings = {
  minPrice: String(config.defaultMinPrice),
  maxPrice: String(config.defaultMaxPrice),
  minDiscount: String(config.defaultMinDiscount),
  blockedKeywords: config.blockedKeywords.join(', '),
  aiMinScore: String(config.aiMinScore),
  aiEnabled: String(config.aiEnabled),
  dryRun: String(config.dryRun),
  schedulerEnabled: String(!config.disableScheduler)
};

for (const [key, value] of Object.entries(defaultSettings)) {
  db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)').run(key, value);
}

export function getDb() {
  return db;
}

export function getSetting(key, fallback = '') {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row?.value ?? fallback;
}

export function setSetting(key, value) {
  db.prepare(`
    INSERT INTO settings (key, value) VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `).run(key, String(value));
}

export function listSettings() {
  return db.prepare('SELECT key, value FROM settings ORDER BY key').all();
}

export function createRun() {
  const startedAt = new Date().toISOString();
  const result = db.prepare('INSERT INTO runs (started_at, status) VALUES (?, ?)').run(startedAt, 'running');
  return { id: Number(result.lastInsertRowid), startedAt };
}

export function finishRun(id, payload) {
  db.prepare(`
    UPDATE runs
    SET finished_at = ?, checked_count = ?, accepted_count = ?, published_count = ?, status = ?, notes = ?
    WHERE id = ?
  `).run(
    new Date().toISOString(),
    payload.checkedCount || 0,
    payload.acceptedCount || 0,
    payload.publishedCount || 0,
    payload.status || 'done',
    payload.notes || '',
    id
  );
}

export function upsertOffer(offer) {
  db.prepare(`
    INSERT INTO offers (
      external_id, title, product_url, affiliate_url, image_url, category, campaign, sub_id,
      price, old_price, discount, ai_score, ai_approved, ai_reasons, ai_risks,
      approved_reason, first_seen_at, last_seen_at, last_status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(external_id) DO UPDATE SET
      title = excluded.title,
      product_url = excluded.product_url,
      affiliate_url = excluded.affiliate_url,
      image_url = excluded.image_url,
      category = excluded.category,
      campaign = excluded.campaign,
      sub_id = excluded.sub_id,
      price = excluded.price,
      old_price = excluded.old_price,
      discount = excluded.discount,
      ai_score = excluded.ai_score,
      ai_approved = excluded.ai_approved,
      ai_reasons = excluded.ai_reasons,
      ai_risks = excluded.ai_risks,
      approved_reason = excluded.approved_reason,
      last_seen_at = excluded.last_seen_at,
      last_status = excluded.last_status
  `).run(
    offer.externalId,
    offer.title,
    offer.productUrl,
    offer.affiliateUrl,
    offer.imageUrl,
    offer.category,
    offer.campaign,
    offer.subId,
    offer.price,
    offer.oldPrice,
    offer.discount,
    offer.aiScore,
    offer.aiApproved ? 1 : 0,
    JSON.stringify(offer.aiReasons || []),
    JSON.stringify(offer.aiRisks || []),
    offer.approvedReason || '',
    offer.firstSeenAt,
    offer.lastSeenAt,
    offer.lastStatus
  );
}

export function wasPosted(externalId, chatId) {
  const row = db.prepare('SELECT id FROM posts WHERE offer_external_id = ? AND telegram_chat_id = ? LIMIT 1').get(externalId, String(chatId));
  return Boolean(row);
}

export function addPost(post) {
  db.prepare(`
    INSERT INTO posts (offer_external_id, telegram_chat_id, telegram_message_id, sent_at, status, note)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(post.offerExternalId, String(post.telegramChatId), post.telegramMessageId || '', post.sentAt, post.status, post.note || '');
}

export function getDashboardStats() {
  const counts = db.prepare(`
    SELECT
      (SELECT COUNT(*) FROM offers) AS offers,
      (SELECT COUNT(*) FROM posts) AS posts,
      (SELECT COUNT(*) FROM runs) AS runs,
      (SELECT COUNT(*) FROM offers WHERE ai_approved = 1) AS approved
  `).get();
  return counts;
}

export function listRecentPosts(limit = 20) {
  return db.prepare(`
    SELECT p.sent_at, p.status, p.note, o.title, o.category, o.ai_score, o.affiliate_url
    FROM posts p
    JOIN offers o ON o.external_id = p.offer_external_id
    ORDER BY p.id DESC
    LIMIT ?
  `).all(limit);
}

export function listRecentRuns(limit = 20) {
  return db.prepare('SELECT * FROM runs ORDER BY id DESC LIMIT ?').all(limit);
}

export function resetDatabase() {
  db.exec('DELETE FROM posts; DELETE FROM offers; DELETE FROM runs;');
}
