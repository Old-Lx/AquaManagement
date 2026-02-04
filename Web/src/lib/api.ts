/**
 * API Client for Pump Management System
 * * Este módulo proporciona funciones para interactuar con las edge functions
 * que implementan la API REST de telemetría y control de bombas.
 */

import type { PumpData } from '@/types/pump';

/**
 * PUENTE DE VARIABLES DE ENTORNO
 * Vite usa 'import.meta.env' y Node.js usa 'process.env'.
 * Este bloque detecta el entorno automáticamente para evitar errores de compilación.
 */
const getEnv = (key: string): string => {
  // @ts-ignore - Ignoramos error en Node.js
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    // @ts-ignore - Ignoramos error en Node.js
    return import.meta.env[key] || '';
  }
  return process.env[key] || '';
};

const SUPABASE_URL = getEnv('VITE_SUPABASE_URL');
const EDGE_FUNCTION_BASE_URL = `${SUPABASE_URL}/functions/v1`;

interface TelemetryRequest {
  pump_id: number;
  timestamp: string;
  water_level_percent: number;
  current_amps: number;
  street_flow_status: string;
  current_inflow_rate: number;
}

interface ControlRequest {
  command: 'START' | 'STOP';
}

interface ControlResponse {
  message: string;
  pump_id: number;
  command: 'START' | 'STOP';
  timestamp: string;
}

/**
 * POST /api/v1/telemetry
 */
export async function sendTelemetry(data: TelemetryRequest): Promise<void> {
  const response = await fetch(`${EDGE_FUNCTION_BASE_URL}/telemetry`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error: any = await response.json(); // Usamos any para evitar errores de acceso a propiedades
    throw new Error(error.error || 'Failed to send telemetry');
  }

  await response.json(); // Simplemente consumimos el json si la promesa es void
}

/**
 * GET /api/v1/pumps/status
 */
export async function getPumpStatus(): Promise<PumpData[]> {
  const response = await fetch(`${EDGE_FUNCTION_BASE_URL}/pump-status`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    const error: any = await response.json();
    throw new Error(error.error || 'Failed to fetch pump status');
  }

  return await response.json() as PumpData[]; // Forzamos el tipo de retorno
}

/**
 * POST /api/v1/pumps/:id/control
 */
export async function sendPumpCommand(
  pumpId: number,
  command: 'START' | 'STOP'
): Promise<ControlResponse> {
  const response = await fetch(
    `${EDGE_FUNCTION_BASE_URL}/pump-control/${pumpId}/control`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command }),
    }
  );

  if (!response.ok) {
    const error: any = await response.json();
    throw new Error(error.error || 'Failed to send pump command');
  }

  return await response.json() as ControlResponse; // Forzamos el tipo de retorno
}