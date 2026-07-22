import fs from 'fs';
import path from 'path';
import db from '../config/db';

export async function injectSeoToHtml(htmlTemplate: string, reqPath: string): Promise<string> {
  const domain = 'https://gazisports24.com';
  const cleanPath = reqPath.split('?')[0].trim();

  try {
    if (cleanPath.startsWith('/product/')) {
      const param = decodeURIComponent(cleanPath.replace('/product/', '').trim());
      if (param) {
        return await injectProductSeo(htmlTemplate, param, domain, reqPath);
      }
    } else if (cleanPath.startsWith('/blog/')) {
      const slug = decodeURIComponent(cleanPath.replace('/blog/', '').trim());
      if (slug) {
        return await injectBlogSeo(htmlTemplate, slug, domain, reqPath);
      }
    } else if (cleanPath.startsWith('/collection/')) {
      const slug = decodeURIComponent(cleanPath.replace('/collection/', '').trim());
      if (slug) {
        return injectCollectionSeo(htmlTemplate, slug, domain, reqPath);
      }
    } else if (cleanPath.startsWith('/page/')) {
      const pageId = decodeURIComponent(cleanPath.replace('/page/', '').trim());
      if (pageId) {
        return injectPageSeo(htmlTemplate, pageId, domain, reqPath);
      }
    }
  } catch (err) {
    console.error('Error in injectSeoToHtml:', err);
  }

  return injectDefaultSeo(htmlTemplate, domain, reqPath);
}

