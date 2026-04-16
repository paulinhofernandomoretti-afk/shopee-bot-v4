import { setTelegramCommands } from './services/telegram-service.js';

setTelegramCommands()
  .then(() => console.log('Comandos do Telegram registrados.'))
  .catch(error => {
    console.error('Falha ao registrar comandos:', error.message);
    process.exitCode = 1;
  });
