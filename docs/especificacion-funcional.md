# Especificacion funcional

## 1. Resumen

Expense Tracker es una aplicacion multiusuario para registrar y consultar
movimientos financieros personales. Cada usuario autenticado podra administrar
sus cuentas, registrar ingresos, gastos y movimientos entre cuentas propias, y
consultar informes sobre su dinero esperado por cuenta, categorias de movimiento,
historial de transferencias, total ahorrado, avance de metas de ahorro y deudas
pendientes, incluyendo planeacion mensual de gasto por categoria.

## 2. Objetivo

Crear una experiencia clara y rapida para responder cinco preguntas principales:

- Cuanto dinero deberia tener en cada cuenta.
- Cuanto he gastado por categoria.
- Cuanto he recibido por categoria.
- Cuanto tengo ahorrado entre mis cuentas de ahorro.
- Como avanzo frente a mis metas de ahorro.
- Que deudas tengo pendientes y cuando debo pagarlas.
- Cuanto proyectaba gastar este mes por categoria y cuanto llevo ejecutado.

## 3. Usuarios

### Usuario autenticado

Persona que registra sus propias cuentas y movimientos financieros. Solo puede
ver y administrar su informacion.

### Usuario no autenticado

Persona que aun no ha iniciado sesion. Solo puede acceder a los flujos de inicio
de sesion o registro.

## 4. Conceptos principales

### Cuenta personal

Representa un lugar donde el usuario guarda o mueve dinero.

Tipos de cuenta:

- Cuenta de ahorro: cuenta cuyo saldo suma al total ahorrado.
- Cuenta de dinero disponible: efectivo, cuenta corriente, billetera electronica
  u otro medio liquido.

Cada usuario debe tener una moneda global configurada en su cuenta de usuario.
Todos los montos financieros del usuario se registran, muestran y reportan en
esa moneda global.

Ejemplos:

- Pibank.
- Bancolombia cajita de ahorros.
- Efectivo.
- Cuenta corriente de banco.
- Billetera electronica.

### Movimiento financiero

Registro que afecta el dinero del usuario.

Tipos de movimiento:

- Gasto: salida de dinero asociada a una categoria de gasto.
- Ingreso: entrada de dinero asociada a una categoria de ingreso.
- Movimiento interbancario: transferencia entre cuentas propias.

### Saldo esperado

Monto calculado por la aplicacion segun el saldo inicial de una cuenta y los
movimientos registrados por el usuario. No implica conciliacion automatica con
el banco real.

### Meta de ahorro

Objetivo financiero definido por el usuario para ahorrar un monto especifico. Se
debe integrar al dashboard de ahorro para mostrar avance, monto objetivo, monto
alcanzado y saldo pendiente.

### Planeacion mensual por categoria

Sistema organizativo en el que el usuario define una base mensual de gasto y
asigna porcentajes a categorias de gasto. La aplicacion calcula el forecast
monetario esperado por categoria y lo compara con el gasto real acumulado del
periodo.

### Deuda

Obligacion financiera del usuario que tiene un monto pendiente y uno o varios
dias esperados de pago dentro del mes. Las deudas se integran con el registro de
gastos mediante una categoria protegida llamada `Deudas`.

### Ajuste manual

Movimiento interno usado para corregir el saldo esperado de una cuenta. Debe
registrarse con una categoria oculta llamada `Ajustes manuales`, de modo que la
correccion quede trazable sin mezclarse con categorias visibles de ingresos o
gastos.

## 5. Alcance funcional

### Incluido

