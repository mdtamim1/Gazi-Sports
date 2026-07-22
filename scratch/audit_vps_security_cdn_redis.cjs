const { Client } = require('ssh2');

const conn = new Client();

console.log('🔍 Starting Comprehensive Audit of CDN, Redis, Security & Backend...\n');

conn.on('ready', () => {
  const cmd = [
    'echo "=== 1. REDIS STATUS & SECURITY ==="',
    'systemctl is-active redis-server',
    'redis-cli ping',
    'echo "Redis Bind Address:"',
    'redis-cli config get bind',
    'echo "Redis Max Memory:"',
    'redis-cli config get maxmemory',
    'echo "Redis Eviction Policy:"',
    'redis-cli config get maxmemory-policy',
    'echo "Redis Key Count:"',
    'redis-cli dbsize',
    'echo ""',

    'echo "=== 2. LISTENING PORTS & EXPOSED SERVICES ==="',
    'ss -tlnp',
    'echo ""',

    'echo "=== 3. NGINX SYNTAX & CONFIG TEST ==="',
    'nginx -t',
    'echo ""',

    'echo "=== 4. BACKEND PM2 LOGS (REDIS & CACHE) ==="',
    'pm2 status',
    'pm2 logs gazi-sports-backend --lines 25 --nostream',
    'echo ""',

    'echo "=== 5. LIVE HTTP RESPONSE FROM BACKEND API ==="',
    'curl -sI http://127.0.0.1:5000/api/products | head -n 15',
  ].join(' && ');

  conn.exec(cmd, (err, stream) => {
    if (err) {
      console.error('❌ SSH Exec Error:', err);
      conn.end();
      return;
    }

    stream.on('close', (code) => {
      console.log(`\n✅ Audit script finished with exit code ${code}`);
      conn.end();
    }).on('data', (d) => {
      process.stdout.write(d.toString());
    }).stderr.on('data', (d) => {
      process.stdout.write(d.toString());
    });
  });
}).on('error', (err) => {
  console.error('❌ SSH Connection Error:', err);
}).connect({
  host: '159.198.36.84',
  port: 22,
  username: 'root',
  password: 'g790QnH0s17QcVLywX',
  readyTimeout: 30000
});
