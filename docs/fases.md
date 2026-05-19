# Prompts seriales por fase

Este archivo contiene los prompts listos para usar en chats nuevos con Codex o
con otra IA, en el orden recomendado de implementacion.

Regla de uso:

- Ejecutar una fase por chat o por ciclo de trabajo.
- No mezclar fases salvo que una dependencia tecnica obligue a tocar algo menor.
- Antes de cada fase, la IA debe leer la documentacion base y luego solo la
  iteracion correspondiente.
- Cuando una fase toque frontend, vistas, componentes, paleta o tokens, la IA
  debe consultar por MCP el proyecto Stitch `Expense Tracker Pro UI/UX` y tomar
  como referencia sus vistas moviles y desktop.
- Cuando una fase toque Docker, CI/CD, deploy, rollback, Compose, PostgreSQL,
  healthchecks o nginx, la IA debe leer tambien `docs/despliegue-vps.md`.

## Fase 01

```md
Quiero que implementes Expense Tracker por iteraciones.

Antes de programar, lee estos documentos en este orden:

1. `docs/especificacion-funcional.md`
2. `docs/especificacion-tecnica.md`
3. `docs/puntos-de-refinamiento.md`
4. `docs/iteraciones/00-instrucciones-globales.md`
5. `docs/iteraciones/01-base-proyecto.md`

Implementa únicamente la iteración 01: Base del proyecto.

No implementes autenticación, movimientos, dashboard, deudas, metas ni adjuntos todavía.

Al terminar, debes entregar:

- Código implementado.
- Pruebas o verificaciones ejecutadas.
- Resumen de archivos modificados.
- Notas de cualquier decisión técnica que hayas tomado.

Respeta estrictamente la documentación existente, especialmente:

- React + TypeScript para frontend.
- Backend API HTTP separada del frontend.
- Enfoque mobile first en toda la interfaz.
- Si la fase crea o modifica vistas, componentes frontend, paleta o tokens, consultar por MCP el proyecto Stitch `Expense Tracker Pro UI/UX`.
- Reproducir las referencias moviles y desktop de Stitch lo mas fielmente posible sin romper la documentacion funcional o tecnica.
- Tailwind CSS.
- Prisma.
- PostgreSQL.
- `lucide-react`.
- Principios SOLID.
- Tokens visuales globales.
- Los tokens visuales globales deben derivarse del proyecto Stitch `Expense Tracker Pro UI/UX` cuando el MCP este disponible.
- Estructura preparada para servicios, dominio, datos y UI compartida.
```

## Fase 02

```md
Quiero que implementes la iteración 02 de Expense Tracker: Autenticación, sesiones y usuarios.

Antes de programar, lee estos documentos en este orden:

1. `docs/especificacion-funcional.md`
2. `docs/especificacion-tecnica.md`
3. `docs/puntos-de-refinamiento.md`
4. `docs/iteraciones/00-instrucciones-globales.md`
5. `docs/iteraciones/02-autenticacion-sesiones-usuarios.md`

Implementa únicamente la iteración 02.

No implementes todavía cuentas, categorías, movimientos, dashboard, deudas, metas de ahorro, adjuntos, administración avanzada, Docker ni CI/CD.

Debes respetar especialmente:

- React + TypeScript para frontend.
- Backend API HTTP separada del frontend.
- Enfoque mobile first en toda la interfaz.
- Si la fase crea o modifica vistas, componentes frontend, paleta o tokens, consultar por MCP el proyecto Stitch `Expense Tracker Pro UI/UX`.
- Reproducir las referencias moviles y desktop de Stitch lo mas fielmente posible sin romper la documentacion funcional o tecnica.
- Prisma y PostgreSQL.
- OTP por correo usando backend SMTP configurable, inicialmente Gmail.
- OTP hasheado.
- OTP expira en 10 minutos.
- Máximo 5 intentos fallidos.
- Después de 5 intentos fallidos, bloqueo de 1 hora.
- Reenvíos permitidos antes del bloqueo.
- Cada reenvío invalida códigos anteriores.
- Sesiones persistentes sin expiración automática.
- Sesiones revocables al cerrar sesión.
- Cookies seguras, `httpOnly` y `sameSite`.
- Roles `admin` y `user`.
- Moneda global del usuario.
- Almacenamiento inicial por usuario: 1 GB.
- Máximo de archivo adjunto futuro: 50 MB.
- Máximo de adjuntos por movimiento configurable por usuario administrador.
- Validación siempre en servidor.
- Aislamiento estricto por usuario autenticado.
- Principios SOLID y separación entre UI, servicios, dominio y datos.

Al terminar, debes entregar:

- Código implementado.
- Migraciones o cambios Prisma realizados.
- Variables de entorno nuevas o actualizadas.
- Pruebas o verificaciones ejecutadas.
- Resumen de archivos modificados.
- Notas de cualquier decisión técnica que hayas tomado.

Criterios de aceptación de esta iteración:

- Un usuario puede solicitar OTP por correo.
- Un OTP válido inicia sesión.
- Un OTP expirado falla.
- Un OTP con demasiados intentos falla y bloquea por 1 hora.
- Reenviar OTP invalida el código anterior.
- Cerrar sesión revoca la sesión.
- Las rutas privadas exigen sesión activa.
- El usuario queda creado con rol, moneda global y límites iniciales configurados.
```

## Fase 03

