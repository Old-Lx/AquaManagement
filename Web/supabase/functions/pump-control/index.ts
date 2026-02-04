// CORS headers para permitir peticiones desde el frontend
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Tipos de comandos válidos que puede recibir una bomba
type PumpCommand = 'START' | 'STOP';

// Estructura de la petición de control
interface ControlRequest {
  command: PumpCommand;
}

// Estructura del mensaje MQTT que se publicará
interface MQTTControlMessage {
  command: PumpCommand;
  timestamp: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract pump ID from URL path
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    const pumpIdStr = pathParts[pathParts.length - 2]; // Get ID before 'control'
    const pumpId = parseInt(pumpIdStr, 10);

    // Validate pump ID
    if (isNaN(pumpId) || pumpId < 1) {
      return new Response(
        JSON.stringify({ error: 'Invalid pump ID' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse and validate command
    const body: ControlRequest = await req.json();
    
    if (!body.command || !['START', 'STOP'].includes(body.command)) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid command. Must be START or STOP',
          received: body.command 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Command ${body.command} received for pump ${pumpId}`);

    // Preparar el mensaje MQTT siguiendo la estructura del ESP32
    const mqttTopic = `caracas/pumps/${pumpId}/control`;
    const mqttMessage: MQTTControlMessage = {
      command: body.command,
      timestamp: new Date().toISOString()
    };

    // NOTA: Edge Functions no soportan MQTT directo. Opciones:
    // 1. Usar un broker MQTT con REST API (ej: HiveMQ Cloud)
    // 2. Usar un webhook a un servidor intermedio con MQTT
    // 3. Usar WebSockets si el broker lo soporta
    
    // Por ahora simulamos la publicación (en producción aquí iría la llamada HTTP al broker)
    console.log(`[MQTT SIMULATION] Publishing to topic: ${mqttTopic}`);
    console.log(`[MQTT SIMULATION] Payload: ${JSON.stringify(mqttMessage)}`);
    
    // TODO: Implementar publicación real a MQTT
    // Ejemplo con broker REST API:
    // const brokerUrl = Deno.env.get('MQTT_BROKER_REST_URL');
    // await fetch(`${brokerUrl}/publish`, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ topic: mqttTopic, payload: mqttMessage })
    // });

    const responseMessage = `Command ${body.command} sent to pump ${pumpId}`;

    return new Response(
      JSON.stringify({ 
        success: true,
        message: responseMessage,
        pump_id: pumpId,
        command: body.command,
        mqtt_topic: mqttTopic,
        timestamp: new Date().toISOString(),
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error processing pump control command:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
