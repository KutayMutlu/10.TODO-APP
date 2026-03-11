import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['logo.png', 'favicon.ico', 'robots.txt'],
      manifest: {
        name: 'Todo App',
        short_name: 'Todo',
        description: 'Benim Todo Uygulamam',
        theme_color: '#ffffff',
        icons: [
          {
            src: 'logo.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'logo.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },
      workbox: {
        // Çevrimdışı destek için tüm varlıkları kapsayan desen
        globPatterns: ['**/*.{js,css,html,png,svg,mp3}']
      }
    })
  ],
  base: '/'
})