export function getRuntimeSettings(dbFns) {
  return {
    minPrice: Number(dbFns.getSetting('minPrice', '0')),
    maxPrice: Number(dbFns.getSetting('maxPrice', '999999')),
    minDiscount: Number(dbFns.getSetting('minDiscount', '0')),
    blockedKeywords: String(dbFns.getSetting('blockedKeywords', ''))
      .split(',')
      .map(v => v.trim().toLowerCase())
      .filter(Boolean),
    aiMinScore: Number(dbFns.getSetting('aiMinScore', '75')),
    aiEnabled: String(dbFns.getSetting('aiEnabled', 'true')).toLowerCase() === 'true',
    dryRun: String(dbFns.getSetting('dryRun', 'false')).toLowerCase() === 'true'
  };
}

export function applyBasicFilters(item, settings) {
  const title = String(item.title || '').toLowerCase();

  for (const word of settings.blockedKeywords) {
    if (title.includes(word)) {
      return { ok: false, reason: `bloqueado por palavra: ${word}` };
    }
  }

  if (item.price !== null && item.price < settings.minPrice) {
    return { ok: false, reason: 'preço abaixo do mínimo' };
  }

  if (item.price !== null && item.price > settings.maxPrice) {
    return { ok: false, reason: 'preço acima do máximo' };
  }

  if (item.discount !== null && item.discount < settings.minDiscount) {
    return { ok: false, reason: 'desconto abaixo do mínimo' };
  }

  return { ok: true, reason: 'passou filtros básicos' };
}
