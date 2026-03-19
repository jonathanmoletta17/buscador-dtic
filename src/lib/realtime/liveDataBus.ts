"use client";

import { resolveRootContext } from "@/lib/api/client";

export type LiveDataDomain =
  | "tickets"
  | "dashboard"
  | "analytics"
  | "search"
  | "user"
  | "knowledge"
  | "permissions"
  | "inventory"
  | "chargers";

export type LiveDataSource = "mutation" | "sse" | "polling" | "broadcast";

export interface LiveDataEvent {
  context: string;
  domains: LiveDataDomain[];
  source: LiveDataSource;
  reason?: string;
  ticketId?: number;
  updatedAt: number;
}

type Listener = (event: LiveDataEvent) => void;

const CHANNEL_NAME = "tensor-aurora-live-data";
const listeners = new Set<Listener>();
let channel: BroadcastChannel | null = null;

function inBrowser(): boolean {
  return typeof window !== "undefined";
}

function normalizeContext(context: string): string {
  return resolveRootContext((context || "").trim().toLowerCase());
}

function uniqueDomains(domains: LiveDataDomain[]): LiveDataDomain[] {
  return Array.from(new Set(domains));
}

function dispatch(event: LiveDataEvent): void {
  listeners.forEach((listener) => {
    listener(event);
  });
}

function ensureChannel(): BroadcastChannel | null {
  if (!inBrowser() || typeof BroadcastChannel === "undefined") {
    return null;
  }

  if (channel) {
    return channel;
  }

  channel = new BroadcastChannel(CHANNEL_NAME);
  channel.onmessage = (message) => {
    const payload = message.data as Partial<LiveDataEvent> | null;
    if (!payload?.context || !Array.isArray(payload.domains)) {
      return;
    }

    const normalizedContext = normalizeContext(payload.context);
    if (!normalizedContext) {
      return;
    }

    dispatch({
      context: normalizedContext,
      domains: uniqueDomains(payload.domains as LiveDataDomain[]),
      source: "broadcast",
      reason: payload.reason,
      ticketId: payload.ticketId,
      updatedAt: Date.now(),
    });
  };

  return channel;
}

export function subscribeLiveData(listener: Listener): () => void {
  listeners.add(listener);
  ensureChannel();
  return () => {
    listeners.delete(listener);
  };
}

export function publishLiveDataEvent(input: {
  context: string;
  domains: LiveDataDomain[];
  source?: LiveDataSource;
  reason?: string;
  ticketId?: number;
  broadcast?: boolean;
}): void {
  const normalizedContext = normalizeContext(input.context);
  const normalizedDomains = uniqueDomains(input.domains);
  if (!normalizedContext || normalizedDomains.length === 0) {
    return;
  }

  const source = input.source ?? "mutation";
  const event: LiveDataEvent = {
    context: normalizedContext,
    domains: normalizedDomains,
    source,
    reason: input.reason,
    ticketId: input.ticketId,
    updatedAt: Date.now(),
  };

  dispatch(event);

  const shouldBroadcast = input.broadcast ?? source === "mutation";
  if (!shouldBroadcast) {
    return;
  }

  ensureChannel()?.postMessage(event);
}

export function isSameContextScope(left: string, right: string): boolean {
  return normalizeContext(left) === normalizeContext(right);
}

export function inferDomainsFromSsePayload(payload: Record<string, unknown>): LiveDataDomain[] {
  const itemType = String(payload.itemtype ?? "").toLowerCase();
  const itemTypeLink = String(payload.itemtype_link ?? "").toLowerCase();
  const userName = String(payload.user_name ?? "").toLowerCase();
  const message = [
    String(payload.message_log ?? ""),
    String(payload.content ?? ""),
    String(payload.old_value ?? ""),
    String(payload.new_value ?? ""),
    itemTypeLink,
    userName,
  ].join(" ").toLowerCase();

  const domains = new Set<LiveDataDomain>();

  if (itemType.includes("ticket") || message.includes("ticket")) {
    domains.add("tickets");
    domains.add("dashboard");
    domains.add("analytics");
    domains.add("search");
    domains.add("user");
    domains.add("chargers");
  }

  if (
    itemType.includes("knowbase")
    || itemType.includes("kb")
    || message.includes("knowbase")
    || message.includes("base de conhecimento")
  ) {
    domains.add("knowledge");
  }

  if (
    itemType.includes("group")
    || itemType.includes("profile")
    || itemType.includes("user")
    || message.includes("hub-app-")
    || message.includes("permiss")
  ) {
    domains.add("permissions");
  }

  if (
    itemType.includes("carregador")
    || message.includes("carregador")
    || message.includes("charger")
  ) {
    domains.add("chargers");
    domains.add("tickets");
    domains.add("dashboard");
    domains.add("analytics");
    domains.add("search");
  }

  if (
    itemType.includes("computer")
    || itemType.includes("monitor")
    || itemType.includes("printer")
    || itemType.includes("networkequipment")
    || itemType.includes("peripheral")
    || itemType.includes("phone")
    || itemType.includes("software")
    || itemTypeLink.includes("software")
    || userName.includes("inventory")
    || message.includes("inventario")
    || message.includes("patrimonio")
  ) {
    domains.add("inventory");
  }

  return Array.from(domains);
}
