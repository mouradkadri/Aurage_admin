// Types
export interface Product {
  id: string;
  name: string;
  price: number;
  scent: string;
  sizes: string[];
  inventory: number;
  status: 'in-stock' | 'low-stock' | 'out-of-stock';
}

export interface OrderItem {
  id: string;
  productName: string;
  scent: string;
  size: string;
  quantity: number;
  price: number;
  total: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  customer: string;
  email: string;
  total: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered';
  paymentStatus: 'paid' | 'pending' | 'refunded';
  date: string;
  items: number;
  detailedItems?: OrderItem[];
  shippingAddress?: string;
  shippingCost?: number;
  tax?: number;
  subtotal?: number;
  discountCode?: string;
  discountAmount?: number;
  trackingNumber?: string;
  paymentMethod?: string;
  orderValue: 'low' | 'medium' | 'high';
}

export interface SalesMetric {
  date: string;
  sales: number;
  orders: number;
}

// Mock Products
export const mockProducts: Product[] = [
  {
    id: '1',
    name: 'Rose Elegance',
    price: 45,
    scent: 'Rose',
    sizes: ['8oz', '16oz', '26oz'],
    inventory: 145,
    status: 'in-stock',
  },
  {
    id: '2',
    name: 'Lavender Dreams',
    price: 42,
    scent: 'Lavender',
    sizes: ['8oz', '16oz'],
    inventory: 32,
    status: 'low-stock',
  },
  {
    id: '3',
    name: 'Vanilla Sunset',
    price: 48,
    scent: 'Vanilla',
    sizes: ['8oz', '16oz', '26oz'],
    inventory: 89,
    status: 'in-stock',
  },
  {
    id: '4',
    name: 'Ocean Breeze',
    price: 40,
    scent: 'Marine',
    sizes: ['8oz'],
    inventory: 0,
    status: 'out-of-stock',
  },
  {
    id: '5',
    name: 'Amber Spice',
    price: 52,
    scent: 'Amber',
    sizes: ['8oz', '16oz', '26oz'],
    inventory: 156,
    status: 'in-stock',
  },
  {
    id: '6',
    name: 'Citrus Burst',
    price: 38,
    scent: 'Citrus',
    sizes: ['8oz', '16oz'],
    inventory: 67,
    status: 'in-stock',
  },
  {
    id: '7',
    name: 'Sandalwood Serenity',
    price: 55,
    scent: 'Sandalwood',
    sizes: ['16oz', '26oz'],
    inventory: 12,
    status: 'low-stock',
  },
  {
    id: '8',
    name: 'Floral Garden',
    price: 46,
    scent: 'Floral',
    sizes: ['8oz', '16oz', '26oz'],
    inventory: 203,
    status: 'in-stock',
  },
];

