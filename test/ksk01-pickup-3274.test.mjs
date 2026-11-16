import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { once } from 'node:events';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createServer, request as plainRequest } from 'node:http';
import { createServer as createTlsServer, request } from 'node:https';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, test } from 'node:test';
import { setTimeout as delay } from 'node:timers/promises';

const host = '127.0.0.1';
const prefix = '/internal/pickup/';
const numbering = '/internal/kiosk/shared-document/';
const billId = '91f73e53-512a-401a-a6d1-2241850f7b76';
const token = 'Bearer synthetic-pickup-staff';
const numberingToken = 'Bearer ' + 'q'.repeat(43);
const calls = [];
const numberingCalls = [];
let state = 'READY';
let folder, worker, authority, child, port, ca;

async function listen(server, targetPort = 0) {
  server.listen(targetPort, host);
  await once(server, 'listening');
  return server.address().port;
}

function send(path, { method = 'GET', body, headers = {}, trusted = true, transport = request } = {}) {
  return new Promise((resolve, reject) => {
    const req = transport({ host, port, path, method, agent: false, ca: trusted ? ca : undefined,
      signal: AbortSignal.timeout(3000), headers: { ...headers, ...(body === undefined ? {} : {
        'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body),
      }) } }, res => {
      let text = '';
      res.setEncoding('utf8').on('data', chunk => { text += chunk; });
      res.on('error', reject);
      res.on('end', () => resolve({ status: res.statusCode, body: text, headers: res.headers }));
    });
    req.on('error', reject).end(body);
  });
}

before(async () => {
  folder = mkdtempSync(join(tmpdir(), 'ksk01-pickup-3274-'));
  const key = join(folder, 'key.pem');
  const cert = join(folder, 'server.pem');
  const password = randomBytes(24).toString('hex');
  const openssl = args => execFileSync('openssl', args, { stdio: 'pipe' });
  openssl(['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '1', '-subj', '/CN=KSK01 QA',
    '-addext', 'subjectAltName=IP:' + host, '-keyout', key, '-out', cert]);
  openssl(['pkcs12', '-export', '-inkey', key, '-in', cert, '-out', join(folder, 'server.pfx'),
    '-passout', 'pass:' + password]);
  ca = readFileSync(cert, 'utf8');
  writeFileSync(join(folder, 'server.pass'), password);
  const origin = join(folder, 'https-origin.cjs');
  copyFileSync(new URL('../ops/ksk01-pickup-3274/https-origin.cjs', import.meta.url), origin);

  const appData = join(folder, 'appdata');
  const provision = join(appData, 'com.adasoft.croissant-kiosk', 'paid');
  mkdirSync(provision, { recursive: true });
  writeFileSync(join(provision, 'checkout.json'), JSON.stringify({ provision: { factory: { sharedAuthority: {
    reserveUrl: 'https://127.0.0.1:3261' + numbering + 'reserve', tlsCertificate: ca,
  } } } }));
  authority = createTlsServer({ key: readFileSync(key), cert: ca }, async (req, res) => {
    let body = '';
    req.setEncoding('utf8');
    for await (const chunk of req) body += chunk;
    numberingCalls.push({ path: req.url, method: req.method, authorization: req.headers.authorization,
      cloudflareSecret: req.headers['cf-access-client-secret'], body });
    if (req.headers.authorization !== numberingToken) {
      res.writeHead(401, { 'WWW-Authenticate': 'Bearer' }).end();
    } else if (req.url === numbering + 'readiness') {
      res.writeHead(204).end();
    } else {
      res.writeHead(200, { 'Content-Type': 'application/json' }).end(body);
    }
  });
  await listen(authority, 3261);

  worker = createServer(async (req, res) => {
    let body = '';
    req.setEncoding('utf8');
    for await (const chunk of req) body += chunk;
    calls.push({ path: req.url, method: req.method, authorization: req.headers.authorization, body });
    if (req.headers.authorization !== token) {
      res.writeHead(401, { 'content-type': 'application/json' }).end('{"code":"CNDOC_PICKUP_UNAUTHORIZED"}');
      return;
    }
    if (req.url === prefix + 'complete' && body === JSON.stringify({ billId })) state = 'COMPLETED';
    res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify({ billId, queueCode: '0012', state }));
  });
  const upstream = await listen(worker);
  const reservation = createServer();
  port = await listen(reservation);
  await new Promise(resolve => reservation.close(resolve));
  child = spawn(process.execPath, [origin, String(upstream), String(port)], {
    stdio: 'ignore', env: { ...process.env, APPDATA: appData },
  });
  for (let attempt = 0; attempt < 50; attempt++) {
    if (child.exitCode !== null) break;
    try {
      if ((await send('/unmounted')).status === 404) return;
    } catch (error) {
      if (error.code !== 'ECONNREFUSED') throw error;
    }
    await delay(60);
  }
  throw Error('Pickup HTTPS origin did not start');
});

