// Product type definition
export type Product = {
  _id?: string;
  name: string;
  price: number;
  description?: string;
  category?: string;
  stock?: number;
  createdAt?: Date | string;
  updatedAt?: Date | string;
};

// Product creation input type
export type CreateProductInput = {
  name: string;
  price: number;
  description?: string;
  category?: string;
  stock?: number;
};

// Product update input type
export type UpdateProductInput = Partial<CreateProductInput>;

// Pagination response type
export type PaginatedResponse<T> = {
  products: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
};

// Product statistics type
export type ProductStats = {
  overview: {
    totalProducts: number;
    avgPrice: number;
    minPrice: number;
    maxPrice: number;
    totalStock: number;
  };
  byCategory: Array<{
    _id: string;
    count: number;
    avgPrice: number;
  }>;
};
