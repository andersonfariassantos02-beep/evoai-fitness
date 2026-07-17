import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "VITE_");
  const runtimeEnv = (
    globalThis as typeof globalThis & {
      process?: { env?: Record<string, string | undefined> };
    }
  ).process?.env ?? {};
  const supabaseUrl =
    env.VITE_SUPABASE_URL?.trim() ||
    runtimeEnv.VITE_SUPABASE_URL?.trim() ||
    "";
  const supabasePublishableKey =
    env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    env.VITE_SUPABASE_ANON_KEY?.trim() ||
    runtimeEnv.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    runtimeEnv.VITE_SUPABASE_ANON_KEY?.trim() ||
    "";

  return {
    plugins: [
      {
        name: "evoai-runtime-config",
        transformIndexHtml: {
          order: "pre",
          handler() {
            return [
              {
                tag: "script",
                children: `window.__EVOAI_CONFIG__=${JSON.stringify({
                  supabaseUrl,
                  supabasePublishableKey,
                })}`,
                injectTo: "head-pre",
              },
            ];
          },
        },
      },
      react(),
      VitePWA({
        registerType: "autoUpdate",
        includeAssets: ["icons/evoai-icon.svg"],
        manifest: {
          name: "EvoAI Fitness",
          short_name: "EvoAI",
          description: "Treino série a série, nutrição e evolução física em um só lugar.",
          theme_color: "#071a33",
          background_color: "#f4f7fb",
          display: "standalone",
          orientation: "portrait-primary",
          start_url: "/",
          scope: "/",
          lang: "pt-BR",
          categories: ["fitness", "health", "lifestyle"],
          icons: [
            { src: "/icons/pwa-192x192.png", sizes: "192x192", type: "image/png" },
            { src: "/icons/pwa-512x512.png", sizes: "512x512", type: "image/png" },
            { src: "/icons/maskable-icon-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
          ],
        },
        workbox: {
          navigateFallback: "/index.html",
          globPatterns: ["**/*.{js,css,html,svg,png,ico}"],
        },
      }),
    ],
    server: { host: true, port: 5173 },
  };
});
