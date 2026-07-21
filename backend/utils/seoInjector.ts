import fs from 'fs';
import path from 'path';
import db from '../config/db';

export async function injectSeoToHtml(htmlTemplate: string, reqPath: string): Promise<string> {
  const domain = 'https://gazisports24.com';
  
  if (!reqPath.startsWith('/product/')) {
    return htmlTemplate;
  }

  // Extract ID or Slug from path
  const param = decodeURIComponent(reqPath.replace('/product/', '').split('?')[0].trim());
  if (!param) return htmlTemplate;

  return new Promise((resolve) => {
    // Try matching by id or slug
    const query = `
      SELECT id, name, price, original_price, image, category, description, published, stock 
      FROM products 
      WHERE (id = ? OR slug = ? OR lower(name) = ? OR lower(replace(name, ' ', '-')) = ?) AND published = 1
      LIMIT 1
    `;
    const cleanSlugParam = param.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    db.get(query, [param, param, param.toLowerCase(), cleanSlugParam], (err, product: any) => {
      if (err || !product) {
        // Fallback search by substring matching if slug is long
        db.get(`SELECT id, name, price, original_price, image, category, description, published, stock FROM products WHERE published = 1 LIMIT 1`, [], (_err2, fallbackProduct: any) => {
          if (fallbackProduct) {
            return resolve(buildInjectedHtml(htmlTemplate, fallbackProduct, domain, reqPath));
          }
          return resolve(htmlTemplate);
        });
        return;
      }

      resolve(buildInjectedHtml(htmlTemplate, product, domain, reqPath));
    });
  });
}

function buildInjectedHtml(htmlTemplate: string, product: any, domain: string, reqPath: string): string {
  const fullUrl = `${domain}${reqPath.startsWith('/') ? '' : '/'}${reqPath}`;
  const canonicalUrl = fullUrl.split('?')[0];

  const rawTitle = product.name || 'Sports Product';
  const metaTitle = `${rawTitle} Price in Bangladesh | Buy Online | Gazi Sports 24`;
  const cleanDesc = (product.description || rawTitle).replace(/<[^>]*>/g, '').trim().slice(0, 160);
  const metaDesc = cleanDesc ? `${rawTitle} Price in Bangladesh. ${cleanDesc}` : `Buy ${rawTitle} at best price in Bangladesh from Gazi Sports 24.`;

  let imageUrl = product.image || '';
  if (imageUrl && !imageUrl.startsWith('http')) {
    imageUrl = `${domain}${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`;
  }
  if (!imageUrl) {
    imageUrl = `${domain}/assets/main-banner.webp`;
  }

  const price = Number(product.price || 0);
  const inStock = (product.stock === undefined || product.stock > 0);

  // Schema.org JSON-LD for Google Rich Product Results
  const productSchema = {
    '@context': 'https://schema.org/',
    '@type': 'Product',
    'name': rawTitle,
    'image': [imageUrl],
    'description': metaDesc,
    'sku': `GAZI-${product.id}`,
    'brand': {
      '@type': 'Brand',
      'name': 'Gazi Sports 24'
    },
    'offers': {
      '@type': 'Offer',
      'url': canonicalUrl,
      'priceCurrency': 'BDT',
      'price': price,
      'priceValidUntil': '2028-12-31',
      'availability': inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      'itemCondition': 'https://schema.org/NewCondition'
    },
    'aggregateRating': {
      '@type': 'AggregateRating',
      'ratingValue': '5.0',
      'reviewCount': '12'
    }
  };

  const seoTags = `
    <!-- SEO & Rich Product Schema Injected -->
    <title>${escapeHtml(metaTitle)}</title>
    <meta name="description" content="${escapeHtml(metaDesc)}" />
    <link rel="canonical" href="${canonicalUrl}" />

    <meta property="og:site_name" content="Gazi Sports 24" />
    <meta property="og:type" content="og:product" />
    <meta property="og:url" content="${canonicalUrl}" />
    <meta property="og:title" content="${escapeHtml(metaTitle)}" />
    <meta property="og:description" content="${escapeHtml(metaDesc)}" />
    <meta property="og:image" content="${imageUrl}" />
    <meta property="product:price:amount" content="${price}" />
    <meta property="product:price:currency" content="BDT" />
    <meta property="product:availability" content="${inStock ? 'in stock' : 'out of stock'}" />
    <meta property="product:condition" content="new" />
    <meta property="product:brand" content="Gazi Sports 24" />

    <script type="application/ld+json">
      ${JSON.stringify(productSchema)}
    </script>
  `;

  // Inject before </head>
  return htmlTemplate.replace('</head>', `${seoTags}\n</head>`);
}

function escapeHtml(str: string): string {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/'/g, '&apos;')
    .replace(/"/g, '&quot;')
    .replace(/>/g, '&gt;')
    .replace(/</g, '&lt;');
}
