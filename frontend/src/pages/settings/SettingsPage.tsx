import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader } from "../../components/ui/PageHeader";
import { Button } from "../../components/ui/Button";
import { fetchApi } from "../../api/client";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { useAuth } from "../../context/AuthContext";

type MonthlyPlanMode = "amount" | "percentage";

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Ocurrió un error inesperado.";
}

export function SettingsPage() {
  const { user, setUser } = useAuth();
  const [currencyDraft, setCurrencyDraft] = useState<string | null>(null);
  const [monthlyPlanMode, setMonthlyPlanMode] = useState<MonthlyPlanMode>("amount");
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [message, setMessage] = useState({ text: "", type: "" });
  const currencyCode = useMemo(
    () => currencyDraft ?? user?.currencyCode ?? "COP",
    [currencyDraft, user?.currencyCode],
  );

  const loadSettings = useCallback(async () => {
    try {
      setIsLoadingSettings(true);
      const settings = await fetchApi("/settings");
      if (settings?.monthlyPlanMode === "percentage" || settings?.monthlyPlanMode === "amount") {
        setMonthlyPlanMode(settings.monthlyPlanMode);
      }
    } catch (error) {
      setMessage({ text: getErrorMessage(error), type: "error" });
    } finally {
      setIsLoadingSettings(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadSettings();
  }, [loadSettings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirm("Advertencia: Cambiar la moneda global no convierte automáticamente los valores históricos. ¿Deseas continuar?")) {
      return;
    }
    
    setIsSaving(true);
    setMessage({ text: "", type: "" });
    try {
      const updated = await fetchApi("/settings/currency", {
        method: "PATCH",
        body: JSON.stringify({ currencyCode }),
      });

      await fetchApi("/settings/monthly-plan-mode", {
        method: "PATCH",
        body: JSON.stringify({ monthlyPlanMode }),
      });

      setMessage({ text: "Preferencias actualizadas correctamente.", type: "success" });
      if (user) {
        setUser({ ...user, currencyCode: updated.currencyCode });
      }
    } catch (error) {
      setMessage({ text: getErrorMessage(error), type: "error" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeader 
        title="Configuración" 
        description="Ajustes de cuenta y preferencias."
      />

      <div className="bg-[var(--color-surface-container-lowest)] border border-[var(--color-outline-variant)] rounded-lg p-6 shadow-sm">
        <h3 className="text-lg font-semibold mb-4">Preferencias Globales</h3>
        
        {message.text && (
          <div className={`p-3 mb-4 rounded text-sm ${message.type === 'success' ? 'bg-secondary-container text-on-secondary-container' : 'bg-error-container text-on-error-container'}`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Input 
              label="Moneda Global" 
              value={currencyCode} 
              onChange={e => setCurrencyDraft(e.target.value.toUpperCase())} 
              maxLength={3}
              placeholder="Ej: COP, USD, EUR"
              required 
            />
            <p className="mt-1 text-xs text-on-surface-variant">
              Esta moneda se usará en todos los reportes y saldos.
            </p>
          </div>

          <div>
            <Select
              label="Planeación mensual por categoría"
              value={monthlyPlanMode}
              onChange={(event) => setMonthlyPlanMode(event.target.value as MonthlyPlanMode)}
              disabled={isLoadingSettings}
            >
              <option value="amount">Cantidad fija por categoría</option>
              <option value="percentage">Porcentaje de la base mensual</option>
            </Select>
            <p className="mt-1 text-xs text-on-surface-variant">
              El planner mensual usará este modo para capturar y calcular el forecast por categoría.
            </p>
          </div>
          
          <Button type="submit" disabled={isSaving || isLoadingSettings}>
            {isSaving ? "Guardando..." : "Guardar Cambios"}
          </Button>
        </form>
      </div>
    </div>
  );
}
