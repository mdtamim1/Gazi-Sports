const { Client } = require('ssh2');

const conn = new Client();

console.log('🔌 Connecting to VPS server 159.198.36.84 via SSH to install sharp binary...');

conn.on('ready', () => {
  console.log('✅ SSH Connection Established successfully!');
  
  const cmd = 'cd /var/www/gazisports && npm install @img/sharp-linux-x64@0.33.5 sharp@0.33.5 --save-exact && node -e "const sharp = require(\'sharp\'); console.log(\'Sharp version:\', sharp.versions);"';
  
  conn.exec(cmd, (err, stream) => {
    if (err) {
      console.error('❌ SSH Command Error:', err);
      conn.end();
      return;
    }
    
    let output = '';
    stream.on('close', (code, signal) => {
      console.log(`\n📋 Installation Output:\n${output}`);
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
