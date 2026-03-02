import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "apple-touch-icon.png", "pwa-192x192.png", "pwa-512x512.png"],
      workbox: {
        navigateFallbackDenylist: [/^\/~oauth/],
        globPatterns: ["**/*.{js,css,html,ico,svg,woff2}"],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5 MB
        runtimeCaching: [
          {
            // Supabase API — NEVER cache
            urlPattern: /supabase\.co/,
            handler: "NetworkOnly",
          },
          {
            // Also catch /rest/v1 and /auth/v1 paths
            urlPattern: /\/(rest|auth|realtime)\/v1\//,
            handler: "NetworkOnly",
          },
          {
            // PNG images — cache with revalidation
            urlPattern: /\.png$/,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "images",
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 * 7 },
            },
          },
        ],
      },
      manifest: {
        name: "Goaltje - WK 2026 Poules",
        short_name: "Goaltje",
        description: "Maak poules, voorspel wedstrijden en daag je vrienden uit voor het WK 2026!",
        theme_color: "#0a1628",
        background_color: "#0a1628",
        display: "standalone",
        orientation: "portrait",
        scope: "/",
        start_url: "/app",
        icons: [
          {
            src: "/pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    target: "es2020",
    cssMinify: true,
    minify: "esbuild",
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom", "react-router-dom"],
          query: ["@tanstack/react-query"],
          motion: ["framer-motion"],
          supabase: ["@supabase/supabase-js"],
          ui: [
            "@radix-ui/react-tabs",
            "@radix-ui/react-dialog",
            "@radix-ui/react-popover",
            "@radix-ui/react-tooltip",
            "@radix-ui/react-collapsible",
          ],
          charts: ["recharts"],
          vercel: ["@vercel/analytics", "@vercel/speed-insights"],
        },
      },
    },
  },
}));