```md
Quiero que implementes la iteración 03 de Expense Tracker: Cuentas, categorías y configuración.

Antes de programar, lee estos documentos en este orden:

1. `docs/especificacion-funcional.md`
2. `docs/especificacion-tecnica.md`
3. `docs/puntos-de-refinamiento.md`
4. `docs/iteraciones/00-instrucciones-globales.md`
5. `docs/iteraciones/03-cuentas-categorias-configuracion.md`

Implementa únicamente la iteración 03.

Asume que la iteración 01 y 02 ya existen. Trabaja sobre lo implementado, sin rehacer autenticación ni estructura base.

No implementes todavía el dashboard completo, adjuntos, deudas como módulo completo, metas de ahorro, administración avanzada, Docker ni CI/CD.

Debes respetar especialmente:

- React + TypeScript para frontend.
- Backend API HTTP separada del frontend.
- Enfoque mobile first en toda la interfaz.
- Si la fase crea o modifica vistas, componentes frontend, paleta o tokens, consultar por MCP el proyecto Stitch `Expense Tracker Pro UI/UX`.
- Reproducir las referencias moviles y desktop de Stitch lo mas fielmente posible sin romper la documentacion funcional o tecnica.
- Prisma y PostgreSQL.
- Usuario autenticado obligatorio para operar datos.
- Aislamiento estricto por `user_id`.
- Moneda global vive en el usuario, no en cada cuenta.
- Tipos de cuenta: `savings` y `cash`.
- Soft delete/desactivación de cuentas.
- Categorías visibles creadas por usuario.
- Categoría oculta `Ajustes manuales`.
- Categoría protegida no borrable `Deudas`.
- El saldo inicial de una cuenta debe crear un ajuste manual inicial.
- `Ajustes manuales` no debe aparecer como categoría visible normal.
- `Deudas` no se puede eliminar ni desactivar.
- No permitir nombres duplicados activos por usuario y tipo.
- Validación siempre en servidor.
- Escrituras que creen cuenta + ajuste inicial deben ser transaccionales.
- Principios SOLID y separación entre UI, servicios, dominio y datos.

Al terminar, debes entregar:

- Código implementado.
- Migraciones o cambios Prisma realizados.
- Pruebas o verificaciones ejecutadas.
- Resumen de archivos modificados.
- Notas de cualquier decisión técnica que hayas tomado.

Criterios de aceptación de esta iteración:

- El usuario puede crear una cuenta con nombre, tipo y saldo inicial.
- El saldo inicial queda trazado como ajuste manual inicial.
- El usuario puede listar, editar y desactivar sus cuentas.
- Una cuenta desactivada no aparece como opción principal para nuevos movimientos.
- El usuario puede crear, listar, editar y desactivar categorías visibles.
- El usuario no puede crear categorías activas duplicadas por tipo.
- La categoría `Ajustes manuales` existe como oculta y no aparece como categoría normal.
- La categoría `Deudas` existe como protegida y no puede eliminarse ni desactivarse.
- El usuario puede configurar su moneda global.
- Cambiar moneda global después de existir movimientos muestra advertencia de que no convierte valores históricos.
- Un usuario no puede ver ni modificar cuentas o categorías de otro usuario.
```

## Fase 04

```md
Quiero que implementes la iteración 04 de Expense Tracker: Movimientos y saldos.

Antes de programar, lee estos documentos en este orden:

1. `docs/especificacion-funcional.md`
2. `docs/especificacion-tecnica.md`
3. `docs/puntos-de-refinamiento.md`
4. `docs/iteraciones/00-instrucciones-globales.md`
5. `docs/iteraciones/04-movimientos-saldos.md`

Implementa únicamente la iteración 04.

Asume que la iteración 01, 02 y 03 ya existen. Trabaja sobre lo implementado, sin rehacer la base del proyecto, autenticación, sesiones, usuarios, cuentas, categorías ni configuración global.

No implementes todavía adjuntos, dashboard completo, módulo de deudas, metas de ahorro, administración avanzada, Docker ni CI/CD.

Debes respetar especialmente:

- React + TypeScript para frontend.
- Backend API HTTP separada del frontend.
- Enfoque mobile first en toda la interfaz.
- Si la fase crea o modifica vistas, componentes frontend, paleta o tokens, consultar por MCP el proyecto Stitch `Expense Tracker Pro UI/UX`.
- Reproducir las referencias moviles y desktop de Stitch lo mas fielmente posible sin romper la documentacion funcional o tecnica.
- Prisma y PostgreSQL.
- Validación siempre en servidor.
- Aislamiento estricto por `user_id`.
- Escrituras financieras transaccionales.
- Moneda global vive en el usuario.
- Tipos de movimiento:
  - `income`
  - `expense`
  - `manual_adjustment`
- Transferencias interbancarias separadas de ingresos y gastos.
- Los ingresos aumentan saldo esperado.
- Los gastos disminuyen saldo esperado.
- Las transferencias restan en origen y suman en destino.
- Las transferencias no son ingreso ni gasto.
- Las transferencias no tienen comisiones ni estados en esta versión.
- Las cuentas pueden quedar con saldo esperado negativo.
- La suma de asignaciones por cuenta debe coincidir con el total del movimiento.
- Toda edición o eliminación de movimiento debe recalcular saldos.
- Toda edición o eliminación debe registrar auditoría interna.
- Soft delete para eliminaciones con impacto histórico.
- Principios SOLID y separación entre UI, servicios, dominio y datos.

Implementa dentro de esta iteración:

- Modelo de transacciones.
- Modelo de asignaciones por cuenta.
- Modelo de transferencias.
- Crear ingresos con una o varias cuentas.
- Crear gastos con una o varias cuentas.
- Crear transferencias entre cuentas propias.
- Crear ajustes manuales de saldo.
- Cálculo de saldo esperado por cuenta.
- Edición y eliminación de movimientos con confirmación y auditoría.
- Detalle de movimiento.
- Formularios o modales necesarios para:
  - ingreso
  - gasto
  - transferencia
  - ajuste manual

No implementes todavía:

- Adjuntos funcionales.
- Pagos de deuda.
- Dashboard de reportes completo.
- Metas de ahorro.
- Panel administrativo.
- Despliegue.

Al terminar, debes entregar:

- Código implementado.
- Migraciones o cambios Prisma realizados.
- Pruebas o verificaciones ejecutadas.
- Resumen de archivos modificados.
- Notas de cualquier decisión técnica que hayas tomado.

Criterios de aceptación de esta iteración:

- El usuario puede registrar un ingreso en una o varias cuentas.
- El usuario puede registrar un gasto en una o varias cuentas.
- El usuario puede registrar una transferencia entre cuentas distintas.
- El usuario puede registrar un ajuste manual de saldo.
- El saldo esperado por cuenta refleja ingresos, gastos, transferencias y ajustes.
- Las cuentas pueden quedar con saldo negativo sin bloquear la operación.
- Editar un movimiento recalcula saldos correctamente.
- Eliminar un movimiento usa soft delete y recalcula saldos.
- La auditoría interna registra ediciones y eliminaciones relevantes.
- Un usuario no puede crear, editar, eliminar ni consultar movimientos de otro usuario.
- El detalle de movimiento muestra la información completa del registro.
```

