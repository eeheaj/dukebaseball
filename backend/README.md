# Backend (FastAPI)

## Setup
1. **Tesseract:** install it with the [UB Mannheim Windows installer](https://github.com/UB-Mannheim/tesseract/wiki). If `tesseract` is not on your PATH, set `TESSERACT_CMD=C:\Program Files\Tesseract-OCR\tesseract.exe` in `.env`.
2. **Supabase (hosted):** in the dashboard's SQL Editor, run `supabase/migrations/20261104000000_init.sql` and then `supabase/seed.sql`.
3. **Keys in the root `.env`:** see `../.env.example` for the variable names. The backend reads the root `.env`, then `backend/.env`.
   - Set the project URL, from Settings → API.
   - Set `SUPABASE_SECRET_KEY` or `SUPABASE_SERVICE_ROLE_KEY` (Settings → API Keys → secret). This lets the server save receipts and images.
   - If you only want to use the publishable key, also run `supabase/dev/dev_anon_policies.sql`. It's for local testing only.
   - Set `DEV_NO_AUTH=true` while sign-in isn't built.
4. **Install and run:**
   ```
   uv sync
   uv run uvicorn app.main:app --reload --host 0.0.0.0
   ```
   The startup log shows which key type is in use; it never shows the value.
5. Open http://localhost:8000/docs.

## Receipt flow
1. `POST /api/ocr/receipt` (an image file) runs OCR, stores the photo in the private `receipts` bucket, and returns the fields, the `image_path` and a `suggested_partnership_id`.
2. `POST /api/receipts/validate` returns duplicate and mismatch warnings to show before saving.
3. `POST /api/receipts` saves the receipt row along with its `image_path`.

## Tests
```
uv run pytest
```

## Layout
| Folder | What goes there |
|---|---|
| `app/api/` | Routers (HTTP only). Every route is mounted under `/api`. |
| `app/schemas/` | Pydantic models: the request and response contract with the frontend. |
| `app/services/` | Business logic (OCR parsing, progress/status, validation, exports). No HTTP or DB code. |
| `app/db/` | Supabase queries. |
| `app/deps.py` | Shared FastAPI dependencies (Supabase client, current user). |
| `tests/` | pytest. Put sample receipt images in `tests/fixtures/`. |

## Auth
The frontend signs users in with Supabase Auth and sends `Authorization: Bearer <access_token>` with each request. `deps.get_current_user` validates the token.
