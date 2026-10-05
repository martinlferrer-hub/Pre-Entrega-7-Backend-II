# EventHub API

API REST para una Plataforma de Eventos e Inscripciones.

## Pre-entrega 7 — Tickets, inscripciones y control de cupos

En esta etapa se incorpora la entidad `Ticket`, el flujo de inscripción a eventos, control de cupos, prevención de inscripciones duplicadas, cancelación de tickets y notificación por email mediante Nodemailer.

La implementación continúa sobre la arquitectura de las entregas anteriores:

```text
Route
  ↓
Authentication / Authorization
  ↓
Controller
  ↓
Service
  ↓
Repository
  ↓
DAO
  ↓
Model / MongoDB
```

Las validaciones de inscripción, cupos, duplicados, propiedad y cancelación están en `services/tickets.service.js`. Los controllers solo reciben request y construyen la respuesta HTTP.

## Modelo Ticket

La entidad `Ticket` utiliza únicamente referencias mediante `ObjectId`; no embebe usuarios ni eventos.

| Campo | Tipo | Descripción |
|---|---|---|
| `user` | ObjectId | Referencia a `User` |
| `event` | ObjectId | Referencia a `Event` |
| `status` | String | `confirmed`, `pending`, `cancelled` |
| `quantity` | Number | Cantidad de cupos reservados, mayor a 0 |
| `reservationCode` | String | Código único de reserva |
| `createdAt` | Date | Timestamp automático |
| `cancelledAt` | Date/null | Fecha de cancelación |

Existe un índice único parcial sobre `user + event` para impedir más de una inscripción activa por usuario y evento. Los tickets `cancelled` no bloquean una nueva inscripción.

## Flujo de inscripción

```text
POST /api/events/:eid/tickets
        ↓
¿Usuario autenticado?
        ↓
¿Evento existe?
        ↓
¿Está published?
        ↓
¿Fecha futura?
        ↓
¿Quantity válida?
        ↓
¿Ya existe ticket activo?
        ↓
Calcular cupos activos
        ↓
¿Hay capacidad suficiente?
        ↓
Crear Ticket confirmed
        ↓
Generar reservationCode
        ↓
Enviar email de confirmación con Nodemailer
```

Los tickets `cancelled` no se cuentan como cupos ocupados. La cancelación no elimina documentos: cambia `status` a `cancelled` y registra `cancelledAt`.

## Reglas de negocio

- El usuario debe estar autenticado para inscribirse.
- El evento debe existir.
- El evento debe estar en estado `published`.
- El evento no puede haber finalizado.
- `quantity` debe ser un entero mayor a 0.
- Los tickets `confirmed` y `pending` ocupan cupo.
- Los tickets `cancelled` no ocupan cupo.
- Un usuario no puede tener dos tickets activos para el mismo evento.
- Si no hay cupos suficientes, la inscripción se rechaza.
- El dueño puede cancelar su ticket.
- `admin` puede cancelar cualquier ticket.
- Un ticket ya cancelado no puede volver a cancelarse.
- Cancelar libera automáticamente los cupos porque ese ticket deja de participar en el cálculo de ocupación.
- No se eliminan tickets físicamente.

## Roles y acceso

| Acción | user | organizer | admin |
|---|:---:|:---:|:---:|
| Inscribirse a evento publicado | ✅ | ✅ | ✅ |
| Ver mis tickets | ✅ | ✅ | ✅ |
| Ver tickets de un evento propio | ❌ | ✅ | ✅ |
| Ver tickets de evento ajeno | ❌ | ❌ | ❌ |
| Cancelar ticket propio | ✅ | ✅ | ✅ |
| Cancelar ticket ajeno | ❌ | ❌ | ✅ |

Para consultar los tickets de un evento, un `organizer` debe ser el organizador de ese evento. `admin` puede consultar cualquier evento.

## Endpoints

### 1. POST `/api/events/:eid/tickets`

Acceso: cualquier usuario autenticado.

Request:

```json
{
  "quantity": 2
}
```

Response `201`:

```json
{
  "status": "success",
  "payload": {
    "id": "66a0...",
    "user": "665f2a...",
    "event": "6690...",
    "status": "confirmed",
    "quantity": 2,
    "reservationCode": "EVT-A1B2C3D4E5",
    "createdAt": "2026-10-05T15:00:00.000Z",
    "cancelledAt": null
  }
}
```

Errores principales:

- `401` → no autenticado.
- `404` → evento inexistente.
- `400` → evento no publicado, finalizado o cantidad inválida.
- `409` → cupos insuficientes o inscripción activa duplicada.

### 2. GET `/api/tickets/my-tickets`

Acceso: usuario autenticado.

Devuelve únicamente los tickets del usuario autenticado y utiliza `populate` sobre el evento con los datos públicos:

- `title`
- `date`
- `location`

No expone información sensible de otros usuarios.

### 3. GET `/api/events/:eid/tickets`

Acceso: `organizer` dueño del evento o `admin`.

Ejemplo:

```text
GET /api/events/6690abc123/tickets
```

Un `organizer` que no sea dueño del evento recibe `403`.

Response `200`:

```json
{
  "status": "success",
  "payload": []
}
```

### 4. PATCH `/api/tickets/:tid/cancel`

Acceso: dueño del ticket o `admin`.

Request sin body.

Response `200`:

