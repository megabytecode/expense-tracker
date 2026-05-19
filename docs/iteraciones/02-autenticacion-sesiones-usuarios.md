# 02 - Autenticacion, sesiones y usuarios

## Objetivo

Implementar usuarios, roles, moneda global, limites de almacenamiento y
autenticacion local por OTP enviado al correo.

## Alcance

- Modelo `users`.
- Modelo `auth_otps`.
- Modelo `sessions`.
- Registro o inicio por correo.
- Solicitud de OTP.
- Verificacion de OTP.
- Sesion persistente sin expiracion automatica.
- Cierre de sesion y revocacion.
- Roles `admin` y `user`.
- Configuracion inicial de usuario:
  - moneda global
  - limite inicial de almacenamiento de 1 GB
  - maximo de adjuntos por movimiento

## Fuera de alcance

- Google Auth.
- Panel administrativo completo.
- Adjuntos reales.
- Datos financieros.

## Reglas

- OTP hasheado.
- OTP expira en 10 minutos.
- Maximo 5 intentos fallidos.
- Despues de 5 intentos fallidos, bloqueo de 1 hora.
- Reenvios permitidos antes del bloqueo.
- Cada reenvio invalida codigos anteriores.
- Sesion sin expiracion automatica, pero revocable.
- Cookies seguras y `httpOnly`.

## Tareas sugeridas

- Crear migraciones Prisma para `users`, `auth_otps` y `sessions`.
- Crear servicio de OTP.
- Crear servicio de envio de correo con SMTP configurable.
- Crear servicio de sesiones.
- Crear guards/helpers de usuario actual.
- Crear paginas de login, solicitud OTP y verificacion OTP.
- Crear ruta o accion de logout.
- Crear seed o mecanismo para primer administrador si hace falta.

## Criterios de aceptacion

- Un usuario puede solicitar OTP.
- Un OTP valido inicia sesion.
- Un OTP expirado o con demasiados intentos falla.
- Reenviar OTP invalida el anterior.
- Cerrar sesion revoca la sesion.
- Las rutas privadas exigen sesion.
- El usuario tiene moneda global y limites iniciales configurados.

## Verificacion

- Pruebas unitarias del servicio OTP.
- Pruebas de sesion.
- Prueba manual completa de login/logout.

