# 08 - Dashboard y reportes

## Objetivo

Construir el dashboard principal con reportes, graficas, tablas filtradas,
acciones rapidas fijas y paginacion, con enfoque mobile first.

## Alcance

- Dashboard principal.
- Filtro global desde inicio del mes actual.
- Filtros granulares por informe.
- Acciones fijas inferior derecha:
  - agregar gasto
  - agregar ingreso
  - registrar transferencia
- Grafica horizontal de gastos por categoria.
- Grafica horizontal de ingresos por categoria.
- Forecast mensual por categoria de gasto.
- Tabla filtrada al seleccionar categoria.
- Tabla con 10 registros por defecto.
- Paginacion con botones inferiores.
- Saldos esperados por cuenta.
- Historial de transferencias.
- Total transferido en rango.
- Total ahorrado.
- Resumen de metas.
- Resumen de deudas.
- Comparativo entre forecast mensual y gasto real por categoria.

## Fuera de alcance

- Exportacion CSV.
- Notificaciones externas.
- Analitica avanzada.

## Reglas

- El filtro global inicia en el primer dia del mes actual.
- Un filtro granular solo afecta su informe.
- Las transferencias no aparecen en graficas de ingreso/gasto.
- Los reportes respetan usuario autenticado.
- Las tablas deben tener estados vacios y paginacion inferior.
- La planeacion mensual por categoria es organizativa y no crea movimientos.
- La lectura y la accion principal del dashboard deben resolverse primero en
  movil.
- Consultar por MCP el proyecto Stitch `Expense Tracker Pro UI/UX` y reproducir
  las vistas de dashboard movil y desktop lo mas fielmente posible.

## Tareas sugeridas

- Crear consultas de reportes.
- Crear componentes de graficas con Recharts.
- Crear tablas paginadas.
- Crear detalle de movimiento desde tabla.
- Crear resumen de cuentas, ahorros, metas y deudas.
- Crear UI para base mensual de gasto y asignacion porcentual por categoria.
- Integrar botones fijos.

## Criterios de aceptacion

- Dashboard carga con filtro del mes actual.
- Graficas muestran ingresos y gastos por categoria.
- Forecast mensual por categoria se calcula y compara contra gasto real.
- Click en categoria muestra tabla filtrada.
- Tabla muestra 10 registros por defecto y pagina con botones inferiores.
- Saldos por cuenta son correctos.
- Total ahorrado es correcto.
- Deudas y metas aparecen en dashboard.
- Botones fijos abren los modales correctos.

## Verificacion

- Pruebas de consultas agregadas.
- Pruebas de filtros.
- Pruebas manuales responsive.
- Verificacion explicita mobile first antes de validar desktop.
- Verificacion visual de graficas y tablas.
- Verificacion visual de comparativo forecast vs ejecutado.
- Comparar visualmente contra las referencias de Stitch disponibles para movil
  y desktop.
