import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['logo.png', 'logo-48.png', 'logo-192.png', 'logo-512.png', 'favicon.ico', 'robots.txt'],
      manifest: {
        name: 'What To Doodle',
        short_name: 'What To Doodle',
        description: 'Benim Todo Uygulamam',
        theme_color: '#6c63ff',
        background_color: '#6c63ff',
        icons: [
          { src: 'logo-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'logo-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,mp3}'],
        // PWA'nın büyük dosyaları da cache'lemesini garanti altına alalım
        maximumFileSizeToCacheInBytes: 3000000
      }
    })
  ],
  base: '/',
  build: {
    target: 'esnext',
    cssCodeSplit: true,
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',

        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('firebase')) return 'vendor-firebase';
            if (id.includes('framer-motion')) return 'vendor-framer';
            return 'vendor';
          }
        }
      }
    }
  }
})