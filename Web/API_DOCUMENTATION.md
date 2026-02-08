# API REST - Sistema de Gestión de Bombas de Agua

Esta documentación describe la API REST implementada para el sistema de telemetría y control de bombas de agua.

## Arquitectura

La API está implementada usando **Lovable Cloud Edge Functions** (basadas en Deno) que proporcionan una arquitectura serverless escalable y de alto rendimiento.

### Estructura del Proyecto

```
supabase/functions/
├── telemetry/           # POST /api/v1/telemetry
├── pump-status/         # GET /api/v1/pumps/status
└── pump-control/        # POST /api/v1/pumps/:id/control
```

## Base URL

```
https://xttpwemyddczplcjubwq.supabase.co/functions/v1
```

## Endpoints

### 1. POST /telemetry

Recibe datos de telemetría de una bomba (simulando datos enviados por cliente MQTT).

**Request:**
```http
POST /telemetry
Content-Type: application/json

{
  "pump_id": 1,
  "timestamp": "2025-10-21T10:00:00Z",
  "water_level_percent": 78.5,
  "current_amps": 12.8,
  "street_flow_status": "FLOWING",
  "current_inflow_rate": 148.3
}
```

**Response (201 Created):**
```json
{
  "message": "Telemetry data received successfully",
  "pump_id": 1
}
```

**Errores:**
- `400 Bad Request`: Datos de telemetría inválidos
- `500 Internal Server Error`: Error al almacenar datos

---

### 2. GET /pump-status

Obtiene el estado actual de todas las bombas del sistema.

**Request:**
```http
GET /pump-status
```

**Response (200 OK):**
```json
[
  {
    "pump_id": 1,
    "timestamp": "2025-10-21T15:13:15.149Z",
    "water_level_percent": 75.5,
    "current_amps": 12.3,
    "street_flow_status": "FLOWING",
    "current_inflow_rate": 145.8
  },
  {
    "pump_id": 2,
    "timestamp": "2025-10-21T15:13:15.149Z",
    "water_level_percent": 45.2,
    "current_amps": 0,
    "street_flow_status": "STOPPED",
    "current_inflow_rate": 0
  }
]
```

**Notas:**
- Si no hay datos en la base de datos, devuelve datos mock para facilitar el desarrollo
- Retorna el estado más reciente de cada bomba

---

### 3. POST /pump-control/:id/control

Envía un comando de control (START o STOP) a una bomba específica.

**Request:**
```http
POST /pump-control/1/control
Content-Type: application/json

{
  "command": "START"
}
```

**Response (200 OK):**
```json
{
  "message": "Command START sent to pump 1",
  "pump_id": 1,
  "command": "START",
  "timestamp": "2025-10-21T15:13:13.082Z"
}
```

**Errores:**
- `400 Bad Request`: ID de bomba inválido o comando inválido
- `405 Method Not Allowed`: Método HTTP no permitido

**Comandos válidos:**
- `START`: Iniciar la bomba
- `STOP`: Detener la bomba

---

## Interfaces TypeScript

### TelemetryData (Request/Response)

```typescript
interface TelemetryData {
  pump_id: number;
  timestamp: string;
  water_level_percent: number;
  current_amps: number;
  street_flow_status: string;
  current_inflow_rate: number;
}
```

### ControlRequest

```typescript
interface ControlRequest {
  command: 'START' | 'STOP';
}
```

### ControlResponse

```typescript
interface ControlResponse {
  message: string;
  pump_id: number;
  command: 'START' | 'STOP';
  timestamp: string;
}
```

## Uso desde el Frontend

El módulo `src/lib/api.ts` proporciona funciones helper para consumir la API:

```typescript
import { sendTelemetry, getPumpStatus, sendPumpCommand } from '@/lib/api';

// Enviar telemetría
await sendTelemetry({
  pump_id: 1,
  timestamp: new Date().toISOString(),
  water_level_percent: 78.5,
  current_amps: 12.8,
  street_flow_status: 'FLOWING',
  current_inflow_rate: 148.3,
});

// Obtener estado de bombas
const pumps = await getPumpStatus();

// Enviar comando a bomba
const response = await sendPumpCommand(1, 'START');
```

## Seguridad

- Todas las edge functions tienen CORS habilitado para desarrollo
- Las funciones no requieren JWT (configuradas como públicas)
- Los datos se validan tanto en el servidor como en el cliente
- Para producción, se recomienda habilitar autenticación JWT

## Base de Datos

Los datos de telemetría se almacenan en la tabla `telemetry_data` con Row Level Security (RLS) habilitada:

```sql
CREATE TABLE public.telemetry_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pump_id INTEGER NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  water_level_percent NUMERIC(5,2) NOT NULL,
  current_amps NUMERIC(6,2) NOT NULL,
  street_flow_status TEXT NOT NULL,
  current_inflow_rate NUMERIC(8,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
```

## Testing

Las edge functions se pueden probar usando curl:

```bash
# Test pump-status
curl https://xttpwemyddczplcjubwq.supabase.co/functions/v1/pump-status

# Test telemetry
curl -X POST https://xttpwemyddczplcjubwq.supabase.co/functions/v1/telemetry \
  -H "Content-Type: application/json" \
  -d '{"pump_id":1,"timestamp":"2025-10-21T10:00:00Z","water_level_percent":78.5,"current_amps":12.8,"street_flow_status":"FLOWING","current_inflow_rate":148.3}'

# Test pump-control
curl -X POST https://xttpwemyddczplcjubwq.supabase.co/functions/v1/pump-control/1/control \
  -H "Content-Type: application/json" \
  -d '{"command":"START"}'
```
