import path from 'node:path';
import 'dotenv/config';

export const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 3000),
  baseUrl: process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`,
  sessionSecret: process.env.SESSION_SECRET || 'troque-isto',
  webUsername: process.env.WEB_USERNAME || 'admin',
  webPassword: process.env.WEB_PASSWORD || '123456',
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || '',
  telegramDefaultChatId: process.env.TELEGRAM_DEFAULT_CHAT_ID || '',
  telegramAdminIds: String(process.env.TELEGRAM_ADMIN_IDS || '')
    .split(',')
    .map(v => v.trim())
    .filter(Boolean),
  openAiApiKey: process.env.OPENAI_API_KEY || '',
  openAiModel: process.env.OPENAI_MODEL || 'gpt-5.4-mini',
  aiMinScore: Number(process.env.AI_MIN_SCORE || 75),
  aiEnabled: String(process.env.AI_ENABLED || 'true').toLowerCase() === 'true',
  cronSchedule: process.env.CRON_SCHEDULE || '*/10 * * * *',
  dryRun: String(process.env.DRY_RUN || 'false').toLowerCase() === 'true',
  disableScheduler: String(process.env.DISABLE_SCHEDULER || 'false').toLowerCase() === 'true',
  defaultMinPrice: Number(process.env.DEFAULT_MIN_PRICE || 10),
  defaultMaxPrice: Number(process.env.DEFAULT_MAX_PRICE || 500),
  defaultMinDiscount: Number(process.env.DEFAULT_MIN_DISCOUNT || 20),
  blockedKeywords: String(process.env.DEFAULT_BLOCKED_KEYWORDS || '')
    .split(',')
    .map(v => v.trim().toLowerCase())
    .filter(Boolean),
  sqlitePath: path.resolve(process.cwd(), process.env.SQLITE_PATH || './data/app.sqlite'),
  affiliateListsPath: path.resolve(process.cwd(), process.env.AFFILIATE_LISTS_PATH || './data/affiliate-lists.json'),
  logPath: path.resolve(process.cwd(), process.env.LOG_PATH || './logs/app.log')
};
