const { Client } = require('ssh2');

const conn = new Client();

console.log('🔌 Connecting to VPS server 159.198.36.84 via SSH...');

conn.on('ready', () => {
  console.log('✅ SSH Connection Established successfully!');
  console.log('🚀 Executing deployment commands on /var/www/gazisports...');
  
  const cmd = 'cd /var/www/gazisports && git stash && git pull origin master && npm install && npm run build && pm2 restart all';
  
  conn.exec(cmd, (err, stream) => {
    if (err) {
      console.error('❌ SSH Command Error:', err);
      conn.end();
      return;
    }
    
    stream.on('close', (code, signal) => {
      console.log(`\n🎉 Remote Command Finished with exit code: ${code}`);
      conn.end();
    }).on('data', (data) => {
      console.log(data.toString().trim());
    }).stderr.on('data', (data) => {
      console.log(data.toString().trim());
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
