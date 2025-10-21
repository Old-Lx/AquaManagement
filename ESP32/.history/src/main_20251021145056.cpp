#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

// -------------------------------------------------------------------------
// 0. MODOS DE OPERACIÓN (ACTIVAR SOLO UNO)
// -------------------------------------------------------------------------

#define PUMP_MODE_OFFLINE_TEST  // Simulación: Imprime al Serial, NO conecta Wi-Fi/MQTT.
// #define PUMP_MODE_PRODUCTION    // Producción: Conecta Wi-Fi, lee sensores, publica a MQTT.
// #define PUMP_MODE_ONLINE_TEST   // Prueba Online: Conecta Wi-Fi, lee sensores, publica a MQTT (Mismo que Producción, pero fácil de cambiar la lógica de simulación/intervalo si es necesario).

// -------------------------------------------------------------------------
// 0.1. MODO DE SIMULACIÓN DE SENSORES (APLICA A TODOS LOS MODOS)
// -------------------------------------------------------------------------

// Descomentar esta línea para SIMULAR que los sensores están desconectados o fallando.
#define SENSOR_SIMULATION

// -------------------------------------------------------------------------
// 1. CONFIGURACIÓN DE RED Y BROKER
// -------------------------------------------------------------------------

const char* ssid = "TU_RED_WIFI";
const char* password = "TU_PASSWORD_WIFI";
const char* mqtt_server = "192.168.1.10"; // IP de tu Broker (o Lovable Cloud)
const int mqtt_port = 1883;

const char* clientID = "ESP32_Pump_Controller_1";
const int PUMP_ID = 1;

const char* TELEMETRY_TOPIC = "caracas/pumps/1/telemetry";

// -------------------------------------------------------------------------
// 2. CONFIGURACIÓN DE SENSORES Y VARIABLES
// -------------------------------------------------------------------------

float current_amps = 0.0;
float water_level_percent = 70.0;
bool is_flow_detected = true;
float current_inflow_rate = 155.5;

long lastMsg = 0;
#define PUBLISH_INTERVAL 5000 // Publicar cada 5 segundos (5000 ms)
#define WIFI_TIMEOUT_MS 60000 // Esperar 1 minuto (60000 ms) para la conexión Wi-Fi

WiFiClient espClient;
PubSubClient client(espClient);

// -------------------------------------------------------------------------
// 3. FUNCIONES DE CONEXIÓN
// -------------------------------------------------------------------------

void setup_wifi() {
  // Ignorar Wi-Fi si estamos en el modo OFFLINE
#ifdef PUMP_MODE_OFFLINE_TEST
  Serial.println("MODO OFFLINE_TEST: Saltando conexión Wi-Fi.");
  return;
#endif
  
  delay(10);
  Serial.print("Conectando a ");
  Serial.println(ssid);

  WiFi.begin(ssid, password);
  
  long startTime = millis();

  while (WiFi.status() != WL_CONNECTED && (millis() - startTime < WIFI_TIMEOUT_MS)) {
    delay(500);
    Serial.print(".");
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n✅ WiFi conectado!");
    Serial.print("Dirección IP: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\n❌ Falla al conectar Wi-Fi después de 1 minuto. Procediendo sin conexión...");
    // Forzar modo OFFLINE si falla la conexión después del timeout
    // Esto es un diagnóstico, pero mantenemos el loop activo para reintentos o simulación.
  }
}

void reconnect() {
  // Ignorar MQTT si no hay Wi-Fi o estamos en modo OFFLINE
#if defined(PUMP_MODE_OFFLINE_TEST)
  return;
#endif

  while (!client.connected() && WiFi.status() == WL_CONNECTED) {
    Serial.print("Intentando conexión MQTT...");
    if (client.connect(clientID)) {
      Serial.println("conectado");
    } else {
      Serial.print("falló, rc=");
      Serial.print(client.state());
      Serial.println(" Intentando de nuevo en 5 segundos...");
      delay(5000);
    }
  }
}

// -------------------------------------------------------------------------
// 4. LÓGICA DE LECTURA Y PUBLICACIÓN
// -------------------------------------------------------------------------

void read_mock_sensors() {
  
#ifdef SENSOR_SIMULATION
    // CASO: Sensores Desconectados o Fallando (Modo Analógico)
    current_amps = -1.0;
    water_level_percent = -1.0;
    is_flow_detected = false; 
    current_inflow_rate = -1.0;
    Serial.println("!!! ALERTA: MODO SENSOR SIMULACION ACTIVO. DATOS DEVUELTOS: -1.0 !!!");
    return;
#endif

  // CASO: Sensores Funcionando (Producción/Prueba)
  is_flow_detected = (millis() / 30000) % 2 == 0; 
  
  if (is_flow_detected) {
    current_amps = 10.0 + (float)random(0, 50) / 10.0;
    current_inflow_rate = 140.0 + (float)random(0, 300) / 10.0;
    water_level_percent = min(100.0, water_level_percent + 0.1);
  } else {
    current_amps = 0.0;
    current_inflow_rate = 0.0;
    water_level_percent = max(0.0, water_level_percent - 0.05);
  }
}

void publishTelemetry() {
  read_mock_sensors();
  
  StaticJsonDocument<256> doc;

  doc["pump_id"] = PUMP_ID;
  doc["timestamp"] = (long)time(NULL); 
  doc["water_level_percent"] = water_level_percent;
  doc["current_amps"] = current_amps;
  doc["street_flow_status"] = is_flow_detected ? "FLOWING" : "STOPPED";
  doc["current_inflow_rate"] = current_inflow_rate;

  char output[256];
  size_t n = serializeJson(doc, output);
  
  Serial.print("JSON Generado: ");
  Serial.println(output);

// Decidir si publicar a MQTT o solo imprimir a Serial
#if defined(PUMP_MODE_PRODUCTION) || defined(PUMP_MODE_ONLINE_TEST)
  // PUBLICACIÓN A MQTT (Modos Producción y Prueba Online)
  if (client.connected()) {
      client.publish(TELEMETRY_TOPIC, output, n);
      Serial.println("✅ Publicado a MQTT.");
  } else {
      Serial.println("⚠️ MQTT no conectado. No se pudo publicar.");
  }
#else
  // SOLO IMPRESIÓN (Modo Prueba Offline)
  Serial.println(">>> MODO OFFLINE_TEST ACTIVO: SOLO IMPRESIÓN SERIAL. <<<");
#endif
}

// -------------------------------------------------------------------------
// 5. SETUP Y LOOP
// -------------------------------------------------------------------------

void setup() {
  Serial.begin(115200);
  
  setup_wifi();
  
  // Si tenemos Wi-Fi, configuramos el MQTT
  if (WiFi.status() == WL_CONNECTED) {
    client.setServer(mqtt_server, mqtt_port);
  }
  
  configTime(0, 0, "pool.ntp.org");
  setenv("TZ", "VET-4", 1); 
}

void loop() {
#if defined(PUMP_MODE_PRODUCTION) || defined(PUMP_MODE_ONLINE_TEST)
  // Modos que requieren conexión: intentar reconectar y mantener el loop MQTT
  if (!client.connected()) {
    reconnect();
  }
  client.loop();
#endif

  long now = millis();
  // Publicar si ha pasado el intervalo de tiempo (aplica a todos los modos)
  if (now - lastMsg > PUBLISH_INTERVAL) {
    lastMsg = now;
    publishTelemetry();
  }
}