- Autenticacion de usuarios.
- Administracion de cuentas personales.
- Clasificacion de cuentas como ahorro o dinero disponible.
- Registro de gastos.
- Registro de ingresos.
- Registro de ingresos distribuidos entre varias cuentas.
- Registro de gastos distribuidos entre varias cuentas.
- Registro de movimientos interbancarios.
- Ajustes manuales de saldo por cuenta.
- Modulo de deudas.
- Registro de pagos de deuda desde el flujo de gastos.
- Edicion y eliminacion de movimientos con confirmacion y advertencia.
- Desactivacion de cuentas, categorias y otros registros cuando aplique.
- Notas libres y multiples archivos adjuntos en los movimientos.
- Metas de ahorro integradas al dashboard.
- Planeacion mensual de gasto por categoria integrada al dashboard.
- Dashboard principal con informes.
- Graficas de barras horizontales para gastos e ingresos por categoria.
- Tablas filtradas por categoria al seleccionar una barra o categoria.
- Pop-up de detalle completo para cada movimiento.
- Reporte de saldo esperado por cuenta.
- Historial de movimientos interbancarios con filtro por rango de fechas.
- Total acumulado de movimientos interbancarios en el rango seleccionado.
- Total ahorrado entre cuentas de ahorro.
- Reporte de deudas pendientes y pagos realizados.
- Comparativo entre forecast mensual y gasto real por categoria.

### Fuera de alcance inicial

- Conciliacion automatica con bancos.
- Importacion automatica de extractos.
- Presupuestos mensuales.
- Reportes contables avanzados.
- Categorizacion automatica con inteligencia artificial.
- Autenticacion con Google, reservada para una fase posterior.
- Conversion entre multiples monedas.

## 6. Navegacion principal

La aplicacion debe tener como pantalla central un dashboard principal. Desde ahi
el usuario debe poder:

- Registrar gastos.
- Registrar ingresos.
- Registrar movimientos interbancarios.
- Consultar reportes.
- Acceder a la administracion de cuentas.

## 7. Acciones rapidas fijas

En la pantalla principal, y preferiblemente en las vistas principales de la
aplicacion, deben existir botones fijos en la parte inferior derecha.

Botones requeridos:

- Agregar gasto.
- Agregar ingreso.
- Registrar movimiento interbancario.

Comportamiento esperado:

- Los botones se mantienen visibles aunque el usuario haga scroll.
- Cada boton abre el flujo correspondiente.
- Deben ser faciles de usar en escritorio y movil.

## 8. Administracion de cuentas

### Crear cuenta

El usuario debe poder crear una cuenta personal con al menos:

- Nombre de la cuenta.
- Tipo de cuenta: ahorro o dinero disponible.
- Saldo inicial.

### Consultar cuentas

El usuario debe poder ver:

- Nombre de la cuenta.
- Tipo de cuenta.
- Saldo esperado.

### Editar cuenta

El usuario debe poder modificar:

- Nombre.
- Tipo.

### Ajustar saldo

El usuario debe poder ajustar manualmente el saldo esperado de una cuenta.

Reglas:

- El ajuste debe pedir monto, motivo o nota libre, fecha y cuenta afectada.
- El ajuste debe registrarse como movimiento trazable.
- El ajuste debe usar internamente la categoria oculta `Ajustes manuales`.
- El ajuste debe afectar el saldo esperado de la cuenta.

### Desactivar cuenta

El usuario debe poder desactivar una cuenta sin eliminar historicamente sus
movimientos.

Reglas:

- Una cuenta desactivada no debe aparecer como opcion principal para nuevos
  movimientos.
- Sus movimientos historicos deben conservarse.
- Sus saldos pueden seguir consultandose en vistas historicas o administrativas.

## 9. Configuracion de usuario

El usuario debe poder configurar su moneda global desde los ajustes de su
cuenta.

Reglas:

- La moneda global aplica a cuentas, movimientos, deudas, metas, reportes y
adjuntos con montos.
- El cambio de moneda global despues de existir movimientos debe advertir que no
  convierte valores historicos automaticamente.
- En la primera version no habra conversion automatica ni tasas de cambio.

El usuario tambien debe poder configurar una base mensual organizativa para
planeacion de gasto.

Reglas:

