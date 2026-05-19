# Especificacion tecnica

## 1. Resumen

Este documento propone la base tecnica para implementar Expense Tracker como una
aplicacion web multiusuario con autenticacion, persistencia de datos, dashboard
de reportes y flujos de registro de movimientos financieros.

La implementacion aun no inicia. Este documento sirve como guia para tomar
decisiones antes de escribir codigo.

## 2. Objetivos tecnicos

- Aislar los datos por usuario autenticado.
- Mantener una fuente consistente para calcular saldos esperados.
- Registrar ingresos, gastos y transferencias entre cuentas propias.
- Permitir reportes agregados por categoria, cuenta y rango de fechas.
- Separar reglas de negocio de la capa visual.
- Dejar una base extensible para categorias, filtros y futuros reportes.
- Aplicar principios SOLID y patrones de diseño simples en todos los modulos.
- Priorizar seguridad, integridad transaccional y manejo correcto de
  concurrencia.
- Diseñar la interfaz con enfoque mobile first y escalar despues a tablet y
  escritorio.

## 3. Arquitectura propuesta

Aplicacion web separada en frontend React, backend API, PostgreSQL y Tailwind
CSS.

React se propone como stack principal de frontend para mantener la interfaz como
una aplicacion cliente clara, desacoplada del backend y con flujos de UI
controlados por estado de aplicacion en lugar de depender de parametros de URL
para acciones internas. El backend debe exponerse como una API propia y
versionada, con contratos documentados mediante Swagger/OpenAPI desde las
primeras iteraciones. La experiencia de interfaz debe plantearse con enfoque
mobile first, de modo que los flujos principales queden resueltos primero en
movil y despues escalen a pantallas mas amplias.

Capas:

- Frontend: interfaz de usuario, formularios, dashboard y validaciones de
  experiencia con React, Tailwind CSS y una libreria de iconos, priorizando
  layout, jerarquia y acciones principales para movil antes de adaptarlas a
  tablet y desktop.
- Backend API: autenticacion, autorizacion, reglas de negocio y endpoints HTTP
  versionados para consumo del frontend.
- Documentacion API: especificacion Swagger/OpenAPI generada o mantenida junto
  al backend, disponible en desarrollo y protegida o restringida segun ambiente
  en produccion.
- Base de datos: PostgreSQL para usuarios, cuentas, categorias, movimientos,
  adjuntos, metas y auditoria basica.
- Capa de reportes: consultas agregadas para dashboard y filtros.
- Capa de dominio: servicios con reglas de negocio independientes de la UI.

## 4. Decisiones tecnicas cerradas

- Frontend principal: React con TypeScript.
- Enfoque de interfaz: mobile first.
- Referencia visual: proyecto Stitch `Expense Tracker Pro UI/UX` consultado por
  MCP cuando se creen o modifiquen vistas, componentes visuales, paleta o tokens.
- Backend: API HTTP separada del frontend, con contratos versionados.
- Documentacion de API: Swagger/OpenAPI obligatorio para endpoints backend.
- Estilos: Tailwind CSS.
- Iconos: libreria de iconos compatible con React, preferiblemente `lucide-react`.
- Base de datos: PostgreSQL.
- ORM: Prisma.
- Autenticacion inicial: local con codigo OTP enviado por correo electronico.
- Envio de correo inicial: libreria backend configurable con credenciales SMTP de
  una cuenta Gmail.
- Autenticacion futura: Google.
- Despliegue: VPS con Docker.
- PostgreSQL en produccion: administrado en el host del VPS, no dentro del
  Compose del proyecto.
- Desarrollo local: ejecucion en crudo, sin Docker obligatorio.
- CI/CD: GitHub Actions como disparador remoto; el build real ocurre en el VPS.
- Ramas: `development` para integracion y `production` para produccion.
- Zona horaria operativa: America/Bogota.
- Pais objetivo inicial: Colombia.
- Roles: administrador y usuario normal.
- Moneda: moneda global por usuario.
- Almacenamiento inicial por usuario: 1 GB.
- Tamano maximo por archivo adjunto: 50 MB.
- Almacenamiento de adjuntos: objeto privado compatible con S3.
- Nivel inicial de pruebas: basico, cubriendo reglas criticas.
- Libreria de graficas recomendada: Recharts, por integracion simple con React.

## 4.1 Referencia visual con Stitch

Cuando una iteracion incluya trabajo de frontend, vistas, componentes visuales,
paleta, tokens, layout responsive o pulido de interfaz, el agente debe consultar
por MCP el proyecto Stitch llamado `Expense Tracker Pro UI/UX`.

Reglas:

- Usar Stitch como referencia visual y de composicion, no como fuente de reglas
  de negocio.
- Implementar en React y Tailwind las vistas lo mas fieles posible a las
  referencias disponibles en Stitch.
- Revisar tanto las vistas moviles como las vistas desktop del proyecto Stitch.
- Mantener el enfoque mobile first: primero resolver movil y luego adaptar a
  desktop.
- Si la referencia de Stitch contradice reglas funcionales, seguridad,
  permisos, integridad financiera o arquitectura documentada, prevalece esta
  documentacion.
- Si se crean paleta, radios, sombras, espaciados, tipografia o tokens globales,
  deben derivarse del sistema visual observado en Stitch y centralizarse en la
  configuracion global del frontend.

## 5. Principios de diseno de software

La implementacion debe aplicar SOLID de forma pragmatica:

