import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadsDir = path.resolve(__dirname, '../../uploads');

async function compressAll() {
  if (!fs.existsSync(uploadsDir)) {
    console.log('No uploads directory found at:', uploadsDir);
    return;
  }
  const files = fs.readdirSync(uploadsDir);
  console.log(`Found ${files.length} files in uploads directory.`);

  let processed = 0;
  let totalSaved = 0;

  for (const file of files) {
    const ext = path.extname(file).toLowerCase();
    if (ext === '.png' || ext === '.jpg' || ext === '.jpeg') {
      const filePath = path.join(uploadsDir, file);
      const stat = fs.statSync(filePath);
      const originalSize = stat.size;

      // Only compress files larger than 40 KB
      if (originalSize > 40 * 1024) {
        try {
          const tempPath = filePath + '.tmp.webp';
          await sharp(filePath)
            .resize(1000, 1000, { fit: 'inside', withoutEnlargement: true })
            .webp({ quality: 78 })
            .toFile(tempPath);

          const newStat = fs.statSync(tempPath);
          const newSize = newStat.size;

          if (newSize < originalSize) {
            fs.unlinkSync(filePath); // delete original heavy file
            fs.renameSync(tempPath, filePath); // replace with WebP compressed file at same path
            const saved = originalSize - newSize;
            totalSaved += saved;
            console.log(`✅ Compressed ${file}: ${(originalSize / 1024).toFixed(1)} KB -> ${(newSize / 1024).toFixed(1)} KB (Saved ${(saved / 1024).toFixed(1)} KB)`);
          } else {
            fs.unlinkSync(tempPath);
          }
          processed++;
        } catch (err) {
          console.error(`Failed to compress ${file}:`, err.message);
        }
      }
    }
  }
  console.log(`\n🎉 Image Compression Completed! Processed ${processed} images. Total disk space saved: ${(totalSaved / (1024 * 1024)).toFixed(2)} MB`);
}

compressAll().catch(console.error);
