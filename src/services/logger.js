import fs from 'node:fs';
import path from 'node:path';
import { config } from '../config.js';

function ensureLogDir() {
  fs.mkdirSync(path.dirname(config.logPath), { recursive: true });
}

function write(level, message) {
  ensureLogDir();
  const line = `[${new Date().toISOString()}] [${level}] ${message}`;
  console.log(line);
  fs.appendFileSync(config.logPath, `${line}\n`, 'utf8');
}

export const logger = {
  info: message => write('INFO', message),
  warn: message => write('WARN', message),
  error: message => write('ERROR', message)
};
