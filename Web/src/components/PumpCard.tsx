import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Droplets, Zap, Activity, Thermometer } from "lucide-react";
import type { PumpData } from "@/types/pump";

interface PumpCardProps {
  pump: PumpData;
}

export function PumpCard({ pump }: PumpCardProps) {
  const isActive = pump.street_flow_status === 'FLOWING';
  
  return (
    <Card className="overflow-hidden border-2 transition-all hover:shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">Bomba #{pump.pump_id}</CardTitle>
          <Badge 
            variant={isActive ? "default" : "secondary"}
            className={isActive ? "bg-primary animate-pulse" : "bg-muted-foreground/20"}
          >
            {pump.street_flow_status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Droplets className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-muted-foreground">Nivel de Agua</p>
            <p className="text-xl font-bold">{pump.water_level_percent}%</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
            <Zap className="h-5 w-5 text-accent" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-muted-foreground">Corriente</p>
            <p className="text-xl font-bold">{pump.current_amps.toFixed(1)} A</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary/10">
            <Droplets className="h-5 w-5 text-secondary-foreground" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-muted-foreground">Tasa de Salida</p>
            <p className="text-xl font-bold">{pump.current_inflow_rate.toFixed(1)} L/min</p>
          </div>
        </div>

        {pump.pump_temperature_celsius !== undefined && (
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/10">
              <Thermometer className="h-5 w-5 text-orange-500" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">Temperatura Motor</p>
              <p className="text-xl font-bold">{pump.pump_temperature_celsius.toFixed(1)} °C</p>
            </div>
          </div>
        )}

        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
            <Activity className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-muted-foreground">Última actualización</p>
            <p className="text-sm font-medium">
              {new Date(pump.timestamp).toLocaleTimeString('es-ES')}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
