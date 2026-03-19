import "server-only";

import mysql, { type Pool } from "mysql2/promise";

import { getAppDbConfig } from "./config";

declare global {
  var __glpiPool: Pool | undefined;
}

function createPool(): Pool {
  const appDbConfig = getAppDbConfig();

  return mysql.createPool({
    host: appDbConfig.host,
    port: appDbConfig.port,
    user: appDbConfig.user,
    password: appDbConfig.password,
    database: appDbConfig.database,
    connectionLimit: appDbConfig.poolLimit,
    waitForConnections: true,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10_000,
    timezone: appDbConfig.timezone,
    dateStrings: true,
  });
}

export function getDbPool(): Pool {
  if (globalThis.__glpiPool) {
    return globalThis.__glpiPool;
  }

  const pool = createPool();

  if (process.env.NODE_ENV !== "production") {
    globalThis.__glpiPool = pool;
  }

  return pool;
}
