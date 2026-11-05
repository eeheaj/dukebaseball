# Frontend (React + Vite + TypeScript)

The only page so far is **Add receipt** (`src/pages/CaptureReceipt.tsx`). It takes a photo, the backend runs OCR on it, you review the fields, and the receipt is saved to Supabase.

## Run
Start the backend first (see `../backend/README.md`), then:
```
npm install
npm run dev
```
- On a laptop, open http://localhost:5173.
- On a phone, use the **Network** URL that Vite prints. The phone must be on the same Wi-Fi. Tapping the photo box opens the camera.

The dev server proxies `/api/*` to the backend at `http://localhost:8000`, so no Supabase keys are needed in the frontend.

## Notes
- `src/api.ts` has the API types, copied from `backend/app/schemas`. The full contract is at http://localhost:8000/docs.
- Sign-in isn't wired up yet. The backend runs with `DEV_NO_AUTH=true` for now.
