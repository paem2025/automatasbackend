import mysql, { Pool, RowDataPacket } from "mysql2/promise";
import { SimulationRequest, SimulationResponse } from "../simulator/types.js";

interface SimulationHistoryRow extends RowDataPacket {
  id: number;
  delivered: 0 | 1;
  detected_protocol: string;
  reason: string;
  request_json: string;
  response_json: string;
  created_at: Date;
}

let pool: Pool | null = null;
let initialized = false;
let lastError: string | null = null;

export function getSimulationHistoryStorageStatus() {
  return {
    enabled: isDatabaseEnabled(),
    connected: initialized && lastError === null,
    database: process.env.DB_NAME ?? "automataslab",
    error: lastError
  };
}

export async function initializeSimulationHistoryStorage(): Promise<void> {
  const databasePool = getPool();
  if (!databasePool) {
    return;
  }

  try {
    await databasePool.query(`
      CREATE TABLE IF NOT EXISTS simulation_history (
        id INT AUTO_INCREMENT PRIMARY KEY,
        delivered BOOLEAN NOT NULL,
        detected_protocol VARCHAR(80) NOT NULL,
        reason TEXT NOT NULL,
        request_json JSON NOT NULL,
        response_json JSON NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    initialized = true;
    lastError = null;
  } catch (error) {
    initialized = false;
    lastError = getErrorMessage(error);
    console.warn(`No se pudo inicializar MySQL: ${lastError}`);
  }
}

export async function saveSimulationHistory(request: SimulationRequest, response: SimulationResponse): Promise<void> {
  const databasePool = getPool();
  if (!databasePool) {
    return;
  }

  if (!initialized) {
    await initializeSimulationHistoryStorage();
  }

  if (!initialized) {
    return;
  }

  try {
    await databasePool.execute(
      `
        INSERT INTO simulation_history
          (delivered, detected_protocol, reason, request_json, response_json)
        VALUES (?, ?, ?, ?, ?)
      `,
      [
        response.delivered,
        response.detectedProtocol,
        response.reason,
        JSON.stringify(request),
        JSON.stringify(response)
      ]
    );
    lastError = null;
  } catch (error) {
    lastError = getErrorMessage(error);
    console.warn(`No se pudo guardar la simulacion en MySQL: ${lastError}`);
  }
}

export async function listRecentSimulationHistory(limit = 20) {
  const databasePool = getPool();
  if (!databasePool) {
    return [];
  }

  if (!initialized) {
    await initializeSimulationHistoryStorage();
  }

  if (!initialized) {
    return [];
  }

  const normalizedLimit = Math.min(100, Math.max(1, Math.trunc(limit)));
  const [rows] = await databasePool.query<SimulationHistoryRow[]>(
    `
      SELECT id, delivered, detected_protocol, reason, request_json, response_json, created_at
      FROM simulation_history
      ORDER BY created_at DESC
      LIMIT ?
    `,
    [normalizedLimit]
  );

  return rows.map((row) => ({
    id: row.id,
    delivered: Boolean(row.delivered),
    detectedProtocol: row.detected_protocol,
    reason: row.reason,
    request: parseJson(row.request_json),
    response: parseJson(row.response_json),
    createdAt: row.created_at
  }));
}

function getPool(): Pool | null {
  if (!isDatabaseEnabled()) {
    return null;
  }

  if (!pool) {
    pool = mysql.createPool({
      host: process.env.DB_HOST ?? "localhost",
      port: Number(process.env.DB_PORT ?? 3306),
      user: process.env.DB_USER ?? "root",
      password: process.env.DB_PASSWORD ?? "1234",
      database: process.env.DB_NAME ?? "automataslab",
      waitForConnections: true,
      connectionLimit: 5
    });
  }

  return pool;
}

function isDatabaseEnabled() {
  return process.env.DB_ENABLED !== "false";
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Error desconocido";
}

function parseJson(value: string) {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return value;
  }
}