// Mock Orders
export const mockOrders: Order[] = [
  {
    id: '1',
    orderNumber: 'ORD-2024-001',
    customer: 'Sarah Mitchell',
    email: 'sarah@example.com',
    total: 127.50,
    status: 'delivered',
    paymentStatus: 'paid',
    date: '2024-02-20',
    items: 3,
    orderValue: 'medium',
    subtotal: 110.00,
    shippingCost: 10.00,
    tax: 7.50,
    shippingAddress: '123 Main St, Portland, OR 97201',
    trackingNumber: 'FX123456789',
    paymentMethod: 'Visa ****4242',
    detailedItems: [
      { id: '1', productName: 'Rose Elegance', scent: 'Rose', size: '8oz Tin', quantity: 1, price: 45.00, total: 45.00 },
      { id: '2', productName: 'Vanilla Sunset', scent: 'Vanilla', size: '16oz Glass', quantity: 1, price: 48.00, total: 48.00 },
      { id: '3', productName: 'Lavender Dreams', scent: 'Lavender', size: '8oz Tin', quantity: 1, price: 42.00, total: 17.00 },
    ],
  },
  {
    id: '2',
    orderNumber: 'ORD-2024-002',
    customer: 'James Chen',
    email: 'james@example.com',
    total: 89.99,
    status: 'shipped',
    paymentStatus: 'paid',
    date: '2024-02-23',
    items: 2,
    orderValue: 'low',
    subtotal: 78.00,
    shippingCost: 8.00,
    tax: 3.99,
    shippingAddress: '456 Oak Ave, Seattle, WA 98101',
    trackingNumber: 'UPS987654321',
    paymentMethod: 'Mastercard ****5678',
    detailedItems: [
      { id: '1', productName: 'Amber Spice', scent: 'Amber', size: '8oz Tin', quantity: 1, price: 52.00, total: 52.00 },
      { id: '2', productName: 'Citrus Burst', scent: 'Citrus', size: '8oz Tin', quantity: 1, price: 38.00, total: 26.00 },
    ],
  },
  {
    id: '3',
    orderNumber: 'ORD-2024-003',
    customer: 'Emma Rodriguez',
    email: 'emma@example.com',
    total: 156.00,
    status: 'processing',
    paymentStatus: 'paid',
    date: '2024-02-24',
    items: 4,
    orderValue: 'high',
    subtotal: 140.00,
    shippingCost: 12.00,
    tax: 4.00,
    shippingAddress: '789 Elm St, San Francisco, CA 94101',
    paymentMethod: 'Amex ****9012',
    detailedItems: [
      { id: '1', productName: 'Sandalwood Serenity', scent: 'Sandalwood', size: '26oz Glass', quantity: 1, price: 55.00, total: 55.00 },
      { id: '2', productName: 'Floral Garden', scent: 'Floral', size: '16oz Glass', quantity: 2, price: 46.00, total: 92.00 },
    ],
  },
  {
    id: '4',
    orderNumber: 'ORD-2024-004',
    customer: 'Michael Anderson',
    email: 'michael@example.com',
    total: 94.25,
    status: 'pending',
    paymentStatus: 'pending',
    date: '2024-02-24',
    items: 2,
    orderValue: 'low',
    subtotal: 85.00,
    shippingCost: 6.00,
    tax: 3.25,
    shippingAddress: '321 Pine Rd, Denver, CO 80201',
    discountCode: 'SAVE10',
    discountAmount: 10.00,
    paymentMethod: 'Pending',
    detailedItems: [
      { id: '1', productName: 'Rose Elegance', scent: 'Rose', size: '8oz Tin', quantity: 1, price: 45.00, total: 45.00 },
      { id: '2', productName: 'Citrus Burst', scent: 'Citrus', size: '16oz Glass', quantity: 1, price: 38.00, total: 40.00 },
    ],
  },
  {
    id: '5',
    orderNumber: 'ORD-2024-005',
    customer: 'Lisa Wang',
    email: 'lisa@example.com',
    total: 213.50,
    status: 'delivered',
    paymentStatus: 'paid',
    date: '2024-02-21',
    items: 5,
    orderValue: 'high',
    subtotal: 195.00,
    shippingCost: 15.00,
    tax: 3.50,
    shippingAddress: '654 Maple Dr, Boston, MA 02101',
    trackingNumber: 'FDX456123789',
    paymentMethod: 'Visa ****3456',
    detailedItems: [
      { id: '1', productName: 'Amber Spice', scent: 'Amber', size: '26oz Glass', quantity: 2, price: 52.00, total: 104.00 },
      { id: '2', productName: 'Sandalwood Serenity', scent: 'Sandalwood', size: '16oz Glass', quantity: 1, price: 55.00, total: 55.00 },
      { id: '3', productName: 'Vanilla Sunset', scent: 'Vanilla', size: '8oz Tin', quantity: 2, price: 48.00, total: 36.00 },
    ],
  },
  {
    id: '6',
    orderNumber: 'ORD-2024-006',
    customer: 'David Thompson',
    email: 'david@example.com',
    total: 67.99,
    status: 'processing',
    paymentStatus: 'paid',
    date: '2024-02-22',
    items: 1,
    orderValue: 'low',
    subtotal: 55.00,
    shippingCost: 10.00,
    tax: 2.99,
    shippingAddress: '987 Cedar Ln, Austin, TX 78701',
    paymentMethod: 'Visa ****7890',
    detailedItems: [
      { id: '1', productName: 'Sandalwood Serenity', scent: 'Sandalwood', size: '16oz Glass', quantity: 1, price: 55.00, total: 55.00 },
    ],
  },
  {
    id: '7',
    orderNumber: 'ORD-2024-007',
    customer: 'Jessica Brown',
    email: 'jessica@example.com',
    total: 142.75,
    status: 'shipped',
    paymentStatus: 'paid',
    date: '2024-02-18',
    items: 3,
    orderValue: 'medium',
    subtotal: 130.00,
    shippingCost: 9.00,
    tax: 3.75,
    shippingAddress: '147 Birch Way, Miami, FL 33101',
    trackingNumber: 'UPS789456123',
    paymentMethod: 'Visa ****1234',
    detailedItems: [
      { id: '1', productName: 'Floral Garden', scent: 'Floral', size: '26oz Glass', quantity: 1, price: 46.00, total: 46.00 },
      { id: '2', productName: 'Rose Elegance', scent: 'Rose', size: '16oz Glass', quantity: 1, price: 45.00, total: 45.00 },
      { id: '3', productName: 'Citrus Burst', scent: 'Citrus', size: '8oz Tin', quantity: 1, price: 38.00, total: 39.00 },
    ],
  },
  {
    id: '8',
    orderNumber: 'ORD-2024-008',
    customer: 'Robert Martinez',
    email: 'robert@example.com',
    total: 105.50,
    status: 'pending',
    paymentStatus: 'pending',
    date: '2024-02-25',
    items: 2,
    orderValue: 'low',
    subtotal: 93.00,
    shippingCost: 9.00,
    tax: 3.50,
    shippingAddress: '258 Spruce Ave, Chicago, IL 60601',
    paymentMethod: 'Pending',
    detailedItems: [
      { id: '1', productName: 'Lavender Dreams', scent: 'Lavender', size: '16oz Glass', quantity: 1, price: 42.00, total: 42.00 },
      { id: '2', productName: 'Amber Spice', scent: 'Amber', size: '8oz Tin', quantity: 1, price: 52.00, total: 51.00 },
    ],
  },
];

