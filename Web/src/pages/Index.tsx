import { useState, useEffect } from "react";
import { TankLevel } from "@/components/TankLevel";
import { InletFlow } from "@/components/InletFlow";
import { PumpControlCard } from "@/components/PumpControlCard";
import { AlertsList } from "@/components/AlertsList";
import { LoginCard } from "@/components/LoginCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Activity, LogOut, Database, Wifi } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import type { PumpData, AlertEvent } from "@/types/pump";

/**
 * Genera datos mock para demostración del sistema de 2 bombas
 */
const generateMockPumps = (): PumpData[] => [
  {
    pump_id: 1,
    street_flow_status: 'FLOWING',
    current_amps: 12.5,
    water_level_percent: 75,
    current_inflow_rate: 145.8,
    pump_temperature_celsius: 65.3,
    timestamp: new Date().toISOString(),
  },
  {
    pump_id: 2,
    street_flow_status: 'STOPPED',
    current_amps: 0,
    water_level_percent: 75,
    current_inflow_rate: 0,
    pump_temperature_celsius: 28.7,
    timestamp: new Date().toISOString(),
  },
];

const mockAlerts: AlertEvent[] = [
  {
    severity: 'medium',
    message: 'Nivel de agua bajo detectado',
    timestamp: new Date().toISOString(),
    relatedPumpId: 2,
  },
  {
    severity: 'low',
    message: 'Ciclo de mantenimiento programado',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    relatedPumpId: 1,
  },
];

const Index = () => {
  const { user, isLoading, logout } = useAuth();
  const [pumps, setPumps] = useState<PumpData[]>([]);
  const [useSimulation, setUseSimulation] = useState(true); // Por defecto usa simulación

  /**
   * Modo Simulación: Genera datos mock con actualizaciones periódicas
   */
  useEffect(() => {
    if (!user || !useSimulation) return;

    // Inicializar datos mock
    setPumps(generateMockPumps());

    // Simular actualizaciones periódicas de telemetría
    const interval = setInterval(() => {
      setPumps(prevPumps => {
        const sharedWaterLevel = Math.max(
          0, 
          Math.min(100, prevPumps[0]?.water_level_percent + (Math.random() - 0.5) * 2)
        );

        return prevPumps.map(pump => ({
          ...pump,
          current_amps: pump.street_flow_status === 'FLOWING' ? 10 + Math.random() * 5 : 0,
          water_level_percent: sharedWaterLevel,
          current_inflow_rate: pump.street_flow_status === 'FLOWING' ? 140 + Math.random() * 20 : 0,
          pump_temperature_celsius: pump.street_flow_status === 'FLOWING' 
            ? 60 + Math.random() * 15
            : 25 + Math.random() * 5,
          timestamp: new Date().toISOString(),
        }));
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [user, useSimulation]);

  /**
   * Modo Real: Obtiene datos de telemetría desde Supabase
   * y se suscribe a actualizaciones en tiempo real
   */
  useEffect(() => {
    // Si no hay usuario o estamos en modo simulación, no hacer nada y limpiar intervalo anterior
    if (!user || useSimulation) return;

    const fetchTelemetry = async () => {
      try {
        // 1. Pedir datos al backend
        const response = await fetch('/api/telemetry');
        if (!response.ok) throw new Error('Error de red');
        
        const rawHistory = await response.json(); // Esto trae ej: 20 filas mezcladas
        
        // 2. FILTRAR: Solo queremos la ÚLTIMA lectura de cada bomba para las tarjetas
        // Usamos un Map para quedarnos solo con el registro más reciente de cada pump_id
        const latestPumpsMap = new Map<number, PumpData>();
        
        // Asumiendo que la DB devuelve orden descendente (el 0 es el más nuevo)
        // O si viene mezclado, procesamos todo:
        rawHistory.forEach((record: any) => {
          // Si no hemos guardado esta bomba todavía, la guardamos (prioridad al primero que aparece si está ordenado)
          if (!latestPumpsMap.has(record.pump_id)) {
            latestPumpsMap.set(record.pump_id, {
              pump_id: record.pump_id,
              street_flow_status: record.street_flow_status,
              current_amps: record.current_amps,
              water_level_percent: record.water_level_percent,
              current_inflow_rate: record.current_inflow_rate,
              pump_temperature_celsius: record.pump_temperature_celsius,
              timestamp: record.timestamp,
            });
          }
        });

        // 3. Convertir el Map a Array y ordenar por ID (Bomba 1, Bomba 2)
        const uniquePumps = Array.from(latestPumpsMap.values())
            .sort((a, b) => a.pump_id - b.pump_id);

        console.log("✅ Datos procesados para UI:", uniquePumps);
        setPumps(uniquePumps);
        
      } catch (error) {
        console.error("❌ Error cargando datos reales:", error);
      }
    };

    // Ejecutar inmediatamente al cambiar el switch
    fetchTelemetry();

    // Configurar polling cada 3 segundos
    const intervalId = setInterval(fetchTelemetry, 3000);

    return () => clearInterval(intervalId);
    
  }, [user, useSimulation]);

  // Mostrar pantalla de carga mientras valida sesión
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Activity className="h-12 w-12 animate-pulse mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  // No autenticado -> Mostrar Login
  if (!user) {
    return <LoginCard />;
  }

  // Autenticado -> Dashboard con nueva estructura de 2 bombas
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Activity className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                Sistema de Control de Bombas - Caracas
              </h1>
              <p className="text-muted-foreground">
                Monitoreo y control en tiempo real de 2 bombas
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Toggle Simulación / Datos Reales */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50">
              <Database className={`h-4 w-4 ${useSimulation ? 'text-primary' : 'text-muted-foreground'}`} />
              <Label htmlFor="data-mode" className="text-sm cursor-pointer">
                Simulación
              </Label>
              <Switch
                id="data-mode"
                checked={!useSimulation}
                onCheckedChange={(checked) => setUseSimulation(!checked)}
              />
              <Label htmlFor="data-mode" className="text-sm cursor-pointer">
                ESP32
              </Label>
              <Wifi className={`h-4 w-4 ${!useSimulation ? 'text-green-500' : 'text-muted-foreground'}`} />
            </div>

            <span className="text-sm text-muted-foreground">
              Usuario: <strong>{user.username}</strong>
            </span>
            <Button variant="outline" size="sm" onClick={logout}>
              <LogOut className="h-4 w-4 mr-2" />
              Cerrar Sesión
            </Button>
          </div>
        </div>

        {/* Sección Superior: Datos Compartidos - Nivel del Tanque y Flujo de Entrada */}
        <div className="grid gap-6 md:grid-cols-2">
          <TankLevel waterLevelPercent={pumps[0]?.water_level_percent || 0} />
          <InletFlow flowRate={pumps[0]?.current_inflow_rate || 0} />
        </div>

        {/* Sección Inferior: Tarjetas Individuales de Control por Bomba */}
        <div className="grid gap-6 md:grid-cols-2">
          {pumps.map(pump => (
            <PumpControlCard key={pump.pump_id} pump={pump} />
          ))}
        </div>

        {/* Alertas y Notificaciones */}
        <Card>
          <CardHeader>
            <CardTitle>Notificaciones y Alertas del Sistema</CardTitle>
          </CardHeader>
          <CardContent>
            <AlertsList alerts={mockAlerts} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Index;
