export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

const DEFAULT_GET_CACHE_TTL_MS = 2 * 60 * 1000;

type ApiRequestOptions = RequestInit & {
  cacheTtlMs?: number;
  skipCache?: boolean;
  invalidateCache?: boolean;
};

type CacheEntry = {
  expiresAt: number;
  value: unknown;
};

// Keep fetchApi compatible with the pre-existing untyped call sites while cache support is centralized here.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ApiResponse = any;

const responseCache = new Map<string, CacheEntry>();
const pendingRequests = new Map<string, Promise<unknown>>();
let cacheVersion = 0;

function cloneCachedValue<T>(value: T): T {
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }

  return JSON.parse(JSON.stringify(value)) as T;
}

function getCacheKey(endpoint: string) {
  return endpoint;
}

export function clearApiCache() {
  cacheVersion += 1;
  responseCache.clear();
  pendingRequests.clear();
}

async function readResponse(response: Response) {
  if (response.status === 204) {
    return null;
  }

  return response.json();
}

async function requestApi(endpoint: string, fetchOptions: RequestInit) {
  const isFormData = fetchOptions.body instanceof FormData;
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...fetchOptions,
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...fetchOptions.headers,
    },
    credentials: 'include',
  });

  if (!response.ok) {
    let errorMsg = 'An error occurred';
    try {
      const errorData = await response.json();
      errorMsg = errorData.error || errorMsg;
    } catch {
      // Ignore
    }
    throw new Error(errorMsg);
  }

  return readResponse(response);
}

export async function fetchApi<T = ApiResponse>(endpoint: string, options: ApiRequestOptions = {}): Promise<T> {
  const {
    cacheTtlMs = DEFAULT_GET_CACHE_TTL_MS,
    skipCache = false,
    invalidateCache = true,
    ...fetchOptions
  } = options;
  const method = (fetchOptions.method || "GET").toUpperCase();
  const shouldUseCache = method === "GET" && !skipCache && cacheTtlMs > 0;
  const cacheKey = getCacheKey(endpoint);

  if (!shouldUseCache) {
    const data = await requestApi(endpoint, fetchOptions);

    if (method !== "GET" && invalidateCache) {
      clearApiCache();
    }

    return cloneCachedValue(data) as T;
  }

  const cached = responseCache.get(cacheKey);

  if (cached && cached.expiresAt > Date.now()) {
    return cloneCachedValue(cached.value) as T;
  }

  const pendingRequest = pendingRequests.get(cacheKey);

  if (pendingRequest) {
    return cloneCachedValue(await pendingRequest) as T;
  }

  const requestCacheVersion = cacheVersion;
  const request = requestApi(endpoint, fetchOptions).then((data) => {
    if (requestCacheVersion === cacheVersion) {
      responseCache.set(cacheKey, {
        expiresAt: Date.now() + cacheTtlMs,
        value: cloneCachedValue(data),
      });
    }

    return data;
  });

  pendingRequests.set(cacheKey, request);

  try {
    return cloneCachedValue(await request) as T;
  } finally {
    pendingRequests.delete(cacheKey);
  }
}