// Mock Sales Data (last 30 days)
export const mockSalesData: SalesMetric[] = [
  { date: 'Jan 26', sales: 4200, orders: 18 },
  { date: 'Jan 27', sales: 3800, orders: 16 },
  { date: 'Jan 28', sales: 5100, orders: 22 },
  { date: 'Jan 29', sales: 4900, orders: 21 },
  { date: 'Jan 30', sales: 6200, orders: 28 },
  { date: 'Jan 31', sales: 5800, orders: 25 },
  { date: 'Feb 1', sales: 4100, orders: 17 },
  { date: 'Feb 2', sales: 5500, orders: 24 },
  { date: 'Feb 3', sales: 6800, orders: 30 },
  { date: 'Feb 4', sales: 5300, orders: 23 },
  { date: 'Feb 5', sales: 4600, orders: 20 },
  { date: 'Feb 6', sales: 7100, orders: 31 },
  { date: 'Feb 7', sales: 6400, orders: 28 },
  { date: 'Feb 8', sales: 5900, orders: 26 },
  { date: 'Feb 9', sales: 6500, orders: 29 },
  { date: 'Feb 10', sales: 5200, orders: 22 },
  { date: 'Feb 11', sales: 6900, orders: 30 },
  { date: 'Feb 12', sales: 7200, orders: 32 },
  { date: 'Feb 13', sales: 6100, orders: 27 },
  { date: 'Feb 14', sales: 8100, orders: 36 },
  { date: 'Feb 15', sales: 7400, orders: 33 },
  { date: 'Feb 16', sales: 5800, orders: 25 },
  { date: 'Feb 17', sales: 6300, orders: 28 },
  { date: 'Feb 18', sales: 7600, orders: 34 },
  { date: 'Feb 19', sales: 6800, orders: 30 },
  { date: 'Feb 20', sales: 5500, orders: 24 },
  { date: 'Feb 21', sales: 7100, orders: 31 },
  { date: 'Feb 22', sales: 6900, orders: 30 },
  { date: 'Feb 23', sales: 7300, orders: 32 },
  { date: 'Feb 24', sales: 6200, orders: 27 },
];

// Dashboard Summary Stats
export const dashboardStats = {
  totalRevenue: '€185,420',
  totalOrders: 487,
  activeCustomers: 234,
  conversionRate: 3.24,
  topSeller: 'Amber Spice',
  lowStockCount: 2,
};

// Analytics Data - Revenue by Scent
export const revenueByScent = [
  { name: 'Lavender', value: 28500, percentage: 15.4 },
  { name: 'Sandalwood', value: 24200, percentage: 13.1 },
  { name: 'Vanilla', value: 31200, percentage: 16.9 },
  { name: 'Amber', value: 27800, percentage: 15.0 },
  { name: 'Rose', value: 22100, percentage: 11.9 },
  { name: 'Citrus', value: 18600, percentage: 10.0 },
  { name: 'Marine', value: 14000, percentage: 7.6 },
];

// Analytics Data - Sales by Packaging
export const salesByPackaging = [
  { name: '8oz Tin', value: 42, percentage: 28 },
  { name: '12oz Glass', value: 38, percentage: 25 },
  { name: '16oz Tin', value: 35, percentage: 23 },
  { name: '26oz Glass', value: 28, percentage: 19 },
  { name: 'Candle Trio', value: 12, percentage: 8 },
  { name: 'Gift Set', value: 5, percentage: 3 },
];

