const { Client } = require('ssh2');
const conn = new Client();

console.log('📄 Reading Nginx site config...');

conn.on('ready', () => {
  const cmd = 'cat /etc/nginx/sites-enabled/gazisports24.com';

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