- Single Responsibility: cada modulo debe tener una razon clara para cambiar.
- Open/Closed: las reglas deben poder extenderse sin reescribir flujos completos.
- Liskov Substitution: interfaces y abstracciones deben respetar contratos
  esperados.
- Interface Segregation: evitar interfaces grandes que obliguen a depender de
  metodos innecesarios.
- Dependency Inversion: la logica de dominio no debe depender directamente de
  detalles de infraestructura.

Patrones recomendados:

- Repository para aislar acceso a datos.
- Service o Use Case para reglas de negocio.
- DTO o schemas de validacion para entradas y salidas.
- Transaction Script controlado para operaciones financieras atomicas.
- Policy o Guard para autorizacion por usuario y rol.
- Factory simple cuando se creen movimientos de tipos distintos.

Regla general:

- No crear abstracciones por anticipado si no reducen complejidad real.
- Toda regla financiera debe vivir fuera de componentes visuales.
- Toda escritura financiera debe pasar por una capa de servicio transaccional.

## 6. Modulos funcionales

### Autenticacion

Responsabilidades:

- Registro de usuario.
- Inicio de sesion.
- Cierre de sesion.
- Envio y verificacion de codigo OTP por correo electronico.
- Sesiones persistentes sin expiracion automatica.
- Proteccion de rutas privadas.
- Asociacion de cada registro financiero con un usuario.
- Preparar la integracion futura con Google sin bloquear la version inicial.

### Roles y autorizacion

Responsabilidades:

- Diferenciar usuario administrador y usuario normal.
- Proteger rutas y acciones por rol.
- Garantizar que los usuarios normales solo operen sus propios datos.
- Permitir que administradores desactiven o eliminen usuarios.
- Permitir que administradores cambien el limite de almacenamiento de usuarios.
- Permitir que administradores cambien la cantidad maxima de adjuntos por
  movimiento.
- Impedir que administradores accedan a datos financieros privados de usuarios,
  salvo que se defina una funcion administrativa futura.

### Cuentas

Responsabilidades:

- Crear cuentas personales.
- Clasificar cuentas como ahorro o dinero disponible.
- Consultar saldos esperados.
- Editar informacion basica de cuentas.
- Desactivar cuentas con soft delete.
- Registrar ajustes manuales de saldo.

### Categorias

Responsabilidades:

- Gestionar categorias de gasto.
- Gestionar categorias de ingreso.
- Crear categorias desde cero, sin seed inicial obligatorio.
- Editar y desactivar categorias.
- Mantener la categoria oculta `Ajustes manuales`.
- Mantener la categoria protegida no borrable `Deudas`.
- Permitir agrupacion de reportes por categoria.

### Movimientos

Responsabilidades:

- Crear gastos.
- Crear gastos distribuidos entre varias cuentas.
- Crear ingresos.
- Crear ingresos distribuidos entre varias cuentas.
- Crear movimientos interbancarios.
- Editar y eliminar movimientos con confirmacion desde la interfaz.
- Consultar detalle de movimientos.
- Asociar notas libres y multiples archivos adjuntos.
- Asociar pagos de deuda cuando el gasto use la categoria `Deudas`.

### Deudas

Responsabilidades:

- Crear deudas.
- Editar deudas.
- Desactivar deudas.
- Definir dias esperados de pago dentro del mes.
- Calcular saldo pendiente.
- Asociar pagos desde gastos en la categoria protegida `Deudas`.
- Mostrar deudas en dashboard y reportes.

### Metas de ahorro

Responsabilidades:

- Crear metas de ahorro.
- Editar metas de ahorro.
- Desactivar metas de ahorro.
- Registrar descripcion de la meta.
- Distribuir el ahorro actual del usuario entre metas.
- Calcular avance de metas.
- Integrar metas en el dashboard de ahorro.

### Dashboard y reportes

Responsabilidades:

- Aplicar filtro global de fecha.
- Aplicar filtros granulares por grafica o informe.
- Calcular gastos por categoria.
- Calcular ingresos por categoria.
- Calcular forecast mensual por categoria de gasto.
- Comparar forecast contra gasto real acumulado.
- Consultar movimientos filtrados por categoria.
- Consultar saldos esperados por cuenta.
- Consultar historial de movimientos interbancarios.
- Calcular total transferido entre cuentas en un rango.
- Calcular total ahorrado.
- Calcular avance de metas de ahorro.
- Calcular deudas pendientes y pagos de deuda.

## 7. Modelo de datos propuesto

### users

Representa un usuario autenticado.

Campos sugeridos:

- id.
- email.
- name.
- role: `admin` o `user`.
- currency_code.
- monthly_expense_base.
- storage_limit_bytes.
- storage_used_bytes.
- max_attachments_per_movement.
- is_active.
- deleted_at.
- created_at.
- updated_at.

Notas:

- `currency_code` define la moneda global del usuario.
- Los reportes, cuentas, deudas, metas y movimientos usan la moneda global del
  usuario.
- `monthly_expense_base` define la base mensual organizativa usada para forecast
  de gasto por categoria.
- `storage_limit_bytes` inicia en 1 GB y puede ser modificado por el usuario en
  esta fase y por administradores.
- `max_attachments_per_movement` define el maximo de archivos por movimiento y
  puede ser modificado por administradores.

### auth_otps

Representa codigos OTP para autenticacion local por correo.

Campos sugeridos:

