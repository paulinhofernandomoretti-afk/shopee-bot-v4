import axios from 'axios';
import { config } from '../config.js';
import { formatCurrency } from '../utils/helpers.js';

function buildCaption(item) {
  const lines = [
    `🔥 <b>${item.category || 'Oferta'}</b>`,
    '',
    `<b>Produto:</b> ${item.title}`,
    item.price ? `<b>Preço:</b> ${formatCurrency(item.price)}` : null,
    item.discount ? `<b>Desconto:</b> ${item.discount}%` : null,
    item.aiScore !== null && item.aiScore !== undefined ? `<b>Nota IA:</b> ${item.aiScore}/100` : null,
    item.aiReasons?.length ? `<b>Resumo:</b> ${item.aiReasons[0]}` : null,
    '',
    '👇 <b>Comprar agora</b>'
  ].filter(Boolean);

  return lines.join('\n');
}

function getInlineKeyboard(item) {
  return {
    inline_keyboard: [[{ text: '🛒 Comprar agora', url: item.affiliateUrl }]]
  };
}

export async function sendOfferToTelegram(item) {
  if (!config.telegramBotToken) {
    throw new Error('TELEGRAM_BOT_TOKEN não configurado');
  }

  const chatId = item.chatId || config.telegramDefaultChatId;
  if (!chatId) {
    throw new Error('Chat do Telegram não configurado');
  }

  if (config.dryRun) {
    return { ok: true, dryRun: true, chatId, messageId: 'dry-run' };
  }

  const caption = buildCaption(item);
  const reply_markup = getInlineKeyboard(item);
  const base = `https://api.telegram.org/bot${config.telegramBotToken}`;

  if (item.imageUrl) {
    const response = await axios.post(`${base}/sendPhoto`, {
      chat_id: chatId,
      photo: item.imageUrl,
      caption,
      parse_mode: 'HTML',
      reply_markup
    });
    return { ok: true, chatId, messageId: response.data.result?.message_id };
  }

  const response = await axios.post(`${base}/sendMessage`, {
    chat_id: chatId,
    text: caption,
    parse_mode: 'HTML',
    reply_markup,
    disable_web_page_preview: false
  });

  return { ok: true, chatId, messageId: response.data.result?.message_id };
}

export async function setTelegramCommands() {
  if (!config.telegramBotToken) return;
  const base = `https://api.telegram.org/bot${config.telegramBotToken}`;
  await axios.post(`${base}/setMyCommands`, {
    commands: [
      { command: 'status', description: 'Mostra status do bot' },
      { command: 'run', description: 'Executa uma varredura agora' },
      { command: 'config', description: 'Mostra configurações principais' },
      { command: 'help', description: 'Mostra ajuda' }
    ]
  });
}
