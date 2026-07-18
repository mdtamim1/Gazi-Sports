const { Client } = require('ssh2');

const conn = new Client();

conn.on('ready', () => {
  // Find all nginx config files and check which one is actually being used
  const cmd = `
    echo "=== ALL SITES-ENABLED FILES ===" && ls -la /etc/nginx/sites-enabled/ &&
    echo "=== ALL SITES-AVAILABLE FILES ===" && ls -la /etc/nginx/sites-available/ &&
    echo "=== FULL NGINX CONF ===" && nginx -T 2>&1 | grep -A 30 "server_name gazisports24" | head -60 &&
    echo "=== TEST API THROUGH NGINX ===" && curl -s "https://gazisports24.com/api/v1/products" | head -c 300
  `;
  
  conn.exec(cmd, (err, stream) => {
    if (err) { console.error('❌ Error:', err); conn.end(); return; }
    stream.on('close', (code) => {
      console.log(`\nExit code: ${code}`);
      conn.end();
    }).on('data', (data) => {
      console.log(data.toString());
    }).stderr.on('data', (data) => {
      console.log('STDERR:', data.toString());
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
