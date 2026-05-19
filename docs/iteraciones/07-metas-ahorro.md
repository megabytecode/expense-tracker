# 07 - Metas de ahorro

## Objetivo

Implementar metas de ahorro y distribucion organizativa del ahorro actual entre
metas, sin mover dinero real entre cuentas.

## Alcance

- Modelo `savings_goals`.
- Modelo `savings_goal_allocations`.
- CRUD de metas.
- Descripcion de meta.
- Distribucion de ahorro actual entre metas.
- Calculo de avance.
- Ajuste proporcional si baja el total ahorrado.
- Aviso al usuario cuando la distribucion cambie por retiro de ahorros.

## Fuera de alcance

- Reservar saldo real de cuentas.
- Movimientos automaticos entre cuentas.
- Metas compartidas entre usuarios.

## Reglas

- Las metas usan la moneda global del usuario.
- La asignacion a metas es organizativa.
- La suma asignada no puede superar el total ahorrado.
- El total ahorrado disponible para metas debe sumar solamente saldos dentro de
  cuentas `savings`; no debe incluir dinero en cuentas `cash` ni otros tipos.
- Si el total ahorrado baja por retiros desde cuentas de ahorro, las
  asignaciones se reducen proporcionalmente.
- Al entrar a la vista de ahorros, se informa que el retiro cambio la
  distribucion.

## Tareas sugeridas

- Crear migraciones Prisma.
- Crear servicio de metas.
- Crear servicio de calculo de total ahorrado.
- Crear servicio de redistribucion proporcional.
- Crear pantalla de metas.
- Crear UI de distribucion de ahorro actual.
- Crear aviso de redistribucion.

## Criterios de aceptacion

- El usuario puede crear meta con monto y descripcion.
- El usuario puede distribuir ahorro entre metas.
- No puede asignar mas que el total ahorrado.
- Retirar ahorro reduce asignaciones proporcionalmente.
- El usuario ve aviso al volver a ahorros.
- El dashboard puede consultar avance de metas.

## Verificacion

- Pruebas de asignacion.
- Pruebas de no superar total ahorrado.
- Pruebas de redistribucion proporcional.
- Prueba manual del aviso.
