# Iteraciones de implementacion

Esta carpeta divide la construccion de Expense Tracker en fases incrementales.
Cada documento esta pensado para pedirle a Codex o a otra IA que implemente una
parte concreta sin perder el contexto completo del producto.

## Orden recomendado

1. [00 - Instrucciones globales](00-instrucciones-globales.md)
2. [01 - Base del proyecto](01-base-proyecto.md)
3. [02 - Autenticacion, sesiones y usuarios](02-autenticacion-sesiones-usuarios.md)
4. [03 - Cuentas, categorias y configuracion](03-cuentas-categorias-configuracion.md)
5. [04 - Movimientos y saldos](04-movimientos-saldos.md)
6. [05 - Adjuntos y almacenamiento](05-adjuntos-almacenamiento.md)
7. [06 - Deudas](06-deudas.md)
8. [07 - Metas de ahorro](07-metas-ahorro.md)
9. [08 - Dashboard y reportes](08-dashboard-reportes.md)
10. [09 - Administracion y auditoria](09-administracion-auditoria.md)
11. [10 - Docker, CI/CD y despliegue](10-docker-cicd-despliegue.md)
12. [11 - Pulido final y hardening](11-pulido-final-hardening.md)

## Como usar estos documentos

Para cada iteracion, pedir a Codex que lea primero:

- `docs/especificacion-funcional.md`
- `docs/especificacion-tecnica.md`
- `docs/puntos-de-refinamiento.md`
- `docs/iteraciones/00-instrucciones-globales.md`
- `docs/despliegue-vps.md` si la fase toca Docker, CI/CD, deploy, rollback,
  Compose, PostgreSQL, healthchecks o nginx
- el documento especifico de la fase

Cada fase debe terminar con:

- Codigo implementado.
- Pruebas o verificaciones ejecutadas.
- Resumen de archivos modificados.
- Notas de cualquier decision que haya sido necesaria.
