#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

// -------------------------------------------------------------------------
// 0. MODOS DE OPERACIÓN
// -------------------------------------------------------------------------

/*PUMP_MODE   SENSOR_SIMULATION       Comportamiento
  0           true                    Prueba offline sin sensores
  0           false                   Prueba offline con sensores
  1           true                    Prueba online sin sensores
  1           false                   Produccion, funciona con sensores y online
*/
#define PUMP_MODE 1  // El modo 0 es prueba offline, el 1 es prueba online o produccion
#define SENSOR_SIMULATION true // Indica si la data va a ser simulada o no

// -------------------------------------------------------------------------
// 1. CONFIGURACIÓN DE RED Y BROKER
// -------------------------------------------------------------------------

const char* ssid = "TP-LINK_07D";
const char* password = "Aeronave07";
const char* mqtt_server = "192.168.0.109"; // IP de tu Broker
const int mqtt_port = 1883;
const int baudrate = 115200;

const char* clientID = "ESP32_Pump_Controller";

// Constantes de control
#define RELAY_PIN_PUMP_1 27 // Pin de Relé para Bomba 1 (Pin de ejemplo)
#define RELAY_PIN_PUMP_2 26 // Pin de Relé para Bomba 2 (Pin de ejemplo)

// Estructura para gestionar el estado de cada bomba
struct Pump {
  int id;
  int relayPin;
  bool is_on; // Estado actual de la bomba (para simulación)
};

// Array para las dos bombas
Pump pumps[] = {
  {1, RELAY_PIN_PUMP_1, false},
  {2, RELAY_PIN_PUMP_2, false}
};
const int NUM_PUMPS = 2; // Cantidad total de bombas

// El topic de monitoreo se maneja directamente en publishTelemetry ya que se hace para cada bomba

// Control
const char* CONTROL_TOPIC_SUBSCRIPTION = "caracas/pumps/+/control";

// -------------------------------------------------------------------------
// 2. CONFIGURACIÓN DE SENSORES Y VARIABLES
// -------------------------------------------------------------------------

#if !SENSOR_SIMULATION
  // Definir los pines para los flotadores
  #define HIGH_LEVEL_PIN 23  // Flotador superior (ej. Nivel Máximo)
  #define LOW_LEVEL_PIN 22   // Flotador inferior (ej. Nivel Mínimo/Corte)

  // Pines para el sensor ultrasónico
  #define ULTRASONIC_TRIG 5  // Pin Trig
  #define ULTRASONIC_ECHO 18 // Pin Echo

  // Parámetros físicos del tanque (necesarios para el cálculo en el caso ultrasónico)
  const float TANK_HEIGHT_CM = 200.0; // Altura total del tanque en cm (ej: 2 metros)
  const float EMPTY_DISTANCE_CM = 180.0; // Distancia desde el sensor hasta el nivel "0%" (fondo del tanque)
#endif

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
  #if !PUMP_MODE
    Serial.println("MODO OFFLINE_TEST: Saltando conexión Wi-Fi.");
    return;
  #else
    delay(10);
    Serial.print("Conectando a ");
    Serial.println(ssid);
    Serial.print("MAC Address: "); // F8:B3:B7:20:61:58 es la del ESP32 que estoy usando
    Serial.println(WiFi.macAddress());

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
  #endif
}

void reconnect() {
  // Ignorar MQTT si no hay Wi-Fi o estamos en modo OFFLINE
  #if !PUMP_MODE
    return;
  #else
    while (!client.connected() && WiFi.status() == WL_CONNECTED) {
      Serial.print("Intentando conexión MQTT...");
      if (client.connect(clientID, "backend", "BackendPass456")) {
        Serial.println("conectado");
        
        // SUSCRIPCIÓN GENÉRICA PARA EL CONTROL DE CUALQUIER BOMBA
        client.subscribe(CONTROL_TOPIC_SUBSCRIPTION); 
        Serial.print("Suscrito al control genérico: ");
        Serial.println(CONTROL_TOPIC_SUBSCRIPTION);
        
      } else {
        Serial.print("falló, rc=");
        Serial.print(client.state());
        Serial.println(" Intentando de nuevo en 5 segundos...");
        delay(5000);
      }
    }
  #endif
}

