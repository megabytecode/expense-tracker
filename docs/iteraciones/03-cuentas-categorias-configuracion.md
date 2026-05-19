# 03 - Cuentas, categorias y configuracion

## Objetivo

Implementar cuentas personales, categorias, configuracion de usuario y las
categorias especiales necesarias para el dominio financiero.

## Alcance

- CRUD de cuentas.
- Tipos de cuenta: `savings` y `cash`.
- Soft delete/desactivacion de cuentas.
- Configuracion de moneda global del usuario.
- CRUD de categorias visibles.
- Categoria oculta `Ajustes manuales`.
- Categoria protegida no borrable `Deudas`.
- Ajuste manual inicial al crear una cuenta.

## Fuera de alcance

- Registro completo de ingresos/gastos.
- Dashboard.
- Deudas como modulo completo.
- Adjuntos.

## Reglas

- Cada cuenta pertenece a un usuario.
- Una cuenta desactivada no aparece para nuevos movimientos.
- El saldo inicial debe crear un ajuste manual inicial.
- `Ajustes manuales` no se administra como categoria visible.
- `Deudas` existe por usuario, no se borra ni desactiva.
- Las categorias visibles son creadas por el usuario.
- No permitir nombres duplicados activos por usuario y tipo.

## Tareas sugeridas

- Crear modelos y migraciones de `accounts`, `categories` y movimientos minimos
  necesarios para ajuste inicial.
- Crear servicios de cuentas.
- Crear servicios de categorias.
- Crear pantalla de cuentas.
- Crear pantalla de categorias.
- Crear pantalla o formulario de configuracion de usuario.
- Crear validaciones de servidor.

## Criterios de aceptacion

- El usuario puede crear cuenta con tipo y saldo inicial.
- El saldo inicial queda trazado como ajuste manual.
- El usuario puede editar y desactivar cuenta.
- El usuario puede crear, editar y desactivar categorias visibles.
- `Ajustes manuales` no aparece como categoria normal.
- `Deudas` existe y no se puede eliminar ni desactivar.
- La moneda global se puede configurar con advertencia si ya hay movimientos.

## Verificacion

- Pruebas de creacion de cuenta con ajuste inicial.
- Pruebas de proteccion de categorias especiales.
- Pruebas de aislamiento por usuario.

