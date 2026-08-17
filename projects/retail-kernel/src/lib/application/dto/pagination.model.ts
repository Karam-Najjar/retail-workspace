export interface PageRequest {
  readonly page: number;
  readonly pageSize: number;
}

export interface PagedResult<T> {
  readonly items: readonly T[];
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
  readonly totalPages: number;
}

export function emptyPagedResult<T>(page: number, pageSize: number): PagedResult<T> {
  return { items: [], total: 0, page, pageSize, totalPages: 0 };
}

export function createPagedResult<T>(items: readonly T[], total: number, page: number, pageSize: number): PagedResult<T> {
  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}
