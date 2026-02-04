import { AlertTriangle, AlertCircle, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { AlertEvent } from "@/types/pump";

interface AlertsListProps {
  alerts: AlertEvent[];
}

export function AlertsList({ alerts }: AlertsListProps) {
  const getSeverityIcon = (severity: AlertEvent['severity']) => {
    switch (severity) {
      case 'high':
        return <AlertTriangle className="h-5 w-5" />;
      case 'medium':
        return <AlertCircle className="h-5 w-5" />;
      case 'low':
        return <Info className="h-5 w-5" />;
    }
  };

  const getSeverityVariant = (severity: AlertEvent['severity']) => {
    switch (severity) {
      case 'high':
        return 'destructive';
      case 'medium':
        return 'default';
      case 'low':
        return 'default';
    }
  };

  return (
    <div className="space-y-3">
      {alerts.map((alert, index) => (
        <Alert 
          key={index} 
          variant={getSeverityVariant(alert.severity)}
          className="border-2"
        >
          <div className="flex items-start gap-3">
            {getSeverityIcon(alert.severity)}
            <div className="flex-1">
              <AlertDescription className="font-medium">
                {alert.message}
              </AlertDescription>
              <p className="mt-1 text-xs opacity-70">
                Bomba #{alert.relatedPumpId} • {new Date(alert.timestamp).toLocaleString('es-ES')}
              </p>
            </div>
          </div>
        </Alert>
      ))}
    </div>
  );
}
