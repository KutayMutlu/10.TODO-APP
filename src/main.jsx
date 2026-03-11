import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
)

// Buradaki tüm if ('serviceWorker' in navigator) bloklarını sildik.
// Eklenti build sırasında kendi kayıt kodunu otomatik olarak ekleyecek.