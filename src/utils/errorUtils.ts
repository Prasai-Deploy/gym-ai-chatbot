/**
 * Utility to recognize structured entitlement denial errors.
 * Backend emits { success: false, error: { code: 'SUBSCRIPTION_REQUIRED', ... } } on HTTP 403.
 *
 * CRITICAL RULE:
 * Do NOT treat every HTTP 403 as a subscription error.
 * A 403 can also represent RBAC denials, tenant boundary violations, or resource authorization failures.
 * Only the explicit error code 'SUBSCRIPTION_REQUIRED' must trigger subscription gates.
 */
export function isSubscriptionRequiredError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const err = error as Record<string, any>;

  // Check custom error code directly attached by httpClient interceptor or coachApi
  if (err.code === 'SUBSCRIPTION_REQUIRED') {
    return true;
  }

  // Check response body structures
  if (err.response?.data?.error?.code === 'SUBSCRIPTION_REQUIRED') {
    return true;
  }

  if (err.response?.data?.code === 'SUBSCRIPTION_REQUIRED') {
    return true;
  }

  if (err.data?.error?.code === 'SUBSCRIPTION_REQUIRED') {
    return true;
  }

  if (err.data?.code === 'SUBSCRIPTION_REQUIRED') {
    return true;
  }

  return false;
}

/**
 * STRIVA V2 — DB-4N: Error Retryability Classification
 *
 * Classifies an error as an eligible offline/retryable network event.
 *
 * RULES:
 * 1. Queue ONLY for genuine connectivity drops (offline, DNS failure, timeout, no response).
 * 2. Transient gateway errors (HTTP 503 Service Unavailable, 504 Gateway Timeout) may be queued if supported.
 * 3. NEVER queue definitive application responses:
 *    - 400 Bad Request
 *    - 401 Unauthorized
 *    - 403 Forbidden
 *    - 404 Not Found
 *    - 409 Conflict
 *    - 422 Unprocessable Entity
 *    - 500 Internal Server Error (indicates application logic bug, not a client offline state)
 */
export function isRetryableNetworkError(error: unknown): boolean {
  if (!error) return false;

  // 1. Explicit browser offline status
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return true;
  }

  const err = error as Record<string, any>;

  // 2. Definitive HTTP status response from server
  const status = err.response?.status ?? err.status;
  if (typeof status === 'number') {
    // 503 and 504 are transient gateway states that can be retried
    if (status === 503 || status === 504) {
      return true;
    }
    // All other HTTP status codes (400, 401, 403, 404, 409, 422, 500, etc.) are definitive
    return false;
  }

  // 3. Axios or network error codes
  if (
    err.code === 'ERR_NETWORK' ||
    err.code === 'ECONNABORTED' ||
    err.code === 'ETIMEDOUT' ||
    err.code === 'ENOTFOUND'
  ) {
    return true;
  }

  // 4. Fallback check for missing response (standard network error without status)
  if (!err.response && (err.message?.includes('Network Error') || err.message?.includes('network') || err.message?.includes('Failed to fetch'))) {
    return true;
  }

  return false;
}

