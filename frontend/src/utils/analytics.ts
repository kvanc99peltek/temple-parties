import { track } from '@vercel/analytics';
import posthog from 'posthog-js';

type Props = Record<string, unknown>;

const schedule = (fn: () => void) => {
  if (typeof window === 'undefined') {
    fn();
    return;
  }
  const ric = (window as unknown as { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => void }).requestIdleCallback;
  if (ric) {
    ric(fn, { timeout: 1000 });
  } else {
    setTimeout(fn, 0);
  }
};

export function trackEvent(name: string, props?: Props) {
  schedule(() => {
    try {
      track(name, props as Parameters<typeof track>[1]);
      posthog.capture(name, props);
    } catch {
      // analytics must never throw into the app
    }
  });
}
