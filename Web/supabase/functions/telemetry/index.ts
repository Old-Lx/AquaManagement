import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TelemetryData {
  pump_id: number;
  timestamp: string;
  water_level_percent: number;
  current_amps: number;
  street_flow_status: string;
  current_inflow_rate: number;
  pump_temperature_celsius?: number;
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

    // Get raw body first for logging
    const rawBody = await req.text();
    
    // Log complete JSON received from ESP32
    console.log('========== ESP32 TELEMETRY RECEIVED ==========');
    console.log('Timestamp:', new Date().toISOString());
    console.log('Raw JSON body:', rawBody);
    
    let telemetryData: TelemetryData;
    try {
      telemetryData = JSON.parse(rawBody);
      console.log('Parsed JSON object:', JSON.stringify(telemetryData, null, 2));
    } catch (parseError) {
      console.error('JSON Parse Error:', parseError);
      return new Response(
        JSON.stringify({ error: 'Invalid JSON', details: String(parseError) }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    console.log('==============================================');

    // Validate required fields
    if (!telemetryData.pump_id || 
        typeof telemetryData.water_level_percent !== 'number' ||
        typeof telemetryData.current_amps !== 'number' ||
        !telemetryData.street_flow_status ||
        typeof telemetryData.current_inflow_rate !== 'number') {
      return new Response(
        JSON.stringify({ error: 'Invalid telemetry data format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Insert telemetry data into database
    const insertData: any = {
      pump_id: telemetryData.pump_id,
      timestamp: telemetryData.timestamp,
      water_level_percent: telemetryData.water_level_percent,
      current_amps: telemetryData.current_amps,
      street_flow_status: telemetryData.street_flow_status,
      current_inflow_rate: telemetryData.current_inflow_rate,
    };

    // Add temperature if provided
    if (telemetryData.pump_temperature_celsius !== undefined) {
      insertData.pump_temperature_celsius = telemetryData.pump_temperature_celsius;
    }

    const { error } = await supabaseClient
      .from('telemetry_data')
      .insert(insertData);

    if (error) {
      console.error('Database error:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to store telemetry data' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        message: 'Telemetry data received successfully',
        pump_id: telemetryData.pump_id,
      }),
      { 
        status: 201, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error processing telemetry:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