after(async () => {
  if (child && child.exitCode === null && child.signalCode === null) {
    const exited = once(child, 'exit');
    child.kill();
    await exited;
  }
  if (worker?.listening) await new Promise(resolve => worker.close(resolve));
  if (authority?.listening) await new Promise(resolve => authority.close(resolve));
  if (folder) rmSync(folder, { recursive: true, force: true });
});

test('reads mock queue 0012 over verified TLS and keeps it completed on three repeat reads', async () => {
  const headers = { Authorization: token };
  const first = await send(prefix + 'snapshot', { headers });
  assert.equal(first.status, 200);
  assert.deepEqual(JSON.parse(first.body), { billId, queueCode: '0012', state: 'READY' });
  const body = JSON.stringify({ billId });
  const complete = await send(prefix + 'complete', { method: 'POST', body, headers });
  assert.equal(complete.status, 200);
  assert.deepEqual(JSON.parse(complete.body), { billId, queueCode: '0012', state: 'COMPLETED' });
  for (let i = 0; i < 3; i++) {
    const read = await send(prefix + 'queues/' + billId, { headers });
    assert.equal(read.status, 200);
    assert.deepEqual(JSON.parse(read.body), { billId, queueCode: '0012', state: 'COMPLETED' });
  }
  assert.deepEqual(calls.filter(c => c.method === 'POST'),
    [{ path: prefix + 'complete', method: 'POST', authorization: token, body }]);
});

test('preserves authentication errors and blocks paths and methods outside the pickup API', async () => {
  const blocked = await send(prefix + 'snapshot');
  assert.equal(blocked.status, 401);
  assert.deepEqual(JSON.parse(blocked.body), { code: 'CNDOC_PICKUP_UNAUTHORIZED' });
  assert.equal(blocked.headers['cache-control'], 'no-store');
  const beforeCount = calls.length;
  assert.equal((await send(prefix + 'complete')).status, 404);
  assert.equal((await send(prefix + 'queues/not-a-bill')).status, 404);
  assert.equal((await send(prefix + 'snapshot', { headers: { Origin: 'https://example.invalid' } })).status, 404);
  assert.equal(calls.length, beforeCount);
});

test('rejects plaintext HTTP and certificates outside the trusted CA', async () => {
  const beforeCount = calls.length;
  await assert.rejects(send(prefix + 'snapshot', { transport: plainRequest }), { code: 'ECONNRESET' });
  await assert.rejects(send(prefix + 'snapshot', { trusted: false }), { code: 'DEPTH_ZERO_SELF_SIGNED_CERT' });
  assert.equal(calls.length, beforeCount);
});

test('forwards the three numbering operations over TLS without sending them to Pickup', async () => {
  const pickupCount = calls.length;
  const body = '{"fixture":"numbering"}';
  const headers = { Authorization: numberingToken, 'CF-Access-Client-Secret': 'fixture-only' };
  for (const action of ['reserve', 'lookup', 'readiness']) {
    const result = await send(numbering + action, { method: 'POST', body, headers });
    assert.equal(result.status, action === 'readiness' ? 204 : 200);
    assert.equal(result.body, action === 'readiness' ? '' : body);
    assert.deepEqual(numberingCalls.at(-1), {
      path: numbering + action, method: 'POST', authorization: numberingToken, cloudflareSecret: undefined, body,
    });
  }
  assert.equal(calls.length, pickupCount);
});

test('blocks numbering recovery, invalid bodies and Pickup credentials on the shared port', async () => {
  const beforeCount = numberingCalls.length;
  const headers = { Authorization: numberingToken }, body = '{}';
  const post = { method: 'POST', body, headers };
  assert.equal((await send(numbering + 'recovery-lookup', post)).status, 404);
  assert.equal((await send(numbering + 'lookup?extra=1', post)).status, 404);
  assert.equal((await send(numbering + 'lookup', { headers })).status, 404);
  assert.equal((await send(numbering + 'lookup', { ...post, headers: { ...headers, Origin: 'https://example.invalid' } })).status, 404);
  assert.equal((await send(numbering + 'lookup', { ...post, headers: { Authorization: token } })).status, 401);
  assert.equal((await send(numbering + 'reserve', { ...post, body: undefined })).status, 400);
  assert.equal((await send(numbering + 'reserve', { ...post, body: 'x'.repeat(8193) })).status, 413);
  assert.equal((await send(numbering + 'reserve', { ...post, headers: { ...headers, 'Content-Encoding': 'gzip' } })).status, 415);
  assert.equal(numberingCalls.length, beforeCount);
  const wrongBearer = await send(numbering + 'lookup', { ...post, headers: { Authorization: 'Bearer ' + 'w'.repeat(43) } });
  assert.equal(wrongBearer.status, 401);
  assert.equal(wrongBearer.headers['www-authenticate'], 'Bearer');
  assert.equal(numberingCalls.length, beforeCount + 1);
});
