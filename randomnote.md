i would probably locally host this with these commands


Terminal 1, backend:
cd "C:\Users\Jane Shin\projects26\dukebaseball\backend"
uv run uvicorn app.main:app --reload --host 0.0.0.0
Wait for Application startup complete. The line above it shows Supabase key in use: secret | DEV_NO_AUTH=True once your .env is filled in.

Terminal 2, frontend:
cd "C:\Users\Jane Shin\projects26\dukebaseball\frontend"
npm run dev
Then open http://localhost:5173. On your phone, use the Network URL it prints, on the same Wi-Fi.

If this is a fresh clone, run npm install in frontend/ once before npm run dev. On another computer, also run uv sync in backend/.
