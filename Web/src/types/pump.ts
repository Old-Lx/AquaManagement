/**
 * Real-time telemetry data for a water pump
 * Matches the telemetry_data table schema in PostgreSQL
 */
export interface PumpData {
  pump_id: number;
  timestamp: string;
  water_level_percent: number;
  current_amps: number;
  street_flow_status: string;
  current_inflow_rate: number;
  pump_temperature_celsius?: number;
}

/**
 * Historical report data including runtime metrics
 */
export interface PumpReport extends PumpData {
  totalRunHours: number;
  dailyCycles: number;
}

/**
 * Alert notification event
 */
export interface AlertEvent {
  severity: 'low' | 'medium' | 'high';
  message: string;
  timestamp: string;
  relatedPumpId: number;
}