- id.
- email.
- code_hash.
- expires_at.
- consumed_at.
- attempts_count.
- cooldown_until.
- created_at.

Reglas:

- Guardar hash del codigo, nunca el codigo plano.
- Definir expiracion corta.
- Cada OTP expira a los 10 minutos.
- Permitir maximo 5 intentos fallidos.
- Antes de llegar a 5 intentos, el usuario puede solicitar reenvios sin limite
  funcional.
- Cada reenvio debe invalidar codigos anteriores.
- Despues de 5 intentos fallidos, el usuario debe esperar 1 hora.
- Invalidar el codigo al usarlo.

### sessions

Representa sesiones persistentes del usuario.

Campos sugeridos:

- id.
- user_id.
- token_hash.
- created_at.
- last_used_at.
- revoked_at.

Reglas:

- La sesion no debe expirar automaticamente.
- La sesion debe poder revocarse al cerrar sesion, por accion administrativa o
  por un evento de seguridad.
- El token de sesion debe almacenarse en cookie `httpOnly`, `secure` y
  `sameSite`.

### accounts

Representa una cuenta personal del usuario.

Campos sugeridos:

- id.
- user_id.
- name.
- type: `savings` o `cash`.
- initial_balance.
- is_active.
- deleted_at.
- created_at.
- updated_at.

Notas:

- `savings` representa cuentas de ahorro.
- `cash` representa dinero disponible: efectivo, cuenta corriente, billetera
  electronica u otros medios liquidos.
- Las cuentas inactivas conservan historial, pero no aparecen como opcion
  principal en nuevos movimientos.
- El saldo inicial debe crear un ajuste manual inicial para que el libro de
  movimientos sea la fuente de verdad.

### categories

Representa una categoria de ingreso o gasto.

Campos sugeridos:

- id.
- user_id.
- name.
- type: `income` o `expense`.
- is_hidden.
- is_protected.
- system_key.
- is_active.
- deleted_at.
- created_at.
- updated_at.

Notas:

- No se crean categorias iniciales visibles.
- `Ajustes manuales` debe existir como categoria oculta del sistema.
- `Deudas` debe existir como categoria protegida no borrable por usuario.

### transactions

Representa gastos, ingresos y ajustes manuales.

Campos sugeridos:

- id.
- user_id.
- type: `income`, `expense` o `manual_adjustment`.
- category_id.
- description.
- notes.
- total_amount.
- debt_id.
- occurred_at.
- is_deleted.
- deleted_at.
- created_at.
- updated_at.

Notas:

- Gastos e ingresos pueden tener una o varias cuentas asociadas.
- Los ajustes manuales usan la categoria oculta `Ajustes manuales`.
- Si la transaccion es un gasto con categoria `Deudas`, `debt_id` es obligatorio.

### transaction_allocations

Representa como un ingreso, gasto o ajuste afecta una o varias cuentas.

Campos sugeridos:

- id.
- transaction_id.
- account_id.
- amount.
- direction: `in` o `out`.
- created_at.

Reglas:

- En un ingreso, los montos de las asignaciones deben sumar el `total_amount`.
- En un gasto, los montos de las asignaciones deben sumar el `total_amount`.
- En un ajuste manual, la asignacion puede ser positiva o negativa segun el
  ajuste requerido.
- La cuenta puede quedar con saldo esperado negativo.

### transfers

Representa movimientos interbancarios entre cuentas propias.

Campos sugeridos:

- id.
- user_id.
- source_account_id.
- destination_account_id.
- reason.
- amount.
- notes.
- occurred_at.
- is_deleted.
- deleted_at.
- created_at.
- updated_at.

Reglas:

- `source_account_id` y `destination_account_id` deben ser diferentes.
- El movimiento resta en origen y suma en destino.
- No debe clasificarse como ingreso ni gasto.
- La cuenta origen puede quedar con saldo esperado negativo.

### attachments

Representa archivos asociados a movimientos o transferencias.

Campos sugeridos:

- id.
- user_id.
- owner_type: `transaction` o `transfer`.
- owner_id.
- file_name.
- mime_type.
- file_size.
- storage_provider.
- bucket.
- object_key.
- created_at.
- deleted_at.

### user_storage_settings

Representa configuraciones de almacenamiento por usuario si se separan de
`users`.

Campos sugeridos:

- id.
- user_id.
- storage_limit_bytes.
- storage_used_bytes.
- updated_by_user_id.
- created_at.
- updated_at.

Reglas:

- Validar propiedad del movimiento o transferencia antes de leer o escribir.
- Permitir multiples archivos por movimiento.
- Validar tipo y tamano de archivo.
- Limitar cada archivo a 50 MB.
- Validar que el usuario no supere `storage_limit_bytes`.
- Validar que el movimiento no supere `max_attachments_per_movement`.
- Permitir PDF, Word, Excel e imagenes.
- Guardar archivos en almacenamiento de objetos privado compatible con S3.
- No guardar archivos en una carpeta publica del servidor web.
- No guardar binarios grandes directamente en PostgreSQL.
- Servir archivos solo despues de validar sesion, propiedad y permisos.
- Entregar descargas mediante proxy autenticado o URL firmada de corta duracion.

### savings_goals

Representa metas de ahorro del usuario.

Campos sugeridos:

- id.
- user_id.
- name.
- description.
- target_amount.
- target_date.
- is_active.
- deleted_at.
- created_at.
- updated_at.

