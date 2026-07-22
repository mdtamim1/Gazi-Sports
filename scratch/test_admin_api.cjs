const { Client } = require('ssh2');
const conn = new Client();

conn.on('ready', () => {
  const cmd = [
    'echo "=== STOREFRONT SETTINGS ==="',
    'curl -s http://127.0.0.1:5000/api/v1/settings/storefront | head -c 200',
    'echo "\n"',
    'echo "=== CAMPAIGNS ==="',
    'curl -s http://127.0.0.1:5000/api/v1/marketing/campaigns | head -c 200',
    'echo "\n"',
    'echo "=== ORDERS ==="',
    'curl -s http://127.0.0.1:5000/api/v1/orders | head -c 200',
    'echo "\n"',
    'echo "=== SECURITY LOGS ==="',
    'curl -s http://127.0.0.1:5000/api/v1/security/logs | head -c 200',
    'echo "\n"',
  ].join(' && ');

  conn.exec(cmd, (err, stream) => {
    if (err) { console.error(err); conn.end(); return; }
    stream.on('close', () => conn.end())
      .on('data', d => process.stdout.write(d.toString()))
      .stderr.on('data', d => process.stdout.write(d.toString()));
  });
}).on('error', err => console.error(err))
  .connect({
    host: '159.198.36.84', port: 22,
    username: 'root', password: 'g790QnH0s17QcVLywX',
    readyTimeout: 20000
  });
