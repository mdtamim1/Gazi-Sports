import { Request, Response } from 'express';
import db from '../config/db';
import { cacheService } from '../services/cacheService';
import { logSecurityAction } from '../utils/auditLogger';
import { generateSitemap } from '../utils/sitemap';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import https from 'https';
import http from 'http';

// Helper to ensure uploads directory exists and return its path
const getUploadsDir = (): string => {
  const uploadsDir = path.resolve(__dirname, '../../uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  return uploadsDir;
};

// Build a branded filename from slug + suffix + extension
const buildBrandedFilename = (slug: string, suffix: string, extension: string): string =>
  `gazisports24-${slug}${suffix ? '-' + suffix : ''}.${extension}`;

// Save base64 image as branded file
const saveBase64Image = (base64Str: string, slug: string, suffix: string = ''): string => {
  if (!base64Str || !base64Str.startsWith('data:image/')) return base64Str;
  try {
    const matches = base64Str.match(/^data:image\/([A-Za-z0-9\-+]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) return base64Str;
    const extension = matches[1] === 'jpeg' ? 'jpg' : matches[1];
    const buffer = Buffer.from(matches[2], 'base64');
    const uploadsDir = getUploadsDir();
    const filename = buildBrandedFilename(slug, suffix, extension);
    fs.writeFileSync(path.join(uploadsDir, filename), buffer);
    return `/uploads/${filename}`;
  } catch (err) {
    console.error('Error saving base64 image:', err);
    return base64Str;
  }
};

// Download external URL and save as branded file (async)
const downloadAndSaveUrl = (url: string, slug: string, suffix: string = ''): Promise<string> => {
  return new Promise((resolve) => {
    try {
      const proto = url.startsWith('https') ? https : http;
      proto.get(url, (response) => {
        if (response.statusCode !== 200) {
          console.warn(`Failed to download image (status ${response.statusCode}): ${url}`);
          return resolve(url);
        }
        const contentType = response.headers['content-type'] || 'image/jpeg';
        const extMap: Record<string, string> = {
          'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/png': 'png',
          'image/webp': 'webp', 'image/gif': 'gif', 'image/avif': 'avif',
        };
        const extension = extMap[contentType.split(';')[0].trim()] || 'jpg';
        const uploadsDir = getUploadsDir();
        const filename = buildBrandedFilename(slug, suffix, extension);
        const filePath = path.join(uploadsDir, filename);
        const fileStream = fs.createWriteStream(filePath);
        response.pipe(fileStream);
        fileStream.on('finish', () => {
          fileStream.close();
          resolve(`/uploads/${filename}`);
        });
        fileStream.on('error', (err) => {
          console.error('Error writing downloaded image:', err);
          resolve(url);
        });
      }).on('error', (err) => {
        console.error('Error downloading image:', err);
        resolve(url);
      });
    } catch (err) {
      console.error('Unexpected error in downloadAndSaveUrl:', err);
      resolve(url);
    }
  });
};

// Main async helper: process any image value (base64, external URL, or already branded)
const processImageUrl = async (imageVal: string, slug: string, suffix: string = ''): Promise<string> => {
  if (!imageVal) return imageVal;
  // Already a branded upload on our server — no need to re-process
  if (imageVal.startsWith('/uploads/gazisports24-')) return imageVal;
  // Base64 image
  if (imageVal.startsWith('data:image/')) return saveBase64Image(imageVal, slug, suffix);
  // External HTTP/HTTPS URL — download and rename
  if (imageVal.startsWith('http://') || imageVal.startsWith('https://')) {
    return downloadAndSaveUrl(imageVal, slug, suffix);
  }
  // Already a local /uploads/ path but not branded — return as-is
  return imageVal;
};



// Auto-migrate: ensure 'sizes' column exists in products table
db.run(`ALTER TABLE products ADD COLUMN sizes TEXT DEFAULT '[]'`, (err) => {
  if (err && !err.message.includes('duplicate column')) {
    // Column already exists or other error, silently ignore
  }
});

export const getProducts = async (req: Request, res: Response) => {
  try {
    res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
    const cacheKey = 'products:all';
    const cachedData = await cacheService.get<any[]>(cacheKey);
    if (cachedData) {
      return res.json({ status: 'success', data: cachedData });
    }

    db.all(`SELECT * FROM products`, [], (err, rows: any[]) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ status: 'error', message: 'Database error' });
      }
      if (!rows || rows.length === 0) {
        return res.json({ status: 'success', data: [] });
      }

      // Fetch all gallery images to match with products
      db.all(`SELECT * FROM product_gallery`, [], (galleryErr, galleryRows: any[]) => {
        const galleryMap: Record<number, string[]> = {};
        if (!galleryErr && galleryRows) {
          galleryRows.forEach(row => {
            if (!galleryMap[row.product_id]) {
              galleryMap[row.product_id] = [];
            }
            galleryMap[row.product_id].push(row.image_url);
          });
        }

        const parsedRows = rows.map((row: any) => {
          let features = [];
          let specs = [];
          let sizes = [];
          try {
            if (row.features) features = JSON.parse(row.features);
          } catch (e) {
            console.error(`Error parsing features for product ${row.id}:`, e);
          }
          try {
            if (row.specs) specs = JSON.parse(row.specs);
          } catch (e) {
            console.error(`Error parsing specs for product ${row.id}:`, e);
          }
          try {
            if (row.sizes) sizes = JSON.parse(row.sizes);
          } catch (e) {
            console.error(`Error parsing sizes for product ${row.id}:`, e);
          }
          const gallery = galleryMap[row.id] || [];
          return {
            ...row,
            features,
            specs,
            sizes,
            published: row.published === 1,
            in_stock: row.in_stock === 1,
            gallery: gallery.length > 0 ? gallery : [row.image],
            video_url: row.video_url || null,
            photo_content: row.photo_content || null
          };
        });

        cacheService.set(cacheKey, parsedRows, 300).catch(console.error);
        res.json({ status: 'success', data: parsedRows });
      });
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

export const getProductById = async (req: Request, res: Response) => {
  const { id } = req.params;
  const cacheKey = `products:id:${id}`;
  try {
    const cachedProduct = await cacheService.get<any>(cacheKey);
    if (cachedProduct) {
      return res.json({ status: 'success', data: cachedProduct });
    }

    db.get(`SELECT * FROM products WHERE id = ? OR slug = ?`, [id, id], (err, product: any) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ status: 'error', message: 'Database error' });
      }
      if (!product) {
        return res.status(404).json({ status: 'error', message: 'Product not found' });
      }
      // Fetch product gallery
      db.all(`SELECT image_url FROM product_gallery WHERE product_id = ?`, [product.id], (err, galleryRows: any[]) => {
        const gallery = galleryRows ? galleryRows.map(r => r.image_url) : [];
        
        let features = [];
        let specs = [];
        let sizes = [];
        try {
          if (product.features) features = JSON.parse(product.features);
        } catch (e) {
          console.error(`Error parsing features for product ${product.id}:`, e);
        }
        try {
          if (product.specs) specs = JSON.parse(product.specs);
        } catch (e) {
          console.error(`Error parsing specs for product ${product.id}:`, e);
        }
        try {
          if (product.sizes) sizes = JSON.parse(product.sizes);
        } catch (e) {
          console.error(`Error parsing sizes for product ${product.id}:`, e);
        }

        const resultData = {
          ...product,
          features,
          specs,
          sizes,
          published: product.published === 1,
          in_stock: product.in_stock === 1,
          gallery: gallery.length > 0 ? gallery : [product.image],
          video_url: product.video_url || null,
          photo_content: product.photo_content || null
        };

        cacheService.set(cacheKey, resultData, 300).catch(console.error);
        res.json({ status: 'success', data: resultData });
      });
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

export const createProduct = async (req: Request, res: Response) => {
  try {
    const { name, slug, sku, brand, category, price, original_price, image, description, stock, published, features, specs, gallery, videoUrl, photoContent, sizes } = req.body;
    const id = 'PRD-' + Math.random().toString(36).substring(2, 8).toUpperCase();
    const slugVal = (slug && String(slug).trim()) || (name ? String(name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') : '') || ('prd-' + Date.now().toString(36));
    const skuVal = (sku && String(sku).trim()) || ('SKU-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substring(2, 5).toUpperCase());
    const categoryVal = (category && String(category).trim()) || 'Fitness Item';
    const rawImage = image || 'https://picsum.photos/seed/' + id + '/600/600';

    // Process main image — handles base64, external URL, or already local
    const finalImage = await processImageUrl(rawImage, slugVal);

    // Process gallery images in parallel
    let processedGallery: string[] = [];
    if (gallery && Array.isArray(gallery)) {
      const validImages = (gallery as string[]).filter((img) => img && img.trim());
      processedGallery = await Promise.all(
        validImages.map((img, idx) => processImageUrl(img, slugVal, `gallery-${idx + 1}`))
      );
    }

    db.run('BEGIN TRANSACTION', (txErr) => {
      if (txErr) {
        console.error('Failed to start transaction:', txErr);
        return res.status(500).json({ status: 'error', message: 'Database error' });
      }

      db.run(
        `INSERT INTO products (id, name, slug, sku, brand, category, price, original_price, image, description, stock, published, features, specs, video_url, photo_content, sizes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id, name || 'New Product', slugVal, skuVal, brand || '', categoryVal, Number(price) || 0, original_price ? Number(original_price) : null, finalImage, description || '', Number(stock) || 0,
          published ? 1 : 0, JSON.stringify(features || []), JSON.stringify(specs || []),
          videoUrl || null, photoContent || null, JSON.stringify(sizes || [])
        ],
        function (err) {
          if (err) {
            console.error('Error inserting product:', err);
            db.run('ROLLBACK', (rbErr) => { if (rbErr) console.error('Error rolling back transaction:', rbErr); });
            return res.status(500).json({ status: 'error', message: err.message });
          }

          const commitTransaction = () => {
            db.run('COMMIT', (commitErr) => {
              if (commitErr) {
                console.error('Error committing transaction:', commitErr);
                db.run('ROLLBACK', (rbErr) => { if (rbErr) console.error('Error rolling back transaction:', rbErr); });
                return res.status(500).json({ status: 'error', message: 'Failed to commit transaction' });
              }
              cacheService.delPattern('products:*').catch(console.error);
              cacheService.del('products:all').catch(console.error);
              const actor = (req as any).user;
              logSecurityAction(actor?.id || null, actor?.email || null, 'PRODUCT_CREATE',
                `Product created: ${name} (SKU: ${skuVal}, ID: ${id}, Price: ৳${price})`, req);
              res.json({ status: 'success', message: 'Product created', data: { id } });
              generateSitemap().catch(console.error);
            });
          };

          if (processedGallery.length === 0) return commitTransaction();

          const stmt = db.prepare(`INSERT INTO product_gallery (product_id, image_url) VALUES (?, ?)`);
          let hasError = false;
          let pending = processedGallery.length;
          processedGallery.forEach((finalGalleryImage) => {
            stmt.run([id, finalGalleryImage], (runErr: any) => {
              if (runErr) { console.error('Error inserting gallery image:', runErr); hasError = true; }
              pending--;
              if (pending === 0) {
                stmt.finalize((finalizeErr: any) => {
                  if (hasError || finalizeErr) {
                    db.run('ROLLBACK', (rbErr) => { if (rbErr) console.error(rbErr); });
                    return res.status(500).json({ status: 'error', message: 'Failed to insert gallery images' });
                  }
                  commitTransaction();
                });
              }
            });
          });
        }
      );
    });
  } catch (err: any) {
    console.error('Unexpected error in createProduct:', err);
    res.status(500).json({ status: 'error', message: err.message || 'Server error' });
  }
};

export const updateProduct = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, price, original_price, stock, description, image, brand, category, published, features, specs, gallery, videoUrl, photoContent, sizes } = req.body;

  db.get("SELECT name, slug FROM products WHERE id = ?", [id], async (findErr, existingProd: any) => {
    if (findErr || !existingProd) {
      return res.status(404).json({ status: 'error', message: 'Product not found' });
    }

    const slugVal = existingProd.slug || (name || existingProd.name).toLowerCase().replace(/[^a-z0-9]+/g, '-');
    // Process main image — handles base64, external URL, or already local
    const finalImage = image ? await processImageUrl(image, slugVal) : image;

    // Pre-process gallery images (if any) before opening the DB transaction
    let processedGallery: string[] | null = null;
    if (gallery && Array.isArray(gallery)) {
      const validImages = (gallery as string[]).filter((img) => img && img.trim());
      processedGallery = await Promise.all(
        validImages.map((img, idx) => processImageUrl(img, slugVal, `gallery-${idx + 1}`))
      );
    }

    db.run('BEGIN TRANSACTION', (txErr) => {
      if (txErr) {
        console.error('Failed to start transaction:', txErr);
        return res.status(500).json({ status: 'error', message: 'Database error' });
      }

      db.run(
        `UPDATE products 
         SET name = COALESCE(?, name), 
             price = COALESCE(?, price), 
             original_price = COALESCE(?, original_price), 
             stock = COALESCE(?, stock), 
             description = COALESCE(?, description), 
             image = COALESCE(?, image),
             brand = COALESCE(?, brand),
             category = COALESCE(?, category),
             published = COALESCE(?, published),
             features = COALESCE(?, features),
             specs = COALESCE(?, specs),
             video_url = COALESCE(?, video_url),
             photo_content = COALESCE(?, photo_content),
             sizes = COALESCE(?, sizes)
         WHERE id = ?`,
        [
          name, price, original_price, stock, description, finalImage, brand, category, 
          published === undefined ? null : (published ? 1 : 0),
          features ? JSON.stringify(features) : null,
          specs ? JSON.stringify(specs) : null,
          videoUrl === undefined ? null : videoUrl,
          photoContent === undefined ? null : photoContent,
          sizes ? JSON.stringify(sizes) : null,
          id
        ],
        function (err) {
          if (err) {
            console.error('Error updating product:', err);
            db.run('ROLLBACK', (rbErr) => {
              if (rbErr) console.error('Error rolling back transaction:', rbErr);
            });
            return res.status(500).json({ status: 'error', message: 'Database error' });
          }

          const commitTransaction = () => {
            db.run('COMMIT', (commitErr) => {
              if (commitErr) {
                console.error('Error committing transaction:', commitErr);
                db.run('ROLLBACK', (rbErr) => {
                  if (rbErr) console.error('Error rolling back transaction:', rbErr);
                });
                return res.status(500).json({ status: 'error', message: 'Failed to commit transaction' });
              }
              cacheService.delPattern('products:*').catch(console.error);
              cacheService.del('products:all').catch(console.error);
              cacheService.del(`products:id:${id}`).catch(console.error);
              const actor = (req as any).user;
              logSecurityAction(
                actor?.id || null,
                actor?.email || null,
                'PRODUCT_UPDATE',
                `Product updated: ${name || 'ID: ' + id} (ID: ${id}, Price: ৳${price || 'unchanged'}, Stock: ${stock || 'unchanged'})`,
                req
              );
              res.json({ status: 'success', message: 'Product updated' });
              generateSitemap().catch(console.error);
            });
          };

          if (processedGallery !== null) {
            db.run(`DELETE FROM product_gallery WHERE product_id = ?`, [id], (deleteErr) => {
              if (deleteErr) {
                console.error('Error deleting gallery:', deleteErr);
                db.run('ROLLBACK', (rbErr) => { if (rbErr) console.error(rbErr); });
                return res.status(500).json({ status: 'error', message: 'Failed to clear old gallery' });
              }

              if (processedGallery!.length === 0) return commitTransaction();

              const stmt = db.prepare(`INSERT INTO product_gallery (product_id, image_url) VALUES (?, ?)`);
              let hasError = false;
              let pending = processedGallery!.length;

              processedGallery!.forEach((finalGalleryImage) => {
                stmt.run([id, finalGalleryImage], (runErr: any) => {
                  if (runErr) { console.error('Error inserting gallery image:', runErr); hasError = true; }
                  pending--;
                  if (pending === 0) {
                    stmt.finalize((finalizeErr: any) => {
                      if (hasError || finalizeErr) {
                        db.run('ROLLBACK', (rbErr) => { if (rbErr) console.error(rbErr); });
                        return res.status(500).json({ status: 'error', message: 'Failed to insert gallery images' });
                      }
                      commitTransaction();
                    });
                  }
                });
              });
            });
          } else {
            commitTransaction();
          }
        }
      );
    });
  });
};

export const deleteProduct = (req: Request, res: Response) => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : (req.params.id || '');
  const id = String(rawId);

  // Build alternate ID forms:
  // If numeric 1-8 → also try PRD-00X
  // If PRD-00X (legacy seeded) → also try numeric
  // If PRD-XXXXXX (new random) → just use as-is, no altId needed
  let altId = id;
  if (/^PRD-00[1-8]$/.test(id)) {
    altId = String(parseInt(id.replace('PRD-00', '')));
  } else if (/^[1-8]$/.test(id)) {
    altId = `PRD-00${id}`;
  }

  db.run(`DELETE FROM product_gallery WHERE product_id = ? OR product_id = ?`, [id, altId], (galleryErr) => {
    if (galleryErr) {
      console.error('Error deleting product gallery:', galleryErr);
    }
    db.run(`DELETE FROM products WHERE id = ? OR id = ?`, [id, altId], function (err) {
      if (err) {
        console.error('Error deleting product:', err);
        return res.status(500).json({ status: 'error', message: 'Database error' });
      }

      console.log(`[DELETE] Product ${id} — rows deleted: ${this.changes}`);

      // Invalidate cache thoroughly
      cacheService.delPattern('products:*').catch(console.error);
      cacheService.del('products:all').catch(console.error);
      cacheService.del(`products:id:${id}`).catch(console.error);
      cacheService.del(`products:id:${altId}`).catch(console.error);

      const actor = (req as any).user;
      logSecurityAction(
        actor?.id || null,
        actor?.email || null,
        'PRODUCT_DELETE',
        `Product deleted: ID: ${id} (${this.changes} rows affected)`,
        req
      );
      res.json({ status: 'success', message: 'Product deleted', changes: this.changes });
      generateSitemap().catch(console.error);
    });
  });
};

export const getFacebookFeed = (req: Request, res: Response) => {
  const escapeXml = (unsafe: any): string => {
    if (unsafe === null || unsafe === undefined) return '';
    return String(unsafe).replace(/[&<>'"]/g, (c: string) => {
      switch (c) {
        case '&': return '&amp;';
        case '<': return '&lt;';
        case '>': return '&gt;';
        case "'": return '&apos;';
        case '"': return '&quot;';
        default: return c;
      }
    });
  };

  db.all(`SELECT * FROM products WHERE published = 1`, [], (err, rows) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Database error');
    }
    const domain = process.env.STORE_URL || 'https://gazisports24.com';
    const storeName = process.env.STORE_NAME || 'Gazi Sports';
    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">\n`;
    xml += `  <channel>\n`;
    xml += `    <title>${storeName} - Facebook Catalog Feed</title>\n`;
    xml += `    <link>${domain}</link>\n`;
    xml += `    <description>Dynamic Product Catalog Feed for Facebook Ads</description>\n`;

    rows.forEach((p: any) => {
      const rawDesc = p.description || `${p.name} - Premium sports item from ${storeName}.`;
      const cleanDesc = rawDesc.replace(/<[^>]*>/g, ''); // strip HTML tags
      
      let imageLink = p.image || '';
      if (imageLink && !imageLink.startsWith('http')) {
        imageLink = `${domain}${imageLink.startsWith('/') ? '' : '/'}${imageLink}`;
      }

      const inStock = p.in_stock === 1 || p.stock > 0;
      const availability = inStock ? 'in stock' : 'out of stock';
      const priceFormatted = `${p.price} BDT`;

      xml += `    <item>\n`;
      xml += `      <g:id>${escapeXml(p.id)}</g:id>\n`;
      xml += `      <g:title>${escapeXml(p.name)}</g:title>\n`;
      xml += `      <g:description>${escapeXml(cleanDesc)}</g:description>\n`;
      xml += `      <g:link>${escapeXml(`${domain}/product/${p.id}`)}</g:link>\n`;
      xml += `      <g:image_link>${escapeXml(imageLink)}</g:image_link>\n`;
      xml += `      <g:brand>${escapeXml(p.brand || 'AURA Sports')}</g:brand>\n`;
      xml += `      <g:condition>new</g:condition>\n`;
      xml += `      <g:availability>${escapeXml(availability)}</g:availability>\n`;
      xml += `      <g:price>${escapeXml(priceFormatted)}</g:price>\n`;
      if (p.category) {
        xml += `      <g:google_product_category>${escapeXml(p.category)}</g:google_product_category>\n`;
      }
      xml += `    </item>\n`;
    });

    xml += `  </channel>\n`;
    xml += `</rss>\n`;

    res.header('Content-Type', 'text/xml; charset=utf-8');
    res.send(xml);
  });
};
