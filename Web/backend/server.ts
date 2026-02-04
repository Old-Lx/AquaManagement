import express from 'express';
import cors from 'cors';
import mqtt from 'mqtt';
import { Pool } from 'pg';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// --- CONFIGURACIÓN POSTGRES ---
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://pumpuser:SecureDBPassword123@localhost:5432/pump_monitoring',
});

// --- CONFIGURACIÓN MQTT ---
const mqttClient = mqtt.connect(process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883', {
  username: process.env.MQTT_USERNAME || 'backend',
  password: process.env.MQTT_PASSWORD || 'BackendPass456',
});

mqttClient.on('connect', () => {
  console.log('✅ Conectado al Broker MQTT');
  // Suscribirse a telemetría de todas las bombas
  mqttClient.subscribe('caracas/pumps/+/telemetry');
});

mqttClient.on('message', async (topic, message) => {
  try {
    const payload = JSON.parse(message.toString());
    console.log(`📡 Dato recibido en ${topic}:`, payload);

    // Extraer ID de la bomba del tópico
    const pumpId = topic.split('/')[2];
    
    // Guardar en Base de Datos
    await pool.query(
      `INSERT INTO pump_telemetry (pump_id, water_level_percent, current_amps, current_inflow_rate, street_flow_status)
       VALUES ($1, $2, $3, $4, $5)`,
      [pumpId, payload.water_level_percent, payload.current_amps, payload.current_inflow_rate, payload.street_flow_status]
    );
  } catch (err) {
    console.error('❌ Error procesando mensaje MQTT:', err);
  }
});

// --- API ENDPOINTS ---

// 1. Estado de salud
app.get('/', (req, res) => {
  res.send('Pump Monitor API v1.0 is running');
});

// 2. Enviar comando a una bomba (Desde el Frontend)
// Endpoint para recibir comandos desde el Frontend y enviarlos al ESP32 vía MQTT
app.post('/api/pumps/:id/control', (req, res) => {
  const { id } = req.params;
  const { command } = req.body;
  const topic = `caracas/pumps/${id}/control`;
  
  // 1. PRIMER LOG: Confirmar que la petición llegó al Backend
  console.log(`🔔 INTENTO DE CONTROL: Recibida orden ${command} para Bomba ${id}`);

  if (!mqttClient.connected) {
    console.error('❌ ERROR CRÍTICO: El cliente MQTT no está conectado. No se puede enviar la orden.');
    return res.status(503).json({ success: false, error: "Backend desconectado de MQTT" });
  }

  const payload = JSON.stringify({ command });

  // 2. PUBLICAR CON CALLBACK: Para saber si MQTT aceptó el mensaje
  mqttClient.publish(topic, payload, { qos: 1 }, (error) => {
    if (error) {
      console.error(`❌ FALLÓ PUBLICACIÓN MQTT: ${error.message}`);
      return res.status(500).json({ success: false, error: error.message });
    } else {
      // 3. SEGUNDO LOG: Confirmación de envío exitoso
      console.log(`🚀 COMANDO ENVIADO EXITOSAMENTE: ${topic} -> ${payload}`);
      return res.json({ 
        success: true, 
        message: `Command ${command} sent to pump ${id}`,
        mqtt_topic: topic 
      });
    }
  });
});

// --- Endpoint para obtener historial de telemetría ---
app.get('/api/telemetry', async (req, res) => {
  try {
    // Consultamos las últimas 20 lecturas de la base de datos local
    const result = await pool.query(
      'SELECT * FROM pump_telemetry ORDER BY timestamp DESC LIMIT 20'
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al leer base de datos' });
  }
});

// Iniciar Servidor
app.listen(PORT, () => {
  console.log(`⚡ Servidor Backend escuchando en puerto ${PORT}`);
});
