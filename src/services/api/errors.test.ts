import { AxiosError, AxiosHeaders } from 'axios';
import { describe, expect, it } from 'vitest';
import { normalizePage } from './pagination';
import { parseErrorPayload, toApiError } from './errors';

describe('error normalisation', () => {
  it('handles DRF payload shapes', () => {
    expect(parseErrorPayload({ detail: 'Nope' }).message).toBe('Nope');
    expect(parseErrorPayload({ error: 'Bad' }).message).toBe('Bad');
    expect(parseErrorPayload({ amount: ['Insufficient balance'] })).toEqual({ message: 'amount: Insufficient balance', fieldErrors: { amount: 'Insufficient balance' }, code: undefined });
    expect(parseErrorPayload('<html>500</html>').message).toBe('');
  });
  it('flags network errors as ambiguous unless the browser is known offline', () => {
    const err = toApiError(new AxiosError('Network Error', 'ERR_NETWORK', { headers: new AxiosHeaders() } as never));
    expect(err).toMatchObject({ status: null, isNetworkError: true, isAmbiguous: true });
  });
  it('normalises paginated and bare list responses', () => {
    expect(normalizePage([1, 2]).count).toBe(2);
    expect(normalizePage({ count: 30, next: 'x', previous: null, results: [1] })).toMatchObject({ count: 30, next: 'x' });
    expect(normalizePage(null).results).toEqual([]);
  });
});
