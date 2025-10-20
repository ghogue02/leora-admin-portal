import { useState, useMemo } from 'react';

export interface PaginationState {
  page: number;
  pageSize: number;
  total: number;
}

export interface PaginationControls {
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  goToPage: (page: number) => void;
  nextPage: () => void;
  previousPage: () => void;
  setPageSize: (size: number) => void;
  setTotal: (total: number) => void;
  offset: number;
  limit: number;
}

export function usePagination(
  initialPageSize: number = 50
): PaginationControls {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [total, setTotal] = useState(0);

  const totalPages = useMemo(() => {
    return Math.ceil(total / pageSize);
  }, [total, pageSize]);

  const hasNextPage = page < totalPages;
  const hasPreviousPage = page > 1;

  const goToPage = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
    }
  };

  const nextPage = () => {
    if (hasNextPage) {
      setPage((p) => p + 1);
    }
  };

  const previousPage = () => {
    if (hasPreviousPage) {
      setPage((p) => p - 1);
    }
  };

  const handleSetPageSize = (size: number) => {
    setPageSize(size);
    setPage(1); // Reset to first page when changing page size
  };

  const offset = (page - 1) * pageSize;
  const limit = pageSize;

  return {
    page,
    pageSize,
    totalPages,
    hasNextPage,
    hasPreviousPage,
    goToPage,
    nextPage,
    previousPage,
    setPageSize: handleSetPageSize,
    setTotal,
    offset,
    limit,
  };
}
