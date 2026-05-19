# 01 - Base del proyecto

## Objetivo

Crear la base tecnica de la aplicacion para que las siguientes iteraciones puedan
construirse encima sin rehacer estructura, dejando desde el inicio una base
mobile first.

## Alcance

- Inicializar frontend React con TypeScript.
- Inicializar backend API HTTP.
- Configurar Tailwind CSS.
- Configurar `lucide-react`.
- Configurar Prisma.
- Configurar PostgreSQL local para desarrollo.
- Configurar Swagger/OpenAPI para documentar el API backend.
- Crear estructura inicial de carpetas.
- Crear tokens visuales globales.
- Crear layout base autenticado/no autenticado si aplica.
- Preparar la base responsive con enfoque mobile first.
- Consultar por MCP el proyecto Stitch `Expense Tracker Pro UI/UX` para derivar
  paleta, tokens visuales, radios, espaciados, tipografia y lineamientos base.
- Preparar variables de entorno de ejemplo.

## Fuera de alcance

- Autenticacion real.
- Modelos financieros completos.
- Dashboard funcional.
- Docker de produccion.

## Tareas sugeridas

- Crear proyecto React.
- Crear base del backend API.
- Configurar lint, typecheck y scripts principales.
- Crear `prisma/schema.prisma` inicial.
- Crear configuracion inicial de Swagger/OpenAPI y endpoint de documentacion en
  desarrollo.
- Crear carpeta de dominio, datos, servicios y UI compartida.
- Crear componentes base: `Button`, `Input`, `Select`, `Modal`, `Table`,
  `EmptyState`, `PageHeader`.
- Configurar Tailwind con paleta, radio, sombras, espaciados y tipografia
  tomando como referencia el sistema visual de Stitch.
- Definir reglas base de layout y breakpoints para que la UI nazca pensada para
  movil.
- Crear pagina inicial simple que confirme que la app arranca.

## Criterios de aceptacion

- La app arranca localmente.
- El backend API arranca localmente.
- Swagger/OpenAPI expone la documentacion inicial del API.
- Tailwind funciona.
- Prisma esta instalado y configurado.
- Existe `.env.example`.
- Los componentes base compilan.
- La base visual funciona primero en movil y escala correctamente.
- Los tokens visuales globales reflejan el proyecto Stitch
  `Expense Tracker Pro UI/UX` cuando el MCP este disponible.
- El proyecto tiene scripts claros para desarrollo, build, lint y typecheck.

## Verificacion

- Ejecutar instalacion de dependencias.
- Ejecutar lint/typecheck si existen.
- Ejecutar build si el proyecto ya lo permite.
- Levantar servidor local y verificar pantalla inicial.
