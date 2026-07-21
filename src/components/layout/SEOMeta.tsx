import React from 'react';
import { Helmet } from 'react-helmet-async';

interface SEOMetaProps {
  title: string;
  description?: string;
  image?: string;
  slug?: string;
  type?: 'website' | 'product' | 'article';
  price?: number;
  originalPrice?: number;
  currency?: string;
  inStock?: boolean;
  sku?: string;
  brand?: string;
  rating?: number;
  reviewCount?: number;
}

export const SEOMeta: React.FC<SEOMetaProps> = ({
  title,
  description = 'Gazi Sports 24 - Premium Sports, Fitness & Lifestyle Products Store in Bangladesh.',
  image = 'https://gazisports24.com/assets/main-banner.webp',
  slug = '',
  type = 'website',
  price,
  currency = 'BDT',
  inStock = true,
  sku,
  brand = 'Gazi Sports 24',
  rating = 5.0,
  reviewCount = 12
}) => {
  const domain = typeof window !== 'undefined' ? window.location.origin : 'https://gazisports24.com';
  
  // Construct raw URL and clean Canonical URL (stripped of query string tracking parameters like ?ref=... or ?fbclid=...)
  const rawUrl = slug ? `${domain}/${slug.startsWith('/') ? slug.slice(1) : slug}` : domain;
  const canonicalUrl = rawUrl.split('?')[0];

  const fullTitle = title.includes('Gazi Sports') ? title : `${title} | Gazi Sports 24`;

  // Format absolute image URL
  const imageUrl = image && image.startsWith('http') ? image : `${domain}${image.startsWith('/') ? '' : '/'}${image}`;

  // Schema.org JSON-LD for Google Rich Product Results
  const productSchema = type === 'product' && price ? {
    '@context': 'https://schema.org/',
    '@type': 'Product',
    'name': title,
    'image': [imageUrl],
    'description': description,
    'sku': sku || `GAZI-${title.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 20)}`,
    'brand': {
      '@type': 'Brand',
      'name': brand
    },
    'offers': {
      '@type': 'Offer',
      'url': canonicalUrl,
      'priceCurrency': currency,
      'price': price,
      'priceValidUntil': '2028-12-31',
      'availability': inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      'itemCondition': 'https://schema.org/NewCondition'
    },
    'aggregateRating': {
      '@type': 'AggregateRating',
      'ratingValue': rating.toString(),
      'reviewCount': (reviewCount || 12).toString()
    }
  } : null;

  return (
    <Helmet>
      {/* Standard HTML Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      
      {/* 🔗 Canonical URL Tag */}
      <link rel="canonical" href={canonicalUrl} />

      {/* 🌐 Facebook & WhatsApp Open Graph Meta Tags */}
      <meta property="og:site_name" content="Gazi Sports 24" />
      <meta property="og:type" content={type === 'product' ? 'og:product' : type} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={imageUrl} />
      <meta property="og:image:secure_url" content={imageUrl} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt" content={fullTitle} />
      <meta property="og:locale" content="en_US" />

      {/* Product Specific Open Graph Data */}
      {type === 'product' && price && (
        <>
          <meta property="product:price:amount" content={price.toString()} />
          <meta property="product:price:currency" content={currency} />
          <meta property="product:availability" content={inStock ? 'in stock' : 'out of stock'} />
          <meta property="product:condition" content="new" />
          <meta property="product:brand" content={brand} />
        </>
      )}

      {/* 🐦 Twitter Card Meta Tags */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content="@GaziSports24" />
      <meta name="twitter:url" content={canonicalUrl} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={imageUrl} />
      <meta name="twitter:image:alt" content={fullTitle} />

      {/* 🎯 Google Rich Product Schema JSON-LD */}
      {productSchema && (
        <script type="application/ld+json">
          {JSON.stringify(productSchema)}
        </script>
      )}
    </Helmet>
  );
};
