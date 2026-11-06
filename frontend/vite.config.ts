import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

declare const process: { env: Record<string, string | undefined> }; // Node, at build time

export default defineConfig(({ mode }) => {
  // On Netlify the API lives on another host (Render). Fail the build loudly instead of shipping a site that can't load data.
  if (mode === "production" && process.env.NETLIFY && !process.env.VITE_API_URL) {
    throw new Error("Set VITE_API_URL in Netlify (Site configuration -> Environment variables), e.g. https://dukebaseball-api.onrender.com");
  }
  return {
    plugins: [react()],
    server: {
      host: true, // reachable from a phone on the same Wi-Fi
      proxy: { "/api": "http://localhost:8000" },
    },
  };
});