function injectProductSeo(htmlTemplate: string, param: string, domain: string, reqPath: string): Promise<string> {
  return new Promise((resolve) => {
    db.all("SELECT id, name, price, original_price, image, category, description, published, stock FROM products WHERE published = 1", [], (err, rows: any[]) => {
      if (err || !rows || rows.length === 0) {
        return resolve(injectDefaultSeo(htmlTemplate, domain, reqPath));
      }

      let matched = rows.find(p => String(p.id) === param || (p.slug && p.slug === param));
      if (!matched) {
        const cleanParam = param.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        matched = rows.find(p => {
          const pNameSlug = (p.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-');
          return pNameSlug === cleanParam || cleanParam.includes(pNameSlug) || pNameSlug.includes(cleanParam);
        });
      }
      if (!matched) {
        matched = rows[0];
      }

      const rawTitle = matched.name || 'Sports Equipment';
      const metaTitle = `${rawTitle} Price in Bangladesh | Buy Online | Gazi Sports 24`;
      const cleanDesc = (matched.description || rawTitle).replace(/<[^>]*>/g, '').trim().slice(0, 160);
      const metaDesc = cleanDesc ? `${rawTitle} Price in Bangladesh. ${cleanDesc}` : `Buy ${rawTitle} at best price in Bangladesh from Gazi Sports 24. Nationwide Cash on Delivery!`;

      let imageUrl = matched.image || '';
      if (imageUrl && !imageUrl.startsWith('http')) {
        imageUrl = `${domain}${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`;
      }
      if (!imageUrl) {
        imageUrl = `${domain}/assets/main-banner.webp`;
      }

      const canonicalUrl = `${domain}${reqPath.startsWith('/') ? '' : '/'}${reqPath}`.split('?')[0];
      const price = Number(matched.price || 0);
      const inStock = (matched.stock === undefined || matched.stock > 0);

      const productSchema = {
        '@context': 'https://schema.org/',
        '@type': 'Product',
        'name': rawTitle,
        'image': [imageUrl],
        'description': metaDesc,
        'sku': `GAZI-${matched.id}`,
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
        <title>${escapeHtml(metaTitle)}</title>
        <meta name="description" content="${escapeHtml(metaDesc)}" />
        <meta name="keywords" content="${escapeHtml(rawTitle)}, Gazi Sports 24, sports store bangladesh, buy online bd" />
        <link rel="canonical" href="${canonicalUrl}" />

        <meta property="og:site_name" content="Gazi Sports 24" />
        <meta property="og:type" content="og:product" />
        <meta property="og:url" content="${canonicalUrl}" />
        <meta property="og:title" content="${escapeHtml(metaTitle)}" />
        <meta property="og:description" content="${escapeHtml(metaDesc)}" />
        <meta property="og:image" content="${imageUrl}" />
        <meta property="og:image:secure_url" content="${imageUrl}" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content="${escapeHtml(rawTitle)}" />
        <meta property="og:locale" content="en_US" />

        <meta property="product:price:amount" content="${price}" />
        <meta property="product:price:currency" content="BDT" />
        <meta property="product:availability" content="${inStock ? 'in stock' : 'out of stock'}" />
        <meta property="product:condition" content="new" />
        <meta property="product:brand" content="Gazi Sports 24" />

        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@GaziSports24" />
        <meta name="twitter:title" content="${escapeHtml(metaTitle)}" />
        <meta name="twitter:description" content="${escapeHtml(metaDesc)}" />
        <meta name="twitter:image" content="${imageUrl}" />

        <script type="application/ld+json">
          ${JSON.stringify(productSchema)}
        </script>
      `;

      resolve(replaceHeadTags(htmlTemplate, seoTags));
    });
  });
}

function injectBlogSeo(htmlTemplate: string, slug: string, domain: string, reqPath: string): Promise<string> {
  return new Promise((resolve) => {
    db.get("SELECT title, summary, content, banner_image, author_name, created_at FROM blog_posts WHERE slug = ? OR id = ?", [slug, slug], (err, blog: any) => {
      if (err || !blog) {
        return resolve(injectDefaultSeo(htmlTemplate, domain, reqPath));
      }

      const rawTitle = blog.title || 'Blog Post';
      const metaTitle = `${rawTitle} | Gazi Sports 24 Blog`;
      const cleanDesc = (blog.summary || blog.content || rawTitle).replace(/<[^>]*>/g, '').trim().slice(0, 160);
      const metaDesc = cleanDesc || `Read ${rawTitle} on Gazi Sports 24 Official Blog.`;

      let imageUrl = blog.banner_image || '';
      if (imageUrl && !imageUrl.startsWith('http')) {
        imageUrl = `${domain}${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`;
      }
      if (!imageUrl) {
        imageUrl = `${domain}/assets/main-banner.webp`;
      }

      const canonicalUrl = `${domain}${reqPath.startsWith('/') ? '' : '/'}${reqPath}`.split('?')[0];

      const articleSchema = {
        '@context': 'https://schema.org',
        '@type': 'Article',
        'headline': rawTitle,
        'image': [imageUrl],
        'datePublished': blog.created_at || new Date().toISOString(),
        'author': {
          '@type': 'Organization',
          'name': blog.author_name || 'Gazi Sports 24'
        },
        'publisher': {
          '@type': 'Organization',
          'name': 'Gazi Sports 24',
          'logo': {
            '@type': 'ImageObject',
            'url': `${domain}/favicon.png`
          }
        },
        'description': metaDesc
      };

      const seoTags = `
        <title>${escapeHtml(metaTitle)}</title>
        <meta name="description" content="${escapeHtml(metaDesc)}" />
        <link rel="canonical" href="${canonicalUrl}" />

        <meta property="og:site_name" content="Gazi Sports 24" />
        <meta property="og:type" content="article" />
        <meta property="og:url" content="${canonicalUrl}" />
        <meta property="og:title" content="${escapeHtml(metaTitle)}" />
        <meta property="og:description" content="${escapeHtml(metaDesc)}" />
        <meta property="og:image" content="${imageUrl}" />
        <meta property="og:image:secure_url" content="${imageUrl}" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />

        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@GaziSports24" />
        <meta name="twitter:title" content="${escapeHtml(metaTitle)}" />
        <meta name="twitter:description" content="${escapeHtml(metaDesc)}" />
        <meta name="twitter:image" content="${imageUrl}" />

        <script type="application/ld+json">
          ${JSON.stringify(articleSchema)}
        </script>
      `;

      resolve(replaceHeadTags(htmlTemplate, seoTags));
    });
  });
}

function injectCollectionSeo(htmlTemplate: string, slug: string, domain: string, reqPath: string): string {
  const categoryName = slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  const metaTitle = `${categoryName} Collection | Buy Online in Bangladesh | Gazi Sports 24`;
  const metaDesc = `Browse authentic ${categoryName} gear at best price in Bangladesh from Gazi Sports 24. Top quality sports and fitness equipment with fast delivery!`;
  const canonicalUrl = `${domain}${reqPath.startsWith('/') ? '' : '/'}${reqPath}`.split('?')[0];
  const imageUrl = `${domain}/assets/main-banner.webp`;

  const seoTags = `
    <title>${escapeHtml(metaTitle)}</title>
    <meta name="description" content="${escapeHtml(metaDesc)}" />
    <link rel="canonical" href="${canonicalUrl}" />

    <meta property="og:site_name" content="Gazi Sports 24" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${canonicalUrl}" />
    <meta property="og:title" content="${escapeHtml(metaTitle)}" />
    <meta property="og:description" content="${escapeHtml(metaDesc)}" />
    <meta property="og:image" content="${imageUrl}" />
    <meta property="og:image:secure_url" content="${imageUrl}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />

    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(metaTitle)}" />
    <meta name="twitter:description" content="${escapeHtml(metaDesc)}" />
    <meta name="twitter:image" content="${imageUrl}" />
  `;

  return replaceHeadTags(htmlTemplate, seoTags);
}

function injectPageSeo(htmlTemplate: string, pageId: string, domain: string, reqPath: string): string {
  const pageName = pageId.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  const metaTitle = `${pageName} | Gazi Sports 24`;
  const metaDesc = `${pageName} details for Gazi Sports 24 - Bangladesh's leading sports and fitness store.`;
  const canonicalUrl = `${domain}${reqPath.startsWith('/') ? '' : '/'}${reqPath}`.split('?')[0];

  const seoTags = `
    <title>${escapeHtml(metaTitle)}</title>
    <meta name="description" content="${escapeHtml(metaDesc)}" />
    <link rel="canonical" href="${canonicalUrl}" />

    <meta property="og:site_name" content="Gazi Sports 24" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${canonicalUrl}" />
    <meta property="og:title" content="${escapeHtml(metaTitle)}" />
    <meta property="og:description" content="${escapeHtml(metaDesc)}" />

    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(metaTitle)}" />
    <meta name="twitter:description" content="${escapeHtml(metaDesc)}" />
  `;

  return replaceHeadTags(htmlTemplate, seoTags);
}

function injectDefaultSeo(htmlTemplate: string, domain: string, reqPath: string): string {
  const canonicalUrl = `${domain}${reqPath === '/' ? '' : reqPath}`.split('?')[0];
  const canonicalTag = `<link rel="canonical" href="${canonicalUrl}" />`;
  
  if (reqPath !== '/' && reqPath !== '') {
    return htmlTemplate.replace(/<link rel="canonical" href="[^"]*" \/>/g, canonicalTag);
  }
  return htmlTemplate;
}

function replaceHeadTags(htmlTemplate: string, newSeoTags: string): string {
  // Clean pre-existing title, description, canonical, and og tags from static template
  let cleaned = htmlTemplate
    .replace(/<title>[\s\S]*?<\/title>/gi, '')
    .replace(/<meta name="description"[\s\S]*?\/>/gi, '')
    .replace(/<meta name="keywords"[\s\S]*?\/>/gi, '')
    .replace(/<link rel="canonical"[\s\S]*?\/>/gi, '')
    .replace(/<meta property="og:[\s\S]*?\/>/gi, '')
    .replace(/<meta name="twitter:[\s\S]*?\/>/gi, '');

  return cleaned.replace('</head>', `${newSeoTags}\n</head>`);
}

function escapeHtml(str: string): string {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/'/g, '&apos;')
    .replace(/"/g, '&quot;')
    .replace(/>/g, '&gt;')
    .replace(/</g, '&lt;');
}

