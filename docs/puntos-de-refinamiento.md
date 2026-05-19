# Puntos de refinamiento

Este documento registra decisiones ya cerradas y temas que siguen como mejoras
o definiciones futuras. Las preguntas abiertas se trabajaran en conversacion,
no como una lista acumulada dentro de este archivo.

## 1. Decisiones resueltas

### 1.1 Moneda

- La moneda global pertenece al usuario, no a cada cuenta financiera.
- Todos los montos del usuario se manejan en esa moneda global.
- La primera version no requiere conversion entre monedas.

### 1.2 Saldo inicial

- El saldo inicial debe crearse como ajuste manual inicial.
- Esto permite que el libro de movimientos sea la fuente de verdad.

### 1.3 Auditoria

- Debe existir auditoria completa para ediciones y eliminaciones desde la primera
  version.
- En la primera version la auditoria sera interna. Una vista visible para el
  usuario puede agregarse despues.

### 1.4 Adjuntos y almacenamiento

- Se permiten archivos relacionados con PDF, Word, Excel e imagenes.
- Cada usuario tiene 1 GB de almacenamiento inicial.
- Cada archivo individual puede pesar maximo 50 MB.
- La cantidad maxima de adjuntos por movimiento sera configurable por un usuario
  administrador.
- El mejor approach para seguridad, performance y migracion es usar
  almacenamiento de objetos privado compatible con S3.
- La base de datos debe guardar metadata y claves de objeto, no binarios.
- Los archivos deben servirse solo despues de validar sesion, propiedad y
  permisos.
- Si todo debe operar dentro del VPS, MinIO en Docker con volumen persistente
  permite mantener la interfaz S3-compatible.

### 1.5 OTP y sesiones

- El envio de OTP se hara desde backend con una libreria configurable por
  credenciales SMTP.
- Inicialmente se usara una cuenta Gmail.
- Cada OTP expira en 10 minutos.
- Se permiten 5 intentos fallidos.
- Antes de alcanzar 5 intentos fallidos, el usuario puede reenviar OTP sin
  limite funcional.
- Cada reenvio debe invalidar codigos anteriores.
- Despues de 5 intentos fallidos, el usuario debe esperar 1 hora.
- La sesion iniciada no expira automaticamente.

### 1.6 Administradores

- El administrador puede eliminar usuarios.
- El administrador puede desactivar usuarios.
- El administrador puede cambiar el limite de almacenamiento de usuarios.
- El administrador puede modificar la cantidad maxima de adjuntos por
  movimiento.

### 1.7 Metas de ahorro

- El usuario puede crear metas con monto objetivo y descripcion.
- El usuario tendra un modulo para distribuir su ahorro actual entre metas.
- La asignacion a metas es organizativa y no mueve dinero entre cuentas.
- Si el usuario retira dinero de cuentas de ahorro y el total ahorrado queda por
  debajo de lo asignado a metas, la aplicacion debe reducir
  proporcionalmente las asignaciones.
- Al volver a la vista de ahorros, la aplicacion debe informar que el retiro
  cambio la distribucion de metas.

### 1.8 Dashboard y tablas

- El rango por defecto del dashboard inicia en el primer dia del mes actual.
- Las tablas muestran 10 registros por defecto.
- La paginacion se controla con botones inferiores.
- Debe existir planeacion mensual por categoria de gasto con porcentaje
  asignado, forecast monetario y comparativo contra gasto real acumulado.

### 1.9 Base de datos, ORM y ramas

- Se usara Prisma.
- PostgreSQL de produccion sera administrado en el host del VPS, no dentro del
  Compose del proyecto.
- Los contenedores se conectaran a PostgreSQL por la red Docker compartida de
  acceso a base de datos usando `DB_HOST=172.31.255.1`.
- Cada proyecto debe tener su propia base de datos, rol y password.
- La rama de produccion sera `production`.

### 1.10 Transferencias

- Las transferencias interbancarias seran simples e inmediatas en la primera
  version.
- No tendran comisiones.
- No tendran estados pendiente/completada.

### 1.11 Deudas

- Se debe integrar un modulo de deudas.
- El usuario puede crear una deuda y definir que dias del mes espera pagarla.
- Debe existir una categoria no borrable llamada `Deudas`.
- Al registrar un gasto y escoger la categoria `Deudas`, debe aparecer un
  desplegable para escoger la deuda que se va a pagar.
- El desplegable debe mostrar el nombre de la deuda y el monto pendiente.

## 2. Pendientes de definicion futura

### 2.1 Backups y restauracion

- Definir frecuencia de backups.
- Definir retencion.
- Definir ubicacion.
- Definir prueba de restauracion antes de produccion.

Recomendacion inicial:

- Backup diario de PostgreSQL y adjuntos, retencion minima de 7 dias y prueba
  manual de restauracion antes de produccion.

### 2.2 Onboarding inicial

- Definir que pasa cuando un usuario entra por primera vez sin cuentas ni
  categorias.

Recomendacion inicial:

- Usar onboarding guiado: crear primera cuenta, crear categorias basicas y luego
  entrar al dashboard.

### 2.3 Categorias y subcategorias

- Definir si las categorias tendran colores, iconos, orden personalizado o
  subcategorias.

Recomendacion inicial:

- Categorias planas con nombre, tipo, color e icono. Dejar subcategorias fuera
  de la primera version.

### 2.4 Filtros granulares

- Definir indicadores visuales cuando un informe use un filtro granular distinto
  al filtro global.

Recomendacion inicial:

- Un filtro granular sobrescribe solo su informe y muestra una etiqueta de
  filtro local activo.

### 2.5 Notificaciones y recordatorios

- Definir si la app avisara sobre metas, saldos negativos, deudas cercanas o
  actividad relevante.

Recomendacion inicial:

- Sin notificaciones externas en primera version. Mostrar alertas dentro del
  dashboard.

### 2.6 Validacion de datos

- Definir libreria de validacion.

Recomendacion inicial:

- Usar Zod para schemas compartidos entre cliente y servidor.

### 2.7 API interna

- Definir contratos de la API HTTP que consumira el frontend React.
- Definir estrategia de documentacion Swagger/OpenAPI.

Recomendacion inicial:

- API REST versionada para autenticacion, usuarios, cuentas, categorias,
  movimientos, adjuntos, deudas, metas, reportes y administracion.
- Swagger/OpenAPI debe publicarse en desarrollo y usarse como contrato entre
  frontend y backend.
- Mantener schemas compartidos o generados cuando sea razonable para reducir
  divergencias entre validacion frontend y backend.

### 2.8 Observabilidad

- Definir logs estructurados, captura de errores, health checks y auditoria
  tecnica.

Recomendacion inicial:

- Logs estructurados, endpoint de health check, auditoria de cambios financieros
  y manejo centralizado de errores.

## 3. Mejoras futuras

- Movimientos recurrentes.
- Importacion manual por CSV.
- Exportacion de movimientos y reportes.
- Vista de auditoria visible para el usuario.
