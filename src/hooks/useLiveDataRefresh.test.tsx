import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { LiveDataEvent } from "@/lib/realtime/liveDataBus";
import { useLiveDataRefresh } from "./useLiveDataRefresh";

const { subscribeLiveDataMock, isSameContextScopeMock } = vi.hoisted(() => ({
  subscribeLiveDataMock: vi.fn(),
  isSameContextScopeMock: vi.fn((left: string, right: string) => left === right),
}));

vi.mock("@/lib/realtime/liveDataBus", () => ({
  subscribeLiveData: subscribeLiveDataMock,
  isSameContextScope: isSameContextScopeMock,
}));

function setVisibility(state: DocumentVisibilityState): void {
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    get: () => state,
  });
}

describe("useLiveDataRefresh", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    setVisibility("visible");
    subscribeLiveDataMock.mockImplementation(() => () => {});
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("nao faz polling com aba oculta e executa refresh unico ao voltar visivel", () => {
    const onRefresh = vi.fn();
    setVisibility("hidden");

    renderHook(() =>
      useLiveDataRefresh({
        context: "dtic",
        domains: ["search"],
        onRefresh,
        enabled: true,
        pollIntervalMs: 1000,
        pauseWhenHidden: true,
      }),
    );

    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(onRefresh).not.toHaveBeenCalled();

    setVisibility("visible");
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });

    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it("respeita minRefreshGapMs com fake timers", () => {
    const onRefresh = vi.fn();

    renderHook(() =>
      useLiveDataRefresh({
        context: "dtic",
        domains: ["search"],
        onRefresh,
        enabled: true,
        pollIntervalMs: 1000,
        minRefreshGapMs: 2500,
      }),
    );

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(onRefresh).toHaveBeenCalledTimes(1);

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(onRefresh).toHaveBeenCalledTimes(1);

    act(() => {
      vi.advanceTimersByTime(1500);
    });
    expect(onRefresh).toHaveBeenCalledTimes(2);
  });

  it("executa refresh por evento quando contexto e dominio coincidem", () => {
    const onRefresh = vi.fn();
    let listener: ((event: LiveDataEvent) => void) | null = null;

    subscribeLiveDataMock.mockImplementation((input: (event: LiveDataEvent) => void) => {
      listener = input;
      return () => {
        listener = null;
      };
    });

    renderHook(() =>
      useLiveDataRefresh({
        context: "dtic",
        domains: ["search", "tickets"],
        onRefresh,
        enabled: true,
      }),
    );

    act(() => {
      listener?.({
        context: "dtic",
        domains: ["search"],
        source: "polling",
        updatedAt: Date.now(),
      });
    });

    expect(onRefresh).toHaveBeenCalledTimes(1);
  });
});
