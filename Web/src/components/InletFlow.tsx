import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Droplets } from "lucide-react";

interface InletFlowProps {
  flowRate: number;
}

/**
 * Componente que muestra el flujo de entrada de agua desde la calle hacia el tanque
 * Dato compartido del sistema
 */
export function InletFlow({ flowRate }: InletFlowProps) {
  // Determinar color según el flujo
  const getFlowColor = (rate: number) => {
    if (rate >= 100) return "text-blue-600";
    if (rate >= 50) return "text-yellow-600";
    return "text-red-600";
  };

  const getFlowStatus = (rate: number) => {
    if (rate >= 100) return "✓ Flujo óptimo";
    if (rate >= 50) return "⚠ Flujo moderado";
    return "⚠ Flujo bajo - Verificar suministro";
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Droplets className="h-6 w-6 text-blue-500" />
          Flujo de Entrada
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Tasa de Flujo</p>
            <p className={`text-4xl font-bold ${getFlowColor(flowRate)}`}>
              {flowRate.toFixed(1)} <span className="text-2xl">L/min</span>
            </p>
          </div>
          
          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground">
              {getFlowStatus(flowRate)}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2">
            <div className="text-center p-2 bg-muted rounded">
              <p className="text-xs text-muted-foreground">Diario</p>
              <p className="text-sm font-semibold">{(flowRate * 60 * 24).toFixed(0)} L</p>
            </div>
            <div className="text-center p-2 bg-muted rounded">
              <p className="text-xs text-muted-foreground">Por Hora</p>
              <p className="text-sm font-semibold">{(flowRate * 60).toFixed(0)} L</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
