# Deploying the prototype

- **Frontend**: Netlify, from this GitHub repo (`netlify.toml`).
- **API + OCR**: Render, as a Docker container with Tesseract (`backend/Dockerfile`).
- **Database + photo storage**: the existing Supabase project.

There's no sign-in in the prototype (`DEV_NO_AUTH=true`), so anyone with the site URL can see and add
receipts. Only share the link with people who should have it.

Do Render first. The Netlify build fails on purpose until `VITE_API_URL` is set, and the site
that's already live stays up while it does.

## 1. Render (API)

Pick one of these:

- **Blueprint (quickest)**: render.com → **New → Blueprint** → pick this repo. It reads `render.yaml`
  and only asks for the values below.
- **By hand**: **New → Web Service** → pick this repo, then set:
  - Language: **Docker**
  - Root Directory: `backend`. The Dockerfile path is then `./Dockerfile`.
  - Instance type: Free
  - Health Check Path: `/health`

Environment variables:

| Name | Value |
| --- | --- |
| `SUPABASE_URL` | `https://<project-ref>.supabase.co` |
| `SUPABASE_SECRET_KEY` | Supabase → Settings → API Keys → secret key (only here, never in Netlify) |
| `CORS_ORIGINS` | `https://<your-site>.netlify.app` |
| `DEV_NO_AUTH` | `true` |

When it's live, open `https://<your-api>.onrender.com/api/status`. You want `"tesseract"` to show a
version and `"database": "ok"`.

The free plan sleeps after ~15 minutes idle. The first request after that takes ~30–60 s, and the
app shows "Backend not reachable" with a Retry button meanwhile.

## 2. Netlify (frontend)

**Site configuration → Environment variables**: add `VITE_API_URL` = `https://<your-api>.onrender.com`.

Then **Deploys → Trigger deploy** (or push to `main`). Build settings come from `netlify.toml`.

## 3. Check it

Open the Netlify URL. On your phone: Add Receipts → Take photo → the form fills in → Save. Then check
the photo's **View** link on the Receipts page.

## Before going beyond a prototype

Add sign-in (Supabase Auth). The backend already checks sign-in tokens once `DEV_NO_AUTH` is off; only
the frontend login is missing.