### savings_goal_allocations

Representa cuanto del ahorro actual del usuario se asigna a cada meta.

Campos sugeridos:

- id.
- savings_goal_id.
- amount.
- created_at.
- updated_at.

Reglas:

- La suma de asignaciones activas no debe superar el total de ahorro disponible.
- El total de ahorro disponible para asignar se calcula solo con saldos dentro
  de cuentas `savings`; los saldos de cuentas `cash` u otros tipos no participan.
- Las metas usan la moneda global del usuario.
- La asignacion a metas es organizativa y no mueve dinero entre cuentas.
- Si el total ahorrado baja por retiros desde cuentas de ahorro, las
  asignaciones deben reducirse proporcionalmente.
- Debe registrarse o calcularse un aviso para informar al usuario que retiro
  dinero de ahorros y que la distribucion de metas cambio.

### category_budget_allocations

Representa la planeacion mensual organizativa por categoria de gasto.

Campos sugeridos:

- id.
- user_id.
- category_id.
- percentage.
- created_at.
- updated_at.

Reglas:

- Solo se permiten categorias de tipo `expense`.
- La suma de porcentajes activos del usuario no debe superar 100.
- El forecast monetario por categoria se calcula usando
  `monthly_expense_base` del usuario.
- La planeacion no crea movimientos ni reserva saldo real.

### debts

Representa una deuda del usuario.

Campos sugeridos:

- id.
- user_id.
- name.
- description.
- total_amount.
- is_active.
- deleted_at.
- created_at.
- updated_at.

### debt_payment_days

Representa los dias del mes en los que se espera pagar una deuda.

Campos sugeridos:

- id.
- debt_id.
- day_of_month.
- created_at.

Reglas:

- `day_of_month` debe estar entre 1 y 31.
- Si un mes no tiene el dia configurado, la UI debe resolverlo mostrando el
  ultimo dia valido del mes o una advertencia, segun se defina en implementacion.

### debt_payments

Relaciona gastos con pagos de deuda.

Campos sugeridos:

- id.
- debt_id.
- transaction_id.
- amount.
- created_at.

Reglas:

- El `transaction_id` debe corresponder a un gasto con categoria `Deudas`.
- El pago disminuye el saldo pendiente de la deuda.
- El gasto puede pagar parcial o totalmente una deuda.

### audit_logs

Registra auditoria completa para ediciones y eliminaciones.

Campos sugeridos:

- id.
- user_id.
- actor_user_id.
- entity_type.
- entity_id.
- action: `create`, `update`, `delete`, `deactivate`.
- previous_values.
- new_values.
- created_at.

Reglas:

- Debe registrar ediciones y eliminaciones desde la primera version.
- Debe conservar valores anteriores relevantes para reconstruir cambios.

### currencies

Catalogo configurable de monedas disponibles.

Campos sugeridos:

- code.
- name.
- symbol.
- decimal_places.
- is_active.

## 8. Calculo de saldos esperados

El saldo esperado de una cuenta se calcula asi:

```text
saldo esperado =
  saldo inicial
  + ingresos asignados a la cuenta
  - gastos asignados a la cuenta
  + transferencias recibidas
  - transferencias enviadas
  + ajustes manuales positivos
  - ajustes manuales negativos
```

Este calculo debe hacerse filtrando siempre por `user_id`.

Estrategia inicial:

- Calcular saldos a partir del libro de movimientos y asignaciones.
- Crear el saldo inicial como ajuste manual inicial, no solo como atributo
  independiente.
- Ejecutar escrituras financieras dentro de transacciones de base de datos.
- Evitar saldos materializados como fuente primaria en la primera version para
  reducir riesgo de inconsistencias.
- Agregar vistas, cache o snapshots solo si el volumen lo exige.

Esta estrategia consume pocos recursos en una app personal y mantiene buena
integridad porque la fuente de verdad son los movimientos registrados.

## 9. Concurrencia e integridad transaccional

Toda operacion financiera debe ejecutarse de forma atomica.

Reglas:

- Crear, editar o eliminar movimientos dentro de transacciones SQL.
- Bloquear o validar filas afectadas cuando una operacion toque varias cuentas.
- Usar constraints de base de datos para proteger invariantes criticos.
- Usar indices por `user_id`, fecha y relaciones principales.
- Diseñar operaciones idempotentes cuando puedan repetirse por error de red.
- Validar que todas las cuentas, categorias y adjuntos pertenezcan al usuario.
- Registrar cambios de edicion o eliminacion cuando afecten saldos historicos.
- Registrar auditoria completa para ediciones y eliminaciones.

Invariantes:

- Un usuario no puede usar cuentas de otro usuario.
- Una transferencia debe tener cuentas distintas.
- La suma de asignaciones debe coincidir con el total del movimiento.
- Las operaciones deben permitir saldos negativos sin fallar.
- Un gasto con categoria `Deudas` debe estar asociado a una deuda.
- Un pago de deuda no debe superar el monto pendiente, salvo regla futura
  explicita para sobrepagos.

## 10. Consultas de reportes

### Gastos por categoria

Agrupar transacciones de tipo `expense` por categoria.

Resultado esperado:

- category_id.
- category_name.
- total_amount.

### Ingresos por categoria

Agrupar transacciones de tipo `income` por categoria.

Resultado esperado:

- category_id.
- category_name.
- total_amount.

### Movimientos por categoria

