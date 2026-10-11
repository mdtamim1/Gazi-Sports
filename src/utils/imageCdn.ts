const IMAGE_CDN_ENDPOINT = ''; // Disabled because the ImageKit endpoint returns 404

/**
 * Helper to generate optimized ImageKit CDN URLs for local/external images.
 * If the CDN URL is disabled or empty, returns the original source.
 */
export const getOptimizedImageUrl = (src: string, width?: number, height?: number): string => {
  if (!src) return '';

  // If the image is a base64 string or already optimized, return it
  if (src.startsWith('data:')) return src;

  // Case 1: Unsplash images (most product images in our seeds)
  // Dynamically optimize Unsplash images using edge parameters (WebP, auto-format, quality 75)
  if (src.includes('images.unsplash.com')) {
    try {
      const url = new URL(src);
      const targetW = width || 500;
      url.searchParams.set('w', String(targetW));
      if (height) {
        url.searchParams.set('h', String(height));
        url.searchParams.set('fit', 'crop');
      } else {
        url.searchParams.set('fit', 'max');
      }
      url.searchParams.set('auto', 'format');
      url.searchParams.set('q', '75');
      return url.toString();
    } catch {
      return src;
    }
  }

  // Case 2: Other external URLs (http/https)
  if (src.startsWith('http://') || src.startsWith('https://')) {
    return src;
  }

  // Case 3: Relative local image files (e.g. /uploads/product.png or assets/logo.png)
  const cleanPath = src.startsWith('/') ? src : `/${src}`;
  
  // Determine frontend deployment base for image origin proxying
  const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  let backendBase = 'https://api.gazisports24.com';
  
  if (isLocalDev) {
    backendBase = `${window.location.protocol}//${window.location.hostname}:5000`;
  } else {
    const envApiUrl = import.meta.env.VITE_API_URL;
    if (envApiUrl) {
      try {
        const urlObj = new URL(envApiUrl);
        backendBase = `${urlObj.protocol}//${urlObj.host}`;
      } catch {}
    }
  }
  
  const cdnUrl = IMAGE_CDN_ENDPOINT;
  if (!cdnUrl) {
    if (isLocalDev) {
      return `${backendBase}${cleanPath}`;
    }
    return cleanPath;
  }

  // Build query/path options for sizing/formatting
  const transformation = (width || height)
    ? `tr:${[width ? `w-${width}` : '', height ? `h-${height}` : '', 'f-auto', 'q-80'].filter(Boolean).join(',')}`
    : 'tr:f-auto,q-80';

  return `${cdnUrl}/${transformation}/${backendBase}${cleanPath}`;
};

/**
 * Compresses an image file on the client side using Canvas API and converts it to WebP format.
 * Returns a Base64 WebP string.
 */
export const convertToWebP = (file: File, quality = 0.92): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const webpDataUrl = canvas.toDataURL('image/webp', quality);
          resolve(webpDataUrl);
        } else {
          reject(new Error('Canvas context not available'));
        }
      };
      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };
      img.src = event.target?.result as string;
    };
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    reader.readAsDataURL(file);
  });
};
