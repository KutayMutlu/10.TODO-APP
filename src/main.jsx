import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
)

// SERVICE WORKER KAYIT KODU (Buraya ekle)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => console.log('SW Kayıt Başarılı:', reg.scope))
      .catch(err => console.error('SW Kayıt Hatası:', err));
  });
}