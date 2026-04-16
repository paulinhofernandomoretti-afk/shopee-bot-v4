import fs from 'node:fs';
import path from 'node:path';
import { config } from '../config.js';

function ensureFile() {
  fs.mkdirSync(path.dirname(config.affiliateListsPath), { recursive: true });
  if (!fs.existsSync(config.affiliateListsPath)) {
    fs.writeFileSync(config.affiliateListsPath, '[]', 'utf8');
  }
}

export function readAffiliateLists() {
  ensureFile();
  const raw = fs.readFileSync(config.affiliateListsPath, 'utf8');
  const parsed = JSON.parse(raw || '[]');
  return Array.isArray(parsed) ? parsed : [];
}

export function writeAffiliateLists(items) {
  ensureFile();
  fs.writeFileSync(config.affiliateListsPath, JSON.stringify(items, null, 2), 'utf8');
}
