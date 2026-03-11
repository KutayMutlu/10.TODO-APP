import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
)

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js?v=17')
      .then(registration => {
        console.log('SW Kayıtlı');

        // Periyodik güncelleme kontrolü (Safari'yi uyanık tutar)
        setInterval(() => {
          registration.update();
        }, 1000 * 60 * 60); // Saatte bir kontrol
      })
      .catch(err => console.log('SW Hatası:', err));
  });
}