const { Client } = require('ssh2');

const conn = new Client();

console.log('🔌 Connecting to VPS server 159.198.36.84 via SSH to enable Nginx Gzip compression...');

conn.on('ready', () => {
  console.log('✅ SSH Connection Established successfully!');
  
  const remoteScript = `
    sed -i 's/# gzip_vary on;/gzip_vary on;/g' /etc/nginx/nginx.conf
    sed -i 's/# gzip_proxied any;/gzip_proxied any;/g' /etc/nginx/nginx.conf
    sed -i 's/# gzip_comp_level 6;/gzip_comp_level 6;/g' /etc/nginx/nginx.conf
    sed -i 's/# gzip_types/gzip_types/g' /etc/nginx/nginx.conf
    nginx -t && systemctl reload nginx
  `;
  
  conn.exec(remoteScript, (err, stream) => {
    if (err) {
      console.error('❌ SSH Command Error:', err);
      conn.end();
      return;
    }
    
    let output = '';
    stream.on('close', (code, signal) => {
      console.log(`\n📋 Nginx Gzip Activation Result (code ${code}):\n${output}`);
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
