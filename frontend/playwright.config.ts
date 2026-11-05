import { defineConfig } from "@playwright/test";

// Browser tests for the frontend. The backend is faked in e2e/fake-api.ts (same contract
// as backend/app/schemas), so these run without Supabase or Tesseract.
export default defineConfig({
  testDir: "e2e",
  use: { baseURL: "http://localhost:5317", viewport: { width: 1300, height: 900 } },
  webServer: {
    command: "npx vite --port 5317 --strictPort",
    url: "http://localhost:5317",
    reuseExistingServer: false,
  },
});
