import "server-only";

import { getAppDbConfig } from "./config";

export function normalizeContext(context: string): string {
  const normalized = (context || "").trim().toLowerCase();
  if (normalized.startsWith("sis")) return "sis";
  if (normalized.startsWith("dtic")) return "dtic";
  return normalized;
}

export function isContextAllowed(context: string): boolean {
  return normalizeContext(context) === normalizeContext(getAppDbConfig().contextRoot);
}
