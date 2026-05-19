# 00 - Instrucciones globales para Codex/IA

## Objetivo

Construir Expense Tracker de forma incremental, respetando la especificacion
funcional y tecnica existentes. La prioridad es integridad financiera, seguridad
por usuario, claridad de dominio y una base mantenible.

## Documentos fuente

Antes de implementar cualquier fase, leer:

- `docs/especificacion-funcional.md`
- `docs/especificacion-tecnica.md`
- `docs/puntos-de-refinamiento.md`
- `docs/despliegue-vps.md` cuando la fase toque Docker, CI/CD, deploy,
  rollback, Compose, PostgreSQL, healthchecks o nginx
- el documento de iteracion correspondiente

## Stack base

- React con TypeScript para frontend.
- Backend API HTTP separado del frontend.
- TypeScript.
- Tailwind CSS.
- `lucide-react` para iconos.
- Enfoque mobile first para toda la interfaz.
- PostgreSQL.
- Prisma y Prisma Migrate.
- Swagger/OpenAPI para documentacion del API backend.
- Recharts para graficas.
- OTP por correo usando backend SMTP configurable inicialmente con Gmail.
- Sesiones persistentes sin expiracion automatica, revocables.
- Docker para despliegue.
- En produccion, PostgreSQL es administrado por el host del VPS y no por el
  Compose del proyecto.
- GitHub Actions dispara el deploy remoto por SSH; el build real ocurre en el
  VPS.
- Rama `development` para integracion y `production` para despliegue estable.

## Principios obligatorios

- Aplicar SOLID de forma pragmatica.
- Mantener reglas financieras fuera de componentes visuales.
- Validar siempre en servidor.
- Filtrar toda consulta por usuario autenticado.
- Usar transacciones para escrituras financieras.
- Evitar `float` para dinero.
- Usar soft delete donde haya impacto historico.
- Registrar auditoria interna para ediciones y eliminaciones financieras.
- No exponer adjuntos sin validar sesion, propiedad y permisos.

## Convenciones de implementacion

- Crear servicios o casos de uso para reglas de negocio.
- Usar repositorios o servicios de datos sobre Prisma.
- Exponer operaciones backend mediante endpoints API versionados.
- Mantener Swagger/OpenAPI actualizado con los endpoints implementados.
- Compartir schemas de validacion cuando sea razonable.
- Mantener componentes visuales reutilizables para formularios, modales, tablas,
  botones, selectores y estados vacios.
- Centralizar tokens visuales en configuracion global de Tailwind.
- Resolver primero la experiencia movil y luego escalar a tablet y escritorio.
- Cuando una fase cree o modifique vistas, componentes frontend, paleta o tokens,
  consultar por MCP el proyecto Stitch `Expense Tracker Pro UI/UX` y reproducir
  las referencias moviles y desktop lo mas fielmente posible.
- Usar Stitch como referencia visual; las reglas funcionales, seguridad,
  permisos, datos y contratos API siguen viniendo de la documentacion del
  proyecto.
- No implementar funcionalidades futuras si la fase no las pide.

## Reglas financieras base

- La moneda global vive en el usuario.
- El saldo inicial de cuenta se registra como ajuste manual inicial.
- Los gastos disminuyen saldo esperado.
- Los ingresos aumentan saldo esperado.
- Las transferencias mueven saldo entre cuentas propias y no son gasto ni
  ingreso.
- Los saldos esperados pueden quedar negativos.
- La categoria oculta `Ajustes manuales` se usa para ajustes de saldo.
- La categoria protegida `Deudas` no se puede borrar ni desactivar.
- Las metas de ahorro son organizativas y no mueven dinero real entre cuentas.

## Seguridad minima

- Cookies de sesion `httpOnly`, `secure` en produccion y `sameSite`.
- OTP hasheado, expira en 10 minutos.
- Maximo 5 intentos fallidos por ciclo de OTP.
- Despues de 5 intentos fallidos, bloqueo de 1 hora.
- Reenvios permitidos antes del bloqueo e invalidan codigos anteriores.
- Secretos solo por variables de entorno.

## Definition of Done por fase

- El scope de la fase esta implementado.
- No se implementa scope de fases posteriores salvo dependencia directa.
- Las pruebas o checks disponibles pasan.
- Las migraciones quedan coherentes.
- La UI no deja flujos principales sin estados de error o vacio.
- Se documenta cualquier decision nueva.
