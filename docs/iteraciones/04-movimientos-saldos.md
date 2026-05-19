# 04 - Movimientos y saldos

## Objetivo

Implementar el libro financiero central: ingresos, gastos, transferencias,
ajustes manuales y calculo de saldos esperados.

## Alcance

- Modelo de transacciones.
- Modelo de asignaciones por cuenta.
- Modelo de transferencias.
- Crear ingreso con una o varias cuentas.
- Crear gasto con una o varias cuentas.
- Crear transferencia interbancaria simple.
- Crear ajuste manual.
- Calcular saldo esperado por cuenta.
- Editar y eliminar movimientos con auditoria interna.

## Fuera de alcance

- Adjuntos.
- Pagos de deuda.
- Dashboard avanzado.
- Metas de ahorro.

## Reglas

- Los ingresos aumentan saldo.
- Los gastos disminuyen saldo.
- Las transferencias restan origen y suman destino.
- Las transferencias no son ingreso ni gasto.
- Las transferencias no tienen comisiones ni estados en esta version.
- Las cuentas pueden quedar negativas.
- La suma de asignaciones debe coincidir con el total.
- Toda escritura financiera debe ser transaccional.
- Toda edicion/eliminacion debe recalcular saldos y registrar auditoria.

## Tareas sugeridas

- Completar modelos Prisma para `transactions`, `transaction_allocations`,
  `transfers` y `audit_logs`.
- Crear servicios de movimientos.
- Crear servicios de calculo de saldos.
- Crear formularios/modales de ingreso, gasto, transferencia y ajuste.
- Crear detalle de movimiento.
- Crear confirmacion de edicion/eliminacion.

## Criterios de aceptacion

- Se puede registrar ingreso en una o varias cuentas.
- Se puede registrar gasto en una o varias cuentas.
- Se puede registrar transferencia entre cuentas distintas.
- El saldo esperado refleja todos los movimientos.
- Editar un movimiento recalcula saldos.
- Eliminar un movimiento usa soft delete y recalcula saldos.
- La auditoria interna registra cambios relevantes.

## Verificacion

- Pruebas unitarias de saldo esperado.
- Pruebas de transacciones multi-cuenta.
- Pruebas de transferencia.
- Pruebas de edicion/eliminacion y auditoria.

