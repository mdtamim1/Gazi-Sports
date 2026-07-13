import React from 'react';
import { Helmet } from 'react-helmet-async';

interface SEOMetaProps {
  title: string;
  description?: string;
  image?: string;
  slug?: string;
}

export const SEOMeta: React.FC<SEOMetaProps> = ({
  title,
  description = 'Gazi Sports - Premium Sports, Fitness & Lifestyle Products Store.',
  image = 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=800&q=80',
  slug = ''
}) => {
  const domain = 'https://beauty-elegance-ec88f.web.app';
  const url = slug ? `${domain}/${slug}` : domain;
  const fullTitle = `${title} | Gazi Sports`;

  return (
    <Helmet>
      {/* Standard HTML Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />

      {/* Facebook Open Graph Meta Tags */}
      <meta property="og:type" content="website" />
      <meta property="og:url" content={url} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />

      {/* Twitter Card Meta Tags */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={url} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
    </Helmet>
  );
};
