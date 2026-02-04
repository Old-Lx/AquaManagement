import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Droplet } from "lucide-react";

interface TankLevelProps {
  waterLevelPercent: number;
}

/**
 * Componente que muestra el nivel del tanque de agua compartido
 * Visualización prominente con barra de progreso vertical y código de colores
 */
export function TankLevel({ waterLevelPercent }: TankLevelProps) {
  // Determinar color según el nivel
  const getLevelColor = (level: number) => {
    if (level >= 70) return "bg-green-500";
    if (level >= 40) return "bg-yellow-500";
    return "bg-red-500";
  };

  const getLevelTextColor = (level: number) => {
    if (level >= 70) return "text-green-600";
    if (level >= 40) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Droplet className="h-6 w-6 text-blue-500" />
          Nivel del Tanque
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-6">
          {/* Barra de progreso vertical */}
          <div className="relative h-48 w-24 bg-muted rounded-lg overflow-hidden border-2 border-border">
            {/* Nivel de agua */}
            <div
              className={`absolute bottom-0 w-full transition-all duration-500 ${getLevelColor(waterLevelPercent)}`}
              style={{ height: `${waterLevelPercent}%` }}
            />
            {/* Marcadores de nivel */}
            <div className="absolute inset-0 flex flex-col justify-between p-1 pointer-events-none">
              <span className="text-xs text-muted-foreground">100%</span>
              <span className="text-xs text-muted-foreground">75%</span>
              <span className="text-xs text-muted-foreground">50%</span>
              <span className="text-xs text-muted-foreground">25%</span>
              <span className="text-xs text-muted-foreground">0%</span>
            </div>
          </div>

          {/* Información detallada */}
          <div className="flex-1 space-y-3">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Nivel Actual</p>
              <p className={`text-4xl font-bold ${getLevelTextColor(waterLevelPercent)}`}>
                {waterLevelPercent.toFixed(1)}%
              </p>
            </div>
            
            <div className="pt-2 border-t">
              <p className="text-xs text-muted-foreground">
                {waterLevelPercent >= 70 && "✓ Nivel óptimo"}
                {waterLevelPercent >= 40 && waterLevelPercent < 70 && "⚠ Nivel medio"}
                {waterLevelPercent < 40 && "⚠ Nivel bajo - Se recomienda revisar"}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
