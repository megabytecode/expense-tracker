# Despliegue en VPS

Este documento define el contrato de despliegue de Expense Tracker para el VPS
personal. GitHub Actions funciona como disparador remoto; el build real,
releases, rollback, secretos, networking y acceso a base de datos viven en el
VPS.

## Modelo de infraestructura

- `nginx` vive en el host y recibe el trafico publico.
- PostgreSQL vive en el host, no en el Compose del proyecto.
- Docker corre la aplicacion, API y servicios propios del proyecto.
- El firewall del host debe exponer solo `22`, `80` y `443`.
- Los contenedores web publican puertos solo en loopback del host.

## Estructura esperada

```text
/srv/apps/expense-tracker/
  config/
    deploy.conf
    pre_deploy.sh            # opcional
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

## PostgreSQL

PostgreSQL debe estar administrado por el host.

Reglas:

- La app no debe usar el superusuario `postgres`.
- Expense Tracker debe tener su propia base, rol y password.
- Los contenedores deben conectarse por la red Docker compartida de DB.
- Host esperado desde contenedores: `172.31.255.1`.
- Puerto esperado: `5432`.
- `pg_hba.conf` debe permitir solo la subnet Docker definida para acceso DB.

Variables esperadas:

```env
DB_HOST=172.31.255.1
DB_PORT=5432
DB_NAME=expense_tracker
DB_USER=expense_tracker
DB_PASSWORD=...
DATABASE_URL=postgresql://expense_tracker:...@172.31.255.1:5432/expense_tracker
```

## Docker Compose

El Compose de produccion no debe incluir PostgreSQL del proyecto.

Patron esperado:

```yaml
services:
  app:
    build: .
    env_file:
      - /srv/secrets/expense-tracker/app.env
    ports:
      - "127.0.0.1:3101:3000"
    networks:
      - app_net
      - platform_db

networks:
  app_net:
    driver: bridge
  platform_db:
    external: true
```

La aplicacion dentro del contenedor debe escuchar en `0.0.0.0`.

## Dockerfile

Requisitos:

- Multi-stage build.
- Imagen base liviana y versionada, por ejemplo `node:20-alpine` si las
  dependencias lo permiten.
- No usar `node:latest`.
- Copiar manifiestos de dependencias antes del codigo fuente.
- Instalar solo dependencias necesarias en runtime final.
- No copiar `node_modules` local.
- Ejecutar con usuario no root cuando sea viable.
- Incluir `.dockerignore`.

`.dockerignore` minimo:

```text
node_modules
.git
*.env
dist
build
coverage
.cache
```

## `deploy.conf`

Ejemplo base:

```bash
REPO_URL='https://github.com/megabytecode/expense-tracker.git'
DEPLOY_PATH='.'
COMPOSE_FILE='compose.yaml'
ENV_FILE='/srv/secrets/expense-tracker/app.env'
COMPOSE_PROJECT_NAME='expense-tracker'
HEALTHCHECK_URL='http://127.0.0.1:3101/health'
RELEASES_TO_KEEP='5'
```

## Flujo de deploy

1. GitHub Actions detecta `push`, tag o `workflow_dispatch`.
2. GitHub Actions valida el codigo si aplica.
3. GitHub Actions se conecta al VPS por SSH.
4. GitHub Actions ejecuta el script remoto de deploy.
5. El VPS actualiza `repo.git`.
6. El VPS crea un release en `releases/<timestamp>-<sha>`.
7. El VPS ejecuta `docker compose build`.
8. El VPS ejecuta `docker compose up -d --remove-orphans`.
9. El VPS valida healthcheck.
10. Si todo pasa, el VPS actualiza `current`.
11. El VPS registra el despliegue en `deploy-history.log`.

GitHub Actions no debe construir imagenes productivas para este VPS.

## Rollback

El rollback se ejecuta desde el VPS:

1. Toma lock con el mismo mecanismo del deploy.
2. Selecciona un release explicito o el inmediatamente anterior.
3. Levanta la stack desde ese release.
4. Valida healthcheck.
5. Actualiza `current`.
6. Registra el rollback en `deploy-history.log`.

Advertencia: el rollback de codigo no revierte datos. Cualquier migracion
destructiva o irreversible debe documentar el riesgo antes de despliegue.

## `nginx`

Ejemplo base:

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

TLS se configura en el host, fuera del repositorio.