```json
{
  "status": "success",
  "payload": {
    "id": "66a0...",
    "status": "cancelled",
    "quantity": 2,
    "reservationCode": "EVT-A1B2C3D4E5",
    "cancelledAt": "2026-10-05T16:00:00.000Z"
  }
}
```

Un usuario que intenta cancelar un ticket ajeno recibe `403`.

## Control de cupos

El cálculo se realiza en la capa `services`.

```text
Cupos ocupados = SUM(quantity)
                 de tickets con status
                 confirmed o pending

Cupos disponibles = Event.capacity - Cupos ocupados
```

Los tickets `cancelled` se excluyen automáticamente.

Ejemplo:

```text
Capacidad del evento:          100
Ticket A:                       20 confirmed
Ticket B:                       10 confirmed
Ticket C:                        5 cancelled
---------------------------------------
Cupos ocupados:                30
Cupos disponibles:             70
```

Una nueva inscripción de `quantity: 70` es válida; una de `quantity: 71` es rechazada.

## Notificaciones con Nodemailer

Después de crear correctamente un ticket confirmado, el servicio intenta enviar un email de confirmación al email del usuario autenticado.

El mensaje incluye:

- evento
- fecha
- ubicación
- cantidad
- código de reserva

Las credenciales SMTP nunca están hardcodeadas.

Variables requeridas:

| Variable | Descripción |
|---|---|
| `MAIL_HOST` | Host SMTP |
| `MAIL_PORT` | Puerto SMTP, por ejemplo `587` |
| `MAIL_USER` | Usuario SMTP |
| `MAIL_PASS` | Contraseña SMTP |
| `MAIL_FROM` | Remitente del mensaje |

## Variables de entorno

Crear `.env` a partir de `.env.example`.

```env
PORT=8080
NODE_ENV=development
MONGO_URL=mongodb://localhost:27017/eventhub
JWT_SECRET=change_this_secret
JWT_EXPIRES_IN=1h

MAIL_HOST=smtp.example.com
MAIL_PORT=587
MAIL_USER=your_email@example.com
MAIL_PASS=your_email_password
MAIL_FROM="EventHub <your_email@example.com>"
```

No subir `.env` al repositorio.

## Instalación

```bash
npm install
```

> La Pre-entrega 7 agrega `nodemailer` como dependencia. Si se parte del ZIP de la entrega anterior, ejecutar `npm install` para instalarla y sincronizar `package-lock.json`.

## Ejecución

```bash
npm run dev
```

Producción:

```bash
npm start
```

## Estructura relevante

```text
src/
├── config/
│   ├── database.js
│   ├── env.js
│   ├── mailer.js
│   └── passport.config.js
├── controllers/
│   ├── events.controller.js
│   ├── sessions.controller.js
│   ├── tickets.controller.js
│   └── users.controller.js
├── dao/
│   ├── events.dao.js
│   ├── tickets.dao.js
│   └── users.dao.js
├── middlewares/
│   ├── auth.middleware.js
│   ├── authorize.middleware.js
│   └── error.middleware.js
├── models/
│   ├── Event.js
│   ├── Ticket.js
│   └── User.js
├── repositories/
│   ├── events.repository.js
│   ├── tickets.repository.js
│   └── users.repository.js
├── routes/
│   ├── events.router.js
│   ├── health.router.js
│   ├── sessions.router.js
│   ├── tickets.router.js
│   └── users.router.js
├── services/
│   ├── events.service.js
│   ├── sessions.service.js
│   ├── tickets.service.js
│   └── users.service.js
└── utils/
    ├── hash.js
    └── jwt.js
```

## Errores de autenticación y autorización

### 401 — No autenticado

Se devuelve cuando no existe una sesión JWT válida.

```json
{
  "status": "error",
  "message": "No autenticado"
}
```

### 403 — Sin permisos

Se devuelve cuando el usuario está autenticado pero intenta acceder a un recurso que no puede administrar.

```json
{
  "status": "error",
  "message": "No tenés permisos para cancelar este ticket"
}
```

## Casos de prueba manuales

1. Inscripción exitosa → `201` y email de confirmación.
2. Inscripción sin sesión → `401`.
3. Inscripción a evento inexistente → `404`.
4. Inscripción a evento cancelado/finalizado → `400`.
5. Inscripción sin cupos suficientes → `409`.
6. Inscripción duplicada activa → `409`.
7. Cancelación propia → `200`; el cupo queda disponible.
8. Usuario cancela ticket ajeno → `403`.
9. `user` consulta `/api/events/:eid/tickets` → `403`.
10. `organizer` consulta tickets de evento ajeno → `403`.

## Git — historial incremental

Para esta entrega se recomienda dividir el trabajo en commits pequeños y descriptivos, siguiendo la observación realizada en la Pre-entrega 5:

```text
feat: add ticket model
feat: add ticket data access layer
feat: add ticket registration business rules
feat: add ticket endpoints
feat: add ticket cancellation
feat: add event ticket listing authorization
feat: add nodemailer confirmation
fix: release capacity after ticket cancellation
test: add ticket business rules
 docs: update ticket and enrollment API
```

## Seguridad

No subir:

- `.env`
- `node_modules/`
- contraseñas
- JWT secrets
- credenciales SMTP
- tokens de autenticación

## Tecnologías

Node.js, Express, MongoDB, Mongoose, Passport.js, bcrypt, JSON Web Token, cookie-parser, dotenv, Nodemailer y módulos ESM.