Consultar transacciones por:

- user_id.
- type.
- category_id.
- rango de fechas opcional.

Resultado esperado:

- id.
- description.
- occurred_at.
- total_amount.

### Saldos por cuenta

Consultar cada cuenta activa del usuario y calcular su saldo esperado.

Resultado esperado:

- account_id.
- account_name.
- account_type.
- expected_balance.

### Historial de transferencias

Consultar transferencias por:

- user_id.
- rango de fechas.

Resultado esperado:

- id.
- source_account_name.
- destination_account_name.
- reason.
- amount.
- occurred_at.

### Total acumulado de transferencias

Sumar `amount` de las transferencias dentro del rango seleccionado.

### Total ahorrado

Sumar unicamente el saldo esperado de cuentas donde `type = savings`.

Este calculo no debe incluir cuentas `cash` ni ningun otro tipo futuro de
cuenta, aunque tengan saldo positivo. El mismo total es la base para el ahorro
disponible y el monto sin asignar en metas de ahorro.

### Metas de ahorro

Consultar metas activas y calcular avance.

Resultado esperado:

- goal_id.
- goal_name.
- target_amount.
- current_amount.
- remaining_amount.
- progress_percentage.

### Deudas

Consultar deudas activas y calcular saldo pendiente.

Resultado esperado:

- debt_id.
- debt_name.
- total_amount.
- paid_amount.
- remaining_amount.
- payment_days.
- status.

### Forecast mensual por categoria

Consultar asignaciones de planeacion mensual y compararlas con gasto real.

Resultado esperado:

- category_id.
- category_name.
- percentage.
- forecast_amount.
- actual_spent_amount.
- variance_amount.
- status.

## 11. Reglas de validacion

### Cuentas

- El nombre de la cuenta es obligatorio.
- El tipo de cuenta es obligatorio.
- El saldo inicial debe ser numerico.

### Planeacion mensual de gasto

- La base mensual del usuario debe ser mayor o igual que cero.
- La categoria debe ser de tipo `expense`.
- El porcentaje asignado debe ser mayor que cero.
- La suma total de porcentajes no debe superar 100.

### Categorias

- El nombre de la categoria es obligatorio.
- El tipo debe ser ingreso o gasto.
- No se deben permitir nombres duplicados activos por usuario y tipo.
- La categoria `Deudas` no debe poder eliminarse ni desactivarse.

### Ingresos

- La categoria es obligatoria.
- El monto total debe ser mayor que cero.
- Debe existir al menos una cuenta destino.
- Si hay varias cuentas destino, la suma de montos por cuenta debe coincidir con
  el monto total.

### Gastos

- La categoria es obligatoria.
- El monto debe ser mayor que cero.
- Debe existir al menos una cuenta afectada.
- Si hay varias cuentas afectadas, la suma de montos por cuenta debe coincidir
  con el monto total.
- Si la categoria es `Deudas`, la deuda asociada es obligatoria.
- El monto del gasto asociado a deuda no debe superar el saldo pendiente.

### Transferencias

- La cuenta origen es obligatoria.
- La cuenta destino es obligatoria.
- La cuenta origen y destino no pueden ser iguales.
- El monto debe ser mayor que cero.
- El motivo es obligatorio.

### Ajustes manuales

- La cuenta es obligatoria.
- El monto de ajuste es obligatorio.
- El motivo o nota es obligatorio.
- Debe registrarse con la categoria oculta `Ajustes manuales`.

### Adjuntos

- El archivo debe pertenecer al usuario propietario del movimiento.
- El tipo de archivo debe estar permitido.
- Se permiten PDF, Word, Excel e imagenes.
- El usuario no debe superar su limite de almacenamiento configurado.

### Metas de ahorro

- El nombre es obligatorio.
- El monto objetivo debe ser mayor que cero.
- La descripcion es opcional.

### Deudas

- El nombre es obligatorio.
- El monto total debe ser mayor que cero.
- Debe existir al menos un dia esperado de pago.
- Los dias esperados de pago deben estar entre 1 y 31.

## 12. Endpoints o acciones sugeridas

La forma exacta dependera del framework elegido. Estas acciones definen el
contrato funcional esperado.

### Autenticacion

- `signUp`.
- `requestOtp`.
- `verifyOtp`.
- `signOut`.
- `getCurrentUser`.
- `updateUserSettings`.
- `updateUserStorageLimit`.

### Roles

- `getCurrentUserRole`.
- `requireAdmin`.
- `requireUser`.
- `deactivateUser`.
- `deleteUser`.
- `updateUserStorageLimitAsAdmin`.
- `updateUserAttachmentLimitAsAdmin`.

### Cuentas

- `createAccount`.
- `updateAccount`.
- `listAccounts`.
- `deactivateAccount`.
- `adjustAccountBalance`.
- `getAccountExpectedBalance`.
- `listAccountsWithExpectedBalance`.

### Categorias

- `createCategory`.
- `updateCategory`.
- `listCategories`.
- `deactivateCategory`.

### Movimientos

- `createIncome`.
- `createExpense`.
- `createDebtPaymentExpense`.
- `updateTransaction`.
- `deleteTransaction`.
- `getTransactionDetail`.
- `listTransactionsByCategory`.

### Transferencias

- `createTransfer`.
- `updateTransfer`.
- `deleteTransfer`.
- `listTransfers`.
- `getTransfersTotal`.

### Adjuntos

