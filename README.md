# LaJuvePOS Web

Versión web de LaJuvePOS (backend Express + Prisma + Postgres/Supabase, frontend Vite + React en Vercel), migrada desde la versión de escritorio (Electron + SQLite) en `../LaJuve2.0`.

## Estructura

- `backend/` — API en Express + Prisma. Se conecta a una base Postgres (Supabase). Se deploya en cualquier host de Node (Railway, Render, un VPS, etc. — Vercel no es ideal para un servidor Express persistente).
- `frontend/` — App React (Vite). Se deploya en Vercel.

## Pasos para poner esto en funcionamiento

### 1. Crear el proyecto en Supabase

1. Entrar a [supabase.com](https://supabase.com) y crear un proyecto nuevo.
2. En **Project Settings → Database**, copiar la "Connection string" (modo *Transaction* o *Session*, con el password).
3. Pegarla como `DATABASE_URL` en `backend/.env` (copiar `backend/.env.example` a `backend/.env` primero).

### 2. Crear las tablas y los datos iniciales

```bash
cd backend
npm install
npx prisma migrate dev --name init
npm run prisma:seed
```

Esto crea todas las tablas y siembra el usuario administrador con PIN **0000** y los motivos de caja por defecto.

### 3. Correr el backend

```bash
npm run dev
```

Por defecto escucha en el puerto 4000 (configurable con `PORT` en `.env`).

### 4. Correr el frontend

```bash
cd ../frontend
npm install
cp .env.example .env
npm run dev
```

Ajustar `VITE_API_URL` en `.env` para que apunte al backend (en desarrollo: `http://localhost:4000/api`).

### 5. Deploy

- **Backend**: deployar en Railway, Render o similar, con la variable `DATABASE_URL` (de Supabase) y `AUTH_SECRET` (una clave larga y secreta, distinta a la de desarrollo).
- **Frontend**: deployar en Vercel, seteando `VITE_API_URL` como variable de entorno apuntando a la URL pública del backend.

## Diferencias con la versión de escritorio

- La base de datos es compartida (Postgres en Supabase) en vez de un archivo SQLite local por computadora — todas las cajas ven la misma información en tiempo real.
- El login sigue siendo por PIN de 4 dígitos, pero ahora emite un token que se guarda en el navegador (`localStorage`) en vez de mantenerse en memoria de la app de escritorio.
- La "copia de seguridad" ahora descarga un archivo JSON con todos los datos (antes copiaba el archivo `.db`), ya que los datos viven en la nube y no en un archivo local.
- Requiere conexión a internet para funcionar.
