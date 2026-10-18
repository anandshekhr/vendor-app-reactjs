import { AxiosError } from 'axios';

export interface ApiError {
  status: number | null;
  message: string;
  fieldErrors: Record<string, string>;
  /** True when no HTTP response was received (offline, DNS, CORS, timeout). */
  isNetworkError: boolean;
  /** True when the request may have reached the server but we got no answer (timeout / connection reset). */
  isAmbiguous: boolean;
  code?: string;
  raw?: unknown;
}

function flatten(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map(flatten).filter(Boolean).join(' ');
  if (typeof value === 'object') return Object.values(value as Record<string, unknown>).map(flatten).filter(Boolean).join(' ');
  return String(value);
}

/** Converts DRF error payloads ({detail}, {error}, {field: [msg]}, [msg]) into one shape. */
export function parseErrorPayload(data: unknown): { message: string; fieldErrors: Record<string, string>; code?: string } {
  const fieldErrors: Record<string, string> = {};
  if (data === null || data === undefined || data === '') return { message: '', fieldErrors };
  if (typeof data === 'string') {
    // Django HTML error pages should not be shown verbatim.
    return { message: data.trim().startsWith('<') ? '' : data, fieldErrors };
  }
  if (Array.isArray(data)) return { message: flatten(data), fieldErrors };
  if (typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    const code = typeof obj.code === 'string' ? obj.code : undefined;
    let message = flatten(obj.detail ?? obj.error ?? obj.message ?? obj.non_field_errors ?? '');
    for (const [key, value] of Object.entries(obj)) {
      if (['detail', 'error', 'message', 'non_field_errors', 'code', 'messages'].includes(key)) continue;
      const text = flatten(value);
      if (text) fieldErrors[key] = text;
    }
    if (!message) message = Object.entries(fieldErrors).map(([k, v]) => `${k}: ${v}`).join(' ');
    return { message, fieldErrors, code };
  }
  return { message: String(data), fieldErrors };
}

export function toApiError(error: unknown): ApiError {
  if (error instanceof AxiosError) {
    if (error.response) {
      const { message, fieldErrors, code } = parseErrorPayload(error.response.data);
      const status = error.response.status;
      return {
        status,
        message: message || defaultMessage(status),
        fieldErrors,
        isNetworkError: false,
        isAmbiguous: status === 502 || status === 503 || status === 504,
        code,
        raw: error.response.data,
      };
    }
    const timedOut = error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT';
    const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
    return {
      status: null,
      message: offline
        ? 'You are offline. Check your internet connection.'
        : timedOut
          ? 'The server took too long to respond.'
          : 'Could not reach the server.',
      fieldErrors: {},
      isNetworkError: true,
      // When the browser already knows it is offline, the request never left the device.
      isAmbiguous: !offline,
      code: error.code,
    };
  }
  if (isApiError(error)) return error;
  return {
    status: null,
    message: error instanceof Error ? error.message : 'Something went wrong.',
    fieldErrors: {},
    isNetworkError: false,
    isAmbiguous: false,
  };
}

export function isApiError(value: unknown): value is ApiError {
  return typeof value === 'object' && value !== null && 'message' in value && 'fieldErrors' in value && 'isNetworkError' in value;
}

function defaultMessage(status: number): string {
  if (status === 400) return 'The request was rejected. Please check the details.';
  if (status === 401) return 'Your session has expired. Please sign in again.';
  if (status === 403) return 'You do not have permission to do this.';
  if (status === 404) return 'Not found.';
  if (status === 409) return 'This conflicts with the current state on the server.';
  if (status === 429) return 'Too many requests. Please wait a moment.';
  if (status >= 500) return 'The server encountered an error. Please try again.';
  return `Request failed (${status}).`;
}

/** Human-readable message for anything thrown by RTK Query / axios. */
export function errorMessage(error: unknown): string {
  if (!error) return '';
  if (isApiError(error)) return error.message;
  return toApiError(error).message;
}
