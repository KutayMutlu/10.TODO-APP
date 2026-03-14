/**
 * Kaynak logoyu tüm gerekli boyutlara resize eder.
 * Kullanım: npm run logos  (görsel public/source-logo.png olmalı)
 * veya: node scripts/resize-logos.mjs <görsel-yolu>
 */
import sharp from 'sharp';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, '..', 'public');
const defaultSrc = path.join(publicDir, 'source-logo.png');
const srcPath = process.argv[2] ? path.resolve(process.argv[2]) : defaultSrc;

if (!existsSync(srcPath)) {
  console.error('Hata: Kaynak görsel bulunamadı.');
  console.error('  - Görseli public/source-logo.png olarak kaydedip "npm run logos" çalıştırın.');
  console.error('  - veya: node scripts/resize-logos.mjs <görsel-yolu>');
  process.exit(1);
}

const sizes = [32, 48, 192, 512];

console.log('Logolar yeniden boyutlandırılıyor...');
for (const size of sizes) {
  await sharp(srcPath).resize(size, size).png().toFile(path.join(publicDir, `logo-${size}.png`));
  console.log(`  logo-${size}.png (${size}x${size})`);
}

await sharp(srcPath).resize(48, 48).png().toFile(path.join(publicDir, 'logo.png'));
console.log('  logo.png (48x48)');

await sharp(srcPath).resize(32, 32).png().toFile(path.join(publicDir, 'favicon.ico'));
console.log('  favicon.ico (32x32)');

console.log('Tamamlandı.');
process.exit(0);