void callback(char* topic, byte* payload, unsigned int length) {
  // ... (código para deserializar JSON y verificar errores) ...
  StaticJsonDocument<256> doc;
  
  // 1. EXTRAER EL ID DE LA BOMBA DEL TOPIC
  int pumpId = 0;
  // Usamos sscanf para leer el número después de "caracas/pumps/"
  sscanf(topic, "caracas/pumps/%d/control", &pumpId); 

  if (pumpId == 0) {
    Serial.println("ID de bomba no válido en el topic. Ignorando.");
    return;
  }

  // 2. ENCONTRAR LA BOMBA EN EL ARRAY
  Pump* targetPump = nullptr;
  for (int i = 0; i < NUM_PUMPS; i++) {
    if (pumps[i].id == pumpId) {
      targetPump = &pumps[i];
      break;
    }
  }

  if (targetPump == nullptr) {
    Serial.print("Bomba con ID ");
    Serial.print(pumpId);
    Serial.println(" no encontrada en la configuración del ESP32.");
    return;
  }

  // 3. EXTRAER EL COMANDO Y ACTUAR SOBRE EL RELÉ
  const char* command = doc["command"]; 

  if (strcmp(command, "START") == 0) {
    Serial.print(">>> COMANDO START para Bomba ");
    Serial.println(targetPump->id);
    digitalWrite(targetPump->relayPin, HIGH); // ENCENDER el relé
    targetPump->is_on = true;
  } else if (strcmp(command, "STOP") == 0) {
    Serial.print(">>> COMANDO STOP para Bomba ");
    Serial.println(targetPump->id);
    digitalWrite(targetPump->relayPin, LOW); // APAGAR el relé
    targetPump->is_on = false;
  } else {
    Serial.println("Comando desconocido.");
  }
}

// -------------------------------------------------------------------------
// 4. LÓGICA DE LECTURA DE HARDWARE
// -------------------------------------------------------------------------

// --- Variables y objetos para lectura de hardware real ---
#if !SENSOR_SIMULATION
    // Pines para los sensores de temperatura DS18B20 (uno por bomba)
    #define ONE_WIRE_BUS_PUMP_1 4  // Pin para el sensor de la Bomba 1
    #define ONE_WIRE_BUS_PUMP_2 15 // Pin para el sensor de la Bomba 2 (ej: GPIO 15)

    // Objetos para el sensor de la Bomba 1
    OneWire oneWire1(ONE_WIRE_BUS_PUMP_1);
    DallasTemperature sensors1(&oneWire1);

    // Objetos para el sensor de la Bomba 2
    OneWire oneWire2(ONE_WIRE_BUS_PUMP_2);
    DallasTemperature sensors2(&oneWire2);

    // Pin para la lectura de corriente (Analog Pin)
    #define CURRENT_SENSOR_PIN 34 

    // Pin para el sensor de Flujo (Interrupción Digital)
    #define FLOW_SENSOR_PIN 35
    volatile long flow_pulses = 0; 
    
    // Función de interrupción para el sensor de flujo (DEBE estar fuera de la clase)
    void IRAM_ATTR flowPulseCounter() {
      flow_pulses++;
    }

    // Función que lee el sensor de Corriente (ej. CT no invasivo como SCT-013)
    float readRealAmps() {
        // En un proyecto real, se usa EmonLib o una librería similar 
        // para medir el RMS del pin analógico. Aquí solo leemos el valor crudo.
        int sensorValue = analogRead(CURRENT_SENSOR_PIN);
        // Conversión muy simple: (Valor leído / 4095) * MaxAmps
        return (float)sensorValue * (25.0 / 4095.0); // Asumiendo un rango máximo de 25A
    }

    // Función auxiliar para leer la distancia ultrasónica
    float getDistanceCM() {
        // Generar pulso
        digitalWrite(ULTRASONIC_TRIG, LOW);
        delayMicroseconds(2);
        digitalWrite(ULTRASONIC_TRIG, HIGH);
        delayMicroseconds(10);
        digitalWrite(ULTRASONIC_TRIG, LOW);

        // Medir duración del eco
        long duration = pulseIn(ULTRASONIC_ECHO, HIGH);

        // Calcular distancia (Velocidad del sonido: 343 m/s)
        float distance = duration * 0.034 / 2;
        
        // Devolver la distancia medida, asegurando un rango razonable
        if (distance == 0 || distance > 400) return EMPTY_DISTANCE_CM; // Retorna vacío si es error
        
        return distance; // Distancia del sensor a la superficie del agua
    }

    // Lee el nicel de agua mediante sensor ultrasonico
    float readUltrasonicWaterLevel() {
        float distanceToWater = getDistanceCM();

        // Distancia de referencia: La altura máxima de agua que podemos medir.
        // Max Level = EMPTY_DISTANCE_CM - (TANK_HEIGHT_CM - Max_Water_Level)
        float maxWaterLevel = EMPTY_DISTANCE_CM; 

        // 1. Calcular la altura de agua real
        float waterHeight = maxWaterLevel - distanceToWater;

        // 2. Escalar a porcentaje (Normalizar respecto a la altura total)
        float percentage = (waterHeight / TANK_HEIGHT_CM) * 100.0;

        // Asegurar que el porcentaje está entre 0 y 100
        if (percentage > 100.0) return 100.0;
        if (percentage < 0.0) return 0.0;

        return percentage;
    }

    // Función que lee el nivel de agua (ej. flotador o presión en pin analógico)
    float readFloaterWaterLevel() {
        int highStatus = digitalRead(HIGH_LEVEL_PIN); // Leer flotador superior
        int lowStatus = digitalRead(LOW_LEVEL_PIN);   // Leer flotador inferior

        // Caso 1: Tanque Lleno (Ambos flotadores levantados - HIGH en pull-up)
        // Asumimos lógica: LOW cuando hay agua (flotador hundido); HIGH cuando está vacío/bajo.
        if (highStatus == LOW) { // Si el flotador superior detecta agua
            return 100.0;
        }
        
        // Caso 2: Nivel por Debajo del Flotador Alto pero por Encima del Flotador Bajo
        if (highStatus == HIGH && lowStatus == LOW) {
            // En este estado intermedio, el nivel está entre ~20% y ~80%. 
            // Se puede devolver un valor medio o simplemente un estado de bombeo.
            return 50.0;
        }

        // Caso 3: Tanque Vacío (Ambos flotadores caídos - HIGH en pull-up)
        if (lowStatus == HIGH) { // Si el flotador inferior NO detecta agua
            return 0.0;
        }

        // Default de seguridad
        return 50.0;
    }

    // Función que lee el sensor de Flujo (Calcula L/min)
    float readRealInflowRate() {
        // La lógica debe calcular los pulsos/segundo (flow_pulses) y convertirlos a L/min
        float flow_rate = (float)flow_pulses * 0.00225; // Ejemplo: 0.00225 L/pulso Ese es un valor K que depende del sensor
        flow_pulses = 0; // Resetear contador de pulsos
        return flow_rate;
    }
