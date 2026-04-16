import {
  createRun,
  finishRun,
  upsertOffer,
  wasPosted,
  addPost,
  getSetting
} from '../db/database.js';
import * as dbFns from '../db/database.js';
import { logger } from './logger.js';
import { readAffiliateLists } from './affiliate-list-service.js';
import { fetchOffersFromLists } from './shopee-service.js';
import { applyBasicFilters, getRuntimeSettings } from './filter-service.js';
import { scoreOfferWithAI } from './ai-scoring-service.js';
import { sendOfferToTelegram } from './telegram-service.js';
import { nowIso } from '../utils/helpers.js';

export async function runMonitor() {
  const run = createRun();
  const lists = readAffiliateLists();
  const runtimeSettings = getRuntimeSettings(dbFns);

  let checkedCount = 0;
  let acceptedCount = 0;
  let publishedCount = 0;
  const notes = [];

  try {
    const items = await fetchOffersFromLists(lists, logger);

    for (const item of items) {
      checkedCount += 1;

      const basicDecision = applyBasicFilters(item, runtimeSettings);
      if (!basicDecision.ok) {
        upsertOffer({
          ...item,
          aiScore: 0,
          aiApproved: false,
          aiReasons: [],
          aiRisks: [],
          approvedReason: basicDecision.reason,
          firstSeenAt: nowIso(),
          lastSeenAt: nowIso(),
          lastStatus: 'blocked-basic'
        });
        continue;
      }

      const ai = await scoreOfferWithAI(item, runtimeSettings);
      const aiApproved = ai.approve && ai.score >= runtimeSettings.aiMinScore;
      const category = ai.categorySuggestion || item.category;

      upsertOffer({
        ...item,
        category,
        aiScore: ai.score,
        aiApproved,
        aiReasons: ai.reasons,
        aiRisks: ai.risks,
        approvedReason: aiApproved ? 'aprovado pela IA' : 'reprovado pela IA',
        firstSeenAt: nowIso(),
        lastSeenAt: nowIso(),
        lastStatus: aiApproved ? 'approved' : 'blocked-ai'
      });

      if (!aiApproved) {
        continue;
      }

      acceptedCount += 1;

      if (wasPosted(item.externalId, item.chatId)) {
        continue;
      }

      const sent = await sendOfferToTelegram({
        ...item,
        category,
        aiScore: ai.score,
        aiReasons: ai.reasons
      });

      addPost({
        offerExternalId: item.externalId,
        telegramChatId: item.chatId,
        telegramMessageId: String(sent.messageId || ''),
        sentAt: nowIso(),
        status: sent.dryRun ? 'dry-run' : 'sent',
        note: ai.reasons?.join(' | ') || ''
      });

      publishedCount += 1;
    }

    finishRun(run.id, {
      checkedCount,
      acceptedCount,
      publishedCount,
      status: 'done',
      notes: notes.join(' | ')
    });

    logger.info(`Execução concluída. checked=${checkedCount} accepted=${acceptedCount} published=${publishedCount}`);

    return { checkedCount, acceptedCount, publishedCount };
  } catch (error) {
    finishRun(run.id, {
      checkedCount,
      acceptedCount,
      publishedCount,
      status: 'error',
      notes: error.message
    });
    logger.error(`Falha na execução: ${error.message}`);
    throw error;
  }
}
