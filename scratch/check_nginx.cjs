const { Client } = require('ssh2');

const conn = new Client();

conn.on('ready', () => {
  // Check nginx config and test the API directly
  const cmd = `
    echo "=== NGINX CONFIG ===" && cat /etc/nginx/sites-enabled/gazisports24.com 2>/dev/null || cat /etc/nginx/sites-enabled/default 2>/dev/null || ls /etc/nginx/sites-enabled/ &&
    echo "=== TEST API DIRECT ===" && curl -s http://localhost:5000/api/v1/products | head -c 200 &&
    echo "=== PM2 STATUS ===" && pm2 list &&
    echo "=== NGINX STATUS ===" && systemctl status nginx | head -20
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
