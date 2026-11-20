export type MyProductItem = {
  codeUuid: string;
  title: string;
  status: 'ALLOUER' | 'VENDRE';
  state: 'PENDING' | 'ACTIVE' | 'REJECTED' | 'EXPIRED';
  price: number;
  categoryName: string;
  zoneName: string;
  images: string[];
};

export type MyProductsResponse = {
  content: MyProductItem[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
};