## Fase 05

```md
Quiero que implementes la iteración 05 de Expense Tracker: Adjuntos y almacenamiento.

Antes de programar, lee estos documentos en este orden:

1. `docs/especificacion-funcional.md`
2. `docs/especificacion-tecnica.md`
3. `docs/puntos-de-refinamiento.md`
4. `docs/iteraciones/00-instrucciones-globales.md`
5. `docs/iteraciones/05-adjuntos-almacenamiento.md`

Implementa únicamente la iteración 05.

Asume que la iteración 01, 02, 03 y 04 ya existen. Trabaja sobre lo implementado, sin rehacer la base del proyecto, autenticación, sesiones, usuarios, cuentas, categorías, movimientos ni saldos.

No implementes todavía el módulo de deudas, metas de ahorro, dashboard completo, administración avanzada, Docker final ni CI/CD.

Debes respetar especialmente:

- React + TypeScript para frontend.
- Backend API HTTP separada del frontend.
- Enfoque mobile first en toda la interfaz.
- Si la fase crea o modifica vistas, componentes frontend, paleta o tokens, consultar por MCP el proyecto Stitch `Expense Tracker Pro UI/UX`.
- Reproducir las referencias moviles y desktop de Stitch lo mas fielmente posible sin romper la documentacion funcional o tecnica.
- Prisma y PostgreSQL.
- Validación siempre en servidor.
- Aislamiento estricto por `user_id`.
- Principios SOLID y separación entre UI, servicios, dominio y datos.
- Los binarios no deben guardarse en PostgreSQL.
- La base de datos debe guardar solo metadata y claves de objeto.
- Los adjuntos deben almacenarse en un sistema privado compatible con S3.
- El approach recomendado debe soportar escalabilidad, migración entre VPS y acceso seguro por usuario.
- Si decides implementar el proveedor local para desarrollo o self-host, debe mantenerse interfaz S3-compatible.
- Los archivos nunca deben exponerse públicamente sin validar sesión, propiedad y permisos.
- La entrega de archivos debe hacerse mediante proxy autenticado o URL firmada de corta duración.
- No se usarán servicios externos ni motores antivirus de terceros en esta iteración.
- En su lugar, debes implementar validaciones rigurosas en backend para archivos subidos.
- Tipos permitidos:
  - PDF
  - Word
  - Excel
  - imágenes
- Límite inicial por usuario: 1 GB.
- Tamaño máximo por archivo: 50 MB.
- La cantidad máxima de adjuntos por movimiento debe ser configurable por administrador.
- En esta iteración, puedes dejar el valor de `max_attachments_per_movement` conectado al modelo de usuario o configuración existente, pero ya debe ser respetado por backend.
- El uso de almacenamiento del usuario debe actualizarse correctamente.
- Soft delete o política consistente cuando se eliminen adjuntos o movimientos relacionados.

Implementa dentro de esta iteración:

- Modelo `attachments`.
- Metadata de adjuntos.
- Servicio de almacenamiento con abstracción clara, por ejemplo `StorageProvider`.
- Implementación de proveedor S3-compatible.
- Subida de archivos.
- Descarga segura.
- Eliminación o desactivación coherente de adjuntos.
- Validación de tipo, tamaño y cuota.
- Validación estricta de MIME type, extensión y consistencia básica del archivo.
- Sanitización de nombres de archivo.
- Rechazo de archivos vacíos, corruptos o inconsistentes.
- Integración de adjuntos en los flujos ya existentes de:
  - ingreso
  - gasto
  - transferencia
  - detalle de movimiento

No implementes todavía:

- OCR.
- Escaneo antivirus externo.
- Suscripciones.
- Panel administrativo completo.
- Deudas.
- Metas.
- Reportes de dashboard.
- Despliegue final.

Al terminar, debes entregar:

- Código implementado.
- Migraciones o cambios Prisma realizados.
- Variables de entorno nuevas o actualizadas.
- Pruebas o verificaciones ejecutadas.
- Resumen de archivos modificados.
- Notas de cualquier decisión técnica que hayas tomado.

Criterios de aceptación de esta iteración:

- El usuario puede adjuntar archivos permitidos a movimientos o transferencias soportadas.
- El usuario puede ver los adjuntos desde el detalle correspondiente.
- El usuario puede descargar un adjunto propio de forma segura.
- Otro usuario no puede acceder a adjuntos ajenos.
- Archivos mayores a 50 MB son rechazados.
- Archivos de tipo no permitido son rechazados.
- Archivos vacíos, corruptos o inconsistentes entre extensión y tipo detectado son rechazados cuando sea posible validarlo.
- El usuario no puede superar su cuota de almacenamiento.
- El sistema respeta el máximo de adjuntos por movimiento configurado.
- Al eliminar o desactivar un movimiento, la política de adjuntos se mantiene coherente.
- La base de datos guarda metadata, no binarios.
```

