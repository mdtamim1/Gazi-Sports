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
  // Example: https://images.unsplash.com/photo-1638536532686-d610adfc8e5c?auto=format&fit=crop&w=600&q=80
  if (src.includes('images.unsplash.com')) {
    return src;
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
      } catch (e) {}
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
  let transformation = '';
  if (width || height) {
    const params = [];
    if (width) params.push(`w-${width}`);
    if (height) params.push(`h-${height}`);
    params.push('f-auto'); // Auto-format format (WebP)
    params.push('q-80');   // Quality compression 80%
    transformation = `tr:${params.join(',')}`;
  } else {
    transformation = 'tr:f-auto,q-80';
  }

  return `${cdnUrl}/${transformation}/${backendBase}${cleanPath}`;
};

/**
 * Compresses an image file on the client side using Canvas API and converts it to WebP format.
 * Returns a Base64 WebP string.
 */
export const convertToWebP = (file: File, quality = 0.8): Promise<string> => {
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
