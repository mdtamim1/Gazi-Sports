const { Client } = require('ssh2');

const conn = new Client();

console.log('🔌 Connecting to VPS to install and configure Redis...');

conn.on('ready', () => {
  console.log('✅ SSH Connected!');

  const cmd = [
    // 1. Install Redis
    'apt-get update -qq',
    'apt-get install -y redis-server',

    // 2. Configure Redis: bind only localhost, set max memory & eviction policy
    "sed -i 's/^# maxmemory .*/maxmemory 128mb/' /etc/redis/redis.conf",
    "sed -i 's/^maxmemory .*/maxmemory 128mb/' /etc/redis/redis.conf",
    "sed -i 's/^# maxmemory-policy .*/maxmemory-policy allkeys-lru/' /etc/redis/redis.conf",
    "sed -i 's/^maxmemory-policy .*/maxmemory-policy allkeys-lru/' /etc/redis/redis.conf",

    // Ensure bind is only localhost (security)
    "sed -i 's/^bind .*/bind 127.0.0.1 -::1/' /etc/redis/redis.conf",

    // 3. Enable and (re)start Redis service
    'systemctl enable redis-server',
    'systemctl restart redis-server',

    // 4. Verify Redis is running
    'sleep 1',
    'systemctl is-active redis-server',
    'redis-cli ping',

    // 5. Check configured maxmemory
    "redis-cli config get maxmemory",
    "redis-cli config get maxmemory-policy",

    // 6. Restart the app to pick up Redis
    'cd /var/www/gazisports && pm2 restart gazi-sports-backend',
    'sleep 2',
    'pm2 status',
  ].join(' && ');

  conn.exec(cmd, (err, stream) => {
    if (err) {
      console.error('❌ SSH Command Error:', err);
      conn.end();
      return;
    }

    stream.on('close', (code) => {
      console.log(`\n🎉 Done! Exit code: ${code}`);
      conn.end();
    }).on('data', (data) => {
      process.stdout.write(data.toString());
    }).stderr.on('data', (data) => {
      process.stdout.write(data.toString());
    });
  });
}).on('error', (err) => {
  console.error('❌ SSH Error:', err);
}).connect({
  host: '159.198.36.84',
  port: 22,
  username: 'root',
  password: 'g790QnH0s17QcVLywX',
  readyTimeout: 30000
});
