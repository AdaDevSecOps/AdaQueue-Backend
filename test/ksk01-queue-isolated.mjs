import assert from 'node:assert/strict';
import { createHash, generateKeyPairSync, randomBytes, randomUUID, sign } from 'node:crypto';
import { accessSync, chmodSync, chownSync, constants, mkdirSync, mkdtempSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { request } from 'node:https';
import { createRequire } from 'node:module';
import { once } from 'node:events';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { DatabaseSync } from 'node:sqlite';
import { fiscalHash, fiscalJson } from '/kiosk-web/apps/local/paid-fiscal.js';
import { verifyPaidQueueReceipt } from '/kiosk-web/apps/local/paid-queue-receipt-proof.js';
import { verifyPaidQueueState } from '/kiosk-web/apps/local/paid-queue-state-proof.js';

const scope = { kioskId: 'KSK-TRIAL-01', agencyCode: '00007', branchCode: '00012', posCode: '00016' };
const { kioskId: _kioskId, ...numericScope } = scope;
const stateDir = mkdtempSync('/tmp/adaqueue-ksk01-');
const path = name => join(stateDir, name);
const sha = v => createHash('sha256').update(v).digest('hex');
const pem = key => key.export({ type: key.type === 'private' ? 'pkcs8' : 'spki', format: 'pem' });
const signWith = (prefix, payload, key) => sign(null, Buffer.from(prefix + fiscalJson(payload)), key).toString('base64url');
const receiptKeys = generateKeyPairSync('ed25519'), commitKeys = generateKeyPairSync('ed25519');
const reviewKeys = generateKeyPairSync('ed25519');
const token = randomBytes(32).toString('base64url'), kitchen = randomBytes(32).toString('base64url');
const staffToken = randomBytes(32).toString('base64url');
const namespace = 'POS00016-';
const destination = { baseUrl: 'https://127.0.0.1:3262/', profileId: 'KSK01-QUEUE-QA' };
const tls = { cert: readFileSync('/qa/cert.pem', 'utf8'), key: readFileSync('/qa/key.pem', 'utf8') };

const lockdir = '/run/kiosk-paid-queue-locks';
const policy = '/etc/kiosk-paid/queue-lock-identity';
mkdirSync(lockdir, { recursive: true, mode: 0o700 });
mkdirSync(policy, { recursive: true, mode: 0o755 });
chownSync(lockdir, 1000, 1000);
const lock = join(lockdir, '00007_00012_00016.lock');
writeFileSync(lock, '', { flag: 'wx', mode: 0o600 });
chownSync(lock, 1000, 1000);
const stat = statSync(lock, { bigint: true });
writeFileSync(join(policy, '00007_00012_00016.json'), JSON.stringify({ version: 1, scope: numericScope,
  device: String(stat.dev), inode: String(stat.ino) }), { mode: 0o644 });
chownSync(stateDir, 1000, 1000);
process.setgid(1000);
process.setuid(1000);
accessSync('/adaqueue/dist/ksk01-queue-entry.js', constants.R_OK);
accessSync('/adaqueue/dist/main.js', constants.R_OK);
const { startKsk01Queue } = createRequire(import.meta.url)('/adaqueue/dist/ksk01-queue.js');

const database = path('queue.sqlite');
const seed = new DatabaseSync(database);
seed.exec(readFileSync('/qa/schema.sql', 'utf8'));
seed.prepare('INSERT INTO paid_queue_config VALUES(1,?,0,?,?,?,?,?,7,0)').run(randomUUID(), ...Object.values(scope), namespace);
seed.close();
chmodSync(database, 0o600);
writeFileSync(path('ca.pem'), tls.cert, { mode: 0o600 });
const config = { port: 3262, database, tls, namespace, approvalFile: path('approval.json'),
  manualReview: { publicKey: pem(reviewKeys.publicKey), sourceId: 'QUEUE-QA-REVIEW' },
  service: { accessTokenSha256: sha(token), issuerId: 'QUEUE-QA', privateKey: pem(receiptKeys.privateKey),
    trust: { publicKey: pem(commitKeys.publicKey), issuerId: 'KIOSK-QA', scope, destination },
    actorAuth: { baseUrl: 'http://127.0.0.1:3219/', users: [{ code: '003', role: 'Staff', permissions: ['QUEUE_COMPLETE'] }],
      service: { id: 'QA-KITCHEN', tokenSha256: sha(kitchen), validFrom: Date.now()-60000, validUntil: Date.now()+600000, enabled: true } } } };
writeFileSync(path('queue.json'), JSON.stringify(config), { mode: 0o600 });
const kds = createServer((req, res) => {
  if (req.url !== '/auth/session' || req.headers.authorization !== 'Bearer ' + staffToken) { res.writeHead(401).end(); return; }
  res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({ success: true,
    exp: Math.floor(Date.now()/1000)+300, user: { code: '003', name: 'QA Staff', role: 'Staff' } }));
});
kds.listen(3219, '127.0.0.1');
await once(kds, 'listening');
const { worker, server } = await startKsk01Queue({ KSK01_PAID_QUEUE_CONFIG: path('queue.json'),
  KSK01_PAID_QUEUE_CA: path('ca.pem'), KSK01_PAID_QUEUE_ORIGIN_PORT: '3273' });
