import "server-only";

import { z } from "zod";

const envSchema = z.object({
  GLPI_DB_HOST: z.string().min(1),
  GLPI_DB_PORT: z.coerce.number().int().positive().default(3306),
  GLPI_DB_USER: z.string().min(1),
  GLPI_DB_PASSWORD: z.string().default(""),
  GLPI_DB_NAME: z.string().min(1),
  GLPI_DB_POOL_LIMIT: z.coerce.number().int().positive().default(10),
  APP_CONTEXT_ROOT: z.string().default("dtic"),
  APP_CATEGORY_FILTER: z.string().optional(),
  APP_DB_TIMEZONE: z.string().default("-03:00"),
});

export interface AppDbConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  poolLimit: number;
  contextRoot: string;
  categoryFilter?: string;
  timezone: string;
}

let cachedConfig: AppDbConfig | null = null;

export function getAppDbConfig(): AppDbConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  const parsedEnv = envSchema.safeParse(process.env);
  if (!parsedEnv.success) {
    const issues = parsedEnv.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new Error(`Invalid environment for database API: ${issues}`);
  }

  const env = parsedEnv.data;
  cachedConfig = {
    host: env.GLPI_DB_HOST,
    port: env.GLPI_DB_PORT,
    user: env.GLPI_DB_USER,
    password: env.GLPI_DB_PASSWORD,
    database: env.GLPI_DB_NAME,
    poolLimit: env.GLPI_DB_POOL_LIMIT,
    contextRoot: env.APP_CONTEXT_ROOT.trim().toLowerCase(),
    categoryFilter: env.APP_CATEGORY_FILTER?.trim() || undefined,
    timezone: env.APP_DB_TIMEZONE.trim(),
  };

  return cachedConfig;
}
