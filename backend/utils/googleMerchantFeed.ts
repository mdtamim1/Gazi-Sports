import db from '../config/db';

export async function generateGoogleMerchantFeed(): Promise<string> {
  return new Promise((resolve) => {
    const query = `
      SELECT id, name, price, original_price, image, category, description, published, stock 
      FROM products 
      WHERE published = 1
    `;

    db.all(query, [], (err, rows: any[]) => {
      if (err || !rows) {
        console.error('Failed to query products for Google Merchant feed:', err);
        return resolve(getFallbackMerchantXml());
      }

      const domain = 'https://gazisports24.com';

      const itemsXml = rows.map((p) => {
        const title = (p.name || 'Gazi Sports Product')
          .replace(/&/g, '&amp;')
          .replace(/'/g, '&apos;')
          .replace(/"/g, '&quot;')
          .replace(/>/g, '&gt;')
          .replace(/</g, '&lt;');

        const rawDesc = (p.description || title).replace(/<[^>]*>/g, '').trim();
        const description = (rawDesc || title)
          .replace(/&/g, '&amp;')
          .replace(/'/g, '&apos;')
          .replace(/"/g, '&quot;')
          .replace(/>/g, '&gt;')
          .replace(/</g, '&lt;')
          .slice(0, 1000);

        const link = `${domain}/product/${p.id}`;
        
        let imageUrl = p.image || '';
        if (imageUrl && !imageUrl.startsWith('http')) {
          imageUrl = `${domain}${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`;
        }
        if (!imageUrl) {
          imageUrl = `${domain}/assets/main-banner.webp`;
        }

        const price = `${Number(p.price || 0).toFixed(2)} BDT`;
        const inStock = (p.stock === undefined || p.stock > 0) ? 'in_stock' : 'out_of_stock';
        const category = (p.category || 'Sports & Fitness')
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;');

        return `    <item>
      <g:id>${p.id}</g:id>
      <g:title>${title}</g:title>
      <g:description>${description}</g:description>
      <g:link>${link}</g:link>
      <g:image_link>${imageUrl}</g:image_link>
      <g:price>${price}</g:price>
      <g:availability>${inStock}</g:availability>
      <g:condition>new</g:condition>
      <g:brand>Gazi Sports 24</g:brand>
      <g:product_type>${category}</g:product_type>
    </item>`;
      }).join('\n');

      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>Gazi Sports 24 Google Merchant Shopping Feed</title>
    <link>https://gazisports24.com</link>
    <description>Official Google Merchant Center Product Feed for Gazi Sports 24 Store in Bangladesh.</description>
${itemsXml}
  </channel>
</rss>`;

      resolve(xml);
    });
  });
}

function getFallbackMerchantXml(): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>Gazi Sports 24 Google Merchant Shopping Feed</title>
    <link>https://gazisports24.com</link>
    <description>Official Google Merchant Center Product Feed for Gazi Sports 24 Store in Bangladesh.</description>
  </channel>
</rss>`;
}
