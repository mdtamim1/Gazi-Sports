const { Client } = require('ssh2');
const conn = new Client();

console.log('🔍 Checking current Nginx and DNS configuration...');

conn.on('ready', () => {
  const cmd = [
    // Check Nginx sites
    'echo "=== NGINX SITES ==="',
    'ls /etc/nginx/sites-enabled/',
    'echo ""',
    // Show main site config
    'echo "=== SITE CONFIG ==="',
    'cat /etc/nginx/sites-enabled/gazisports 2>/dev/null || cat /etc/nginx/sites-enabled/default 2>/dev/null || ls /etc/nginx/sites-enabled/',
    'echo ""',
    // Check what's listening
    'echo "=== LISTENING PORTS ==="',
    'ss -tlnp | grep -E "80|443|5000"',
    'echo ""',
    // Check domain DNS
    'echo "=== DNS CHECK ==="',
    'nslookup gazisports24.com 2>/dev/null || dig gazisports24.com +short 2>/dev/null',
    'echo ""',
    // Check SSL
    'echo "=== SSL CERT ==="',
    'ls /etc/letsencrypt/live/ 2>/dev/null || echo "No letsencrypt certs found"',
  ].join(' && ');

  conn.exec(cmd, (err, stream) => {
    if (err) { console.error(err); conn.end(); return; }
    stream.on('close', () => conn.end())
      .on('data', d => process.stdout.write(d.toString()))
      .stderr.on('data', d => process.stdout.write(d.toString()));
  });
}).on('error', err => console.error(err))
  .connect({
    host: '159.198.36.84', port: 22,
    username: 'root', password: 'g790QnH0s17QcVLywX',
    readyTimeout: 20000
  });