// Analytics Data - Customer Retention
export const customerRetention = [
  { period: 'Week 1', firstTime: 45, returning: 12 },
  { period: 'Week 2', firstTime: 52, returning: 28 },
  { period: 'Week 3', firstTime: 38, returning: 35 },
  { period: 'Week 4', firstTime: 61, returning: 42 },
];

// Analytics Data - Gross vs Net Sales
export const grossNetSalesData = mockSalesData.map((item) => ({
  ...item,
  grossSales: item.sales,
  netSales: Math.round(item.sales * 0.75), // Simplified: 25% reduction for net
}));

// Analytics Data - Top/Worst Sellers with return rate
export const bestSellers = [
  { id: '1', name: 'Rose Elegance', sales: 156, revenue: 7020, returnRate: 2.1 },
  { id: '5', name: 'Amber Spice', sales: 142, revenue: 7384, returnRate: 1.8 },
  { id: '8', name: 'Floral Garden', sales: 138, revenue: 6348, returnRate: 2.3 },
  { id: '3', name: 'Vanilla Sunset', sales: 127, revenue: 6096, returnRate: 2.9 },
  { id: '6', name: 'Citrus Burst', sales: 109, revenue: 4142, returnRate: 3.2 },
];

export const worstSellers = [
  { id: '4', name: 'Ocean Breeze', sales: 34, revenue: 1360, returnRate: 8.5 },
  { id: '7', name: 'Sandalwood Serenity', sales: 58, revenue: 3190, returnRate: 5.2 },
  { id: '2', name: 'Lavender Dreams', sales: 72, revenue: 3024, returnRate: 4.7 },
];

export const mostReturnedItems = [
  { id: '4', name: 'Ocean Breeze', totalSold: 34, returnCount: 6, returnRate: 17.6 },
  { id: '7', name: 'Sandalwood Serenity', totalSold: 58, returnCount: 8, returnRate: 13.8 },
  { id: '2', name: 'Lavender Dreams', totalSold: 72, returnCount: 10, returnRate: 13.9 },
];

// Packs Data (product bundles)
export const mockPacks = [
  {
    id: 'pack-1',
    name: 'Floral Romance',
    description: 'A collection of our finest floral scents',
    products: ['Rose Elegance', 'Floral Garden'],
    price: 89.99,
    originalPrice: 101.00,
    discount: 11,
    status: 'active',
    stock: 45,
    image: 'Floral Romance',
  },
  {
    id: 'pack-2',
    name: 'Spice & Warmth',
    description: 'Rich, warm scents for cozy moments',
    products: ['Amber Spice', 'Sandalwood Serenity'],
    price: 97.50,
    originalPrice: 110.00,
    discount: 11,
    status: 'active',
    stock: 32,
    image: 'Spice & Warmth',
  },
  {
    id: 'pack-3',
    name: 'Fresh Classics',
    description: 'Classic fresh scents for any season',
    products: ['Citrus Burst', 'Lavender Dreams'],
    price: 74.99,
    originalPrice: 84.00,
    discount: 11,
    status: 'active',
    stock: 58,
    image: 'Fresh Classics',
  },
  {
    id: 'pack-4',
    name: 'Luxury Collection',
    description: 'Premium scents in premium packaging',
    products: ['Rose Elegance', 'Amber Spice', 'Sandalwood Serenity'],
    price: 154.99,
    originalPrice: 175.00,
    discount: 11,
    status: 'draft',
    stock: 12,
    image: 'Luxury Collection',
  },
];

// Collections Data
export const mockCollections = [
  {
    id: 'col-1',
    name: 'Best Sellers',
    description: 'Our most popular products',
    itemCount: 5,
    status: 'active',
    visibility: 'public',
    products: ['Rose Elegance', 'Vanilla Sunset', 'Amber Spice'],
    packs: ['Floral Romance'],
  },
  {
    id: 'col-2',
    name: 'New Arrivals',
    description: 'Recently added to our catalog',
    itemCount: 8,
    status: 'active',
    visibility: 'public',
    products: ['Ocean Breeze', 'Marine Essence'],
    packs: [],
  },
  {
    id: 'col-3',
    name: 'Gift Sets',
    description: 'Perfect for gifting',
    itemCount: 6,
    status: 'active',
    visibility: 'public',
    products: ['Rose Elegance', 'Vanilla Sunset'],
    packs: ['Floral Romance', 'Spice & Warmth'],
  },
  {
    id: 'col-4',
    name: 'Summer Vibes',
    description: 'Light and refreshing scents',
    itemCount: 4,
    status: 'draft',
    visibility: 'hidden',
    products: ['Citrus Burst', 'Lavender Dreams'],
    packs: ['Fresh Classics'],
  },
];
