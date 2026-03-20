import "server-only";

import { z } from "zod";

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const universeSchema = z.enum(["active", "historical"]);
const depthSchema = z.enum(["basic", "expanded"]);

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
  universe: universeSchema.optional(),
  requesttypes_id: z.string().optional(),
  entities_id: z.string().optional(),
  locations_id: z.string().optional(),
  technician_id: z.coerce.number().int().positive().optional(),
  category_id: z.coerce.number().int().positive().optional(),
  date_from: z.string().regex(DATE_REGEX, "date_from must be YYYY-MM-DD").optional(),
  date_to: z.string().regex(DATE_REGEX, "date_to must be YYYY-MM-DD").optional(),
});

export const statsQuerySchema = baseSchema.transform((value) => ({
  groupIds: parseCsvIntegers(value.group_ids),
  department: value.department?.trim() || undefined,
  universe: value.universe,
  requestTypeIds: parseCsvIntegers(value.requesttypes_id),
  entityIds: parseCsvIntegers(value.entities_id),
  locationIds: parseCsvIntegers(value.locations_id),
  technicianId: value.technician_id,
  categoryId: value.category_id,
  dateFrom: value.date_from,
  dateTo: value.date_to,
}));

export const listTicketsQuerySchema = baseSchema
  .extend({
    status: z.string().optional(),
    requester_id: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().min(1).max(500).default(100),
    offset: z.coerce.number().int().min(0).default(0),
  })
  .transform((value) => ({
    groupIds: parseCsvIntegers(value.group_ids),
    department: value.department?.trim() || undefined,
    universe: value.universe,
    requestTypeIds: parseCsvIntegers(value.requesttypes_id),
    entityIds: parseCsvIntegers(value.entities_id),
    locationIds: parseCsvIntegers(value.locations_id),
    technicianId: value.technician_id,
    categoryId: value.category_id,
    statusFilter: parseCsvIntegers(value.status),
    requesterId: value.requester_id,
    dateFrom: value.date_from,
    dateTo: value.date_to,
    limit: value.limit,
    offset: value.offset,
  }));

export const searchTicketsQuerySchema = baseSchema
  .extend({
    q: z.string().trim().min(1, "q is required"),
    status: z.string().optional(),
    depth: depthSchema.optional(),
    limit: z.coerce.number().int().min(1).max(200).default(50),
  })
  .transform((value) => ({
    query: value.q.trim(),
    department: value.department?.trim() || undefined,
    universe: value.universe,
    depth: value.depth,
    requestTypeIds: parseCsvIntegers(value.requesttypes_id),
    entityIds: parseCsvIntegers(value.entities_id),
    locationIds: parseCsvIntegers(value.locations_id),
    technicianId: value.technician_id,
    categoryId: value.category_id,
    statusFilter: parseCsvIntegers(value.status),
    dateFrom: value.date_from,
    dateTo: value.date_to,
    groupIds: parseCsvIntegers(value.group_ids),
    limit: value.limit,
  }));
