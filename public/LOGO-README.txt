What To Doodle – Logo boyutları
================================

1) Gösterdiğiniz mor ikonu (bulut, kalem, çizgi) bu klasöre kaydedin:
   Dosya adı: source-logo.png
   Konum: public/source-logo.png

2) Terminalde çalıştırın:
   npm run logos

Bu komut şunları oluşturur:
  - logo-32.png   (favicon / masaüstü)
  - logo-48.png
  - logo-192.png  (ana ekran / PWA)
  - logo-512.png
  - logo.png      (48x48)
  - favicon.ico   (32x32)

Görsel başka bir klasördeyse:
  node scripts/resize-logos.mjs "C:\yol\gorsel.png"