- La base mensual se usa para calcular el forecast monetario por categoria de
  gasto.
- La base mensual es organizativa y no crea movimientos financieros.
- Cambiar la base mensual no altera historicos, solo futuros calculos del
  periodo consultado.

## 10. Categorias

No deben existir categorias iniciales obligatorias. El usuario debe crear sus
categorias desde el modulo de categorias antes de usarlas.

El modulo de categorias debe permitir:

- Crear categorias de ingreso.
- Crear categorias de gasto.
- Editar categorias existentes.
- Desactivar categorias mediante soft delete o inactivacion.
- Evitar que categorias inactivas se usen en nuevos movimientos.

La categoria oculta `Ajustes manuales` no debe administrarse como una categoria
normal visible, pero si debe existir para trazabilidad interna.

Debe existir una categoria protegida no borrable llamada `Deudas`.

Reglas de la categoria `Deudas`:

- Debe existir por defecto para cada usuario.
- No debe poder eliminarse.
- No debe poder desactivarse.
- Puede usarse en el registro de gastos para pagar una deuda.
- Al seleccionarla en un gasto, el formulario debe mostrar un desplegable
  adicional para escoger la deuda asociada.

## 11. Registro de ingreso

El ingreso de dinero debe abrirse en un pop-up de pantalla completa.

Campos iniciales:

- Categoria de ingreso, en un desplegable de ancho completo.
- Monto total.
- Cuenta por donde ingreso el dinero, en un desplegable.
- Nota libre opcional.
- Archivos adjuntos opcionales.

### Distribucion entre varias cuentas

Debe existir un boton con simbolo `+` para agregar otra cuenta de ingreso.

Cuando el ingreso usa dos o mas cuentas:

- Cada fila debe permitir seleccionar una cuenta.
- Cada fila debe permitir ingresar el monto correspondiente a esa cuenta.
- El desplegable de cuenta debe reducir su ancho para dejar espacio al monto de
  esa cuenta.
- La suma de montos por cuenta debe coincidir con el monto total del ingreso.

Ejemplo:

- Monto total: 1.000.000.
- Efectivo: 300.000.
- Banco: 700.000.

## 12. Registro de gasto

El gasto debe permitir registrar al menos:

- Categoria de gasto.
- Nombre o descripcion.
- Monto.
- Cuenta desde donde salio el dinero.
- Fecha.
- Nota libre opcional.
- Archivos adjuntos opcionales.

### Pago de deuda

Cuando el usuario seleccione la categoria `Deudas`, el formulario debe mostrar
un desplegable adicional para escoger la deuda que se va a pagar.

El desplegable de deudas debe mostrar:

- Nombre de la deuda.
- Monto pendiente por pagar.

Al guardar un gasto asociado a una deuda:

- Debe disminuir el saldo esperado de la cuenta o cuentas seleccionadas.
- Debe registrar el gasto en la categoria `Deudas`.
- Debe asociar el pago con la deuda seleccionada.
- Debe disminuir el monto pendiente de la deuda.
- Debe permitir pagos parciales.
- No debe permitir que el monto pagado supere el saldo pendiente de la deuda,
  salvo que se defina explicitamente un comportamiento de sobrepago en una fase
  posterior.

### Distribucion entre varias cuentas

El gasto debe poder dividirse entre varias cuentas cuando el pago haya salido de
mas de un origen.

Cuando el gasto usa dos o mas cuentas:

- Cada fila debe permitir seleccionar una cuenta.
- Cada fila debe permitir ingresar el monto correspondiente a esa cuenta.
- La suma de montos por cuenta debe coincidir con el monto total del gasto.

Al guardar un gasto:

- Debe disminuir el saldo esperado de la cuenta o cuentas seleccionadas.
- Debe aparecer en los reportes de gastos por categoria.
- Debe permitirse aunque la cuenta quede con saldo esperado negativo.

## 13. Movimiento interbancario

