import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/', // Boş bırakmak, Vite'ın yolları ./assets/ şeklinde üretmesini sağlar
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    emptyOutDir: true, // Her build'de eski dosyaları temizler
  }
})