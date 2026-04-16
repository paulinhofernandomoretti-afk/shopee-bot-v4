import OpenAI from 'openai';
import { config } from '../config.js';
import { safeJsonParse } from '../utils/helpers.js';

let client = null;

function getClient() {
  if (!config.openAiApiKey) return null;
  if (!client) client = new OpenAI({ apiKey: config.openAiApiKey });
  return client;
}

export async function scoreOfferWithAI(item, runtimeSettings) {
  if (!config.aiEnabled || !runtimeSettings.aiEnabled) {
    return {
      score: 0,
      approve: true,
      reasons: ['IA desativada'],
      risks: [],
      categorySuggestion: item.category || 'Geral'
    };
  }

  const openai = getClient();
  if (!openai) {
    return {
      score: 0,
      approve: true,
      reasons: ['OPENAI_API_KEY não configurada'],
      risks: [],
      categorySuggestion: item.category || 'Geral'
    };
  }

  const prompt = `
Você é um avaliador rigoroso de ofertas para um canal de Telegram de afiliados.
Responda apenas JSON válido com este formato:
{
  "score": number,
  "approve": boolean,
  "reasons": [string],
  "risks": [string],
  "categorySuggestion": string
}

Critérios:
- priorize clareza do produto, desconto, preço razoável e potencial de clique.
- rejeite itens com sinais de problema, produto confuso, preço ruim, baixa atratividade ou sinais suspeitos.
- score de 0 a 100.
- approve deve ser true somente se o item tiver boa chance de performar num canal de promoções.

Item:
${JSON.stringify(item, null, 2)}

Configuração:
${JSON.stringify(runtimeSettings, null, 2)}
`;

  const response = await openai.responses.create({
    model: config.openAiModel,
    input: prompt
  });

  const text = response.output_text?.trim() || '{}';
  const parsed = safeJsonParse(text, null);

  if (!parsed || typeof parsed.score !== 'number') {
    return {
      score: 0,
      approve: false,
      reasons: ['Resposta inválida da IA'],
      risks: ['JSON inválido'],
      categorySuggestion: item.category || 'Geral'
    };
  }

  return {
    score: parsed.score,
    approve: Boolean(parsed.approve),
    reasons: Array.isArray(parsed.reasons) ? parsed.reasons : [],
    risks: Array.isArray(parsed.risks) ? parsed.risks : [],
    categorySuggestion: parsed.categorySuggestion || item.category || 'Geral'
  };
}
