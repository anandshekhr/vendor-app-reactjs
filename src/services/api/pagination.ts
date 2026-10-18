export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

/** DRF returns either a paginated envelope or a bare list depending on the view. Normalise to the envelope. */
export function normalizePage<T>(data: unknown): Paginated<T> {
  if (Array.isArray(data)) return { count: data.length, next: null, previous: null, results: data as T[] };
  if (data && typeof data === 'object' && Array.isArray((data as Paginated<T>).results)) {
    const page = data as Paginated<T>;
    return { count: page.count ?? page.results.length, next: page.next ?? null, previous: page.previous ?? null, results: page.results };
  }
  return { count: 0, next: null, previous: null, results: [] };
}

export const DRF_PAGE_SIZE = 10;