El movimiento interbancario representa una transferencia entre cuentas propias.
No debe contarse como gasto ni como ingreso.

Campos requeridos:

- Cuenta de origen, en un desplegable.
- Saldo esperado disponible de la cuenta origen, visible al seleccionarla.
- Motivo del movimiento.
- Cuenta destino, en un desplegable.
- Monto del movimiento.
- Fecha del movimiento.
- Nota libre opcional.
- Archivos adjuntos opcionales.

Reglas:

- La cuenta origen y la cuenta destino deben ser diferentes.
- Al guardar, el saldo esperado de la cuenta origen disminuye.
- Al guardar, el saldo esperado de la cuenta destino aumenta.
- El movimiento debe aparecer en el historial de movimientos interbancarios.
- Debe permitirse aunque la cuenta origen quede con saldo esperado negativo.

## 14. Edicion y eliminacion de movimientos

El usuario debe poder editar y eliminar movimientos ya registrados.

Reglas:

- Toda edicion debe recalcular los saldos esperados afectados.
- Toda eliminacion debe mostrar una confirmacion explicita.
- La confirmacion debe advertir que la accion cambiara saldos, reportes y
  historiales.
- La eliminacion debe implementarse como desactivacion o soft delete cuando sea
  necesario conservar trazabilidad.
- Debe existir auditoria completa de ediciones y eliminaciones desde la primera
  version.
- La auditoria debe registrar usuario, fecha, accion y valores anteriores
  relevantes.

## 15. Dashboard principal

El dashboard principal debe contener los siguientes informes.

Debe existir un filtro global por rango de fechas que afecte los informes del
dashboard. Adicionalmente, cada grafica o informe debe poder tener filtros
granulares propios cuando el usuario necesite revisar un rango distinto.

El rango global por defecto debe iniciar en el primer dia del mes actual.

### 15.1 Gastos por categoria

Debe mostrar una grafica de barras horizontales con el total gastado por cada
categoria.

Al hacer clic en una barra o categoria:

- Se debe mostrar debajo una tabla filtrada.
- La tabla debe incluir movimientos de esa categoria.
- Cada fila debe mostrar nombre, fecha y monto.
- Cada fila debe tener un boton para abrir un pop-up con el detalle completo.

Tambien debe existir un comparativo de planeacion mensual por categoria de
gasto.

Informacion minima por categoria:

- Nombre de categoria.
- Porcentaje asignado.
- Forecast monetario del mes.
- Gasto real acumulado del periodo.
- Diferencia entre forecast y gasto real.
- Indicador visual de si va por debajo, en linea o por encima del forecast.

### 15.2 Ingresos por categoria

Debe mostrar una grafica de barras horizontales con el total recibido por cada
categoria.

Al hacer clic en una barra o categoria:

- Se debe mostrar debajo una tabla filtrada.
- La tabla debe incluir movimientos de esa categoria.
- Cada fila debe mostrar nombre, fecha y monto.
- Cada fila debe tener un boton para abrir un pop-up con el detalle completo.

### 15.3 Saldos esperados por cuenta

Debe mostrar cuanto dinero deberia tener el usuario en cada cuenta.

Informacion minima:

- Nombre de cuenta.
- Tipo de cuenta.
- Saldo esperado.

### 15.4 Historial de movimientos interbancarios

Debe permitir seleccionar un rango de fechas.

Debe mostrar:

- Lista de movimientos interbancarios en el rango.
- Fecha.
- Cuenta origen.
- Cuenta destino.
- Motivo.
- Monto.
- Total acumulado transferido en el rango seleccionado.

### 15.5 Total ahorrado

Debe mostrar la suma de los saldos esperados de todas las cuentas clasificadas
como cuentas de ahorro.

No debe incluir saldos que esten en cuentas de dinero disponible, efectivo,
cuentas corrientes, billeteras electronicas u otros tipos distintos de
`savings`, aunque esos saldos sean positivos.

