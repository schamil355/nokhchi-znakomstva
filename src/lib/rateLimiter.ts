type RateLimiterOptions = {
  intervalMs: number;
  maxCalls: number;
};

export const createRateLimiter = ({ intervalMs, maxCalls }: RateLimiterOptions) => {
  let calls = 0;
  let queue: (() => void)[] = [];
  let windowStart = Date.now();
  let pendingTimer: NodeJS.Timeout | null = null;

  const schedule = (resolve: () => void) => {
    queue.push(resolve);
    process();
  };

  const process = () => {
    const now = Date.now();
    if (now - windowStart >= intervalMs) {
      windowStart = now;
      calls = 0;
    }

    while (queue.length && calls < maxCalls) {
      const fn = queue.shift();
      if (fn) {
        calls += 1;
        fn();
      }
    }

    if (!queue.length && pendingTimer) {
      clearTimeout(pendingTimer);
      pendingTimer = null;
    }

    if (queue.length && calls >= maxCalls && !pendingTimer) {
      const wait = Math.max(0, intervalMs - (now - windowStart));
      pendingTimer = setTimeout(() => {
        pendingTimer = null;
        process();
      }, wait);
    }
  };

  const acquire = async () =>
    new Promise<void>((resolve) => {
      schedule(resolve);
    });

  return async <T>(fn: () => Promise<T>): Promise<T> => {
    await acquire();
    try {
      return await fn();
    } finally {
      setTimeout(process, 0);
    }
  };
};
