-- Create telemetry_data table for pump monitoring
CREATE TABLE public.telemetry_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pump_id INTEGER NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  water_level_percent NUMERIC(5,2) NOT NULL,
  current_amps NUMERIC(6,2) NOT NULL,
  street_flow_status TEXT NOT NULL,
  current_inflow_rate NUMERIC(8,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.telemetry_data ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users to read telemetry data
CREATE POLICY "Authenticated users can view telemetry data" 
ON public.telemetry_data 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- Create policy for system to insert telemetry data
CREATE POLICY "System can insert telemetry data" 
ON public.telemetry_data 
FOR INSERT 
WITH CHECK (true);

-- Create index for faster queries by pump_id and timestamp
CREATE INDEX idx_telemetry_pump_timestamp ON public.telemetry_data(pump_id, timestamp DESC);

-- Create index for pump_id lookups
CREATE INDEX idx_telemetry_pump_id ON public.telemetry_data(pump_id);