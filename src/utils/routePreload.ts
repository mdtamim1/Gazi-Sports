/**
 * Route Preloading Utility
 * Preloads lazy route chunks on browser idle time and user hover/touchstart
 * to ensure zero-millisecond page-to-page navigation across the storefront.
 */

// Route chunk loaders
export const preloadProductDetails = () => import('../storefront/ProductDetails');
export const preloadCollectionPage = () => import('../storefront/CollectionPage');
export const preloadCheckout = () => import('../storefront/Checkout');
export const preloadBlogList = () => import('../storefront/BlogList');
export const preloadBlogDetails = () => import('../storefront/BlogDetails');
export const preloadEventsPage = () => import('../storefront/EventsPage');
export const preloadCustomerAccount = () => import('../storefront/CustomerAccount');
export const preloadPrivacyPolicy = () => import('../storefront/PrivacyPolicy');
export const preloadTermsOfService = () => import('../storefront/TermsOfService');
export const preloadAboutUs = () => import('../storefront/AboutUs');

// Set of already preloaded paths to prevent duplicate triggers
const _preloaded = new Set<string>();

/**
 * Preload high-priority routes (Product Details, Collection, Checkout)
 * during browser idle time right after initial page load.
 */
export const preloadPriorityRoutes = (): void => {
  if (typeof window === 'undefined') return;

  const schedule = (window as any).requestIdleCallback || ((cb: () => void) => setTimeout(cb, 1000));
  schedule(() => {
    try {
      preloadProductDetails();
      preloadCollectionPage();
      preloadCheckout();
    } catch {}
  });
};

/**
 * Match a target URL and trigger the corresponding lazy chunk download.
 * Called on hover (mouseover) or touchstart on links before user clicks.
 */
export const preloadRoute = (href: string): void => {
  if (!href || typeof href !== 'string') return;

  // Extract path without hash or query
  const cleanPath = href.split('?')[0].split('#')[0].trim();
  if (!cleanPath.startsWith('/')) return;
  if (_preloaded.has(cleanPath)) return;
  _preloaded.add(cleanPath);

  try {
    if (cleanPath.startsWith('/product/')) {
      preloadProductDetails();
    } else if (cleanPath.startsWith('/collection/')) {
      preloadCollectionPage();
    } else if (cleanPath === '/checkout') {
      preloadCheckout();
    } else if (cleanPath.startsWith('/blog/')) {
      preloadBlogDetails();
    } else if (cleanPath === '/blogs') {
      preloadBlogList();
    } else if (cleanPath === '/events') {
      preloadEventsPage();
    } else if (cleanPath === '/account') {
      preloadCustomerAccount();
    } else if (cleanPath === '/privacy-policy') {
      preloadPrivacyPolicy();
    } else if (cleanPath === '/terms-of-service') {
      preloadTermsOfService();
    } else if (cleanPath === '/about-us') {
      preloadAboutUs();
    }
  } catch {}
};
