type Fetch = typeof fetch;

declare global {
  var __NETWORK_LOGGER_INSTALLED__: boolean | undefined;
}

const formatHeaders = (headers: HeadersInit | undefined) => {
  if (!headers) {
    return {};
  }

  if (headers instanceof Headers) {
    const result: Record<string, string> = {};
    headers.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }

  return headers;
};

export const enableNetworkLogging = () => {
  if (globalThis.__NETWORK_LOGGER_INSTALLED__) {
    return;
  }

  const originalFetch: Fetch = globalThis.fetch;

  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    const method = init?.method ?? (input instanceof Request ? input.method : "GET");
    const requestHeaders = formatHeaders(init?.headers ?? (input instanceof Request ? input.headers : undefined));
    const startedAt = Date.now();

    console.log(`[HTTP] ➡️ ${method} ${url}`, { headers: requestHeaders });

    try {
      const response = await originalFetch(input, init);
      const duration = Date.now() - startedAt;

      console.log(`[HTTP] ⬅️ ${method} ${url} - ${response.status} (${duration}ms)`);

      if (!response.ok) {
        console.warn(`[HTTP] ⚠️ ${method} ${url} failed with status ${response.status}`);
      }

      return response;
    } catch (error: any) {
      const duration = Date.now() - startedAt;
      console.error(`[HTTP] ❌ ${method} ${url} failed after ${duration}ms`, error);
      throw error;
    }
  };

  globalThis.__NETWORK_LOGGER_INSTALLED__ = true;
};
