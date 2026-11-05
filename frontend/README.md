# Frontend (React + Vite + TypeScript)

Pages, matching the Figma wireframes:

| Page | URL | File |
|---|---|---|
| Overview: KPIs, partner table, recent receipts | `/` | `src/pages/Overview.tsx` |
| Partnerships: cards, search, sort | `/partnerships` | `src/pages/Partnerships.tsx` |
| New Partnership form | `/partnerships/new` | `src/pages/NewPartnership.tsx` |
| Partnership detail: commitment, progress, actual vs. pace chart, receipts | `/partnerships/:id` | `src/pages/PartnershipDetail.tsx` |
| Receipts table with partner and date filters | `/receipts` | `src/pages/Receipts.tsx` |
| Add receipt: photo, OCR, review, save | `/receipts/new` | `src/pages/CaptureReceipt.tsx` |

The **Add Receipts** button offers "Upload photo" (picks the photo, then the capture page scans it right away) or "Enter manually" (opens the form directly).

All numbers (progress, status, days left, KPIs) come from the backend. The frontend only formats them.

## Run
Start the backend first (see `../backend/README.md`), then:
```
npm install
npm run dev
```
- On a laptop, open http://localhost:5173.
- On a phone, use the **Network** URL that Vite prints. The phone must be on the same Wi-Fi. Tapping the photo box opens the camera.

The dev server proxies `/api/*` to the backend at `http://localhost:8000`, so no Supabase keys are needed in the frontend.

## Tests
```
npx playwright install chromium   # once
npm run test:e2e
```
Playwright opens a real browser and clicks through every page. The backend is replaced by `e2e/fake-api.ts`, which follows the same contract as `backend/app/schemas` and copies the progress formula from `backend/app/services/progress_service.py`, so the tests run without Supabase or Tesseract. If the backend contract changes, update the fake too.

## Other files
- `src/App.tsx`: page routes and the nav bar.
- `src/dashboard.css`: styles for the dashboard pages. It reuses the colors in `src/index.css`, so dark mode works.
- `src/deals.ts`, `src/format.ts`, `src/useApi.ts`: loading partnerships with progress, number and date formatting, and a small data-loading hook.

## Notes
- `src/api.ts` has the API types, copied from `backend/app/schemas`. The full contract is at http://localhost:8000/docs.
- Sign-in isn't wired up yet. The backend runs with `DEV_NO_AUTH=true` for now.
