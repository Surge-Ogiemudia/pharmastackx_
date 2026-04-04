// User and Authentication Types
export interface User {
  _id?: string; // from mongodb
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  name?: string; // for user.name access
  profilePicture?: string;
  businessName?: string;
  slug?: string;
  phone: string;
  phoneNumber?: string; // used in some places
  state?: string;
  stateOfPractice?: string;
  city?: string;
  role: string; // Made more generic to support more roles
  isVerified: boolean;
  isStorePublished?: boolean;
  canManageStore?: boolean;
  reputationScore?: number;
  earnings?: number;
  createdAt: Date;
  updatedAt: Date;
  businessCoordinates?: {
    latitude: number;
    longitude: number;
  };
}

export interface Business extends User {
  businessName: string;
  businessType: string;
  licenseNumber: string;
  address: Address;
  isApproved: boolean;
  documents: Document[];
}

export interface Address {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
}

// Product and Medication Types
export interface Medication {
  id: string;
  name: string;
  description: string;
  category: string;
  manufacturer: string;
  dosage: string;
  price: number;
  stockQuantity: number;
  prescriptionRequired: boolean;
  activeIngredients: string[];
  sideEffects: string[];
  warnings: string[];
  expiryDate: Date;
  images: string[];
  businessId: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Category {
  id: string;
  name: string;
  description: string;
  parentId?: string;
  isActive: boolean;
}

// Order and Cart Types
export interface CartItem {
  medicationId: string;
  quantity: number;
  price: number;
}

export interface Order {
  id: string;
  customerId: string;
  businessId: string;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  deliveryFee: number;
  total: number;
  status: OrderStatus;
  deliveryAddress: Address;
  estimatedDeliveryTime: Date;
  actualDeliveryTime?: Date;
  paymentMethod: string;
  paymentStatus: PaymentStatus;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderItem {
  medicationId: string;
  medication: Medication;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export enum OrderStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  PREPARING = 'preparing',
  OUT_FOR_DELIVERY = 'out_for_delivery',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled'
}

export enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  FAILED = 'failed',
  REFUNDED = 'refunded'
}

// File Upload Types
export interface CSVUploadData {
  name: string;
  description: string;
  category: string;
  price: number;
  stockQuantity: number;
  manufacturer: string;
  dosage: string;
  prescriptionRequired: boolean;
  activeIngredients?: string;
  sideEffects?: string;
  warnings?: string;
  expiryDate: string;
}

export interface UploadResult {
  success: boolean;
  totalRows: number;
  successfulUploads: number;
  errors: UploadError[];
  createdMedications: Medication[];
}

export interface UploadError {
  row: number;
  field: string;
  message: string;
  data: any;
}

// Search and Filter Types
export interface SearchFilters {
  query?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  prescriptionRequired?: boolean;
  inStock?: boolean;
  businessId?: string;
  location?: {
    latitude: number;
    longitude: number;
    radius: number; // in kilometers
  };
}

export interface SearchResult {
  medications: MedicationWithBusiness[];
  total: number;
  page: number;
  limit: number;
}

export interface MedicationWithBusiness extends Medication {
  business: {
    id: string;
    businessName: string;
    address: Address;
    rating: number;
    deliveryTime: string;
    distance?: number; // calculated based on user location
  };
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Authentication Types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
  role: 'customer' | 'business';
  businessName?: string;
  businessType?: string;
  licenseNumber?: string;
  address?: Address;
}

export interface AuthResponse {
  user: User;
  token: string;
  refreshToken: string;
}

// Delivery and Location Types
export interface DeliveryZone {
  id: string;
  businessId: string;
  coordinates: number[][]; // polygon coordinates
  deliveryFee: number;
  estimatedDeliveryTime: number; // in minutes
  isActive: boolean;
}

export interface LocationService {
  getCurrentLocation(): Promise<{ latitude: number; longitude: number }>;
  calculateDistance(from: Address, to: Address): Promise<number>;
  getDeliveryEstimate(businessId: string, customerAddress: Address): Promise<{
    canDeliver: boolean;
    estimatedTime: number;
    deliveryFee: number;
  }>;
}

// Analytics Types
export interface BusinessAnalytics {
  totalOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  topSellingMedications: {
    medication: Medication;
    totalSold: number;
    revenue: number;
  }[];
  recentOrders: Order[];
  monthlyRevenue: {
    month: string;
    revenue: number;
  }[];
}

// Document Types for Business Verification
export interface Document {
  id: string;
  type: 'license' | 'certification' | 'identity' | 'other';
  url: string;
  filename: string;
  uploadedAt: Date;
  status: 'pending' | 'approved' | 'rejected';
}

// Notification Types
export interface Notification {
  id: string;
  userId: string;
  type: 'order' | 'delivery' | 'system' | 'promotion';
  title: string;
  message: string;
  isRead: boolean;
  createdAt: Date;
}

export default {}