let output = '';
worker.stdout.setEncoding('utf8').on('data', bytes => { output += bytes; });

async function waitForLine(match) {
  for (let i=0;i<70;i++) {
    const line = output.split('\n').find(match);
    if (line) return line;
    if (worker.exitCode !== null) break;
    await delay(100);
  }
  throw new Error('QUEUE_QA_WORKER_NOT_READY');
}

function send(action, body, actor, method = 'POST') {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = request({ hostname: '127.0.0.1', port: 3273, method, ca: tls.cert,
      path: '/internal/paid-queue/v1/' + action, headers: { Authorization: 'Bearer ' + token,
        'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data),
        ...(actor ? { 'X-Queue-Actor-Authorization': actor } : {}) } }, result => {
      const chunks = [];
      result.on('data', chunk => chunks.push(chunk));
      result.on('end', () => { const text=Buffer.concat(chunks).toString();
        resolve({ status: result.statusCode, body: text && JSON.parse(text) }); });
    });
    req.on('error', reject).end(data);
  });
}

try {
  const review = JSON.parse(await waitForLine(line => line.startsWith('{"status":"LOCKED",'))).review;
  assert.equal((await send('readiness', {})).status, 503);
  assert.equal((await send('readiness', {}, undefined, 'GET')).status, 405);
  assert.equal((await send('unsupported', {})).status, 404);
  const issuedAt = Date.now();
  const receipt = { version: 1, sourceId: config.manualReview.sourceId, ...review, reviewId: randomUUID(),
    issuedAt, expiresAt: issuedAt + 60000, inventoryDigest: fiscalHash(review),
    acknowledgement: 'MANUAL_REVIEW_KNOWN_UNKNOWN_REFERENCES_HELD' };
  writeFileSync(config.approvalFile, JSON.stringify({ receipt,
    signature: signWith('ADA-KIOSK-MANUAL-REVIEW-1\n', receipt, reviewKeys.privateKey) }), { mode: 0o600 });
  worker.kill('SIGUSR1');
  await waitForLine(line => line === 'PAID_QUEUE_WITNESS_ACCEPTED');
  assert.equal((await send('readiness', {})).status, 204);
  const billId = randomUUID();
  const proof = { version: 1, issuerId: 'KIOSK-QA', idempotencyKey: 'QUEUE:' + billId, billId,
    attemptId: randomUUID(), ...scope, documentNo: 'QA-QUEUE-00016', businessDate: '2026-11-15', amountMinor: 100,
    snapshotHash: 'a'.repeat(64), payloadHash: 'b'.repeat(64), requestHash: 'c'.repeat(64),
    paymentReferenceHash: 'd'.repeat(64), destination };
  const commit = { proof, signature: signWith('AdaFB-Kiosk/PaidQueueCommit/1\n', proof, commitKeys.privateKey) };
  const trust = { issuerId: 'QUEUE-QA', publicKey: pem(receiptKeys.publicKey), requestProof: proof };
  const get = async (action, payload, actor) => {
    const result = await send(action, payload, actor);
    assert.equal(result.status, 200, JSON.stringify(result.body));
    return result.body;
  };
  const queue = verifyPaidQueueReceipt(await get('allocate', commit), trust).queueCode;
  for (let i=0;i<3;i++) assert.equal(verifyPaidQueueReceipt(await get('allocate', commit), trust).queueCode, queue);
  assert.equal(verifyPaidQueueReceipt(await get('read', commit), trust).queueCode, queue);
  const status = async expected => {
    const result = verifyPaidQueueState(await get('status', commit), trust);
    assert.equal(result.queueCode, queue);
    assert.equal(result.state, expected);
  };
  await status('WAIT_FOOD');
  assert.equal((await send('transition', { commit, target: 'READY' })).status, 403);
  assert.equal(verifyPaidQueueState(await get('transition', { commit, target:'READY' }, 'Service '+kitchen), trust).state, 'READY');
  await status('READY');
  assert.equal((await send('transition', { commit, target:'COMPLETED' }, 'Service '+kitchen)).status, 403);
  assert.equal(verifyPaidQueueState(await get('transition', { commit, target:'COMPLETED' }, 'Bearer '+staffToken), trust).state, 'COMPLETED');
  await status('COMPLETED');
  const check = new DatabaseSync(database, { readOnly: true });
  assert.equal(check.prepare('SELECT COUNT(*) AS count FROM paid_queue_record').get().count, 1);
  assert.equal(check.prepare('SELECT last_number FROM paid_queue_config WHERE id=1').get().last_number, 1);
  check.close();
  console.log(JSON.stringify({ syntheticBill:proof.documentNo, queue, duplicateSubmissions:3, readVerified:true,
    states:['WAIT_FOOD','READY','COMPLETED'], sqliteRows:1, signaturesVerified:true, realPayment:false }));
} finally {
  server.close();
  kds.close();
  if (worker.exitCode === null) { worker.kill('SIGTERM'); await once(worker, 'exit'); }
}
