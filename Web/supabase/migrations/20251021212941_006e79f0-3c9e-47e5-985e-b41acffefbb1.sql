-- Renombrar la columna de temperatura para reflejar que es temperatura de la bomba individual
ALTER TABLE telemetry_data 
RENAME COLUMN water_temperature_celsius TO pump_temperature_celsius;

-- Actualizar el comentario descriptivo
COMMENT ON COLUMN telemetry_data.pump_temperature_celsius IS 'Temperatura del motor de la bomba medida por el sensor DS18B20 en grados Celsius';