import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(({ mode }) => {
  const base = mode === "github-pages" ? "/evoai-fitness/" : "/";

  return {
    base,
    plugins: [
      react(),
      VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["evoai-fitness-logo.png", "apple-touch-icon-180x180.png", "favicon.ico"],
      manifest: {
        name: "EvoAI Fitness",
        short_name: "EvoAI",
        description: "Treino série a série, nutrição e evolução física em um só lugar.",
        theme_color: "#071a33",
        background_color: "#f4f7fb",
        display: "standalone",
        orientation: "portrait-primary",
        start_url: base,
        scope: base,
        lang: "pt-BR",
        categories: ["fitness", "health", "lifestyle"],
        icons: [
          { src: `${base}evoai-fitness-logo.png`, sizes: "1256x1256", type: "image/png", purpose: "any" },
          { src: `${base}pwa-192x192.png`, sizes: "192x192", type: "image/png" },
          { src: `${base}pwa-512x512.png`, sizes: "512x512", type: "image/png" },
          { src: `${base}maskable-icon-512x512.png`, sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        navigateFallback: `${base}index.html`,
        globPatterns: ["**/*.{js,css,html,svg,png,ico}"],
      },
      }),
    ],
    server: { host: true, port: 5173 },
  };
});