### 15.6 Metas de ahorro

Debe mostrar las metas de ahorro del usuario y su avance.

Informacion minima:

- Nombre de la meta.
- Monto objetivo.
- Monto acumulado o asociado.
- Porcentaje de avance.
- Monto pendiente.
- Estado de la meta.

### 15.7 Deudas

Debe mostrar un resumen de deudas del usuario.

Informacion minima:

- Nombre de deuda.
- Monto original.
- Monto pagado.
- Monto pendiente.
- Dias esperados de pago en el mes.
- Estado de la deuda.

### 15.8 Planeacion mensual de gasto

El usuario debe poder definir una planeacion mensual de gasto por categoria.

Campos requeridos:

- Base mensual de gasto.
- Categoria de gasto.
- Porcentaje asignado a la categoria.

Reglas:

- Solo aplica a categorias de gasto visibles del usuario.
- La suma de porcentajes no debe superar el 100 por ciento de la base mensual.
- El forecast monetario por categoria se calcula multiplicando porcentaje por
  base mensual de gasto.
- El sistema debe comparar forecast contra gasto real acumulado del rango.
- La planeacion es organizativa y no bloquea gastos reales.
- Si una categoria no tiene planeacion definida, debe poder verse como sin
  forecast.

## 16. Metas de ahorro

El usuario debe poder crear y administrar metas de ahorro.

Campos requeridos:

- Nombre de la meta.
- Monto objetivo.
- Descripcion.
- Fecha objetivo opcional.

Reglas:

- Las metas deben integrarse al dashboard de reportes de ahorro.
- El usuario debe poder crear una meta con monto objetivo y descripcion.
- El usuario debe tener un modulo para distribuir su ahorro actual entre metas.
- Para metas de ahorro, el ahorro actual disponible es exclusivamente la suma
  de saldos esperados dentro de cuentas clasificadas como ahorro. El dinero en
  cuentas de dinero disponible u otros tipos no se puede asignar a metas.
- La distribucion del ahorro entre metas es organizativa; no mueve dinero entre
  cuentas ni reserva saldo real.
- La suma asignada a metas no debe superar el total disponible definido como
  ahorro actual del usuario.
- Si el usuario retira dinero de cuentas de ahorro y el total ahorrado queda por
  debajo de lo asignado a metas, la aplicacion debe reducir
  proporcionalmente las asignaciones de metas.
- Al volver a la vista de ahorros, el usuario debe ver una indicacion de que
  retiro una cantidad de sus cuentas de ahorro y que la distribucion de metas
  cambio proporcionalmente.
- Las metas deben poder editarse y desactivarse.

## 17. Deudas

El usuario debe poder crear, consultar, editar y desactivar deudas.

Campos requeridos:

- Nombre de la deuda.
- Descripcion opcional.
- Monto total.
- Dias del mes en los que se espera pagar.
- Estado.

Reglas:

- Una deuda puede pagarse parcial o totalmente mediante gastos en la categoria
  `Deudas`.
- El monto pendiente de una deuda se calcula con el monto total menos los pagos
  asociados.
- Al registrar un gasto con categoria `Deudas`, debe ser obligatorio escoger una
  deuda.
- Una deuda pagada totalmente debe mostrarse como completada o pagada.
- Las deudas desactivadas no deben aparecer como opcion para nuevos pagos, pero
  deben conservar su historial.

## 18. Detalle de movimiento

Desde las tablas de movimientos, el usuario debe poder abrir un pop-up con toda
la informacion del movimiento.

Para gastos:

- Tipo de movimiento.
- Categoria.
- Nombre o descripcion.
- Monto.
- Cuenta o cuentas afectadas.
- Deuda asociada, si el gasto pertenece a la categoria `Deudas`.
- Nota libre.
- Archivos adjuntos.
- Fecha.

Para ingresos:

