const { Client } = require('ssh2');

const conn = new Client();

console.log('🔌 Connecting to VPS server 159.198.36.84 via SSH to compress images in /var/www/gazisports/uploads...');

conn.on('ready', () => {
  console.log('✅ SSH Connection Established successfully!');
  
  // Script executed on remote server using Node and sharp to compress all PNG/JPG images in /uploads
  const remoteNodeScript = `
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const uploadsDir = '/var/www/gazisports/uploads';

async function compressAll() {
  if (!fs.existsSync(uploadsDir)) {
    console.log('No uploads directory found');
    return;
  }
  const files = fs.readdirSync(uploadsDir);
  console.log('Found ' + files.length + ' files in uploads directory');

  let processed = 0;
  let totalSaved = 0;

  for (const file of files) {
    const ext = path.extname(file).toLowerCase();
    if (ext === '.png' || ext === '.jpg' || ext === '.jpeg') {
      const filePath = path.join(uploadsDir, file);
      const stat = fs.statSync(filePath);
      const originalSize = stat.size;

      // Only compress files larger than 50 KB
      if (originalSize > 50 * 1024) {
        try {
          const tempPath = filePath + '.tmp';
          await sharp(filePath)
            .resize(1000, 1000, { fit: 'inside', withoutEnlargement: true })
            .webp({ quality: 78 })
            .toFile(tempPath);

          const newStat = fs.statSync(tempPath);
          const newSize = newStat.size;

          if (newSize < originalSize) {
            // Replace original file with compressed file
            fs.renameSync(tempPath, filePath);
            const saved = originalSize - newSize;
            totalSaved += saved;
            console.log(\`Compressed \${file}: \${(originalSize/1024).toFixed(1)} KB -> \${(newSize/1024).toFixed(1)} KB (Saved \${(saved/1024).toFixed(1)} KB)\`);
          } else {
            fs.unlinkSync(tempPath);
          }
          processed++;
        } catch (err) {
          console.error(\`Failed to compress \${file}:\`, err.message);
        }
      }
    }
  }
  console.log(\`✅ Done! Processed \${processed} images. Total space saved: \${(totalSaved / (1024*1024)).toFixed(2)} MB\`);
}

compressAll().catch(console.error);
`;

  const cmd = `node -e ${JSON.stringify(remoteNodeScript)}`;

  conn.exec(cmd, (err, stream) => {
    if (err) {
      console.error('❌ SSH Command Error:', err);
      conn.end();
      return;
    }

    stream.on('close', (code, signal) => {
      console.log(`\n🎉 Image Compression Script Finished with exit code: ${code}`);
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
