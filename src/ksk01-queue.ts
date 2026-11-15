import { ChildProcess, spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { IncomingHttpHeaders, IncomingMessage, ServerResponse } from 'node:http';
import { createServer, request as httpsRequest, Server, ServerOptions } from 'node:https';
import { isAbsolute } from 'node:path';

const route = /^\/internal\/paid-queue\/v1\/(allocate|read|readiness|status|transition)$/;
const requestHeaders = ['accept', 'authorization', 'content-type', 'content-length', 'content-encoding', 'x-queue-actor-authorization'];
const responseHeaders = ['allow', 'cache-control', 'content-type', 'content-length', 'www-authenticate'];
const lockPath = '/run/kiosk-paid-queue-locks/00007_00012_00016.lock';

function select(headers: IncomingHttpHeaders, allowed: string[]) {
  return Object.fromEntries(allowed.flatMap(name => headers[name] === undefined ? [] : [[name, headers[name]]]));
}

export function createKsk01QueueOrigin(tls: ServerOptions, workerPort: number, ca: string): Server {
  return createServer({ ...tls, minVersion: 'TLSv1.2' }, (request: IncomingMessage, response: ServerResponse) => {
    response.setHeader('Cache-Control', 'no-store');
    if (!route.test(request.url || '')) { response.writeHead(404).end(); return; }
    if (request.method !== 'POST') { response.writeHead(405, { Allow: 'POST' }).end(); return; }
    if (request.headers.origin !== undefined) { response.writeHead(403).end(); return; }

    const upstream = httpsRequest({ hostname: '127.0.0.1', port: workerPort, ca, method: 'POST',
      path: request.url, headers: select(request.headers, requestHeaders), agent: false }, result => {
      response.writeHead(result.statusCode || 503, select(result.headers, responseHeaders));
      result.on('error', () => response.destroy());
      result.pipe(response);
    });
    const timer = setTimeout(() => upstream.destroy(), 15000);
    response.once('close', () => { clearTimeout(timer); upstream.destroy(); });
    upstream.on('error', () => {
      if (response.headersSent) response.destroy();
      else response.writeHead(503).end();
    });
    request.on('error', () => upstream.destroy());
    request.pipe(upstream);
  });
}

export async function startKsk01Queue(env: NodeJS.ProcessEnv = process.env) {
  const configFile = env.KSK01_PAID_QUEUE_CONFIG;
  const caFile = env.KSK01_PAID_QUEUE_CA;
  const port = Number(env.KSK01_PAID_QUEUE_ORIGIN_PORT);
  if (!isAbsolute(configFile || '') || !isAbsolute(caFile || '') || !Number.isInteger(port) || port < 1024 || port > 65535)
    throw new Error('KSK01_QUEUE_ORIGIN_CONFIG_INVALID');
  const config = JSON.parse(readFileSync(configFile, 'utf8'));
  if (!Number.isInteger(config.port) || config.port < 1024 || config.port > 65535 || config.port === port)
    throw new Error('KSK01_QUEUE_WORKER_PORT_INVALID');

  const server = createKsk01QueueOrigin(config.tls, config.port, readFileSync(caFile, 'utf8'));
  server.headersTimeout = 10000;
  server.requestTimeout = 15000;
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '0.0.0.0', () => { server.removeListener('error', reject); resolve(); });
  });
  let worker: ChildProcess;
  try {
    worker = spawn('flock', ['--exclusive', '--nonblock', '--no-fork', lockPath,
      process.execPath, '/kiosk-web/apps/api/paid-queue-sqlite-main.js', '--config', configFile, '--require-writer-lock'],
      { cwd: '/kiosk-web', stdio: ['ignore', 'pipe', 'inherit'] });
  } catch (error) {
    server.close();
    throw error;
  }
  worker.on('error', () => console.error('KSK01_QUEUE_WORKER_START_FAILED'));
  worker.on('exit', code => console.error('KSK01_QUEUE_WORKER_EXIT', code));
  worker.stdout.pipe(process.stdout, { end: false });
  return { worker, server };
}
