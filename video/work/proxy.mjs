// Local unauthenticated forward proxy for headless Chromium (VM tooling only).
// Chromium in this VM cannot use the authenticated egress proxy directly
// (ERR_TUNNEL_CONNECTION_FAILED / ERR_NO_SUPPORTED_PROXIES). This proxy
// listens on 127.0.0.1:18080 without auth and forwards CONNECT requests to
// the egress proxy from $https_proxy (credentials read from env at runtime,
// never written to disk). Not part of the deliverable; lives in video/work.
import http from 'node:http';
import net from 'node:net';

const upstream = new URL(process.env.https_proxy || process.env.HTTPS_PROXY || '');
const UP_HOST = upstream.hostname, UP_PORT = Number(upstream.port || 3128);
const UP_AUTH = 'Basic ' + Buffer.from(decodeURIComponent(upstream.username) + ':' + decodeURIComponent(upstream.password)).toString('base64');

const server = http.createServer((req, res) => {
  // Plain HTTP (absolute-form) forwarding.
  const target = new URL(req.url);
  const p = http.request({ host: target.hostname, port: target.port || 80, path: target.pathname + target.search, method: req.method, headers: { ...req.headers, host: target.host } }, (up) => { res.writeHead(up.statusCode, up.headers); up.pipe(res); });
  p.on('error', (e) => { res.writeHead(502); res.end('proxy error: ' + e.message); });
  req.pipe(p);
});
server.on('connect', (req, cltSocket, head) => {
  const [host, port] = req.url.split(':');
  const up = net.connect(UP_PORT, UP_HOST, () => {
    up.write(`CONNECT ${host}:${port} HTTP/1.1\r\nHost: ${host}:${port}\r\nProxy-Authorization: ${UP_AUTH}\r\nProxy-Connection: keep-alive\r\n\r\n`);
    let buf = Buffer.alloc(0);
    const onData = (chunk) => {
      buf = Buffer.concat([buf, chunk]);
      const idx = buf.indexOf('\r\n\r\n');
      if (idx === -1) return;
      const header = buf.slice(0, idx).toString();
      if (!/^HTTP\/1\.[01] 200/.test(header)) { cltSocket.end('HTTP/1.1 502 Bad Gateway\r\n\r\n'); up.destroy(); return; }
      up.off('data', onData);
      cltSocket.write('HTTP/1.1 200 Connection Established\r\n\r\n');
      if (buf.length > idx + 4) up.emit('data', buf.slice(idx + 4));
      up.pipe(cltSocket); cltSocket.pipe(up);
    };
    up.on('data', onData);
    up.on('error', () => cltSocket.end());
  });
  up.on('error', () => cltSocket.end());
  cltSocket.on('error', () => up.destroy());
});
server.listen(18080, '127.0.0.1', () => console.log('forward proxy on 127.0.0.1:18080 -> ' + UP_HOST + ':' + UP_PORT));