#endif

// -------------------------------------------------------------------------
// 5. LÓGICA DE LECTURA Y PUBLICACIÓN
// -------------------------------------------------------------------------

void read_or_mock_sensors() {
  
  #if SENSOR_SIMULATION
  // CASO A: SIMULACIÓN DE DATOS (PARA PRUEBA DE JSON/BACKEND)
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
  #else
    // CASO B: LECTURA DE HARDWARE REAL
    // La lectura de sensores reales (analógicos y digitales)
    current_amps = readRealAmps();
    water_level_percent = readFloaterWaterLevel();
    current_inflow_rate = readRealInflowRate();
    
    // El flujo se detecta si la tasa de entrada es > 0
    is_flow_detected = current_inflow_rate > 0.5; // Umbral de 0.5 L/min
    
    Serial.println("!!! LEYENDO HARDWARE REAL !!!");
  #endif
}

void publishTelemetry() {
  read_or_mock_sensors();
  
  // -----------------------------------------------------
  // BUCLE PARA PUBLICAR LOS DATOS INDIVIDUALES DE CADA BOMBA
  // -----------------------------------------------------
  for (int i = 0; i < NUM_PUMPS; i++) {
    Pump currentPump = pumps[i];
    
    // 1. LECTURA ESPECÍFICA (Amperaje y Flujo Individuales)
    float pump_amps = 0.0;
    float pump_flow_rate = 0.0;
    float pump_temperature_celsius = -127.0; // Valor por defecto en caso de error

    #if SENSOR_SIMULATION
      // SIMULACIÓN: Los datos individuales dependen de si el relé está ON
      pump_amps = currentPump.is_on ? (10.0 + (float)random(0, 50) / 10.0) : 0.0;
      pump_flow_rate = currentPump.is_on ? (70.0 + (float)random(0, 10) / 10.0) : 0.0;
      // Simula una temperatura de motor realista si la bomba está encendida
      pump_temperature_celsius = currentPump.is_on ? (65.0 + (float)random(-100, 150) / 10.0) : 25.0;
    #else
      // LECTURA REAL: REQUIERE HARDWARE ADICIONAL
      // Aquí necesitarías:
      // - Un segundo sensor CT (corriente) conectado a otro pin analógico.
      // - Un segundo sensor de flujo (opcional) conectado a otro pin digital/interrupción.
      
      // Simplificado: Necesitarías adaptar readRealAmps para leer un pin específico.
      // if (currentPump.id == 1) { pump_amps = readRealAmps(PIN_CT_1); }
      // else { pump_amps = readRealAmps(PIN_CT_2); }
      
      // Por ahora, usamos el estado ON/OFF para simular el amperaje en modo no simulación.
      pump_amps = currentPump.is_on ? (readRealAmps() * 0.8) : 0.0; // Amperaje reducido si está encendida.
      pump_flow_rate = currentPump.is_on ? (readRealInflowRate() * 0.5) : 0.0;

      // Lectura de temperatura basada en el ID de la bomba
      if (currentPump.id == 1) {
        sensors1.requestTemperatures();
        pump_temperature_celsius = sensors1.getTempCByIndex(0);
      } else if (currentPump.id == 2) {
        sensors2.requestTemperatures();
        pump_temperature_celsius = sensors2.getTempCByIndex(0);
      }
    #endif
    
    // 2. CREAR EL JSON Y TÓPICO DINÁMICO
    StaticJsonDocument<256> doc;

    doc["pump_id"] = currentPump.id;
    doc["current_amps"] = pump_amps;
    doc["pump_temperature_celsius"] = pump_temperature_celsius;
    doc["current_inflow_rate"] = pump_flow_rate;
    doc["timestamp"] = (long)time(NULL); 
    
    // Datos compartidos
    doc["water_level_percent"] = water_level_percent; 
    doc["street_flow_status"] = (pump_amps > 0) ? "FLOWING" : "STOPPED";
    
    char output[256];
    size_t n = serializeJson(doc, output);
    
    // Tópico dinámico: caracas/pumps/1/telemetry o caracas/pumps/2/telemetry
    char topicBuffer[40];
    sprintf(topicBuffer, "caracas/pumps/%d/telemetry", currentPump.id);

    // Decidir si publicar a MQTT o solo imprimir a Serial
    #if PUMP_MODE
      // PUBLICACIÓN A MQTT (Modos Producción y Prueba Online)
      if (client.connected()) {
          client.publish(topicBuffer, output, n);
      }
    #endif
    
    // Impresión para depuración (se muestra en todos los modos)
    Serial.printf("--- Publicando para Bomba %d ---\n", currentPump.id);
    Serial.println(output);
    Serial.println("---------------------------------");

  } // Fin del bucle for

  // Imprimir estado de la publicación
  #if PUMP_MODE
    if (client.connected()) {
        Serial.println("✅ Publicado a MQTT.");
    } else {
        Serial.println("⚠️ MQTT no conectado. No se pudo publicar.");
    }
  #else
    Serial.println(">>> MODO OFFLINE_TEST ACTIVO: SOLO IMPRESIÓN SERIAL. <<<");
  #endif
}

