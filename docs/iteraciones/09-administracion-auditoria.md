# 09 - Administracion y auditoria

## Objetivo

Implementar capacidades administrativas permitidas y consolidar auditoria interna
de cambios sensibles.

## Alcance

- Panel o pantalla de administracion.
- Listado de usuarios para administradores.
- Desactivar usuario.
- Eliminar usuario con politica segura.
- Cambiar limite de almacenamiento.
- Cambiar maximo de adjuntos por movimiento.
- Auditoria interna de ediciones y eliminaciones financieras.

## Fuera de alcance

- Ver datos financieros privados de usuarios.
- Soporte o impersonacion.
- Suscripciones.
- Auditoria visible para usuario final.

## Reglas

- El administrador no ve cuentas, movimientos, reportes ni adjuntos privados.
- Acciones administrativas deben validar rol.
- Eliminar usuario debe respetar integridad y politica de retencion.
- Auditoria interna registra actor, entidad, accion, valores previos y nuevos.

## Tareas sugeridas

- Crear servicios admin.
- Crear UI administrativa.
- Asegurar guards de rol.
- Completar auditoria de movimientos, deudas y metas si aplica.
- Agregar pruebas de permisos.

## Criterios de aceptacion

- Admin puede desactivar usuario.
- Admin puede eliminar usuario segun politica definida.
- Admin puede cambiar cuota de almacenamiento.
- Admin puede cambiar maximo de adjuntos por movimiento.
- Usuario normal no puede acceder a acciones admin.
- Auditoria interna registra ediciones/eliminaciones financieras.

## Verificacion

- Pruebas de autorizacion.
- Pruebas de auditoria.
- Prueba manual con usuario admin y usuario normal.