## Fase 06

```md
Quiero que implementes la iteración 06 de Expense Tracker: Deudas.

Antes de programar, lee estos documentos en este orden:

1. `docs/especificacion-funcional.md`
2. `docs/especificacion-tecnica.md`
3. `docs/puntos-de-refinamiento.md`
4. `docs/iteraciones/00-instrucciones-globales.md`
5. `docs/iteraciones/06-deudas.md`

Implementa únicamente la iteración 06.

Asume que la iteración 01, 02, 03, 04 y 05 ya existen. Trabaja sobre lo implementado, sin rehacer la base del proyecto, autenticación, sesiones, usuarios, cuentas, categorías, movimientos, saldos ni adjuntos.

No implementes todavía metas de ahorro, dashboard completo, administración avanzada, Docker final ni CI/CD.

Debes respetar especialmente:

- React + TypeScript para frontend.
- Backend API HTTP separada del frontend.
- Enfoque mobile first en toda la interfaz.
- Si la fase crea o modifica vistas, componentes frontend, paleta o tokens, consultar por MCP el proyecto Stitch `Expense Tracker Pro UI/UX`.
- Reproducir las referencias moviles y desktop de Stitch lo mas fielmente posible sin romper la documentacion funcional o tecnica.
- Prisma y PostgreSQL.
- Validación siempre en servidor.
- Aislamiento estricto por `user_id`.
- Escrituras financieras transaccionales.
- Principios SOLID y separación entre UI, servicios, dominio y datos.
- Debe existir una categoría protegida no borrable llamada `Deudas`.
- La categoría `Deudas` no se puede eliminar ni desactivar.
- Si un gasto usa categoría `Deudas`, debe obligatoriamente asociarse a una deuda.
- El selector de deuda debe mostrar:
  - nombre de la deuda
  - monto pendiente
- El usuario puede crear deudas con:
  - nombre
  - descripción opcional
  - monto total
  - uno o varios días esperados de pago dentro del mes
  - estado
- El monto pendiente de una deuda se calcula con:
  - monto total
  - menos pagos asociados
- El sistema debe permitir pagos parciales.
- El sistema no debe permitir sobrepago en esta versión.
- Las deudas desactivadas no deben aparecer para nuevos pagos.
- Las deudas desactivadas deben conservar su historial.
- Los pagos de deuda deben integrarse al flujo de gasto, no como flujo separado.
- Editar o eliminar un movimiento asociado a deuda debe recalcular el saldo pendiente de la deuda y registrar auditoría interna.

Implementa dentro de esta iteración:

- Modelo `debts`.
- Modelo `debt_payment_days`.
- Modelo `debt_payments`.
- CRUD de deudas.
- Pantalla de deudas.
- Días esperados de pago dentro del mes.
- Selector de deuda en el modal o formulario de gasto cuando la categoría sea `Deudas`.
- Cálculo de monto pagado y monto pendiente.
- Integración entre gastos y pagos de deuda.
- Reglas para pago parcial y bloqueo de sobrepago.
- Reporte o consulta básica de deudas activas con saldo pendiente.

No implementes todavía:

- Intereses.
- Comisiones.
- Estados avanzados de deuda.
- Recordatorios externos.
- Metas de ahorro.
- Dashboard completo.
- Panel administrativo.
- Despliegue.

Al terminar, debes entregar:

- Código implementado.
- Migraciones o cambios Prisma realizados.
- Pruebas o verificaciones ejecutadas.
- Resumen de archivos modificados.
- Notas de cualquier decisión técnica que hayas tomado.

Criterios de aceptación de esta iteración:

- El usuario puede crear una deuda con monto total y días esperados de pago.
- El usuario puede listar, editar y desactivar sus deudas.
- La categoría `Deudas` sigue protegida y no puede eliminarse ni desactivarse.
- Al seleccionar categoría `Deudas` en un gasto, aparece el selector de deuda.
- El selector muestra nombre de la deuda y monto pendiente.
- Registrar un gasto asociado a una deuda crea un pago vinculado correctamente.
- Un pago parcial reduce el monto pendiente correctamente.
- No se permite pagar más del monto pendiente.
- El monto pendiente de la deuda se recalcula correctamente al editar o eliminar el gasto relacionado.
- Un usuario no puede ver ni modificar deudas o pagos de otro usuario.
- Las deudas desactivadas no aparecen como opción para nuevos pagos.
- La auditoría interna registra cambios relevantes relacionados con pagos de deuda.
```

## Fase 07

