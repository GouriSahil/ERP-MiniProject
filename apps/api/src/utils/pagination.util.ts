export interface PaginationOptions {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const getPaginationParams = (query: any): PaginationOptions => {
  return {
    page: parseInt(query.page) || 1,
    limit: parseInt(query.limit) || 10,
    search: query.search || '',
    sortBy: query.sortBy || 'createdAt',
    sortOrder: query.sortOrder === 'asc' ? 'asc' : 'desc'
  };
};

export const buildPaginationMeta = (page: number, limit: number, total: number) => {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit)
  };
};

export const buildSearchFilter = (searchFields: string[], searchTerm: string) => {
  if (!searchTerm) {
    return {};
  }

  return {
    $or: searchFields.map(field => ({
      [field]: { $regex: searchTerm, $options: 'i' }
    }))
  };
};
