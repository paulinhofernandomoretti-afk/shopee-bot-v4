import { runMonitor } from './services/monitor-service.js';

runMonitor()
  .then(result => {
    console.log('Execução única concluída:', result);
  })
  .catch(error => {
    console.error('Falha na execução única:', error);
    process.exitCode = 1;
  });
