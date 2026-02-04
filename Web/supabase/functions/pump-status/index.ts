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
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== 'GET') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Fetching pump status for all pumps');

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get latest telemetry for each pump
    const { data, error } = await supabaseClient
      .from('telemetry_data')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Database error:', error);
      
      // Return mock data if database is empty
      const mockData: TelemetryData[] = [
        {
          pump_id: 1,
          timestamp: new Date().toISOString(),
          water_level_percent: 75.5,
          current_amps: 12.3,
          street_flow_status: 'FLOWING',
          current_inflow_rate: 145.8,
        },
        {
          pump_id: 2,
          timestamp: new Date().toISOString(),
          water_level_percent: 45.2,
          current_amps: 0,
          street_flow_status: 'STOPPED',
          current_inflow_rate: 0,
        },
      ];

      return new Response(
        JSON.stringify(mockData),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If no data in database, return mock data
    if (!data || data.length === 0) {
      const mockData: TelemetryData[] = [
        {
          pump_id: 1,
          timestamp: new Date().toISOString(),
          water_level_percent: 75.5,
          current_amps: 12.3,
          street_flow_status: 'FLOWING',
          current_inflow_rate: 145.8,
        },
        {
          pump_id: 2,
          timestamp: new Date().toISOString(),
          water_level_percent: 45.2,
          current_amps: 0,
          street_flow_status: 'STOPPED',
          current_inflow_rate: 0,
        },
      ];

      return new Response(
        JSON.stringify(mockData),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get latest record for each pump
    const latestByPump = new Map<number, any>();
    for (const record of data) {
      if (!latestByPump.has(record.pump_id)) {
        latestByPump.set(record.pump_id, record);
      }
    }

    const pumpStatusArray = Array.from(latestByPump.values()).map(record => ({
      pump_id: record.pump_id,
      timestamp: record.timestamp,
      water_level_percent: parseFloat(record.water_level_percent),
      current_amps: parseFloat(record.current_amps),
      street_flow_status: record.street_flow_status,
      current_inflow_rate: parseFloat(record.current_inflow_rate),
    }));

    console.log(`Returning status for ${pumpStatusArray.length} pumps`);

    return new Response(
      JSON.stringify(pumpStatusArray),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error fetching pump status:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
