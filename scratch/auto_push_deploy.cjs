const { execSync } = require('child_process');
const { Client } = require('ssh2');

console.log('🚀 Starting Automated Git Push & VPS Deployment...\n');

try {
  // Step 1: Git Add & Commit if there are changes
  const status = execSync('git status --porcelain').toString();
  if (status.trim()) {
    console.log('📦 Staging local changes...');
    execSync('git add .');
    console.log('💾 Committing changes...');
    execSync('git commit -m "Auto update and deployment"');
  } else {
    console.log('ℹ️ No uncommitted local changes.');
  }

  // Step 2: Push to GitHub
  console.log('⬆️ Pushing code to GitHub (origin/master)...');
  execSync('git push origin master');
  console.log('✅ Git Push successful!\n');

  // Step 3: Remote Deployment via SSH
  console.log('🔌 Connecting to VPS server (159.198.36.84) to update live app...');
  const conn = new Client();

  conn.on('ready', () => {
    console.log('✅ Connected to VPS via SSH.');
    console.log('🔄 Executing remote git pull, build & pm2 restart...');
    const cmd = 'cd /var/www/gazisports && git stash && git pull origin master && npm install --include=optional --force && npm run build && pm2 restart gazi-sports-backend';

    conn.exec(cmd, (err, stream) => {
      if (err) {
        console.error('❌ SSH Exec Error:', err);
        conn.end();
        process.exit(1);
      }

      stream.on('close', (code) => {
        console.log(`\n🎉 Deployment finished successfully with exit code: ${code}`);
        conn.end();
      }).on('data', (data) => {
        process.stdout.write(data.toString());
      }).stderr.on('data', (data) => {
        process.stdout.write(data.toString());
      });
    });
  }).on('error', (err) => {
    console.error('❌ SSH Connection Error:', err);
    process.exit(1);
  }).connect({
    host: '159.198.36.84',
    port: 22,
    username: 'root',
    password: 'g790QnH0s17QcVLywX',
    readyTimeout: 30000
  });

} catch (err) {
  console.error('❌ Automation Error:', err.message);
  process.exit(1);
}