- `uploadAttachment`.
- `listAttachments`.
- `deleteAttachment`.

### Metas de ahorro

- `createSavingsGoal`.
- `updateSavingsGoal`.
- `deactivateSavingsGoal`.
- `listSavingsGoals`.
- `getSavingsGoalProgress`.
- `allocateSavingsToGoal`.

### Deudas

- `createDebt`.
- `updateDebt`.
- `deactivateDebt`.
- `listDebts`.
- `getDebtDetail`.
- `listDebtsForPaymentSelect`.
- `getDebtRemainingAmount`.

### Dashboard

- `getExpenseTotalsByCategory`.
- `getIncomeTotalsByCategory`.
- `getMonthlyCategoryForecastReport`.
- `getAccountBalances`.
- `getSavingsTotal`.
- `getSavingsGoalsReport`.
- `getDebtsReport`.

### Monedas

- `listCurrencies`.
- `createCurrency`.
- `updateCurrency`.
- `deactivateCurrency`.

## 13. Pantallas propuestas

### Login y registro

Flujos de autenticacion local con OTP por correo electronico.

### Dashboard

Pantalla principal con:

- Acciones rapidas fijas.
- Grafica de gastos por categoria.
- Grafica de ingresos por categoria.
- Tabla filtrada al seleccionar categoria.
- Saldos esperados por cuenta.
- Historial de transferencias.
- Total ahorrado.
- Metas de ahorro y avance.
- Forecast mensual por categoria de gasto y comparativo con ejecutado.
- Filtros globales y granulares.

### Cuentas

Pantalla para crear, consultar y editar cuentas personales.

### Categorias

Pantalla para crear, consultar, editar y desactivar categorias de ingreso y
gasto.

### Metas de ahorro

Pantalla para crear, editar, consultar y desactivar metas de ahorro.

### Deudas

Pantalla para crear, editar, consultar y desactivar deudas.

### Pop-up de ingreso

Modal de pantalla completa para registrar ingresos.

### Pop-up de gasto

Modal para registrar gastos.

Cuando se selecciona la categoria `Deudas`, el modal debe mostrar el selector de
deuda con nombre y monto pendiente.

### Pop-up de transferencia

Modal para registrar movimientos interbancarios.

### Pop-up de detalle

Modal para consultar la informacion completa de un movimiento.

## 14. Estados de interfaz

Cada pantalla o flujo debe contemplar:

- Cargando.
- Vacio.
- Error.
- Validacion fallida.
- Guardado exitoso.

Ejemplos:

- Dashboard sin movimientos registrados.
- Usuario sin cuentas creadas.
- Categoria sin movimientos en el rango seleccionado.
- Transferencias sin resultados para el rango de fechas.
- Usuario sin metas de ahorro.
- Usuario sin deudas.
- Movimiento sin adjuntos.

## 15. Seguridad y privacidad

- Todas las consultas deben filtrar por usuario autenticado.
- Ningun usuario debe poder acceder a cuentas, categorias o movimientos de otro.
- Las rutas privadas deben requerir sesion activa. La sesion no expira
  automaticamente, pero puede revocarse.
- Las operaciones de escritura deben validar propiedad de los registros
  relacionados.
- Los montos financieros deben validarse en servidor, no solo en interfaz.
- Los codigos OTP deben guardarse hasheados y expirar rapido.
- Los codigos OTP expiran a los 10 minutos.
- Se permiten 5 intentos fallidos por ciclo antes de bloquear nuevos intentos
  por 1 hora.
- Los reenvios antes de alcanzar el bloqueo estan permitidos y deben invalidar
  codigos anteriores.
- Debe existir rate limiting para solicitud y verificacion de OTP, incluso si el
  reenvio funcional no tiene limite antes del bloqueo.
- El envio de OTP se hara con una libreria backend configurable por SMTP, usando
  inicialmente credenciales de Gmail.
- Los endpoints del backend API deben validar autorizacion y rol.
- Los archivos adjuntos deben validar tipo, tamano, propietario y ruta de
  almacenamiento.
- No se deben exponer rutas de archivos privados sin autorizacion.
- El almacenamiento de adjuntos debe ser privado y compatible con S3 para
  facilitar escalabilidad y migracion entre VPS.
- La base de datos solo guarda metadata y claves de objeto; los binarios viven
  fuera de PostgreSQL.
- Deben usarse variables de entorno para secretos.
- Deben evitarse mensajes de error que filtren informacion sensible.
- Las operaciones financieras deben ser transaccionales para evitar condiciones
  de carrera.
- Los administradores solo pueden ejecutar acciones administrativas permitidas:
  eliminar o desactivar usuarios, cambiar limites de almacenamiento y cambiar el
  maximo de adjuntos por movimiento.

## 16. Manejo de dinero

Recomendacion:

- Guardar montos en unidades enteras menores si la moneda lo requiere, o usar un
  tipo decimal exacto en base de datos.
- Evitar `float` para calculos de dinero.
- Asociar cada usuario a una moneda global.
- Usar el catalogo `currencies` para definir simbolo y cantidad de decimales de
  la moneda global del usuario.
- No manejar conversion automatica en la primera version.
- La primera operacion estara pensada para Colombia y America/Bogota.

## 17. Fechas y zona horaria

- La aplicacion operara inicialmente para Colombia.
- El entorno de desarrollo y el VPS usaran America/Bogota en la configuracion
  del sistema operativo.
