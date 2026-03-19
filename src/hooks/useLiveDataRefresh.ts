"use client";

import { useEffect, useMemo, useRef } from "react";

import {
  type LiveDataDomain,
  isSameContextScope,
  subscribeLiveData,
} from "@/lib/realtime/liveDataBus";

interface UseLiveDataRefreshOptions {
  context: string;
  domains: LiveDataDomain[];
  onRefresh: () => void | Promise<void>;
  enabled?: boolean;
  pollIntervalMs?: number;
  minRefreshGapMs?: number;
}

function isPromiseLike(value: unknown): value is PromiseLike<unknown> {
  return typeof value === "object" && value !== null && typeof (value as { then?: unknown }).then === "function";
}

export function useLiveDataRefresh({
  context,
  domains,
  onRefresh,
  enabled = true,
  pollIntervalMs = 0,
  minRefreshGapMs = 500,
}: UseLiveDataRefreshOptions): void {
  const onRefreshRef = useRef(onRefresh);
  const lastRunRef = useRef(0);
  const timeoutRef = useRef<number | null>(null);
  const refreshInFlightRef = useRef(false);
  const refreshQueuedRef = useRef(false);

  const domainKey = useMemo(() => Array.from(new Set(domains)).sort().join("|"), [domains]);
  const domainSet = useMemo(
    () => new Set((domainKey ? domainKey.split("|") : []) as LiveDataDomain[]),
    [domainKey],
  );

  useEffect(() => {
    onRefreshRef.current = onRefresh;
  }, [onRefresh]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let disposed = false;

    const enqueueRefresh = () => {
      if (disposed) {
        return;
      }

      if (refreshInFlightRef.current) {
        refreshQueuedRef.current = true;
        return;
      }

      const now = Date.now();
      const elapsed = now - lastRunRef.current;

      if (elapsed < minRefreshGapMs) {
        if (timeoutRef.current !== null) {
          return;
        }

        timeoutRef.current = window.setTimeout(() => {
          timeoutRef.current = null;
          enqueueRefresh();
        }, Math.max(minRefreshGapMs - elapsed, 50));
        return;
      }

      lastRunRef.current = now;
      refreshInFlightRef.current = true;

      const completeRefresh = () => {
        refreshInFlightRef.current = false;
        if (disposed) {
          return;
        }

        if (refreshQueuedRef.current) {
          refreshQueuedRef.current = false;
          enqueueRefresh();
        }
      };

      const result = onRefreshRef.current();
      if (isPromiseLike(result)) {
        void Promise.resolve(result)
          .catch(() => {
            // refresh failure is handled in caller state; keep bus resilient
          })
          .finally(completeRefresh);
        return;
      }

      completeRefresh();
    };

    const unsubscribe = subscribeLiveData((event) => {
      if (!isSameContextScope(event.context, context)) {
        return;
      }

      const hasOverlap = event.domains.some((domain) => domainSet.has(domain));
      if (!hasOverlap) {
        return;
      }

      enqueueRefresh();
    });

    const pollTimer = pollIntervalMs > 0
      ? window.setInterval(() => {
          enqueueRefresh();
        }, pollIntervalMs)
      : null;

    return () => {
      disposed = true;
      unsubscribe();
      if (pollTimer) {
        window.clearInterval(pollTimer);
      }
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      refreshInFlightRef.current = false;
      refreshQueuedRef.current = false;
    };
  }, [context, domainKey, domainSet, enabled, minRefreshGapMs, pollIntervalMs]);
}
