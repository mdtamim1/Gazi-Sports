import { Router, Request, Response } from 'express';
import db from '../config/db';

const router = Router();

router.get('/sitemap.xml', (req: Request, res: Response) => {
  const domain = 'https://beauty-elegance-ec88f.web.app';

  // 1. Fetch products
  db.all('SELECT id, created_at FROM products WHERE published = 1', [], (err, products: any[]) => {
    if (err) {
      console.error('Sitemap products fetch error:', err);
      return res.status(500).send('Error generating sitemap');
    }

    // 2. Fetch blog posts
    db.all('SELECT slug, created_at FROM blog_posts WHERE published = 1', [], (err, blogs: any[]) => {
      if (err) {
        console.error('Sitemap blogs fetch error:', err);
        return res.status(500).send('Error generating sitemap');
      }

      // Compile sitemap XML content
      let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
      xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

      // Static routes
      const staticRoutes = [
        { path: '', priority: '1.0' },
        { path: 'checkout', priority: '0.8' },
        { path: 'account', priority: '0.8' },
        { path: 'blogs', priority: '0.9' }
      ];

      staticRoutes.forEach(r => {
        xml += `  <url>\n`;
        xml += `    <loc>${domain}/${r.path}</loc>\n`;
        xml += `    <changefreq>daily</changefreq>\n`;
        xml += `    <priority>${r.priority}</priority>\n`;
        xml += `  </url>\n`;
      });

      // Product detail pages
      (products || []).forEach(p => {
        xml += `  <url>\n`;
        xml += `    <loc>${domain}/product/${p.id}</loc>\n`;
        xml += `    <changefreq>weekly</changefreq>\n`;
        xml += `    <priority>0.8</priority>\n`;
        xml += `  </url>\n`;
      });

      // Blog detail pages
      (blogs || []).forEach(b => {
        xml += `  <url>\n`;
        xml += `    <loc>${domain}/blog/${b.slug}</loc>\n`;
        xml += `    <changefreq>weekly</changefreq>\n`;
        xml += `    <priority>0.7</priority>\n`;
        xml += `  </url>\n`;
      });

      xml += `</urlset>`;

      // Set content type header to XML
      res.header('Content-Type', 'application/xml');
      res.status(200).send(xml);
    });
  });
});

export default router;