- Tipo de movimiento.
- Categoria.
- Monto total.
- Cuenta o cuentas donde ingreso el dinero.
- Monto recibido por cada cuenta, si aplica.
- Nota libre.
- Archivos adjuntos.
- Fecha.

Para movimientos interbancarios:

- Tipo de movimiento.
- Cuenta origen.
- Cuenta destino.
- Motivo.
- Monto.
- Nota libre.
- Archivos adjuntos.
- Fecha.

## 19. Archivos adjuntos y notas

Los movimientos deben permitir guardar informacion complementaria.

Campos:

- Nota libre.
- Uno o varios archivos adjuntos.

Usos esperados:

- Facturas.
- Recibos.
- Comprobantes.
- Soportes de transferencia.

Reglas:

- Los adjuntos deben pertenecer al usuario propietario del movimiento.
- Los adjuntos deben conservarse al consultar el detalle del movimiento.
- Si se elimina o desactiva un movimiento, sus adjuntos deben quedar sujetos a
  la misma politica de retencion del movimiento.
- Se permiten archivos relacionados con PDF, Word, Excel e imagenes.
- Cada usuario tiene un limite inicial de almacenamiento de 1 GB.
- Cada archivo individual puede pesar maximo 50 MB.
- La cantidad maxima de archivos por movimiento debe ser configurable por un
  usuario administrador.
- En esta fase, el usuario puede modificar su propio limite de almacenamiento.
- En una fase futura, el limite podra depender de una suscripcion y ser
  administrado por usuarios administradores.

## 20. Reglas de negocio

- Cada usuario solo puede ver y modificar sus propios datos.
- Los administradores pueden eliminar o desactivar usuarios.
- Los administradores pueden cambiar el limite de almacenamiento de un usuario.
- Los administradores pueden cambiar la cantidad maxima de adjuntos por
  movimiento.
- Los administradores no deben ver datos financieros privados de otros usuarios
  salvo que una funcion administrativa futura lo autorice explicitamente.
- Los gastos disminuyen el saldo esperado de la cuenta o cuentas asociadas.
- Los gastos asociados a la categoria `Deudas` deben vincularse a una deuda.
- Los ingresos aumentan el saldo esperado de la cuenta o cuentas asociadas.
- Los movimientos interbancarios mueven dinero entre cuentas propias.
- Los movimientos interbancarios no alteran el patrimonio total del usuario.
- Los movimientos interbancarios no deben aparecer en graficas de gastos ni de
  ingresos.
- Los movimientos interbancarios no tendran comisiones ni estados
  pendiente/completada en la primera version.
- El total ahorrado se calcula solo con cuentas clasificadas como ahorro.
- Las graficas de gastos e ingresos deben agrupar por categoria.
- Los reportes deben considerar un rango de fechas cuando el filtro exista.
- La planeacion mensual por categoria es organizativa y no crea movimientos
  financieros.
- Las cuentas pueden tener saldo esperado negativo.
- Las categorias visibles son creadas por el usuario.
- Las cuentas y categorias se desactivan preferiblemente con soft delete.
- Los ajustes manuales se registran con la categoria oculta `Ajustes manuales`.
- El saldo inicial de una cuenta debe registrarse como ajuste manual inicial.
- La moneda global pertenece al usuario, no a cada cuenta financiera.
- Las tablas deben mostrar 10 registros por defecto y paginar con botones en la
  parte inferior.
- La auditoria sera interna en la primera version; una vista visible para el
  usuario puede agregarse despues.

## 21. Roles

### Administrador

Puede:

- Eliminar usuarios.
- Desactivar usuarios.
- Cambiar el limite de almacenamiento de usuarios.
- Cambiar la cantidad maxima de adjuntos por movimiento.

### Usuario normal

Puede administrar sus propias cuentas, categorias, movimientos, adjuntos,
reportes, deudas y metas de ahorro.

## 22. Criterios de aceptacion

