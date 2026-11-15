import { startKsk01Queue } from './ksk01-queue';

async function start() {
  const { worker, server } = await startKsk01Queue();
  process.on('SIGUSR1', () => worker.kill('SIGUSR1'));
  process.on('SIGHUP', () => worker.kill('SIGHUP'));
  const stop = () => {
    server.close();
    worker.kill('SIGTERM');
    worker.once('exit', () => process.exit(0));
    if (worker.exitCode !== null || worker.signalCode !== null || !worker.pid) process.exit(0);
  };
  process.once('SIGTERM', stop);
  process.once('SIGINT', stop);
  await import('./main');
}

void start().catch(() => { console.error('KSK01_QUEUE_ORIGIN_START_FAILED'); process.exit(1); });
