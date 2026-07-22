const { Client } = require('ssh2');

const conn = new Client();

console.log('🔌 Connecting to VPS server 159.198.36.84 via SSH to check backend logs...');

conn.on('ready', () => {
  console.log('✅ SSH Connection Established successfully!');
  const cmd = 'pm2 status && curl -s -m 5 http://127.0.0.1:5000/api/v1/products | head -c 500 && echo "" && pm2 logs gazi-sports-backend --lines 40 --nostream';
  
  conn.exec(cmd, (err, stream) => {
    if (err) {
      console.error('❌ SSH Command Error:', err);
      conn.end();
      return;
    }
    
    let output = '';
    stream.on('close', (code, signal) => {
      console.log(`\n📋 VPS Logs & API Response:\n${output}`);
      conn.end();
    }).on('data', (data) => {
      output += data.toString();
    }).stderr.on('data', (data) => {
      output += data.toString();
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
