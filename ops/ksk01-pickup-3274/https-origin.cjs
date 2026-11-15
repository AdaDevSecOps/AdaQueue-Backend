const { readFileSync } = require('node:fs');
const { createServer } = require('node:https');
const { request } = require('node:http');
const { join } = require('node:path');

const upstream = Number(process.argv[2]);
const port = Number(process.argv[3] ?? 3274);
if (![upstream, port].every(n => Number.isInteger(n) && n > 1023 && n < 65536) || upstream === port) process.exit(2);

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
  if ((!read && !complete) || req.headers.origin !== undefined) {
    res.writeHead(404, { 'cache-control': 'no-store' }).end();
    return;
  }
  const headers = {};
  for (const key of ['authorization', 'content-type', 'content-length', 'accept']) {
    if (req.headers[key] !== undefined) headers[key] = req.headers[key];
  }
  const proxy = request({ hostname: '127.0.0.1', port: upstream, path: req.url, method: req.method, headers }, reply => {
    res.writeHead(reply.statusCode, {
      'content-type': reply.headers['content-type'] || 'application/json',
      'cache-control': 'no-store'
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
