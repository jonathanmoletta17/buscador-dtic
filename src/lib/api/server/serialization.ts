import "server-only";

const STATUS_MAP: Record<number, string> = {
  1: "Novo",
  2: "Em Atendimento",
  3: "Planejado",
  4: "Pendente",
  5: "Solucionado",
  6: "Fechado",
};

const URGENCY_MAP: Record<number, string> = {
  1: "Muito Baixa",
  2: "Baixa",
  3: "Media",
  4: "Alta",
  5: "Muito Alta",
};

function decodeEntities(text: string): string {
  return text
    .replace(/&#(\d+);/g, (_m, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_m, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

export function cleanHtml(value: string | null | undefined): string {
  if (!value) return "";

  return decodeEntities(value)
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 500);
}

export function serializeDateTime(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const raw = String(value);
  if (!raw || raw === "0000-00-00 00:00:00") return null;

  const normalized = raw.includes("T") ? raw : raw.replace(" ", "T");
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    return normalized;
  }

  return parsed.toISOString();
}

export function statusLabelFromId(statusId: number): string {
  return STATUS_MAP[statusId] ?? `Status ${statusId}`;
}

export function urgencyLabelFromId(urgencyId: number): string {
  return URGENCY_MAP[urgencyId] ?? `Urgencia ${urgencyId}`;
}
