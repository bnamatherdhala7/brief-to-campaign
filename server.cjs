// Local dev server — proxies /api/* calls so Vite can talk to Anthropic
// Run: node server.cjs
const http = require('http');
const https = require('https');
const url = require('url');

const PORT = 3001;

// Dynamically load .env
const fs = require('fs');
const path = require('path');
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const [k, ...v] = line.split('=');
    if (k && v.length) process.env[k.trim()] = v.join('=').trim();
  });
}

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

if (!ANTHROPIC_API_KEY) {
  console.error('ERROR: ANTHROPIC_API_KEY not set. Create a .env file.');
  process.exit(1);
}

http.createServer((req, res) => {
  // CORS for Vite dev server
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  if (req.method === 'POST' && req.url === '/api/agent') {
    let body = '';
    req.on('data', chunk => (body += chunk));
    req.on('end', () => {
      let parsed;
      try { parsed = JSON.parse(body); }
      catch { res.writeHead(400); res.end(JSON.stringify({ error: 'Bad JSON' })); return; }

      const { model, system, messages, max_tokens = 1024 } = parsed;

      const payload = JSON.stringify({ model, system, messages, max_tokens });

      const options = {
        hostname: 'api.anthropic.com',
        port: 443,
        path: '/v1/messages',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01',
          'x-api-key': ANTHROPIC_API_KEY,
          'Content-Length': Buffer.byteLength(payload),
        },
      };

      const apiReq = https.request(options, apiRes => {
        let data = '';
        apiRes.on('data', chunk => (data += chunk));
        apiRes.on('end', () => {
          res.writeHead(apiRes.statusCode, { 'Content-Type': 'application/json' });
          res.end(data);
        });
      });
      apiReq.on('error', err => {
        res.writeHead(500);
        res.end(JSON.stringify({ error: err.message }));
      });
      apiReq.write(payload);
      apiReq.end();
    });
  } else {
    res.writeHead(404);
    res.end(JSON.stringify({ error: 'Not found' }));
  }
}).listen(PORT, () => {
  console.log(`[dev server] listening on http://localhost:${PORT}`);
});
