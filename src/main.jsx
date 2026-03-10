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
    // sw.js dosyasının public klasöründe olduğunu varsayar
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        console.log('SW kayıt başarılı: ', registration.scope);
      })
      .catch(error => {
        console.log('SW kayıt başarısız: ', error);
      });
  });
}