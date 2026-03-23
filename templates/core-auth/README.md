# Core Auth Backend (Template)

This template is generated from `backend-boilerplate/templates/core-auth`.

## Setup
1. `cp .env.example .env`
2. `npm install`
3. `npm run dev`

## Endpoints
- `GET /api/health`
- `POST /api/auth/register`
- `POST /api/auth/verify-otp`
- `POST /api/auth/resend-otp`
- `POST /api/auth/login` (returns JWT)
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`
- `GET /api/auth/me` (JWT required)

## JWT Usage
Send your token in `Authorization` header:
- `Authorization: <token>`
- or `Authorization: Bearer <token>`

## Seeded accounts
After first run (when DB is connected):
- `ADMIN_EMAIL` / `ADMIN_PASSWORD` (role `admin`, `isVerified=true`)
- `SUPER_ADMIN_EMAIL` / `SUPER_ADMIN_PASSWORD` (role `super_admin`, `isVerified=true`)