```md
Quiero que implementes la iteración 07 de Expense Tracker: Metas de ahorro.

Antes de programar, lee estos documentos en este orden:

1. `docs/especificacion-funcional.md`
2. `docs/especificacion-tecnica.md`
3. `docs/puntos-de-refinamiento.md`
4. `docs/iteraciones/00-instrucciones-globales.md`
5. `docs/iteraciones/07-metas-ahorro.md`

Implementa únicamente la iteración 07.

Asume que la iteración 01, 02, 03, 04, 05 y 06 ya existen. Trabaja sobre lo implementado, sin rehacer la base del proyecto, autenticación, sesiones, usuarios, cuentas, categorías, movimientos, saldos, adjuntos ni deudas.

No implementes todavía el dashboard completo, administración avanzada, Docker final ni CI/CD.

Debes respetar especialmente:

- React + TypeScript para frontend.
- Backend API HTTP separada del frontend.
- Enfoque mobile first en toda la interfaz.
- Si la fase crea o modifica vistas, componentes frontend, paleta o tokens, consultar por MCP el proyecto Stitch `Expense Tracker Pro UI/UX`.
- Reproducir las referencias moviles y desktop de Stitch lo mas fielmente posible sin romper la documentacion funcional o tecnica.
- Prisma y PostgreSQL.
- Validación siempre en servidor.
- Aislamiento estricto por `user_id`.
- Escrituras transaccionales cuando afecten reglas financieras o redistribuciones.
- Principios SOLID y separación entre UI, servicios, dominio y datos.
- La moneda global vive en el usuario.
- Las metas de ahorro usan la moneda global del usuario.
- Una meta debe tener:
  - nombre
  - descripción
  - monto objetivo
  - estado
  - fecha objetivo opcional
- El usuario debe tener un módulo para distribuir su ahorro actual entre metas.
- La asignación a metas es organizativa:
  - no mueve dinero real entre cuentas
  - no crea transacciones financieras
  - no reserva saldo real de cuenta
- La suma asignada a metas no puede superar el total ahorrado disponible del usuario.
- El total ahorrado debe basarse en cuentas de tipo `savings`.
- Si el usuario retira dinero de cuentas de ahorro y el total ahorrado queda por debajo de lo asignado a metas, las asignaciones deben reducirse proporcionalmente.
- Cuando esa redistribución ocurra, debe quedar una indicación visible para el usuario al volver a la vista de ahorros o metas.
- Editar o desactivar metas debe conservar coherencia con las asignaciones.
- El sistema debe recalcular avance, monto pendiente y porcentaje de avance correctamente.

Implementa dentro de esta iteración:

- Modelo `savings_goals`.
- Modelo `savings_goal_allocations`.
- CRUD de metas de ahorro.
- Pantalla de metas de ahorro.
- Distribución del ahorro actual entre metas.
- Cálculo de:
  - ahorro total disponible
  - monto asignado por meta
  - monto pendiente por meta
  - porcentaje de avance
- Reglas que impidan asignar más del total ahorrado.
- Reajuste proporcional de asignaciones cuando baje el ahorro disponible.
- Mecanismo para informar al usuario que una reducción de ahorro cambió la distribución de metas.

No implementes todavía:

- Dashboard completo con visualizaciones finales.
- Notificaciones externas.
- Reservas reales de saldo.
- Suscripciones.
- Panel administrativo.
- Despliegue.

Al terminar, debes entregar:

- Código implementado.
- Migraciones o cambios Prisma realizados.
- Pruebas o verificaciones ejecutadas.
- Resumen de archivos modificados.
- Notas de cualquier decisión técnica que hayas tomado.

Criterios de aceptación de esta iteración:

- El usuario puede crear una meta con nombre, descripción y monto objetivo.
- El usuario puede listar, editar y desactivar sus metas.
- El usuario puede distribuir su ahorro actual entre metas.
- El sistema no permite asignar más del total ahorrado disponible.
- El avance de cada meta se calcula correctamente.
- El monto pendiente de cada meta se calcula correctamente.
- El porcentaje de avance de cada meta se calcula correctamente.
- Si el ahorro total disminuye por retiros desde cuentas de ahorro, las asignaciones se ajustan proporcionalmente.
- El usuario ve una indicación de que la distribución cambió por reducción del ahorro.
- Un usuario no puede ver ni modificar metas o asignaciones de otro usuario.
- Las metas no crean ni modifican movimientos financieros reales.
```

## Fase 08

