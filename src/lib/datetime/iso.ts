declare const isoDateTimeBrand: unique symbol;

export type IsoDateTimeString = string & {
  readonly [isoDateTimeBrand]: "IsoDateTimeString";
};

export function asIsoDateTimeString(value: string): IsoDateTimeString {
  return value as IsoDateTimeString;
}

export function toIsoDateTimeOrNull(value: string | null | undefined): IsoDateTimeString | null {
  return value ? asIsoDateTimeString(value) : null;
}

export function toIsoDateTimeOrUndefined(value: string | null | undefined): IsoDateTimeString | undefined {
  return value ? asIsoDateTimeString(value) : undefined;
}

export function toDateOrNull(value: IsoDateTimeString | string | null | undefined): Date | null {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function compareIsoDateDesc(
  left: IsoDateTimeString | string | null | undefined,
  right: IsoDateTimeString | string | null | undefined,
): number {
  return (toDateOrNull(right)?.getTime() ?? 0) - (toDateOrNull(left)?.getTime() ?? 0);
}

export function formatIsoDate(
  value: IsoDateTimeString | string | null | undefined,
  locale = "pt-BR",
): string {
  const parsed = toDateOrNull(value);
  return parsed
    ? parsed.toLocaleDateString(locale, {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : "";
}

export function formatIsoTime(
  value: IsoDateTimeString | string | null | undefined,
  locale = "pt-BR",
): string {
  const parsed = toDateOrNull(value);
  return parsed
    ? parsed.toLocaleTimeString(locale, {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";
}

export function formatIsoDateTime(
  value: IsoDateTimeString | string | null | undefined,
  locale = "pt-BR",
): string {
  const parsed = toDateOrNull(value);
  return parsed
    ? parsed.toLocaleString(locale, {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";
}

export function minutesSince(
  value: IsoDateTimeString | string | null | undefined,
  now: Date = new Date(),
): number | null {
  const parsed = toDateOrNull(value);
  if (!parsed) {
    return null;
  }
  return Math.max(Math.floor((now.getTime() - parsed.getTime()) / 60000), 0);
}

export function formatElapsedSince(
  value: IsoDateTimeString | string | null | undefined,
  now: Date = new Date(),
): string | null {
  const minutes = minutesSince(value, now);
  if (minutes === null) {
    return null;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
}
