const { readFileSync } = require('node:fs');
const { createServer, request: httpsRequest } = require('node:https');
const { request } = require('node:http');
const { X509Certificate } = require('node:crypto');
const { checkServerIdentity } = require('node:tls');
const { join } = require('node:path');

const upstream = Number(process.argv[2]);
const port = Number(process.argv[3] ?? 3274);
if (![upstream, port].every(n => Number.isInteger(n) && n > 1023 && n < 65536) || upstream === port) process.exit(2);

const provision = join(process.env.APPDATA, 'com.adasoft.croissant-kiosk', 'paid', 'checkout.json');
const options = {
  pfx: readFileSync(join(__dirname, 'server.pfx')),
  passphrase: readFileSync(join(__dirname, 'server.pass'), 'utf8').trim(),
  minVersion: 'TLSv1.2'
};
const server = createServer(options, (req, res) => {
  const read = req.method === 'GET' && (
    req.url === '/internal/pickup/snapshot' ||
    /^\/internal\/pickup\/queues\/[a-f0-9-]{36}$/.test(req.url));
  const complete = req.method === 'POST' && req.url === '/internal/pickup/complete';
  const numbering = req.method === 'POST' &&
    /^\/internal\/kiosk\/shared-document\/(reserve|lookup|readiness)$/.test(req.url);
  if ((!read && !complete && !numbering) || req.headers.origin !== undefined) {
    res.writeHead(404, { 'cache-control': 'no-store' }).end();
    return;
  }
  let authorityTls;
  if (numbering) {
    const reject = status => res.writeHead(status, { 'cache-control': 'no-store' }).end();
    if (!/^Bearer [A-Za-z0-9_-]{43,128}$/.test(req.headers.authorization ?? '')) return reject(401);
    const size = Number(req.headers['content-length']);
    if (!Number.isSafeInteger(size) || size < 1) return reject(400);
    if (size > 8192) return reject(413);
    if (req.headers['content-encoding'] !== undefined) return reject(415);
    try {
      const authority = JSON.parse(readFileSync(provision, 'utf8')).provision.factory.sharedAuthority;
      if (authority.reserveUrl !== 'https://127.0.0.1:3261/internal/kiosk/shared-document/reserve') return reject(503);
      const certificate = new X509Certificate(authority.tlsCertificate);
      if (!certificate.checkIP('127.0.0.1')) return reject(503);
      authorityTls = { ca: certificate.toString(), agent: false, minVersion: 'TLSv1.2',
        checkServerIdentity: (host, peer) => checkServerIdentity(host, peer) ??
          (peer.fingerprint256 === certificate.fingerprint256 ? undefined : Error('NUMBERING_TLS_PIN')) };
    } catch {
      return reject(503);
    }
  }
  const headers = {};
  for (const key of ['authorization', 'content-type', 'content-length', 'accept']) {
    if (req.headers[key] !== undefined) headers[key] = req.headers[key];
  }
  const forward = numbering ? httpsRequest : request;
  const proxy = forward({ hostname: '127.0.0.1', port: numbering ? 3261 : upstream,
    path: req.url, method: req.method, headers, ...authorityTls }, reply => {
    res.writeHead(reply.statusCode, {
      'content-type': reply.headers['content-type'] || 'application/json',
      'cache-control': 'no-store',
      ...(numbering && reply.headers['www-authenticate'] ? { 'www-authenticate': reply.headers['www-authenticate'] } : {}),
      ...(numbering && reply.headers['retry-after'] ? { 'retry-after': reply.headers['retry-after'] } : {})
    });
    reply.on('error', () => res.destroy());
    reply.pipe(res);
  });
  proxy.setTimeout(11000, () => proxy.destroy());
  proxy.on('error', () => {
    if (res.headersSent) return res.destroy();
    res.writeHead(502, { 'cache-control': 'no-store' }).end();
  });
  req.on('error', () => proxy.destroy());
  res.on('close', () => proxy.destroy());
  req.pipe(proxy);
});
server.headersTimeout = 5000;
server.requestTimeout = 12000;
server.listen(port, '127.0.0.1');