- El usuario puede registrarse, iniciar sesion y cerrar sesion.
- El usuario autenticado ve solo sus cuentas y movimientos.
- El usuario puede crear cuentas personales y clasificarlas.
- El usuario puede configurar su moneda global.
- El usuario puede crear, editar y desactivar categorias.
- El sistema crea una categoria protegida no borrable llamada `Deudas`.
- El usuario puede ver el saldo esperado de cada cuenta.
- El usuario puede ajustar manualmente el saldo de una cuenta.
- El saldo inicial de una cuenta se registra como ajuste manual inicial.
- El usuario puede registrar un gasto desde un boton fijo.
- El usuario puede registrar un gasto distribuido entre varias cuentas.
- Al escoger la categoria `Deudas` en un gasto, aparece el desplegable de deudas
  con nombre y monto pendiente.
- El usuario puede pagar una deuda total o parcialmente desde un gasto.
- El usuario puede registrar un ingreso desde un boton fijo.
- El usuario puede registrar un ingreso distribuido entre varias cuentas.
- El usuario puede registrar un movimiento interbancario desde un boton fijo.
- Al seleccionar cuenta origen en un movimiento interbancario, se muestra su
  saldo esperado disponible.
- El dashboard muestra gastos por categoria en barras horizontales.
- El dashboard muestra ingresos por categoria en barras horizontales.
- Al seleccionar una categoria en una grafica, aparece la tabla filtrada.
- Cada fila de la tabla permite abrir un detalle completo del movimiento.
- El dashboard muestra saldos esperados por cuenta.
- El dashboard permite filtros globales y filtros granulares por informe.
- El dashboard muestra historial de movimientos interbancarios filtrable por
  rango de fechas.
- El dashboard muestra el total acumulado transferido entre cuentas en el rango.
- El dashboard muestra el total ahorrado entre cuentas de ahorro.
- El dashboard muestra metas de ahorro y su avance.
- El dashboard muestra deudas y montos pendientes.
- El dashboard muestra comparativo entre forecast mensual y gasto real por
  categoria.
- El usuario puede adjuntar varios archivos a un movimiento.
- Cada usuario tiene 1 GB de almacenamiento inicial.
- Cada archivo adjunto puede pesar maximo 50 MB.
- El usuario puede editar y eliminar movimientos con confirmacion y advertencia.
- El sistema registra auditoria completa de ediciones y eliminaciones.
- El sistema permite saldos esperados negativos.

## 23. Decisiones cerradas

- La moneda global vive en la cuenta del usuario.
- No habra categorias iniciales obligatorias; se crean desde el modulo de
  categorias.
- Debe existir la categoria protegida `Deudas`.
- Las categorias seran editables por el usuario.
- Los movimientos se podran editar y eliminar con confirmacion y advertencia.
- Habra auditoria completa de ediciones y eliminaciones desde la primera version.
- Los ajustes manuales se registraran como `Ajustes manuales`.
- El saldo inicial se creara como ajuste manual inicial.
- Las cuentas y categorias podran desactivarse con soft delete.
- El dashboard tendra filtros globales y filtros granulares por informe.
- El dashboard usa como rango inicial el inicio del mes actual.
- Los movimientos permitiran nota libre y multiples archivos adjuntos.
- Los adjuntos permitiran PDF, Word, Excel e imagenes.
- Los adjuntos tendran limite inicial de 1 GB por usuario y 50 MB por archivo.
- El numero maximo de adjuntos por movimiento sera configurable por un
  administrador.
- Los gastos podran dividirse entre varias cuentas.
- Se permitiran saldos esperados negativos.
- Las metas de ahorro hacen parte del alcance y se integran al dashboard.
- La asignacion de ahorro a metas es organizativa y se ajusta
  proporcionalmente si baja el total ahorrado.
- Las deudas hacen parte del alcance y se integran con el registro de gastos.
- La planeacion mensual de gasto por categoria hace parte del dashboard y es
  solo organizativa.
