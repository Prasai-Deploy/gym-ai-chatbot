import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [
      react(), 
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate', // Auto-replace old SW on new deploy
        devOptions: {
          enabled: true,
          type: 'module',
        },
        includeAssets: [
          'icon.svg',
          'icons/icon-192x192.png',
          'icons/icon-512x512.png',
          'icons/apple-touch-icon-180x180.png',
        ],
        manifest: {
          name: 'Sweat Fix Gym',
          short_name: 'Sweat Fix',
          description: 'Your premium AI-powered fitness companion',
          theme_color: '#121212',
          background_color: '#121212',
          display: 'standalone',
          orientation: 'portrait',
          start_url: '/',
          scope: '/',
          categories: ['fitness', 'health'],
          icons: [
            {
              src: '/icons/icon-192x192.png',
              sizes: '192x192',
              type: 'image/png',
            },
            {
              src: '/icons/icon-512x512.png',
              sizes: '512x512',
              type: 'image/png',
            },
            {
              src: '/icons/icon-maskable-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'maskable',
            },
            {
              src: '/icons/icon-maskable-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
            {
              src: '/icon.svg',
              sizes: 'any',
              type: 'image/svg+xml',
            },
          ],
        },
        workbox: {
          skipWaiting: true,     // New SW takes over without waiting
          clientsClaim: true,    // New SW claims all open tabs immediately
          // Precache all built assets (JS, CSS, HTML, icons)
          globPatterns: ['**/*.{js,css,html,png,svg,ico,woff,woff2}'],
          // Don't precache source maps
          globIgnores: ['**/*.map'],
          // Clean up old caches from previous SW versions
          cleanupOutdatedCaches: true,
          // Navigations should serve the app shell
          navigateFallback: 'index.html',
          // Only fallback navigation requests (not API calls)
          navigateFallbackDenylist: [/^\/api\//, /^\/auth\//],
          // Runtime caching strategies
          runtimeCaching: [
            // API calls: NetworkFirst with 10s timeout, fall back to cache
            {
              urlPattern: /^\/api\//,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'api-cache',
                networkTimeoutSeconds: 10,
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 60 * 60 * 24, // 24 hours
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            // Google Fonts stylesheets: StaleWhileRevalidate
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'google-fonts-stylesheets',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
                },
              },
            },
            // Google Fonts webfonts: CacheFirst
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-webfonts',
                expiration: {
                  maxEntries: 30,
                  maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            // External images (avatars, etc.): CacheFirst
            {
              urlPattern: /^https:\/\/.*\.(png|jpg|jpeg|svg|gif|webp)$/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'external-images',
                expiration: {
                  maxEntries: 60,
                  maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
          ],
        },
      })
    ],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.SUPABASE_URL': JSON.stringify(env.SUPABASE_URL),
      'process.env.SUPABASE_KEY': JSON.stringify(env.SUPABASE_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      proxy: {
        '/auth': 'http://localhost:5000',
        '/api': 'http://localhost:5000'
      },
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
    build: {
      chunkSizeWarningLimit: 1500, // Adjusted to 1500 kB to dismiss the large chunk warning
    },
  };
});
