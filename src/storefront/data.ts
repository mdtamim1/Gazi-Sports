import { Smartphone, Shirt, Home as HomeIcon, Dumbbell, Sparkles, BookOpen } from 'lucide-react';

export interface ProductReview {
  id: number;
  user: string;
  rating: number;
  date: string;
  comment: string;
  helpful: number;
}

export interface ProductSpec {
  name: string;
  value: string;
}

export interface StoreProduct {
  id: number;
  name: string;
  category: string;
  brand: string;
  sku: string;
  price: number;
  originalPrice: number | null;
  rating: number;
  reviews: number;
  image: string;
  gallery: string[];
  badge: 'sale' | 'new' | null;
  inStock: boolean;
  description: string;
  features: string[];
  specs: ProductSpec[];
  customerReviews: ProductReview[];
  relatedProducts: number[];
}

export const categories: { name: string; icon: any; count: number }[] = [
  { name: 'Electronics', icon: Smartphone, count: 1240 },
  { name: 'Fashion', icon: Shirt, count: 3450 },
  { name: 'Home & Garden', icon: HomeIcon, count: 890 },
  { name: 'Sports', icon: Dumbbell, count: 670 },
  { name: 'Beauty', icon: Sparkles, count: 1120 },
  { name: 'Books', icon: BookOpen, count: 2340 },
];

