# 10 - Docker, CI/CD y despliegue

## Objetivo

Preparar la aplicacion para despliegue en VPS con Docker Compose por proyecto,
PostgreSQL administrado en el host, `nginx` en el host y GitHub Actions como
disparador remoto del despliegue.

## Alcance

- Dockerfile liviano multi-stage.
- Docker Compose para produccion o entorno VPS.
- Compose sin PostgreSQL del proyecto en produccion.
- Conexion desde contenedores a PostgreSQL host-managed por red Docker
  compartida.
- Variables de entorno documentadas.
- CI en GitHub Actions.
- CD desde rama `production` ejecutando script remoto en el VPS.
- `deploy.conf` para contrato con scripts del VPS.
- Documentacion de `nginx` host y puerto loopback.
- Estrategia de releases locales y rollback.
- Scripts de migracion Prisma.
- Health check.

## Fuera de alcance

- Provisionamiento completo del VPS.
- Backups definitivos si aun no estan cerrados.
- Observabilidad avanzada.
- Instalacion o administracion completa de PostgreSQL host-managed.
- Configuracion completa de TLS/certificados.

## Reglas

- Desarrollo local puede correr sin Docker.
- Imagen final no debe copiar `node_modules` local completo.
- Runtime con dependencias necesarias de produccion.
- Usar usuario no root cuando sea viable.
- Rama de produccion: `production`.
- Secretos solo por variables de entorno.
- GitHub Actions no debe construir imagenes productivas ni publicar artifacts
  obligatorios; solo valida y dispara deploy remoto por SSH.
- El build real debe ocurrir en el VPS mediante `docker compose build`.
- PostgreSQL de produccion vive en el host, no en Compose.
- Los contenedores deben conectarse a PostgreSQL usando `DB_HOST=172.31.255.1`
  y `DB_PORT=5432`.
- La app nunca debe usar el superusuario `postgres`; debe usar base, rol y
  password propios.
- Los puertos web deben publicarse solo en loopback, por ejemplo
  `127.0.0.1:3101:3000`.
- `nginx` del host debe ser el punto publico y hacer proxy al puerto loopback.
- La app dentro del contenedor debe escuchar en `0.0.0.0`.
- El Compose debe incluir red interna del proyecto y red externa compartida para
  acceso a DB cuando aplique.
- El rollback se hace desde releases previos en el VPS y no revierte datos.

## Tareas sugeridas

- Crear Dockerfile multi-stage.
- Crear `.dockerignore`.
- Crear `docker-compose.yml` o equivalente para VPS.
- Si existe un `docker-compose.yml` previo con PostgreSQL, no usarlo como
  Compose de produccion; reemplazarlo por el contrato VPS o separarlo
  claramente como compose local de desarrollo.
- Configurar Compose sin servicio PostgreSQL en produccion.
- Configurar red interna del proyecto y red externa `platform_db`.
- Publicar el puerto de la app solo en `127.0.0.1`.
- Documentar variables `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`,
  `DB_PASSWORD` y `DATABASE_URL`.
- Crear ejemplo de `deploy.conf`.
- Documentar estructura esperada en `/srv/apps/expense-tracker`,
  `/srv/secrets/expense-tracker` y `/srv/backups/expense-tracker`.
- Documentar ejemplo de virtual host `nginx`.
- Preparar comandos de migracion.
- Crear workflow de CI: install, lint, typecheck, test.
- Crear workflow de CD que conecte por SSH y ejecute el deploy remoto del VPS.
- Documentar variables de entorno.

## Criterios de aceptacion

- La app construye en Docker.
- Compose de produccion no incluye PostgreSQL del proyecto.
- La app se conecta a PostgreSQL host-managed por la red Docker compartida.
- Los puertos publicados por Compose estan limitados a `127.0.0.1`.
- Existe `deploy.conf` documentado para el VPS.
- Existe ejemplo o guia de `nginx` host hacia el puerto loopback.
- CI ejecuta checks basicos.
- CD desde `production` dispara el script remoto del VPS.
- Prisma migrations pueden ejecutarse en despliegue.
- Health check responde correctamente.
- El rollback desde releases previos queda documentado con advertencia de que no
  revierte datos.

## Verificacion

- Build Docker local.
- Levantar compose local o de prueba.
- Ejecutar migraciones.
- Ejecutar workflow o validarlo localmente si aplica.
- Validar que Compose no expone puertos en `0.0.0.0`.
- Validar que no hay secretos reales en el repositorio.
