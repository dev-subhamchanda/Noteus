# Noteus — Collaborative Notes Sharing

## Run locally

1. Install frontend dependencies with `npm install`.
2. Copy `backend/.env.example` to `backend/.env` and set the MongoDB, admin username/password, JWT, mail, and Cloudinary configuration. The admin password is stored as a bcrypt hash in MongoDB.
3. Start both apps with `npm run dev:all` and open the frontend URL printed by Vite. The backend listens on port 3000 and the frontend proxies `/api` requests to it.

Alternatively, run `npm run dev` and `npm run dev --prefix backend` in separate terminals.

The interface uses the Poppins typeface.

The Vite development server proxies `/api` to `http://localhost:3000`. For a separately hosted API, set `VITE_API_BASE_URL` to its URL when building the frontend, and configure the backend's `FRONTEND_ORIGINS` with the frontend origin(s).

## Features

- Roll-number and six-digit PIN sign-in, plus PIN reset by email.
- Responsive home dashboard, subject folders, notifications, and tasks.
- PDF upload to the authenticated backend endpoint. Files are limited to 3 MB and uploads are grouped by subject in this browser.
- Admin panel at `/admin` for creating student accounts and reviewing uploader/file activity.

The backend does not currently expose notification or task endpoints. The home notifications/tasks are sample dashboard content. Student upload history is stored in browser local storage, while the admin upload activity log is persisted in MongoDB; uploaded PDFs themselves are stored by the backend in Cloudinary.

## Frontend structure

The frontend is organized by responsibility:

- `src/app/` — route definitions and shared authentication state.
- `src/layouts/` — authenticated application shells and navigation.
- `src/pages/` — route-level screens grouped by feature (`auth`, `dashboard`, `library`, and `admin`).
- `src/components/` — reusable UI elements and upload/library components.
- `src/services/` — API calls for authentication and note uploads.
- `src/data/` — static subject and dashboard content.
- `src/types/` and `src/utils/` — shared TypeScript types and formatting helpers.

Student routes are `/login`, `/`, `/notes`, `/notes/:subject`, and `/uploads`. The admin sign-in and panel are served under `/admin`.
