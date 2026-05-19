# 11 - Pulido final y hardening

## Objetivo

Cerrar huecos de experiencia, seguridad, performance y calidad antes de usar la
aplicacion de forma real.

## Alcance

- Estados vacios.
- Estados de error.
- Loading states.
- Validaciones de servidor completas.
- Validaciones visuales.
- Responsive con enfoque mobile first.
- Revision de permisos.
- Revision de transacciones financieras.
- Revision de indices de base de datos.
- Pruebas basicas finales.
- Documentacion de uso y despliegue.

## Fuera de alcance

- Nuevas funcionalidades grandes.
- Google Auth.
- Suscripciones.
- Reportes contables avanzados.

## Reglas

- No agregar features nuevas sin cerrar primero estabilidad.
- Priorizar integridad financiera y privacidad.
- No dejar endpoints sin validacion de usuario.
- No dejar modales o formularios sin manejo de error.
- Para pulido visual, consultar por MCP el proyecto Stitch
  `Expense Tracker Pro UI/UX` y acercar las vistas implementadas a sus
  referencias moviles y desktop sin romper reglas funcionales.

## Tareas sugeridas

- Revisar todos los flujos principales.
- Agregar indices faltantes.
- Revisar race conditions en escrituras financieras.
- Ejecutar pruebas.
- Revisar primero experiencia movil y luego desktop.
- Revisar accesibilidad basica.
- Revisar Docker y variables de entorno.
- Documentar comandos principales.

## Criterios de aceptacion

- Usuario puede completar flujo completo:
  - login
  - crear cuenta
  - crear categoria
  - registrar ingreso
  - registrar gasto
  - registrar transferencia
  - crear deuda y pagarla
  - crear meta y asignar ahorro
  - revisar dashboard
- No hay errores visibles en consola durante flujos principales.
- Todas las rutas privadas exigen sesion.
- Las pruebas basicas pasan.
- La app esta lista para despliegue inicial.

## Verificacion

- Prueba manual end-to-end.
- Lint/typecheck/test.
- Build.
- Revision visual desktop y movil.
- Revision visual contra Stitch en movil y desktop cuando el MCP este
  disponible.
- Validacion de permisos con dos usuarios.