```md
Quiero que implementes la iteración 08 de Expense Tracker: Dashboard y reportes.

Antes de programar, lee estos documentos en este orden:

1. `docs/especificacion-funcional.md`
2. `docs/especificacion-tecnica.md`
3. `docs/puntos-de-refinamiento.md`
4. `docs/iteraciones/00-instrucciones-globales.md`
5. `docs/iteraciones/08-dashboard-reportes.md`

Implementa únicamente la iteración 08.

Asume que la iteración 01, 02, 03, 04, 05, 06 y 07 ya existen. Trabaja sobre lo implementado, sin rehacer la base del proyecto, autenticación, sesiones, usuarios, cuentas, categorías, movimientos, saldos, adjuntos, deudas ni metas de ahorro.

No implementes todavía administración avanzada, Docker final, CI/CD, exportaciones, notificaciones externas ni analítica avanzada.

Debes respetar especialmente:

- React + TypeScript para frontend.
- Backend API HTTP separada del frontend.
- Enfoque mobile first en toda la interfaz.
- Si la fase crea o modifica vistas, componentes frontend, paleta o tokens, consultar por MCP el proyecto Stitch `Expense Tracker Pro UI/UX`.
- Reproducir las referencias moviles y desktop de Stitch lo mas fielmente posible sin romper la documentacion funcional o tecnica.
- Prisma y PostgreSQL.
- Recharts para las gráficas.
- Validación siempre en servidor.
- Aislamiento estricto por `user_id`.
- Principios SOLID y separación entre UI, servicios, dominio y datos.
- Moneda global vive en el usuario.
- El dashboard es la pantalla principal autenticada.
- Debe existir filtro global por rango de fechas.
- El rango global por defecto debe iniciar en el primer día del mes actual.
- Cada informe puede tener filtros granulares propios.
- Un filtro granular debe afectar solo su propio informe.
- Las transferencias interbancarias no deben aparecer en gráficas de gastos ni ingresos.
- Las tablas deben mostrar 10 registros por defecto.
- La paginación debe hacerse con botones inferiores.
- Deben existir acciones rápidas fijas en la esquina inferior derecha para:
  - agregar gasto
  - agregar ingreso
  - registrar transferencia
- Los reportes deben tener estados vacíos, carga y error.
- Debe existir una planeación mensual de gasto por categoría.
- El usuario debe poder definir una base mensual de gasto.
- El usuario debe poder asignar porcentajes a categorías de gasto.
- La planeación mensual es organizativa y no crea movimientos financieros.
- El sistema debe calcular forecast monetario por categoría.
- El sistema debe comparar forecast contra gasto real acumulado del periodo.

Implementa dentro de esta iteración:

- Dashboard principal autenticado.
- Filtro global por fechas con rango inicial desde inicio del mes actual.
- Filtros granulares por informe cuando apliquen.
- Gráfica horizontal de gastos por categoría.
- Gráfica horizontal de ingresos por categoría.
- Tabla filtrada al seleccionar una categoría en cualquier gráfica.
- Paginación de 10 registros por defecto en tablas.
- Reporte de saldos esperados por cuenta.
- Historial de transferencias.
- Total acumulado transferido en rango.
- Total ahorrado.
- Resumen de metas de ahorro.
- Resumen de deudas pendientes.
- Configuración de base mensual de gasto.
- Asignación porcentual de planeación mensual por categoría de gasto.
- Comparativo entre forecast mensual y gasto real por categoría.
- Detalle de movimiento desde la tabla.
- Botones de acción rápida fijos y conectados a los flujos existentes.

No implementes todavía:

- Exportación CSV.
- Reportes contables avanzados.
- Analítica avanzada.
- Notificaciones externas.
- Panel administrativo.
- Despliegue final.

Al terminar, debes entregar:

- Código implementado.
- Consultas o servicios de reportes agregados creados o modificados.
- Pruebas o verificaciones ejecutadas.
- Resumen de archivos modificados.
- Notas de cualquier decisión técnica que hayas tomado.

Criterios de aceptación de esta iteración:

- El usuario autenticado entra al dashboard principal.
- El dashboard carga con rango global desde el primer día del mes actual.
- La gráfica de gastos muestra totales por categoría correctamente.
- La gráfica de ingresos muestra totales por categoría correctamente.
- Al hacer clic en una categoría, aparece una tabla filtrada con movimientos relacionados.
- La tabla muestra 10 registros por defecto y permite paginar con botones inferiores.
- El dashboard muestra saldos esperados por cuenta correctamente.
- El dashboard muestra historial de transferencias y total transferido en rango.
- El dashboard muestra total ahorrado correctamente.
- El dashboard muestra resumen de metas de ahorro.
- El dashboard muestra resumen de deudas pendientes.
- El dashboard permite configurar planeación mensual por categoría de gasto.
- El dashboard calcula el forecast monetario por categoría correctamente.
- El dashboard compara forecast mensual contra gasto real acumulado correctamente.
- Las transferencias no contaminan las gráficas de ingresos ni gastos.
- Los botones fijos inferiores derechos abren los flujos correctos.
- Un usuario no puede ver reportes ni datos agregados de otro usuario.
```

## Fase 09

```md
Quiero que implementes la iteración 09 de Expense Tracker: Administración y auditoría.

Antes de programar, lee estos documentos en este orden:

1. `docs/especificacion-funcional.md`
2. `docs/especificacion-tecnica.md`
3. `docs/puntos-de-refinamiento.md`
4. `docs/iteraciones/00-instrucciones-globales.md`
5. `docs/iteraciones/09-administracion-auditoria.md`

Implementa únicamente la iteración 09.

Asume que la iteración 01, 02, 03, 04, 05, 06, 07 y 08 ya existen. Trabaja sobre lo implementado, sin rehacer la base del proyecto, autenticación, sesiones, usuarios, cuentas, categorías, movimientos, saldos, adjuntos, deudas, metas ni dashboard.

No implementes todavía Docker final, CI/CD, backups definitivos, observabilidad avanzada, suscripciones ni una vista pública de auditoría para el usuario final.

Debes respetar especialmente:

- React + TypeScript para frontend.
- Backend API HTTP separada del frontend.
- Enfoque mobile first en toda la interfaz.
- Si la fase crea o modifica vistas, componentes frontend, paleta o tokens, consultar por MCP el proyecto Stitch `Expense Tracker Pro UI/UX`.
- Reproducir las referencias moviles y desktop de Stitch lo mas fielmente posible sin romper la documentacion funcional o tecnica.
- Prisma y PostgreSQL.
- Validación siempre en servidor.
- Aislamiento estricto por `user_id`.
- Principios SOLID y separación entre UI, servicios, dominio y datos.
- Roles `admin` y `user`.
- El administrador no debe ver datos financieros privados de otros usuarios.
- El administrador sí puede:
  - listar usuarios para gestión
  - desactivar usuarios
  - eliminar usuarios según política segura
  - cambiar límite de almacenamiento
  - cambiar máximo de adjuntos por movimiento
- El usuario normal no debe poder acceder a funcionalidades administrativas.
- Debe existir auditoría interna para cambios sensibles.
- La auditoría debe registrar al menos:
  - actor
  - entidad
  - acción
  - valores previos relevantes
  - valores nuevos relevantes
  - fecha
- La auditoría debe cubrir especialmente:
  - edición de movimientos
  - eliminación de movimientos
  - cambios relevantes sobre pagos de deuda si aplica
  - cambios relevantes sobre metas si aplica
- La auditoría en esta versión es interna, no una vista detallada para el usuario final.

Implementa dentro de esta iteración:

- Panel o pantalla de administración accesible solo para administradores.
- Listado de usuarios para gestión.
- Acción para desactivar usuarios.
- Acción para eliminar usuarios con política segura.
- Acción para cambiar límite de almacenamiento de usuarios.
- Acción para cambiar máximo de adjuntos por movimiento.
- Guards o protección de rutas/acciones por rol.
- Consolidación o completitud de auditoría interna para cambios financieros sensibles.
- Pruebas de autorización entre admin y user.

No implementes todavía:

- Acceso del admin a datos financieros privados de otros usuarios.
- Impersonación.
- Soporte multi-tenant avanzado.
- Auditoría visible para el usuario final.
- Suscripciones.
- Despliegue final.

Al terminar, debes entregar:

- Código implementado.
- Migraciones o cambios Prisma realizados si hubo ajustes.
- Pruebas o verificaciones ejecutadas.
- Resumen de archivos modificados.
- Notas de cualquier decisión técnica que hayas tomado.

Criterios de aceptación de esta iteración:

- Un usuario con rol `admin` puede acceder al panel administrativo.
- Un usuario con rol `user` no puede acceder al panel administrativo.
- El administrador puede listar usuarios.
- El administrador puede desactivar usuarios.
- El administrador puede eliminar usuarios según la política definida.
- El administrador puede cambiar el límite de almacenamiento de un usuario.
- El administrador puede cambiar el máximo de adjuntos por movimiento de un usuario.
- Ninguna acción administrativa expone cuentas, movimientos, reportes o adjuntos privados de otros usuarios.
- La auditoría interna registra correctamente cambios sensibles financieros.
- Las acciones protegidas por rol validan permisos en servidor, no solo en UI.
```

