# 05 - Adjuntos y almacenamiento

## Objetivo

Implementar adjuntos seguros para movimientos y transferencias, respetando cuota
por usuario, limite por archivo y almacenamiento privado compatible con S3.

## Alcance

- Modelo `attachments`.
- Metadata de adjuntos.
- Subida de archivos.
- Descarga segura.
- Eliminacion o soft delete de adjuntos.
- Cuota de almacenamiento por usuario.
- Maximo por archivo de 50 MB.
- Limite total inicial de 1 GB por usuario.
- Maximo de adjuntos por movimiento configurable por administrador.

## Fuera de alcance

- Suscripciones.
- Antivirus avanzado.
- OCR o lectura de facturas.

## Reglas

- Permitidos: PDF, Word, Excel e imagenes.
- No guardar binarios grandes en PostgreSQL.
- Usar almacenamiento de objetos privado compatible con S3.
- Recomendado: bucket externo privado para facilitar migracion de VPS.
- Alternativa local: MinIO en Docker con volumen persistente.
- La app debe validar sesion, propietario y permisos antes de entregar archivos.
- Usar proxy autenticado o URL firmada de corta duracion.

## Tareas sugeridas

- Crear abstraccion `StorageProvider`.
- Implementar proveedor S3-compatible.
- Crear servicio de adjuntos.
- Crear validaciones de tipo, tamano y cuota.
- Integrar adjuntos en modales de ingreso, gasto, transferencia y detalle.
- Actualizar uso de almacenamiento del usuario.

## Criterios de aceptacion

- El usuario puede subir adjuntos permitidos.
- Archivos mayores a 50 MB fallan.
- El usuario no puede superar su cuota.
- Otro usuario no puede descargar adjuntos ajenos.
- El detalle del movimiento muestra adjuntos.
- Borrar/desactivar movimiento respeta politica de adjuntos.

## Verificacion

- Pruebas de validacion de archivo.
- Pruebas de autorizacion de descarga.
- Pruebas de cuota.
- Prueba manual de subida y descarga.

