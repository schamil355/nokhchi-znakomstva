type RateLimiterOptions = {
  intervalMs: number;
  maxCalls: number;
};

export const createRateLimiter = ({ intervalMs, maxCalls }: RateLimiterOptions) => {
  let calls = 0;
  let queue: Array<() => void> = [];
  let windowStart = Date.now();

  const schedule = (resolve: () => void) => {
    queue.push(resolve);
    process();
  };

  const process = () => {
    const now = Date.now();
    if (now - windowStart > intervalMs) {
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