## Fase 10

```md
Quiero que implementes la iteración 10 de Expense Tracker: Docker, CI/CD y despliegue.

Antes de programar, lee estos documentos en este orden:

1. `docs/especificacion-funcional.md`
2. `docs/especificacion-tecnica.md`
3. `docs/puntos-de-refinamiento.md`
4. `docs/iteraciones/00-instrucciones-globales.md`
5. `docs/despliegue-vps.md`
6. `docs/iteraciones/10-docker-cicd-despliegue.md`

Implementa únicamente la iteración 10.

Asume que la iteración 01, 02, 03, 04, 05, 06, 07, 08 y 09 ya existen. Trabaja sobre lo implementado, sin rehacer funcionalidades del producto.

No implementes todavía observabilidad avanzada, suscripciones, backups automatizados definitivos ni nuevas funcionalidades de negocio.

Debes respetar especialmente:

- React + TypeScript para frontend.
- Backend API HTTP separada del frontend.
- Enfoque mobile first en toda la interfaz.
- Si la fase crea o modifica vistas, componentes frontend, paleta o tokens, consultar por MCP el proyecto Stitch `Expense Tracker Pro UI/UX`.
- Reproducir las referencias moviles y desktop de Stitch lo mas fielmente posible sin romper la documentacion funcional o tecnica.
- Prisma y PostgreSQL.
- PostgreSQL de produccion debe ser administrado por el host del VPS, no por el Compose del proyecto.
- Los contenedores deben conectarse a PostgreSQL usando `DB_HOST=172.31.255.1` y `DB_PORT=5432`.
- La app nunca debe usar el superusuario `postgres`; debe usar base, rol y password propios.
- El desarrollo local puede seguir corriendo sin Docker obligatorio.
- La imagen final debe ser liviana.
- Debe usarse Dockerfile multi-stage.
- No se debe copiar `node_modules` local completo al runtime final.
- El runtime debe incluir solo artefactos compilados y dependencias necesarias de producción.
- Ejecutar con usuario no root cuando sea viable.
- Secretos solo por variables de entorno.
- Rama de producción: `production`.
- CI con checks básicos:
  - instalación
  - lint
  - typecheck
  - pruebas
- CD preparado para desplegar desde la rama `production` ejecutando un script remoto por SSH en el VPS.
- GitHub Actions no debe construir la imagen productiva ni guardar secretos de runtime; solo valida y dispara el deploy remoto.
- El build real debe ocurrir en el VPS con `docker compose build`.
- El Compose debe publicar puertos solo en loopback, por ejemplo `127.0.0.1:3101:3000`.
- `nginx` vive en el host y debe hacer proxy al puerto loopback.
- Prisma migrations deben quedar contempladas en el despliegue.
- Debe existir health check.
- La configuración debe ser coherente con despliegue en VPS con Docker.

Implementa dentro de esta iteración:

- `Dockerfile` multi-stage para la app.
- `.dockerignore`.
- Si existe un `docker-compose.yml` previo con PostgreSQL, no usarlo como Compose de produccion; reemplazarlo por el contrato VPS o separarlo claramente como compose local de desarrollo.
- Configuración Compose para levantar la app sin servicio PostgreSQL de produccion.
- Red interna del proyecto y red externa compartida para acceso a DB, por ejemplo `platform_db`.
- Publicacion del puerto de la app solo en `127.0.0.1`.
- Variables `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` y `DATABASE_URL`.
- Ejemplo de `deploy.conf`.
- Documentacion de estructura `/srv/apps/expense-tracker`, `/srv/secrets/expense-tracker` y `/srv/backups/expense-tracker`.
- Ejemplo de configuracion `nginx` host.
- Variables de entorno documentadas para despliegue.
- Workflow de CI en GitHub Actions.
- Workflow de CD en GitHub Actions orientado a ejecutar deploy remoto desde `production`.
- Estrategia clara para ejecutar migraciones Prisma en despliegue.
- Health check de aplicación.
- Documentación mínima de despliegue y comandos operativos si hace falta.

No implementes todavía:

- Backups automatizados definitivos.
- Observabilidad completa.
- Provisionamiento automático del VPS.
- Kubernetes.
- Nuevas features de producto.

Al terminar, debes entregar:

- Archivos de Docker y CI/CD implementados.
- Resumen de archivos modificados.
- Verificaciones ejecutadas.
- Notas de cualquier decisión técnica tomada.
- Cualquier supuesto temporal sobre el VPS o secretos de despliegue.

Criterios de aceptación de esta iteración:

- La aplicación puede construirse con Docker.
- La imagen final es multi-stage y razonablemente liviana.
- Compose de produccion no incluye PostgreSQL del proyecto.
- La app se conecta a PostgreSQL host-managed por red Docker compartida.
- Los puertos de la app estan publicados solo en loopback del host.
- La app puede configurarse por variables de entorno.
- Existe un health check funcional.
- CI ejecuta lint, typecheck y pruebas.
- CD queda preparado para disparar deploy remoto desde la rama `production`.
- Prisma migrations están contempladas en el proceso de despliegue.
- `deploy.conf`, nginx y rollback quedan documentados segun el contrato del VPS.
- No se exponen secretos dentro del repositorio.
```

