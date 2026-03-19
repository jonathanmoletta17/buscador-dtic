import "server-only";

import { z } from "zod";

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function parseCsvIntegers(value: string | undefined): number[] | undefined {
  if (!value) return undefined;

  const values = value
    .split(",")
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isInteger(item) && item > 0);

  return values.length ? values : undefined;
}

const baseSchema = z.object({
  group_ids: z.string().optional(),
  department: z.string().optional(),
});

export const statsQuerySchema = baseSchema.transform((value) => ({
  groupIds: parseCsvIntegers(value.group_ids),
  department: value.department?.trim() || undefined,
}));

export const listTicketsQuerySchema = baseSchema
  .extend({
    status: z.string().optional(),
    requester_id: z.coerce.number().int().positive().optional(),
    date_from: z.string().regex(DATE_REGEX, "date_from must be YYYY-MM-DD").optional(),
    date_to: z.string().regex(DATE_REGEX, "date_to must be YYYY-MM-DD").optional(),
    limit: z.coerce.number().int().min(1).max(500).default(100),
    offset: z.coerce.number().int().min(0).default(0),
  })
  .transform((value) => ({
    groupIds: parseCsvIntegers(value.group_ids),
    department: value.department?.trim() || undefined,
    statusFilter: parseCsvIntegers(value.status),
    requesterId: value.requester_id,
    dateFrom: value.date_from,
    dateTo: value.date_to,
    limit: value.limit,
    offset: value.offset,
  }));

export const searchTicketsQuerySchema = z
  .object({
    q: z.string().trim().min(1, "q is required"),
    department: z.string().optional(),
    status: z.string().optional(),
    limit: z.coerce.number().int().min(1).max(200).default(50),
  })
  .transform((value) => ({
    query: value.q.trim(),
    department: value.department?.trim() || undefined,
    statusFilter: parseCsvIntegers(value.status),
    limit: value.limit,
  }));
