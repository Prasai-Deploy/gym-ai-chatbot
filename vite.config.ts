import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: [
          'icon.svg',
          'icons/icon-192x192.png',
          'icons/icon-512x512.png',
          'icons/icon-maskable-192x192.png',
          'icons/icon-maskable-512x512.png',
          'icons/apple-touch-icon-180x180.png',
        ],
        manifest: {
          id: '/',
          name: 'STRIVA Fitness',
          short_name: 'STRIVA',
          description: 'Workouts, nutrition, progress, and coaching in one focused fitness app.',
          start_url: '/',
          scope: '/',
          display: 'standalone',
          orientation: 'portrait-primary',
          background_color: '#0d1018',
          theme_color: '#0d1018',
          icons: [
            { src: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
            { src: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
            { src: '/icons/icon-maskable-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
            { src: '/icons/icon-maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
        },
        workbox: {
          cleanupOutdatedCaches: true,
          clientsClaim: true,
          skipWaiting: true,
          navigateFallback: '/index.html',
          navigateFallbackDenylist: [/^\/api\//, /^\/auth\/google/],
          runtimeCaching: [
            {
              urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
              handler: 'NetworkOnly',
            },
            {
              urlPattern: /^https:\/\/[^/]+\.supabase\.co\//,
              handler: 'NetworkOnly',
            },
            {
              urlPattern: ({ request }) => request.destination === 'image',
              handler: 'CacheFirst',
              options: {
                cacheName: 'striva-images',
                expiration: { maxEntries: 48, maxAgeSeconds: 60 * 60 * 24 * 30 },
              },
            },
          ],
        },
      }),
    ],
    base: '/',

    // NOTE: the `define` block that used to live here injected
    // `process.env.SUPABASE_KEY` into client code. Combined with an
    // .env.example that labelled that variable
    // "YOUR_SUPABASE_ANON_OR_SERVICE_ROLE_KEY", it was one copy-paste away
    // from shipping full database admin rights in public JavaScript.
    //
    // Vite already exposes anything prefixed VITE_ via import.meta.env, which
    // makes the public/private boundary visible in the variable name itself.
    // Use that instead. Nothing needs to be added back here.

    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      proxy: {
        '/api/v1': 'http://localhost:5000',
        '/api': 'http://localhost:5000',
      },
      hmr: process.env.DISABLE_HMR !== 'true',
    },
    build: {
      target: 'es2022',
      chunkSizeWarningLimit: 1500,
    },
    esbuild: {
      target: 'es2022',
    },
    optimizeDeps: {
      esbuildOptions: {
        target: 'es2022',
      },
    },
  };
});
