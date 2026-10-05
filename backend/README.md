# Notes app authentication

## Setup

1. Copy `.env.example` to `.env` and set the MongoDB, admin username and password, JWT secret, Sendcorex email, and Cloudinary values. Set `FRONTEND_ORIGINS` to the frontend origin(s), separated by commas, when the frontend is hosted separately.
2. Start MongoDB and install dependencies with `npm install`.
3. Run `npm run dev`, or build with `npm run build` and start with `npm start`.

User records are stored in the MongoDB `users` collection. PINs are randomly generated, emailed, and stored only as bcrypt hashes. On startup, the configured admin username and password are upserted into the `admins` collection; the password is stored as a bcrypt hash. Change `ADMIN_USERNAME` and `ADMIN_PASSWORD` in the backend environment to set the credentials you want to use. Admin passwords must be at most 72 UTF-8 bytes.

## Endpoints

All routes are under `/api/auth` and accept JSON.

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/admin/login` | Exchange the configured admin username and password for an 8-hour bearer token |
| `POST` | `/register` | Admin-only provisioning; sends the initial PIN |
| `POST` | `/login` | Exchange roll number and PIN for a 12-hour bearer token |
| `POST` | `/change-pin` | Change the authenticated user's PIN after verifying the current PIN (six digits) |
| `POST` | `/reset-pin` | Send a new PIN when roll number and email match |
| `GET` | `/me` | Return the authenticated user's profile |

Admin registration requires the bearer token returned by `/admin/login`.

The simple admin page is available at `/admin`. Sign in with the configured credentials to create student accounts and review the latest upload activity. Creating a student account emails that user their initial PIN. Admin-only endpoints are under `/api/admin`:

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/users` | List the latest student accounts (PIN hashes are never returned) |
| `POST` | `/users` | Create a student account and email its initial PIN |
| `GET` | `/activity` | List the latest 200 upload attempts, with uploader, file, subject, time, and status |

## Note uploads

`POST /api/notes/upload` accepts one PDF in the multipart `file` field plus `semesterId` and `subjectId`, and requires a user bearer token. Files larger than 3 MB or files that are not PDFs are rejected. Upload attempts are saved in the MongoDB `uploadLogs` collection, associated with the authenticated student and semester subject; successful files are streamed to the Cloudinary folder configured by `CLOUDINARY_NOTES_FOLDER` (default: `notes`). `POST /api/notes/access-url` issues a 10-minute Cloudinary signed URL for an uploaded note owned by the authenticated student. Send `{ "publicId": "notes/..." , "mode": "view" | "download" }`. Set `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` in `.env`.

The frontend previews PDFs using PDF.js Express. It requests a short-lived signed Cloudinary URL from the backend, so the stored PDF does not need public delivery access. The Vite build copies the PDF.js Express runtime assets into `dist/pdfjs-express`. Configure `VITE_PDFJS_EXPRESS_LICENSE_KEY` in the frontend environment if required for your deployment; the installed package includes an evaluation license, so verify PDF.js Express licensing before production use.

Signed-in students can load shared notes from `GET /api/notes/shared`, recent uploads from the last three days from `GET /api/notes/recent`, and receive live upload events over the authenticated `GET /api/notes/events` server-sent event stream. Activity items include the uploader's full name and subject. The frontend can display browser notifications after the student grants this site notification permission; those notifications are delivered while the app is open.

Example admin login body:

```json
{
  "username": "your ADMIN_USERNAME value",
  "password": "your ADMIN_PASSWORD value"
}
```

Example registration body:

```json
{
  "rollNumber": "20260042",
  "email": "student@example.com"
}
```

Example login body:

```json
{
  "rollNumber": "20260042",
  "pin": "012345"
}
```

Send the admin token as `Authorization: Bearer <token>` to `/register`. Send the user login token the same way to `/me`. Login and reset endpoints are rate limited.