export const storeProducts: StoreProduct[] = [
  {
    id: 1,
    name: 'Wireless Earbuds Pro Max',
    category: 'Electronics',
    brand: 'SonicTech',
    sku: 'ST-EPB-001',
    price: 129.99,
    originalPrice: 179.99,
    rating: 4.8,
    reviews: 2340,
    image: 'https://picsum.photos/seed/earbuds/600/600',
    gallery: [
      'https://picsum.photos/seed/earbuds/600/600',
      'https://picsum.photos/seed/earbuds2/600/600',
      'https://picsum.photos/seed/earbuds3/600/600',
      'https://picsum.photos/seed/earbuds4/600/600'
    ],
    badge: 'sale',
    inStock: true,
    description: 'Experience premium audio quality with the Wireless Earbuds Pro Max. Featuring active noise cancellation, 24-hour battery life, and sweat resistance. Designed for the ultimate auditory experience whether you are commuting, working out, or relaxing at home.',
    features: [
      'Active Noise Cancellation (ANC)',
      'Transparency Mode for hearing the world around you',
      'Up to 24 hours of total listening time with the MagSafe Charging Case',
      'Spatial audio with dynamic head tracking',
      'Sweat and water resistant (IPX4)'
    ],
    specs: [
      { name: 'Connectivity', value: 'Bluetooth 5.3' },
      { name: 'Battery Life', value: 'Up to 6 hours on single charge' },
      { name: 'Water Resistance', value: 'IPX4' },
      { name: 'Weight', value: '5.4g per earbud' },
      { name: 'Warranty', value: '1 Year Manufacturer' }
    ],
    customerReviews: [
      { id: 101, user: 'Alex D.', rating: 5, date: '2025-10-12', comment: 'The noise cancellation on these is incredible. I use them on the subway every day.', helpful: 45 },
      { id: 102, user: 'Sarah M.', rating: 4, date: '2025-09-28', comment: 'Great sound quality, but the case gets scratched easily. Highly recommend getting a cover.', helpful: 22 },
      { id: 103, user: 'Michael T.', rating: 5, date: '2025-09-15', comment: 'Best earbuds I have ever owned. The spatial audio feature really makes a difference.', helpful: 18 }
    ],
    relatedProducts: [3, 5]
  },
  {
    id: 2,
    name: 'Premium Leather Crossbody Bag',
    category: 'Fashion',
    brand: 'Luxe Wear',
    sku: 'LW-BAG-002',
    price: 89.99,
    originalPrice: null,
    rating: 4.6,
    reviews: 1820,
    image: 'https://picsum.photos/seed/bag2/600/600',
    gallery: [
      'https://picsum.photos/seed/bag2/600/600',
      'https://picsum.photos/seed/bag2_1/600/600',
      'https://picsum.photos/seed/bag2_2/600/600'
    ],
    badge: 'new',
    inStock: true,
    description: 'Crafted from 100% genuine full-grain leather, this crossbody bag combines timeless elegance with everyday practicality. It features multiple compartments to keep your essentials organized.',
    features: [
      '100% Genuine Full-Grain Leather',
      'Adjustable crossbody strap',
      'Gold-tone hardware',
      'Interior zip and slip pockets'
    ],
    specs: [
      { name: 'Material', value: 'Genuine Leather' },
      { name: 'Dimensions', value: '10" W x 8" H x 3" D' },
      { name: 'Strap Drop', value: '22" - 24"' },
      { name: 'Lining', value: 'Polyester' }
    ],
    customerReviews: [
      { id: 201, user: 'Emily R.', rating: 5, date: '2025-11-02', comment: 'Absolutely beautiful bag! The leather feels so soft and premium.', helpful: 12 },
      { id: 202, user: 'Jessica W.', rating: 4, date: '2025-10-18', comment: 'Perfect size for everyday use, but I wish the strap was slightly thicker.', helpful: 8 }
    ],
    relatedProducts: [6, 8]
  },
  {
    id: 3,
    name: 'Smart Watch Ultra Series 5',
    category: 'Electronics',
    brand: 'TechGear',
    sku: 'TG-SW-005',
    price: 349.99,
    originalPrice: 449.99,
    rating: 4.9,
    reviews: 5120,
    image: 'https://picsum.photos/seed/watch5/600/600',
    gallery: [
      'https://picsum.photos/seed/watch5/600/600',
      'https://picsum.photos/seed/watch5_1/600/600',
      'https://picsum.photos/seed/watch5_2/600/600'
    ],
    badge: 'sale',
    inStock: true,
    description: 'The ultimate smartwatch for your active life. Track your health, workouts, and stay connected with cellular capability.',
    features: [
      'Always-On Retina display',
      'Blood oxygen and ECG apps',
      'Water resistant up to 50 meters',
      'Advanced workout metrics'
    ],
    specs: [
      { name: 'Display', value: 'OLED Always-On' },
      { name: 'Battery', value: 'Up to 18 hours' },
      { name: 'Water Resistance', value: '50m' },
      { name: 'Connectivity', value: 'GPS + Cellular' }
    ],
    customerReviews: [],
    relatedProducts: [1, 5]
  },
  {
    id: 4,
    name: 'Organic Face Serum Collection',
    category: 'Beauty',
    brand: 'NatureGlow',
    sku: 'NG-FS-004',
    price: 45.99,
    originalPrice: null,
    rating: 4.7,
    reviews: 980,
    image: 'https://picsum.photos/seed/serum2/600/600',
    gallery: [
      'https://picsum.photos/seed/serum2/600/600',
      'https://picsum.photos/seed/serum2_1/600/600'
    ],
    badge: null,
    inStock: true,
    description: 'Revitalize your skin with our 100% organic face serum collection. Packed with Vitamin C and Hyaluronic Acid for a radiant glow.',
    features: ['100% Organic', 'Cruelty-Free', 'Contains Vitamin C & Hyaluronic Acid'],
    specs: [{ name: 'Volume', value: '30ml' }, { name: 'Skin Type', value: 'All' }],
    customerReviews: [],
    relatedProducts: [8]
  },
  {
    id: 5,
    name: '4K OLED Gaming Monitor 32"',
    category: 'Electronics',
    brand: 'VisionPro',
    sku: 'VP-M-032',
    price: 699.99,
    originalPrice: 899.99,
    rating: 4.9,
    reviews: 3200,
    image: 'https://picsum.photos/seed/monitor3/600/600',
    gallery: [
      'https://picsum.photos/seed/monitor3/600/600',
      'https://picsum.photos/seed/monitor3_1/600/600'
    ],
    badge: 'sale',
    inStock: true,
    description: 'Immerse yourself in true 4K HDR gaming with unparalleled contrast and 144Hz refresh rate.',
    features: ['4K UHD Resolution', '144Hz Refresh Rate', '1ms Response Time', 'G-Sync Compatible'],
    specs: [{ name: 'Panel Type', value: 'OLED' }, { name: 'Resolution', value: '3840 x 2160' }, { name: 'Refresh Rate', value: '144Hz' }],
    customerReviews: [],
    relatedProducts: [1, 3]
  },
  {
    id: 6,
    name: 'Running Shoes X Carbon Pro',
    category: 'Sports',
    brand: 'AeroStep',
    sku: 'AS-RS-006',
    price: 159.99,
    originalPrice: null,
    rating: 4.5,
    reviews: 1560,
    image: 'https://picsum.photos/seed/shoes3/600/600',
    gallery: [
      'https://picsum.photos/seed/shoes3/600/600',
      'https://picsum.photos/seed/shoes3_1/600/600'
    ],
    badge: 'new',
    inStock: true,
    description: 'Lightweight, responsive running shoes featuring a carbon fiber plate for maximum energy return.',
    features: ['Carbon Fiber Plate', 'Breathable Mesh Upper', 'High-Traction Outsole'],
    specs: [{ name: 'Weight', value: '210g' }, { name: 'Drop', value: '8mm' }],
    customerReviews: [],
    relatedProducts: [2]
  },
  {
    id: 7,
    name: 'Ergonomic Office Chair Pro',
    category: 'Home & Garden',
    brand: 'ComfortZone',
    sku: 'CZ-CH-007',
    price: 299.99,
    originalPrice: 399.99,
    rating: 4.8,
    reviews: 2180,
    image: 'https://picsum.photos/seed/chair2/600/600',
    gallery: [
      'https://picsum.photos/seed/chair2/600/600',
      'https://picsum.photos/seed/chair2_1/600/600'
    ],
    badge: 'sale',
    inStock: true,
    description: 'Fully adjustable ergonomic chair designed to support your posture during long working hours.',
    features: ['Adjustable Lumbar Support', 'Breathable Mesh Back', '4D Armrests'],
    specs: [{ name: 'Weight Capacity', value: '300 lbs' }, { name: 'Material', value: 'Mesh & Aluminum' }],
    customerReviews: [],
    relatedProducts: [8]
  },
  {
    id: 8,
    name: 'Premium Silk Pillowcase Set',
    category: 'Home & Garden',
    brand: 'SleepWell',
    sku: 'SW-SP-008',
    price: 59.99,
    originalPrice: null,
    rating: 4.4,
    reviews: 890,
    image: 'https://picsum.photos/seed/pillow2/600/600',
    gallery: [
      'https://picsum.photos/seed/pillow2/600/600',
      'https://picsum.photos/seed/pillow2_1/600/600'
    ],
    badge: null,
    inStock: true,
    description: '100% pure mulberry silk pillowcases that prevent hair breakage and skin creases.',
    features: ['100% Mulberry Silk', 'Hidden Zipper', 'Machine Washable'],
    specs: [{ name: 'Size', value: 'Standard (20" x 26")' }, { name: 'Thread Count', value: '600' }],
    customerReviews: [],
    relatedProducts: [4, 7]
  }
];
