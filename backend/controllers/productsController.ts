import { Request, Response } from 'express';
import db from '../config/db';
import { cacheService } from '../services/cacheService';
import { logSecurityAction } from '../utils/auditLogger';

// Auto-migrate: ensure 'sizes' column exists in products table
db.run(`ALTER TABLE products ADD COLUMN sizes TEXT DEFAULT '[]'`, (err) => {
  if (err && !err.message.includes('duplicate column')) {
    // Column already exists or other error, silently ignore
  }
});

export const getProducts = async (req: Request, res: Response) => {
  try {
    const cacheKey = 'products:all';
    const cachedData = await cacheService.get<any[]>(cacheKey);
    if (cachedData) {
      return res.json({ status: 'success', data: cachedData });
    }

    db.all(`SELECT * FROM products`, [], (err, rows) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ status: 'error', message: 'Database error' });
      }
      const parsedRows = (rows || []).map((row: any) => {
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
        return {
          ...row,
          features,
          specs,
          sizes,
          published: row.published === 1,
          in_stock: row.in_stock === 1,
          video_url: row.video_url || null,
          photo_content: row.photo_content || null
        };
      });

      cacheService.set(cacheKey, parsedRows, 300).catch(console.error);
      res.json({ status: 'success', data: parsedRows });
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

    db.get(`SELECT * FROM products WHERE id = ?`, [id], (err, product: any) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ status: 'error', message: 'Database error' });
      }
      if (!product) {
        return res.status(404).json({ status: 'error', message: 'Product not found' });
      }
      // Fetch product gallery
      db.all(`SELECT image_url FROM product_gallery WHERE product_id = ?`, [id], (err, galleryRows: any[]) => {
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

export const createProduct = (req: Request, res: Response) => {
  const { name, slug, sku, brand, category, price, original_price, image, description, stock, published, features, specs, gallery, videoUrl, photoContent, sizes } = req.body;
  const id = 'PRD-' + Math.random().toString(36).substring(2, 8).toUpperCase();

  db.run('BEGIN TRANSACTION', (txErr) => {
    if (txErr) {
      console.error('Failed to start transaction:', txErr);
      return res.status(500).json({ status: 'error', message: 'Database error' });
    }

    db.run(
      `INSERT INTO products (id, name, slug, sku, brand, category, price, original_price, image, description, stock, published, features, specs, video_url, photo_content, sizes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, name, slug, sku, brand, category, price, original_price, image, description, stock || 0,
        published ? 1 : 0, JSON.stringify(features || []), JSON.stringify(specs || []),
        videoUrl || null, photoContent || null, JSON.stringify(sizes || [])
      ],
      function (err) {
        if (err) {
          console.error('Error inserting product:', err);
          db.run('ROLLBACK', (rbErr) => {
            if (rbErr) console.error('Error rolling back transaction:', rbErr);
          });
          return res.status(500).json({ status: 'error', message: err.message });
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
            const actor = (req as any).user;
            logSecurityAction(
              actor?.id || null,
              actor?.email || null,
              'PRODUCT_CREATE',
              `Product created: ${name} (SKU: ${sku}, ID: ${id}, Price: ৳${price})`,
              req
            );
            res.json({ status: 'success', message: 'Product created', data: { id } });
          });
        };

        // Insert gallery
        if (gallery && Array.isArray(gallery)) {
          const validImages = gallery.filter((img: string) => img.trim());
          if (validImages.length === 0) {
            return commitTransaction();
          }

          const stmt = db.prepare(`INSERT INTO product_gallery (product_id, image_url) VALUES (?, ?)`);
          let hasError = false;
          let pending = validImages.length;

          validImages.forEach((img: string) => {
            stmt.run([id, img.trim()], (runErr: any) => {
              if (runErr) {
                console.error('Error inserting gallery image:', runErr);
                hasError = true;
              }
              pending--;
              if (pending === 0) {
                stmt.finalize((finalizeErr: any) => {
                  if (hasError || finalizeErr) {
                    db.run('ROLLBACK', (rbErr) => {
                      if (rbErr) console.error('Error rolling back transaction:', rbErr);
                    });
                    return res.status(500).json({ status: 'error', message: 'Failed to insert gallery images' });
                  }
                  commitTransaction();
                });
              }
            });
          });
        } else {
          commitTransaction();
        }
      }
    );
  });
};

export const updateProduct = (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, price, original_price, stock, description, image, brand, category, published, features, specs, gallery, videoUrl, photoContent, sizes } = req.body;

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
        name, price, original_price, stock, description, image, brand, category, 
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
            const actor = (req as any).user;
            logSecurityAction(
              actor?.id || null,
              actor?.email || null,
              'PRODUCT_UPDATE',
              `Product updated: ${name || 'ID: ' + id} (ID: ${id}, Price: ৳${price || 'unchanged'}, Stock: ${stock || 'unchanged'})`,
              req
            );
            res.json({ status: 'success', message: 'Product updated' });
          });
        };

        if (gallery && Array.isArray(gallery)) {
          db.run(`DELETE FROM product_gallery WHERE product_id = ?`, [id], (deleteErr) => {
            if (deleteErr) {
              console.error('Error deleting gallery:', deleteErr);
              db.run('ROLLBACK', (rbErr) => {
                if (rbErr) console.error('Error rolling back transaction:', rbErr);
              });
              return res.status(500).json({ status: 'error', message: 'Failed to clear old gallery' });
            }

            const validImages = gallery.filter((img: string) => img.trim());
            if (validImages.length === 0) {
              return commitTransaction();
            }

            const stmt = db.prepare(`INSERT INTO product_gallery (product_id, image_url) VALUES (?, ?)`);
            let hasError = false;
            let pending = validImages.length;

            validImages.forEach((img: string) => {
              stmt.run([id, img.trim()], (runErr: any) => {
                if (runErr) {
                  console.error('Error inserting gallery image:', runErr);
                  hasError = true;
                }
                pending--;
                if (pending === 0) {
                  stmt.finalize((finalizeErr: any) => {
                    if (hasError || finalizeErr) {
                      db.run('ROLLBACK', (rbErr) => {
                        if (rbErr) console.error('Error rolling back transaction:', rbErr);
                      });
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
};

export const deleteProduct = (req: Request, res: Response) => {
  const { id } = req.params;
  db.run(`DELETE FROM products WHERE id = ?`, [id], function (err) {
    if (err) {
      console.error(err);
      return res.status(500).json({ status: 'error', message: 'Database error' });
    }
    // Invalidate cache
    cacheService.delPattern('products:*').catch(console.error);
    const actor = (req as any).user;
    logSecurityAction(
      actor?.id || null,
      actor?.email || null,
      'PRODUCT_DELETE',
      `Product deleted: ID: ${id}`,
      req
    );
    res.json({ status: 'success', message: 'Product deleted' });
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
    const domain = process.env.STORE_URL || 'https://gazisports.com';
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
