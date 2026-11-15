import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { createServer, request } from 'node:https';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, test } from 'node:test';
import { createKsk01QueueOrigin } from '../dist/ksk01-queue.js';

const host = '127.0.0.1';
const prefix = '/internal/paid-queue/v1/';
const payload = '{ "proof": "test", "target": "READY" }';
const seen = [];
let folder;
let worker;
let origin;
let untrustedOrigin;
let tls;

async function listen(server) {
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, host, resolve);
  });
}

before(async () => {
  folder = mkdtempSync(join(tmpdir(), 'adaqueue-origin-test-'));
  const key = join(folder, 'key.pem');
  const cert = join(folder, 'cert.pem');
  execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '1',
    '-subj', '/CN=localhost', '-addext', 'subjectAltName=IP:' + host, '-keyout', key, '-out', cert],
    { stdio: 'pipe' });
  tls = { key: readFileSync(key), cert: readFileSync(cert) };
  worker = createServer(tls, async (req, res) => {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    seen.push({ path: req.url, method: req.method, headers: req.headers, body: Buffer.concat(chunks).toString() });
    if (req.url === prefix + 'readiness') {
      res.writeHead(204).end();
      return;
    }
    res.writeHead(200, { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload),
      'X-Worker-Test': 'internal' }).end(payload);
  });
  await listen(worker);
  origin = createKsk01QueueOrigin(tls, worker.address().port, tls.cert);
  untrustedOrigin = createKsk01QueueOrigin(tls, worker.address().port);
  await listen(origin);
  await listen(untrustedOrigin);
});

after(async () => {
  for (const server of [origin, untrustedOrigin, worker]) {
    if (server?.listening) await new Promise(resolve => server.close(resolve));
  }
  if (folder) rmSync(folder, { recursive: true, force: true });
});

function call(server, path, { method = 'POST', headers = {} } = {}) {
  return new Promise((resolve, reject) => {
    const req = request({ hostname: host, port: server.address().port, ca: tls.cert, method,
      path, agent: false, headers: { 'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload), ...headers } }, res => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('error', reject);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers,
        body: Buffer.concat(chunks).toString() }));
    });
    req.setTimeout(4000, () => req.destroy(new Error('Queue origin test timed out')));
    req.on('error', reject);
    req.end(payload);
  });
}

test('forwards the five legacy POST routes with raw bodies and only approved headers', async () => {
  for (const action of ['allocate', 'read', 'readiness', 'status', 'transition']) {
    const path = prefix + action;
    const response = await call(origin, path, { headers: {
      Authorization: 'Bearer test-queue',
      'X-Queue-Actor-Authorization': 'Service test-kitchen',
      'X-Extra-Test': 'do-not-forward',
    } });
    const ready = action === 'readiness';
    assert.equal(response.status, ready ? 204 : 200);
    assert.equal(response.body, ready ? '' : payload);
    assert.equal(response.headers['cache-control'], 'no-store');
    assert.equal(response.headers['x-worker-test'], undefined);
    const last = seen.at(-1);
    assert.equal(last.path, path);
    assert.equal(last.method, 'POST');
    assert.equal(last.body, payload);
    assert.equal(last.headers.authorization, 'Bearer test-queue');
    assert.equal(last.headers['x-queue-actor-authorization'], 'Service test-kitchen');
    assert.equal(last.headers['x-extra-test'], undefined);
  }
  assert.equal(seen.length, 5);
});

test('rejects unknown routes, incorrect methods and browser origins before forwarding', async () => {
  const beforeCount = seen.length;
  assert.equal((await call(origin, prefix + 'unknown')).status, 404);
  assert.equal((await call(origin, prefix + 'read?extra=1')).status, 404);
  const wrongMethod = await call(origin, prefix + 'read', { method: 'GET' });
  assert.equal(wrongMethod.status, 405);
  assert.equal(wrongMethod.headers.allow, 'POST');
  assert.equal((await call(origin, prefix + 'read', { headers: { Origin: 'https://example.invalid' } })).status, 403);
  assert.equal(seen.length, beforeCount);
});

test('returns unavailable when the worker TLS certificate is untrusted', async () => {
  const beforeCount = seen.length;
  assert.equal((await call(untrustedOrigin, prefix + 'read')).status, 503);
  assert.equal(seen.length, beforeCount);
});