- La aplicacion debe persistir fechas de forma consistente y mostrar fechas en
  America/Bogota.
- Los filtros de fecha deben interpretar inicio y fin de dia segun
  America/Bogota.

## 18. Frontend y sistema visual

- Usar Tailwind CSS.
- Definir tokens globales en archivos de configuracion para paleta, bordes,
  radios, espaciados, sombras y tipografia.
- Evitar estilos dispersos cuando un valor pertenezca al sistema visual.
- Permitir excepciones locales cuando un componente lo justifique.
- Usar una libreria de iconos, preferiblemente `lucide-react`.
- Construir componentes reutilizables para botones, formularios, modales,
  selectores, tablas, filtros y estados vacios.
- La UI debe ser responsive para escritorio y movil.

## 19. Backend y datos

- Exponer una API HTTP separada de la capa visual.
- Versionar endpoints, por ejemplo bajo `/api/v1`.
- Documentar la API con Swagger/OpenAPI.
- Mantener disponible una interfaz Swagger UI o equivalente en desarrollo.
- En produccion, proteger, restringir o deshabilitar la documentacion publica
  segun la politica de despliegue.
- Centralizar reglas financieras en servicios o casos de uso.
- Validar entradas en servidor.
- Usar Prisma como ORM y Prisma Migrate para migraciones.
- Usar repositorios o servicios de datos sobre Prisma para encapsular queries.
- Ejecutar escrituras financieras en transacciones.
- Usar constraints e indices de PostgreSQL para proteger integridad.
- Manejar soft delete con `is_active`, `is_deleted` o `deleted_at` segun el tipo
  de entidad.
- Evitar race conditions con transacciones, bloqueos selectivos y validaciones
  atomicas.

## 20. Docker, VPS y CI/CD

### Desarrollo local

- El desarrollo en la maquina local se hara en crudo, sin requerir Docker.
- Docker debe existir desde el inicio para preparar despliegues reproducibles.
- El `docker-compose.yml` local puede usarse solo como ayuda de desarrollo si
  hace falta, pero el contrato de produccion no debe depender de PostgreSQL en
  contenedor dentro del proyecto.

### Imagen Docker

- Crear Dockerfile liviano.
- Usar build multi-stage.
- Compilar la aplicacion en una etapa de build.
- Copiar al runtime solo artefactos compilados y dependencias necesarias de
  produccion.
- Evitar copiar `node_modules` completo desde el entorno local.
- Usar imagen base liviana cuando sea compatible con las dependencias.
- Ejecutar la aplicacion con usuario no root cuando sea viable.
- Copiar archivos de manifiesto de dependencias antes del codigo fuente para
  aprovechar cache de capas.
- Incluir `.dockerignore` para excluir `node_modules`, `.git`, archivos `.env`,
  builds locales, coverage, caches y artefactos pesados.

### Despliegue

- El despliegue se hara en un VPS con Docker instalado.
- `nginx` vive en el host y es el unico punto publico HTTP/HTTPS.
- PostgreSQL vive en el host del VPS y debe ser accedido por los contenedores a
  traves de la red Docker compartida de acceso a base de datos.
- Los contenedores de la app no deben conectarse a PostgreSQL por IP publica.
- El host esperado de PostgreSQL desde contenedores es `172.31.255.1` y el
  puerto esperado es `5432`.
- Cada proyecto debe usar su propia base de datos, rol y password; la app nunca
  debe usar el superusuario `postgres`.
- El Compose del proyecto debe publicar puertos solo en loopback del host, por
  ejemplo `127.0.0.1:3101:3000`, y no en `0.0.0.0`.
- El Compose del proyecto debe usar una red interna propia y, cuando necesite
  PostgreSQL, una red externa compartida de acceso a DB, por ejemplo
  `platform_db`.
- La aplicacion dentro del contenedor debe escuchar en `0.0.0.0`.
- El firewall del VPS debe exponer solo `22`, `80` y `443`.
- Los adjuntos deben guardarse en almacenamiento de objetos privado compatible
  con S3.
- El approach recomendado es usar un bucket privado externo al VPS para que
  migrar o escalar el VPS no rompa los adjuntos.
- Si se requiere operar todo dentro del VPS, se puede usar MinIO en Docker con
  volumen persistente, manteniendo la misma interfaz S3-compatible.

### GitHub Actions

- Configurar CI para instalar dependencias, ejecutar lint, typecheck y pruebas
  basicas.
- Configurar CD para desplegar al VPS desde la rama `production` usando GitHub
  Actions solo como disparador remoto por SSH.
- GitHub Actions no debe construir la imagen productiva ni almacenar secretos de
  runtime; el build, Compose, healthcheck y release quedan a cargo del VPS.
- Usar rama `development` para trabajo diario e integracion.
- Usar rama `production` para despliegue estable.

### Estructura esperada en VPS

La estructura de produccion debe seguir este contrato:

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

`app.env` contiene secretos reales y nunca debe almacenarse en el repositorio.

### Contrato de deploy

- El script remoto del VPS debe adquirir lock con `flock`.
- Debe crear o actualizar `repo.git` como mirror bare.
- Debe crear un release versionado bajo `releases/<timestamp>-<sha>`.
- Debe ejecutar `docker compose build` en el VPS.
- Debe ejecutar `docker compose up -d --remove-orphans`.
- Debe validar healthcheck antes de cambiar `current`.
- Debe registrar el evento en `deploy-history.log`.
- Debe conservar un numero limitado de releases anteriores para rollback.

