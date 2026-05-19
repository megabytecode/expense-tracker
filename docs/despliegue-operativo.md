# Despliegue operativo

Este documento aterriza la iteracion 10 para el contrato de VPS de Expense
Tracker. GitHub Actions solo valida codigo y dispara el deploy remoto; el build
productivo ocurre en el VPS con `docker compose build`.

## Estructura en el VPS

```text
/srv/apps/expense-tracker/
  config/
    deploy.conf
  current -> releases/<release-id>
  releases/
  shared/
  tmp/
  logs/
  repo.git/
  deploy-history.log

/srv/secrets/expense-tracker/
  app.env

/srv/backups/expense-tracker/
```

`/srv/secrets/expense-tracker/app.env` debe crearse manualmente en el VPS a
partir de `.env.deploy.example`. No se guardan secretos reales en el repositorio.

## Base de datos

PostgreSQL vive en el host del VPS. Expense Tracker debe usar base, rol y
password propios, nunca el superusuario `postgres`.

Variables esperadas:

```env
NODE_ENV=production
API_DOCS_ENABLED=false
DB_HOST=172.31.255.1
DB_PORT=5432
DB_NAME=expense_tracker
DB_USER=expense_tracker
DB_PASSWORD=...
DATABASE_URL=postgresql://expense_tracker:...@172.31.255.1:5432/expense_tracker?schema=public
```

El contenedor se une a la red externa `platform_db`, que debe existir en el
host y tener acceso permitido en `pg_hba.conf` solo para la subnet Docker
correspondiente.

En produccion la documentacion Swagger no queda publicada por defecto. Si se
necesita exponer temporalmente `/api-docs`, activar `API_DOCS_ENABLED=true` solo
en un entorno controlado y volver a desactivarlo al terminar la revision.

## Compose productivo

`compose.yaml` levanta solo la aplicacion. No incluye PostgreSQL.

Comandos esperados en el VPS desde un release:

```bash
docker compose --env-file /srv/secrets/expense-tracker/app.env -f compose.yaml build
docker compose --env-file /srv/secrets/expense-tracker/app.env -f compose.yaml up -d --remove-orphans
```

El puerto se publica solo en loopback:

```text
127.0.0.1:3101:3000
```

## Migraciones Prisma

Antes de activar un release, el deploy remoto debe ejecutar:

```bash
docker compose --env-file /srv/secrets/expense-tracker/app.env -f compose.yaml run --build --rm app npm --prefix /app/backend run prisma:migrate:deploy
```

Esto aplica migraciones con `DATABASE_URL` del archivo secreto del VPS. El
rollback de codigo no revierte datos; cualquier migracion destructiva debe
documentarse y aprobarse antes de desplegar.

## Health check

La aplicacion responde en:

```text
GET /health
GET /api/v1/health
```

El contrato de `deploy.conf` usa:

```text
http://127.0.0.1:3101/health
```

## nginx en el host

Ejemplo de virtual host:

```nginx
server {
    server_name expense-tracker.example.com;

    location / {
        proxy_pass http://127.0.0.1:3101;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

TLS y certificados se configuran en el host, fuera del repositorio.

## GitHub Actions

- `ci.yml`: instala dependencias, genera Prisma Client, ejecuta lint,
  typecheck y pruebas.
- `deploy-production.yml`: corre en `production` y ejecuta el script remoto por
  SSH. No construye la imagen productiva ni almacena secretos de runtime.

Secretos requeridos en GitHub:

```text
VPS_HOST
VPS_USER
VPS_SSH_KEY
VPS_PORT
```

El comando remoto esperado por defecto es:

```bash
/srv/apps/expense-tracker/bin/deploy expense-tracker production
```

Si el VPS usa otro entrypoint, ajustar el workflow o el script remoto del host.

## Desarrollo local

El desarrollo local puede seguir sin Docker obligatorio. Si se necesita solo
PostgreSQL local:

```bash
docker compose -f compose.local.yaml up -d postgres
```

Luego correr backend y frontend como antes:

```bash
cd backend && npm run dev
cd frontend && npm run dev
```

## Rollback

El rollback se ejecuta desde releases previos en el VPS con el mecanismo del
host. Debe levantar el release elegido con Compose, validar `/health`, actualizar
`current` y registrar el evento en `deploy-history.log`.

El rollback no revierte migraciones ni datos.
