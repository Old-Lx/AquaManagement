import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Activity, Zap, Power, PowerOff, Thermometer } from "lucide-react";
import type { PumpData } from "@/types/pump";
import { sendPumpCommand } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface PumpControlCardProps {
  pump: PumpData;
}

/**
 * Tarjeta de control individual para cada bomba
 * Muestra datos en tiempo real y botones de control START/STOP
 */
export function PumpControlCard({ pump }: PumpControlCardProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  
  const isActive = pump.street_flow_status === 'FLOWING';

  /**
   * Maneja el envío de comandos de control a la bomba
   */
  const handleControl = async () => {
    // Determinar el nuevo estado (si está ON, enviamos STOP, si no START)
    const command = pump.street_flow_status === "FLOWING" || pump.current_amps > 0 
      ? "STOP" 
      : "START";
      
    // OJO: Si tu lógica de "isPumpOn" es diferente, úsala aquí. 
    // Lo importante es enviar "START" o "STOP".

    try {
      console.log(`🔌 Enviando comando ${command} a Bomba ${pump.pump_id} (Local API)...`);
      
      // CAMBIO CLAVE: Usamos fetch a nuestra API local, no a Supabase
      const response = await fetch(`/api/pumps/${pump.pump_id}/control`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ command }),
      });

      if (!response.ok) {
        throw new Error(`Error del servidor: ${response.status}`);
      }

      const result = await response.json();
      console.log("✅ Respuesta del servidor:", result);

      // Aquí podrías agregar un toast o notificación de éxito

    } catch (error) {
      console.error("❌ Error enviando comando:", error);
      // Aquí podrías agregar un toast de error
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Bomba {pump.pump_id}
          </CardTitle>
          <Badge variant={isActive ? "default" : "secondary"}>
            {isActive ? "ACTIVA" : "DETENIDA"}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Datos de telemetría */}
        <div className="grid grid-cols-2 gap-4">
          {/* Consumo de corriente */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Zap className="h-4 w-4" />
              <span>Corriente</span>
            </div>
            <p className="text-2xl font-bold">{pump.current_amps.toFixed(1)} A</p>
          </div>

          {/* Temperatura del motor */}
          {pump.pump_temperature_celsius !== undefined && (
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Thermometer className="h-4 w-4" />
                <span>Temp. Motor</span>
              </div>
              <p className="text-2xl font-bold">{pump.pump_temperature_celsius.toFixed(1)} °C</p>
            </div>
          )}
        </div>

        {/* Estado del flujo */}
        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground mb-1">Estado del Flujo</p>
          <div className="flex items-center gap-2">
            <div className={`h-2 w-2 rounded-full ${isActive ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
            <span className="text-sm font-medium">
              {isActive ? 'Flujo detectado en calle' : 'Sin flujo en calle'}
            </span>
          </div>
        </div>

        {/* Botones de control */}
        <div className="grid grid-cols-2 gap-3 pt-4">
          <Button
            onClick={() => handleControl('START')}
            disabled={isLoading || isActive}
            variant="default"
            className="w-full"
          >
            <Power className="h-4 w-4 mr-2" />
            ENCENDER
          </Button>
          
          <Button
            onClick={() => handleControl('STOP')}
            disabled={isLoading || !isActive}
            variant="destructive"
            className="w-full"
          >
            <PowerOff className="h-4 w-4 mr-2" />
            APAGAR
          </Button>
        </div>

        {/* Timestamp */}
        <p className="text-xs text-muted-foreground text-center pt-2">
          Última actualización: {new Date(pump.timestamp).toLocaleTimeString('es-VE')}
        </p>
      </CardContent>
    </Card>
  );
}