// -------------------------------------------------------------------------
// 5. SETUP Y LOOP
// -------------------------------------------------------------------------

void setup() {
  Serial.begin(baudrate);
  
  setup_wifi();
  
  // Si tenemos Wi-Fi, configuramos el MQTT
  if (WiFi.status() == WL_CONNECTED) {
    client.setServer(mqtt_server, mqtt_port);
  }
  
  #if !SENSOR_SIMULATION
    // INICIALIZACIÓN DEL HARDWARE REAL

    // DS18B20
    sensors1.begin(); // Inicia el sensor de la Bomba 1
    sensors2.begin(); // Inicia el sensor de la Bomba 2
    pinMode(FLOW_SENSOR_PIN, INPUT_PULLUP);
    attachInterrupt(digitalPinToInterrupt(FLOW_SENSOR_PIN), flowPulseCounter, RISING);
    
    // Configura el pin analógico de corriente, si es necesario.
    
    // Sensores de nivel de agua alto y bajo con flotadores
    pinMode(HIGH_LEVEL_PIN, INPUT_PULLUP);
    pinMode(LOW_LEVEL_PIN, INPUT_PULLUP);
   
    // Sensor ultrasonico
    pinMode(ULTRASONIC_TRIG, OUTPUT);
    pinMode(ULTRASONIC_ECHO, INPUT);

    // INICIALIZACIÓN DE LOS PINES DE RELÉ PARA AMBAS BOMBAS
    pinMode(RELAY_PIN_PUMP_1, OUTPUT);
    digitalWrite(RELAY_PIN_PUMP_1, LOW); // Iniciar apagada
    
    pinMode(RELAY_PIN_PUMP_2, OUTPUT);
    digitalWrite(RELAY_PIN_PUMP_2, LOW); // Iniciar apagada

    client.setCallback(callback);
  #endif
  
  configTime(0, 0, "pool.ntp.org");
  setenv("TZ", "VET-4", 1);
}

void loop() {
#if PUMP_MODE
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