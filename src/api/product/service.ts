import client from '../client';
import { CategoryDto, CharacteristicDto } from '@/src/types/category';
import * as SecureStore from 'expo-secure-store';

// ── Product Status / State ───────────────────────────────────────────────────

export type ProductStatus = 'ALLOUER' | 'VENDRE';

export type ProductState =
  | 'PENDING'
  | 'REJECTED'
  | 'VALIDATED'
  | 'PAYED'
  | 'PAYMENT_VERIFIED'
  | 'PUBLISHED';

// ── Categories / Characteristics ─────────────────────────────────────────────

export const getPropertyCategories = async (): Promise<CategoryDto[]> => {
  const response = await client.get('/api/akkarak/liste-type-categories');
  return response.data;
};

export const getCategoryCharacteristics = async (
  codeUuid: string
): Promise<CharacteristicDto[]> => {
  const response = await client.get(
    `/api/akkarak/${codeUuid}/liste-caracteristiques`
  );

  return response.data;
};

export const getPaidFeesByAmount = async (
  montant: number
): Promise<{ frais: number }> => {
  const response = await client.get(
    `/api/akkarak/${montant}/afficher-frais-payee`
  );

  return response.data;
};

// ── Create Product ───────────────────────────────────────────────────────────

export type CreateProductPayload = {
  product: {
    title: string;
    description: string;
    price: number;
    status: ProductStatus | string;
    categoryId: number;
    zoneId: number;
    latitude: number;
    longitude: number;
    telContact: string;
    whatsapp: string;
    attributes: Record<string, any>;
  };
};

export type CreateProductResponse = {
  success: boolean;
  message: string;
  productId: number;
};

export const createProduct = async (
  payload: CreateProductPayload
): Promise<CreateProductResponse> => {
  const response = await client.post('/product/ajouter-produit', payload);
  return response.data;
};

// ── Shared Product Types ─────────────────────────────────────────────────────

export type ProductAttribute = {
  attributeName: string;
  value: string;
};

export type ProductListItemBase = {
  codeUuid: string;
  title: string;
  status: ProductStatus;
  state: ProductState;
  price: number;
  categoryName: string;
  zoneName: string;
  cityName?: string;
  images: string[];
  createdAt?: string;
};

export type PaginatedProductsResponse<T> = {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
};

// ── My Products ──────────────────────────────────────────────────────────────

export type MyProductItem = ProductListItemBase;

export type MyProductsResponse = PaginatedProductsResponse<MyProductItem>;

export const getMyProducts = async (
  page = 0,
  size = 10
): Promise<MyProductsResponse> => {
  const response = await client.get('/product/my-products', {
    params: { page, size },
  });

  console.log('MY PRODUCTS RESPONSE:', JSON.stringify(response.data, null, 2));

  return response.data;
};

// ── Product Details ──────────────────────────────────────────────────────────

export type ProductOwner = {
  user_id: number;
  fullName: string;
  telephone: string;
  whatsapp: string;
  userType: 'SIMPLE_USER' | string;
};

export type ProductDetails = {
  codeUuid: string;
  title: string;
  description: string;
  status: ProductStatus;
  state: ProductState;
  price: number;
  latitude: number;
  longitude: number;
  fees: number;
  categoryName: string;
  zoneName: string;
  cityName?: string;
  images: string[];
  video?: string;
  attributes: ProductAttribute[];
  owner: ProductOwner;
  createdAt?: string;
};

export const getProductByCodeUuid = async (
  codeUuid: string
): Promise<ProductDetails> => {
  const response = await client.get(`/product/${codeUuid}`);
  return response.data;
};

// ── Public Products ──────────────────────────────────────────────────────────

export type PublicProductItem = ProductListItemBase;

export type PublicProductsResponse = PaginatedProductsResponse<PublicProductItem>;

export const getPublicProducts = async (
  page = 0,
  size = 10
): Promise<PublicProductsResponse> => {
  const response = await client.get('/product/public', {
    params: { page, size },
  });

  console.log('PUBLIC PRODUCTS RESPONSE:', JSON.stringify(response.data, null, 2));

  return response.data;
};

// ── Product Payment ──────────────────────────────────────────────────────────

// ── Product Payment ──────────────────────────────────────────────────────────

export type PaymentTransactionFile = {
  uri: string;
  name: string;
  mimeType?: string;
};

export type SubmitProductPaymentParams = {
  number_phone: string;
  amount: number;
  code_uuid: string;
  file_transaction: PaymentTransactionFile;
};

export type SubmitProductPaymentResponse = {
  success?: boolean;
  message?: string;
  [key: string]: any;
};

const getStoredAuthToken = async () => {
  // Mets ici la même clé utilisée dans ton client.ts
  const possibleKeys = ['token', 'accessToken', 'authToken', 'jwt'];

  for (const key of possibleKeys) {
    const value = await SecureStore.getItemAsync(key);

    if (value) {
      return value;
    }
  }

  return null;
};

export const submitProductPayment = async (
  params: SubmitProductPaymentParams
): Promise<SubmitProductPaymentResponse> => {
  const token = await getStoredAuthToken();

  if (!token) {
    throw {
      message: 'Token missing',
      response: {
        status: 401,
        data: {
          message: 'جلسة المستخدم منتهية، يرجى تسجيل الدخول من جديد',
        },
      },
    };
  }

  const formData = new FormData();

  formData.append('file_transaction', {
    uri: params.file_transaction.uri,
    name: params.file_transaction.name || 'transaction-image.jpg',
    type: params.file_transaction.mimeType || 'image/jpeg',
  } as any);

  const query = new URLSearchParams({
    number_phone: params.number_phone,
    amount: String(params.amount),
    code_uuid: params.code_uuid,
  }).toString();

  const baseURL = client.defaults.baseURL;

  if (!baseURL) {
    throw new Error('Base URL is missing in API client');
  }

  // Backend spelling: payement, not payment
  const url = `${baseURL}/product/payement?${query}`;

  console.log('PAYMENT FETCH URL:', url);
  console.log('PAYMENT FETCH FILE:', {
    uri: params.file_transaction.uri,
    name: params.file_transaction.name,
    mimeType: params.file_transaction.mimeType,
  });

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,

      // IMPORTANT:
      // Ne pas mettre Content-Type ici.
      // fetch va générer automatiquement multipart/form-data + boundary.
    },
    body: formData,
  });

  const text = await response.text();

  let data: any = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  console.log('PAYMENT FETCH STATUS:', response.status);
  console.log('PAYMENT FETCH RESPONSE:', data);

  if (!response.ok) {
    throw {
      message: `Request failed with status ${response.status}`,
      response: {
        status: response.status,
        data,
      },
    };
  }

  return data;
};