import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import db from '../config/db';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function generateSitemap() {
  try {
    const urls: string[] = [
      'https://gazisports24.com/',
      'https://gazisports24.com/blogs',
      'https://gazisports24.com/events',
      'https://gazisports24.com/about-us',
      'https://gazisports24.com/privacy-policy',
      'https://gazisports24.com/terms-of-service',
      'https://gazisports24.com/login',
      'https://gazisports24.com/checkout'
    ];

    // 1. Fetch active products
    const products: any[] = await new Promise((resolve) => {
      db.all("SELECT id, slug, published FROM products WHERE published = 1", [], (err, rows) => {
        resolve(rows || []);
      });
    });
    products.forEach(p => {
      if (p.slug) {
        urls.push(`https://gazisports24.com/product/${p.slug}`);
      } else {
        urls.push(`https://gazisports24.com/product/${p.id}`);
      }
    });

    // 2. Fetch categories and custom pages from storefront settings
    const settings: any = await new Promise((resolve) => {
      db.get("SELECT setting_value FROM system_settings WHERE setting_key = 'storefront_config'", [], (err, row: any) => {
        if (row && row.setting_value) {
          try {
            resolve(JSON.parse(row.setting_value));
          } catch {
            resolve(null);
          }
        } else {
          resolve(null);
        }
      });
    });

    if (settings) {
      // Add collections/categories
      if (settings.categories && Array.isArray(settings.categories)) {
        settings.categories.forEach((c: any) => {
          if (c.published && c.name) {
            const slug = c.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
            urls.push(`https://gazisports24.com/collection/${slug}`);
          }
        });
      }
      // Add custom pages from navLinks
      if (settings.navLinks && Array.isArray(settings.navLinks)) {
        settings.navLinks.forEach((link: any) => {
          if (link.enabled && link.customPageContent) {
            urls.push(`https://gazisports24.com/page/${link.id}`);
          }
        });
      }
      // Add custom pages from footer
      if (settings.footerColumns && Array.isArray(settings.footerColumns)) {
        settings.footerColumns.forEach((col: any) => {
          if (col.links && Array.isArray(col.links)) {
            col.links.forEach((link: any) => {
              if (link.enabled && link.customPageContent) {
                urls.push(`https://gazisports24.com/page/${link.id}`);
              }
            });
          }
        });
      }
    }

    // 3. Fetch active blogs
    const blogs: any[] = await new Promise((resolve) => {
      db.all("SELECT slug FROM blog_posts WHERE published = 1", [], (err, rows) => {
        resolve(rows || []);
      });
    });
    blogs.forEach(b => {
      if (b.slug) {
        urls.push(`https://gazisports24.com/blog/${b.slug}`);
      }
    });

    // Generate XML content
    const xmlUrls = urls.map(url => {
      // Escape special characters in XML
      const escapedUrl = url.replace(/&/g, '&amp;')
                            .replace(/'/g, '&apos;')
                            .replace(/"/g, '&quot;')
                            .replace(/>/g, '&gt;')
                            .replace(/</g, '&lt;');
      return `  <url>\n    <loc>${escapedUrl}</loc>\n    <changefreq>daily</changefreq>\n    <priority>0.8</priority>\n  </url>`;
    }).join('\n');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${xmlUrls}
</urlset>`;

    // Save to the root dist directory
    const distSitemapPath = path.resolve(__dirname, '../../dist/sitemap.xml');
    
    // Ensure dist directory exists
    const distDir = path.dirname(distSitemapPath);
    if (fs.existsSync(distDir)) {
      fs.writeFileSync(distSitemapPath, xml, 'utf8');
      console.log(`✔ Dynamic Sitemap successfully generated at: ${distSitemapPath} (${urls.length} URLs)`);
    } else {
      console.warn(`⚠ Frontend build dist directory not found at: ${distDir}. Sitemap not written.`);
    }

    return xml;
  } catch (err) {
    console.error('Error generating sitemap:', err);
    return '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>https://gazisports24.com/</loc></url></urlset>';
  }
}

export async function getSitemapXML(): Promise<string> {
  return await generateSitemap();
}
