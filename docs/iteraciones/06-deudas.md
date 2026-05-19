# 06 - Deudas

## Objetivo

Implementar el modulo de deudas y conectarlo con gastos mediante la categoria
protegida `Deudas`.

## Alcance

- Modelo `debts`.
- Modelo `debt_payment_days`.
- Modelo `debt_payments`.
- CRUD de deudas.
- Dias esperados de pago dentro del mes.
- Selector de deuda en gasto cuando la categoria sea `Deudas`.
- Calculo de monto pagado y monto pendiente.
- Pagos parciales y pago total desde gasto.

## Fuera de alcance

- Intereses.
- Comisiones.
- Estados pendientes de pago automaticos.
- Recordatorios externos.

## Reglas

- `Deudas` es categoria protegida, no borrable ni desactivable.
- Si un gasto usa categoria `Deudas`, debe escoger deuda.
- El selector muestra nombre de deuda y monto pendiente.
- El pago disminuye el monto pendiente.
- El pago no debe superar el saldo pendiente salvo regla futura.
- Deudas desactivadas no aparecen para nuevos pagos, pero conservan historial.

## Tareas sugeridas

- Crear migraciones Prisma de deudas.
- Crear servicio de deudas.
- Crear pantalla de deudas.
- Crear selector de deuda en modal de gasto.
- Crear reportes basicos de saldo pendiente.
- Integrar auditoria al editar/eliminar pagos de deuda.

## Criterios de aceptacion

- El usuario puede crear deuda con monto y dias esperados de pago.
- El usuario puede editar y desactivar deuda.
- Al escoger categoria `Deudas`, aparece selector de deuda.
- El selector muestra nombre y monto pendiente.
- Registrar gasto de deuda crea pago asociado.
- El monto pendiente se actualiza correctamente.
- Pagos parciales funcionan.

## Verificacion

- Pruebas de saldo pendiente de deuda.
- Pruebas de gasto asociado a deuda.
- Pruebas de no sobrepago.
- Pruebas de aislamiento por usuario.