### Contrato de rollback

- El rollback se ejecuta desde el VPS.
- Si no se indica release, debe elegir el release inmediatamente anterior al
  actual.
- Debe reconstruir la stack desde ese release, validar healthcheck, actualizar
  `current` y registrar el evento.
- El rollback de codigo no revierte datos; cualquier migracion destructiva o no
  reversible debe documentar el riesgo antes de despliegue.

### Variables de entorno de produccion

La app debe soportar variables separadas para la conexion a PostgreSQL del host:

```env
DB_HOST=172.31.255.1
DB_PORT=5432
DB_NAME=expense_tracker
DB_USER=expense_tracker
DB_PASSWORD=...
DATABASE_URL=postgresql://expense_tracker:...@172.31.255.1:5432/expense_tracker
```

### `deploy.conf` esperado

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

### `nginx` esperado

El sitio de `nginx` del host debe terminar TLS y hacer proxy hacia el puerto de
loopback publicado por Compose:

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

## 21. Testing esperado

Nivel inicial: basico, enfocado en reglas criticas y flujos principales.

### Pruebas unitarias

- Calculo de saldos esperados.
- Validacion de ingresos con multiples cuentas.
- Validacion de gastos con multiples cuentas.
- Validacion de transferencias entre cuentas.
- Calculo de total ahorrado.
- Calculo de avance de metas de ahorro.
- Validacion de ajustes manuales.
- Validacion de pagos de deuda.
- Validacion de cuotas de almacenamiento.
- Validacion de limite de 50 MB por archivo.
- Validacion de limite de adjuntos por movimiento.
- Validacion de expiracion, intentos y bloqueo de OTP.
- Recalculo proporcional de asignaciones de metas cuando baja el ahorro.
- Validacion de suma de porcentajes de forecast mensual por categoria.

### Pruebas de integracion

- Crear ingreso y verificar saldo de cuenta.
- Crear gasto y verificar saldo de cuenta.
- Crear transferencia y verificar saldos de origen y destino.
- Consultar reportes por categoria.
- Editar o eliminar movimiento y verificar recalculo.
- Crear meta de ahorro y verificar avance.
- Retirar ahorro y verificar ajuste proporcional de metas.
- Crear deuda, registrar pago y verificar saldo pendiente.
- Editar o eliminar movimiento de deuda y verificar auditoria.
- Configurar forecast mensual por categoria y verificar comparativo con gasto
  real.

### Pruebas de interfaz

- Botones fijos visibles en dashboard.
- Modal de ingreso de pantalla completa.
- Agregar multiples cuentas en ingreso.
- Agregar multiples cuentas en gasto.
- Seleccionar barra de categoria y ver tabla filtrada.
- Abrir detalle completo de movimiento.
- Adjuntar archivos a un movimiento.
- Ver paginacion inferior de tablas con 10 registros por defecto.
- Ver metas de ahorro en dashboard.
- Ver forecast mensual por categoria en dashboard.
- Seleccionar categoria `Deudas` y ver selector de deuda.
- Ver deudas en dashboard.

## 22. Decisiones tecnicas pendientes

- Proveedor S3-compatible especifico para adjuntos: externo administrado o MinIO
  en el VPS.
- Valor inicial del maximo de archivos por movimiento.

## 23. Propuesta inicial de implementacion por fases

### Fase 1: Base del producto

- Configuracion de React, Tailwind y tokens globales.
- Configuracion inicial del backend API.
- Configuracion inicial de Swagger/OpenAPI para documentar endpoints.
- PostgreSQL y migraciones iniciales.
- Prisma y Prisma Migrate.
- Autenticacion local con OTP.
- Roles administrador y usuario normal.
- Modelo de usuarios.
- Modelo de cuentas.
- Catalogo de monedas.
- Configuracion de moneda global del usuario.
- Configuracion de limite de almacenamiento del usuario.
- Sesiones persistentes.
- CRUD basico de cuentas.
- CRUD basico de categorias.
- Categoria protegida `Deudas`.

### Fase 2: Movimientos

- Registro de ingresos.
- Registro de gastos.
- Registro de transferencias.
- Ajustes manuales.
- Adjuntos.
- Almacenamiento S3-compatible privado.
- Deudas y pagos de deuda.
- Calculo de saldos esperados.

### Fase 3: Dashboard

- Saldos por cuenta.
- Total ahorrado.
- Gastos por categoria.
- Ingresos por categoria.
- Forecast mensual por categoria de gasto.
- Tablas filtradas por categoria.
- Filtros globales y granulares.
- Tablas con 10 registros por defecto y paginacion inferior.
- Deudas pendientes.

### Fase 4: Historial y detalle

- Historial de transferencias con rango de fechas.
- Total acumulado transferido.
- Pop-ups de detalle completo.
- Edicion y eliminacion con confirmacion.
- Auditoria completa.

### Fase 5: Metas de ahorro

- CRUD de metas de ahorro.
- Distribucion del ahorro actual entre metas.
- Ajuste proporcional de metas cuando baja el ahorro.
- Avance de metas en dashboard.

### Fase 6: Pulido y despliegue

- Estados vacios y errores.
- Validaciones completas.
- Pruebas automatizadas.
- Ajustes responsive.
- Dockerfile liviano.
- GitHub Actions.
- Despliegue en VPS.
