import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "../../components/ui/PageHeader";
import { Button } from "../../components/ui/Button";
import { Plus, Edit2, Trash2 } from "lucide-react";
import { fetchApi } from "../../api/client";
import { Modal } from "../../components/ui/Modal";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { EmptyState, ErrorState, LoadingState } from "../../components/ui/EmptyState";

interface Category {
  id: string;
  name: string;
  type: "income" | "expense";
  isProtected: boolean;
}

export function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [formError, setFormError] = useState("");
  
  const [formData, setFormData] = useState<{ id: string; name: string; type: "expense" | "income" }>({
    id: "",
    name: "",
    type: "expense",
  });

  const getErrorMessage = (error: unknown) => {
    return error instanceof Error ? error.message : "Ocurrió un error inesperado.";
  };

  const loadCategories = useCallback(async () => {
    try {
      setIsLoading(true);
      setPageError("");
      const data = await fetchApi("/categories");
      setCategories(data);
    } catch (error) {
      setPageError(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Initial data fetch for this route.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadCategories();
  }, [loadCategories]);

  const openModal = (cat?: Category) => {
    if (cat) {
      if (cat.isProtected) return;
      setFormData({ id: cat.id, name: cat.name, type: cat.type });
    } else {
      setFormData({ id: "", name: "", type: "expense" });
    }
    setFormError("");
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    try {
      if (formData.id) {
        await fetchApi(`/categories/${formData.id}`, {
          method: "PATCH",
          body: JSON.stringify({ name: formData.name, type: formData.type }),
        });
      } else {
        await fetchApi("/categories", {
          method: "POST",
          body: JSON.stringify(formData),
        });
      }
      setIsModalOpen(false);
      loadCategories();
    } catch (error) {
      setFormError(getErrorMessage(error));
    }
  };

  const handleDeactivate = async (cat: Category) => {
    if (cat.isProtected) {
      alert("No se pueden eliminar categorías protegidas.");
      return;
    }
    if (!confirm("¿Desactivar esta categoría?")) return;
    try {
      await fetchApi(`/categories/${cat.id}`, { method: "DELETE" });
      loadCategories();
    } catch (error) {
      alert(getErrorMessage(error));
    }
  };

  const visibleCategories = categories.filter((cat) => !cat.isProtected);

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Categorías" 
        description="Organiza tus ingresos y gastos en categorías."
        action={
          <Button onClick={() => openModal()}>
            <Plus className="mr-2 h-4 w-4" /> Nueva Categoría
          </Button>
        }
      />

      {isLoading ? (
        <LoadingState title="Cargando categorías..." description="Estamos preparando tus categorías visibles." />
      ) : pageError ? (
        <ErrorState
          description={pageError}
          action={<Button onClick={loadCategories}>Reintentar</Button>}
        />
      ) : (
        <div className="bg-[var(--color-surface-container-lowest)] border border-[var(--color-outline-variant)] rounded-lg shadow-sm divide-y divide-[var(--color-outline-variant)]">
          {visibleCategories.map(cat => (
            <div key={cat.id} className="p-4 flex justify-between items-center hover:bg-surface-container-lowest">
              <div>
                <h3 className="font-medium text-on-surface flex items-center">
                  {cat.name}
                  {cat.isProtected && <span className="ml-2 text-xs bg-surface-variant text-on-surface-variant px-2 py-0.5 rounded-full">Protegida</span>}
                </h3>
                <p className="text-sm text-on-surface-variant">
                  {cat.type === "income" ? "Ingreso" : "Gasto"}
                </p>
              </div>
              <div className="flex space-x-2">
                {!cat.isProtected && (
                  <>
                    <button onClick={() => openModal(cat)} className="p-2 text-on-surface-variant hover:text-primary">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDeactivate(cat)} className="p-2 text-error hover:text-on-error-container">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
          {visibleCategories.length === 0 && (
            <EmptyState
              className="m-4"
              title="No tienes categorías visibles"
              description="Crea categorías de ingreso y gasto antes de registrar movimientos."
              action={<Button onClick={() => openModal()}>Crear primera categoría</Button>}
            />
          )}
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={formData.id ? "Editar Categoría" : "Nueva Categoría"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && <div role="alert" className="p-3 bg-error-container text-on-error-container rounded text-sm">{formError}</div>}
          
          <Input 
            label="Nombre de la categoría" 
            value={formData.name} 
            onChange={e => setFormData({ ...formData, name: e.target.value })} 
            required 
          />
          
          <Select 
            label="Tipo de categoría" 
            value={formData.type} 
            onChange={e => setFormData({ ...formData, type: e.target.value as "expense" | "income" })}
          >
            <option value="expense">Gasto</option>
            <option value="income">Ingreso</option>
          </Select>

          <div className="flex justify-end pt-4">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} className="mr-2">Cancelar</Button>
            <Button type="submit">Guardar</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