## Fase 11

```md
Quiero que implementes la iteración 11 de Expense Tracker: Pulido final y hardening.

Antes de programar, lee estos documentos en este orden:

1. `docs/especificacion-funcional.md`
2. `docs/especificacion-tecnica.md`
3. `docs/puntos-de-refinamiento.md`
4. `docs/iteraciones/00-instrucciones-globales.md`
5. `docs/iteraciones/11-pulido-final-hardening.md`

Implementa únicamente la iteración 11.

Asume que la iteración 01, 02, 03, 04, 05, 06, 07, 08, 09 y 10 ya existen. Trabaja sobre lo implementado, sin rehacer funcionalidades completas ya cerradas, salvo que encuentres bugs, huecos de seguridad, fallos de integridad o problemas serios de UX que deban corregirse.

No implementes nuevas funcionalidades grandes fuera del alcance actual del producto. Esta iteración es para cerrar calidad, estabilidad, seguridad y preparación real de uso.

Debes respetar especialmente:

- React + TypeScript para frontend.
- Backend API HTTP separada del frontend.
- Enfoque mobile first en toda la interfaz.
- Si la fase crea o modifica vistas, componentes frontend, paleta o tokens, consultar por MCP el proyecto Stitch `Expense Tracker Pro UI/UX`.
- Reproducir las referencias moviles y desktop de Stitch lo mas fielmente posible sin romper la documentacion funcional o tecnica.
- Prisma y PostgreSQL.
- Validación siempre en servidor.
- Aislamiento estricto por `user_id`.
- Escrituras financieras transaccionales.
- Principios SOLID y separación entre UI, servicios, dominio y datos.
- No dejar rutas privadas sin sesión.
- No dejar acciones sensibles sin validación de permisos.
- No dejar archivos expuestos públicamente.
- No usar `float` para dinero.
- Mantener integridad de saldos, pagos de deuda, metas y reportes.
- No introducir nuevas features de negocio grandes.
- Priorizar:
  - estabilidad
  - seguridad
  - integridad financiera
  - estados de UX
  - mobile first
  - responsive
  - consistencia visual
  - claridad operativa

Implementa dentro de esta iteración:

- Revisión completa de estados vacíos.
- Revisión completa de loading states.
- Revisión completa de errores y mensajes de validación.
- Revisión de permisos y aislamiento por usuario.
- Revisión de guards de rol.
- Revisión de race conditions o puntos sensibles en escrituras financieras.
- Revisión de integridad en:
  - saldos esperados
  - transferencias
  - pagos de deuda
  - metas de ahorro
  - redistribución proporcional de metas
  - forecast mensual por categoría y comparación contra gasto real
- Revisión de índices faltantes en base de datos si hacen falta para consultas clave.
- Revisión mobile first en móvil y luego desktop.
- Revisión visual de modales, tablas, filtros y dashboard.
- Revisión de accesibilidad básica.
- Revisión de configuración de despliegue y variables de entorno.
- Ajustes de documentación operativa si hace falta.

No implementes todavía:

- Google Auth.
- Suscripciones.
- Reportes contables avanzados.
- Analítica avanzada.
- OCR.
- Nuevos módulos grandes.

Al terminar, debes entregar:

- Código implementado o corregido.
- Resumen de bugs o huecos encontrados y corregidos.
- Pruebas o verificaciones ejecutadas.
- Resumen de archivos modificados.
- Riesgos residuales si queda alguno.
- Notas de cualquier decisión técnica tomada.

Criterios de aceptación de esta iteración:

- El flujo completo principal funciona:
  - login
  - crear cuenta
  - crear categoría
  - registrar ingreso
  - registrar gasto
  - registrar transferencia
  - crear deuda y pagarla
  - crear meta y asignar ahorro
  - revisar dashboard
- No hay errores visibles en los flujos principales.
- Todas las rutas privadas exigen sesión.
- Un usuario no puede acceder a datos de otro usuario.
- Un usuario normal no puede ejecutar acciones administrativas.
- Los saldos esperados siguen siendo correctos después de edición y eliminación.
- Los pagos de deuda siguen siendo coherentes.
- Las metas de ahorro siguen siendo coherentes después de retiros de ahorro.
- El comparativo forecast vs ejecutado sigue siendo coherente.
- Los adjuntos siguen protegidos correctamente.
- La UI responde bien en escritorio y móvil.
- La app queda en estado razonable para despliegue inicial real.
```
