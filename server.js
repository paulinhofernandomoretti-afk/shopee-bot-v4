import express from 'express';
import session from 'express-session';
import methodOverride from 'method-override';
import cron from 'node-cron';
import { config } from './config.js';
import { logger } from './services/logger.js';
import { webRouter } from './routes/web.js';
import { runMonitor } from './services/monitor-service.js';
import { getSetting } from './db/database.js';

const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride('_method'));
app.use(session({ secret: config.sessionSecret, resave: false, saveUninitialized: false }));

app.get('/health', (req, res) => res.json({ ok: true }));
app.use('/', webRouter);

app.listen(config.port, () => {
  logger.info(`Servidor rodando em ${config.baseUrl}`);
});

if (!config.disableScheduler) {
  cron.schedule(config.cronSchedule, async () => {
    const enabled = String(getSetting('schedulerEnabled', 'true')).toLowerCase() === 'true';
    if (!enabled) return;
    try {
      await runMonitor();
    } catch (error) {
      logger.error(`Erro no scheduler: ${error.message}`);
    }
  });
}
