import express from 'express';
import { getDashboardStats, listRecentPosts, listRecentRuns, listSettings, setSetting } from '../db/database.js';
import { readAffiliateLists, writeAffiliateLists } from '../services/affiliate-list-service.js';
import { runMonitor } from '../services/monitor-service.js';
import { escapeHtml } from '../utils/helpers.js';

export const webRouter = express.Router();

function requireAuth(req, res, next) {
  if (req.session?.loggedIn) return next();
  return res.redirect('/login');
}

function layout(title, content) {
  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <style>
    body{font-family:Arial,sans-serif;margin:0;background:#f5f6fa;color:#222}
    header{background:#111827;color:#fff;padding:16px 24px}
    nav a{color:#fff;margin-right:16px;text-decoration:none}
    main{padding:24px;max-width:1100px;margin:0 auto}
    .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px}
    .card{background:#fff;border-radius:12px;padding:16px;box-shadow:0 2px 10px rgba(0,0,0,.06)}
    table{width:100%;border-collapse:collapse;background:#fff}
    th,td{padding:10px;border-bottom:1px solid #e5e7eb;text-align:left;font-size:14px}
    input,textarea{width:100%;padding:10px;margin:6px 0 12px;border:1px solid #d1d5db;border-radius:8px}
    button{padding:10px 14px;border:0;border-radius:8px;background:#2563eb;color:#fff;cursor:pointer}
    .muted{color:#6b7280;font-size:13px}
  </style>
</head>
<body>
<header><nav><a href="/">Painel</a><a href="/settings">Configurações</a><a href="/lists">Listas afiliadas</a><a href="/run-now">Executar agora</a><a href="/logout">Sair</a></nav></header>
<main>${content}</main>
</body>
</html>`;
}

webRouter.get('/login', (req, res) => {
  res.send(`<!doctype html><html><body style="font-family:Arial;background:#f5f6fa"><div style="max-width:420px;margin:80px auto;background:#fff;padding:24px;border-radius:12px"><h2>Entrar</h2><form method="post" action="/login"><label>Usuário</label><input name="username" /><label>Senha</label><input name="password" type="password" /><button type="submit">Entrar</button></form></div></body></html>`);
});

webRouter.post('/login', (req, res) => {
  const ok = req.body.username === process.env.WEB_USERNAME && req.body.password === process.env.WEB_PASSWORD;
  if (!ok) return res.redirect('/login');
  req.session.loggedIn = true;
  return res.redirect('/');
});

webRouter.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/login'));
});

webRouter.get('/', requireAuth, (req, res) => {
  const stats = getDashboardStats();
  const runs = listRecentRuns(10);
  const posts = listRecentPosts(10);
  const content = `
    <h1>Painel V4</h1>
    <div class="grid">
      <div class="card"><h3>Ofertas vistas</h3><p>${stats.offers}</p></div>
      <div class="card"><h3>Posts enviados</h3><p>${stats.posts}</p></div>
      <div class="card"><h3>Execuções</h3><p>${stats.runs}</p></div>
      <div class="card"><h3>Aprovadas pela IA</h3><p>${stats.approved}</p></div>
    </div>
    <h2>Últimas execuções</h2>
    <table><tr><th>ID</th><th>Início</th><th>Status</th><th>Checked</th><th>Accepted</th><th>Published</th></tr>
      ${runs.map(r => `<tr><td>${r.id}</td><td>${escapeHtml(r.started_at)}</td><td>${escapeHtml(r.status)}</td><td>${r.checked_count}</td><td>${r.accepted_count}</td><td>${r.published_count}</td></tr>`).join('')}
    </table>
    <h2 style="margin-top:24px">Últimos posts</h2>
    <table><tr><th>Data</th><th>Título</th><th>Categoria</th><th>Nota IA</th><th>Status</th></tr>
      ${posts.map(p => `<tr><td>${escapeHtml(p.sent_at)}</td><td>${escapeHtml(p.title)}</td><td>${escapeHtml(p.category || '')}</td><td>${p.ai_score ?? ''}</td><td>${escapeHtml(p.status)}</td></tr>`).join('')}
    </table>`;
  res.send(layout('Painel V4', content));
});

webRouter.get('/settings', requireAuth, (req, res) => {
  const settings = listSettings();
  const form = settings.map(s => `<label>${escapeHtml(s.key)}</label><input name="${escapeHtml(s.key)}" value="${escapeHtml(s.value)}" />`).join('');
  res.send(layout('Configurações', `<h1>Configurações</h1><form method="post" action="/settings">${form}<button type="submit">Salvar</button></form>`));
});

webRouter.post('/settings', requireAuth, (req, res) => {
  for (const [key, value] of Object.entries(req.body)) {
    setSetting(key, value);
  }
  res.redirect('/settings');
});

webRouter.get('/lists', requireAuth, (req, res) => {
  const lists = readAffiliateLists();
  res.send(layout('Listas afiliadas', `
    <h1>Listas afiliadas</h1>
    <p class="muted">Edite o JSON completo abaixo.</p>
    <form method="post" action="/lists">
      <textarea name="json" rows="24">${escapeHtml(JSON.stringify(lists, null, 2))}</textarea>
      <button type="submit">Salvar listas</button>
    </form>
  `));
});

webRouter.post('/lists', requireAuth, (req, res) => {
  try {
    const parsed = JSON.parse(req.body.json || '[]');
    writeAffiliateLists(parsed);
    res.redirect('/lists');
  } catch (error) {
    res.status(400).send(layout('Erro', `<h1>JSON inválido</h1><p>${escapeHtml(error.message)}</p>`));
  }
});

webRouter.get('/run-now', requireAuth, async (req, res) => {
  await runMonitor();
  res.redirect('/');
});
