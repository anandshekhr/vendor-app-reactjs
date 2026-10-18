import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui';
import { DRF_PAGE_SIZE } from '@/services/api/pagination';

export function Pagination({
  page,
  count,
  pageSize = DRF_PAGE_SIZE,
  hasNext,
  onPageChange,
}: {
  page: number;
  count: number;
  pageSize?: number;
  hasNext?: boolean;
  onPageChange: (page: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(count / pageSize));
  const from = count === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(count, page * pageSize);
  const next = hasNext ?? page < totalPages;
  return (
    <nav className="flex items-center justify-between gap-3 border-t border-line px-4 py-3 text-sm" aria-label="Pagination">
      <p className="text-ink-muted tabular">
        {count === 0 ? 'No results' : `${from}–${to} of ${count}`}
      </p>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => onPageChange(page - 1)} disabled={page <= 1} aria-label="Previous page">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-ink-muted tabular">
          Page {page} of {totalPages}
        </span>
        <Button variant="outline" size="sm" onClick={() => onPageChange(page + 1)} disabled={!next} aria-label="Next page">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </nav>
  );
}
