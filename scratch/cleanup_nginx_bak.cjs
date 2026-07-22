const { Client } = require('ssh2');
const conn = new Client();

conn.on('ready', () => {
  const cmd = [
    // Remove leftover backup that causes duplicate server_name warnings
    'rm -f /etc/nginx/sites-enabled/gazisports24.com.bak',
    'ls /etc/nginx/sites-enabled/',
    'nginx -t',
    'systemctl reload nginx',
    'echo "✅ Clean! Nginx reloaded without warnings."',
  ].join(' && ');

  conn.exec(cmd, (err, stream) => {
    if (err) { console.error(err); conn.end(); return; }
    stream.on('close', () => conn.end())
      .on('data', d => process.stdout.write(d.toString()))
      .stderr.on('data', d => process.stdout.write(d.toString()));
  });
}).on('error', err => console.error(err))
  .connect({ host: '159.198.36.84', port: 22, username: 'root', password: 'g790QnH0s17QcVLywX', readyTimeout: 20000 });
