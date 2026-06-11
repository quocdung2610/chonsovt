const http = require('http');
const https = require('https');
const PORT = 3000;

function proxyRequest(targetUrl, method, res) {
  const urlObj = new URL(targetUrl);
  const options = {
    hostname: urlObj.hostname,
    path: urlObj.pathname + urlObj.search,
    method: method || 'POST',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:151.0) Gecko/20100101 Firefox/151.0',
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
      'Accept-Encoding': 'gzip, deflate, br',
      'Origin': 'https://viettel.vn',
      'Referer': 'https://viettel.vn/',
      'Connection': 'keep-alive',
      'Sec-Fetch-Dest': 'empty',
      'Sec-Fetch-Mode': 'cors',
      'Sec-Fetch-Site': 'same-site',
      'Content-Length': '0',
    }
  };

  const req = https.request(options, (apiRes) => {
    let chunks = [];
    apiRes.on('data', chunk => chunks.push(chunk));
    apiRes.on('end', () => {
      const buf = Buffer.concat(chunks);
      // Decompress nếu cần
      const zlib = require('zlib');
      const enc = apiRes.headers['content-encoding'] || '';
      const decompress = enc.includes('gzip') ? zlib.gunzip :
                         enc.includes('deflate') ? zlib.inflate :
                         enc.includes('br') ? zlib.brotliDecompress : null;
      const done = (data) => {
        res.writeHead(200, {
          'Content-Type': 'application/json; charset=utf-8',
          'Access-Control-Allow-Origin': '*',
        });
        res.end(data.toString('utf-8'));
      };
      if (decompress) decompress(buf, (err, data) => done(err ? buf : data));
      else done(buf);
    });
  });

  req.on('error', (e) => {
    res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify({ errorCode: 1, message: e.message }));
  });
  req.end();
}

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  const url = new URL(req.url, `http://localhost:${PORT}`);
  const carrier = url.searchParams.get('carrier') || 'vnpt';
  const search  = url.searchParams.get('search')  || '';
  const prefix  = url.searchParams.get('prefix')  || '';
  const commit  = url.searchParams.get('commit')  || '0';
  const page    = url.searchParams.get('page')    || '1';

  let targetUrl, method;

  if (carrier === 'viettel') {
    // Không cần token — chỉ cần đúng headers + POST
    targetUrl = `https://apigami.viettel.vn/mvt-api/myviettel.php/omiSearchSimV2?isdn_type=22&page_type=&page=${page}&page_size=45&key_search=${encodeURIComponent(search)}&total_record=1&captcha=&sid=`;
    method = 'POST';
  } else {
    // VNPT
    targetUrl = `https://digishop.vnpt.vn/apiprod/v2/simso/num_search?search=${encodeURIComponent(search)}&prefix=${encodeURIComponent(prefix)}&commit=${commit}`;
    method = 'GET';
  }

  console.log(`[${new Date().toLocaleTimeString('vi-VN')}] [${carrier.toUpperCase()}] ${method} ${targetUrl}`);
  proxyRequest(targetUrl, method, res);
});

server.listen(PORT, () => {
  console.log('');
  console.log('  ╔══════════════════════════════════════════════╗');
  console.log('  ║   VNPT + Viettel SIM Hunter Proxy v3.0       ║');
  console.log('  ║   http://localhost:' + PORT + '                      ║');
  console.log('  ║   Viettel: không cần token!                  ║');
  console.log('  ╚══════════════════════════════════════════════╝');
  console.log('');
  console.log('  Nhấn Ctrl+C để dừng.');
  console.log('');
});
