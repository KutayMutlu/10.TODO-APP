import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

import { cloudflare } from "@cloudflare/vite-plugin";

export default defineConfig({
  plugins: [react(), cloudflare()],
  base: '', // Boş bırakmak, Vite'ın yolları ./assets/ şeklinde üretmesini sağlar
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    emptyOutDir: true, // Her build'de eski dosyaları temizler
  }
})