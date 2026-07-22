const { Client } = require('ssh2');

const conn = new Client();

console.log('🔌 Connecting to VPS server 159.198.36.84 via SSH to check CLI image tools...');

conn.on('ready', () => {
  console.log('✅ SSH Connection Established successfully!');
  const cmd = 'which convert || which cwebp || which ffmpeg || node -e "console.log(process.platform)"';
  
  conn.exec(cmd, (err, stream) => {
    if (err) {
      console.error('❌ SSH Command Error:', err);
      conn.end();
      return;
    }
    
    let output = '';
    stream.on('close', (code, signal) => {
      console.log(`\n📋 Tools Check Output:\n${output}`);
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
