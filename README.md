# TODO App

## Uygulama Nedir? (Türkçe)

Bu proje, **yapılacaklar listesi** (todo list) tutmak için kullanılan bir web uygulamasıdır. Günlük görevleri tek yerde toplamanıza, tamamladıklarınızı işaretlemenize, tamamlananları arşive almanıza ve gerektiğinde silmenize olanak tanır. Veriler Firebase üzerinde saklanır; giriş yaptığınız sürece listeleriniz cihazlar arasında senkron kalır. Ayrıca PWA desteği sayesinde telefona veya masaüstüne "uygulama gibi" eklenip çevrimdışı kullanılabilir.

### Neler Yapılabilir?

- **Görev ekleme** — Yeni yapılacak madde yazıp listeye ekleyebilirsiniz.
- **Düzenleme** — Görev metnini ve son teslim tarihini değiştirebilirsiniz.
- **Tamamlama** — Görevi tamamlandı olarak işaretleyebilirsiniz; tamamlanma tarihi kaydedilir.
- **Arşivleme** — Tamamlanan görevleri arşive taşıyabilir, arşivden geri getirebilir veya arşivdeyken silebilirsiniz.
- **Silme** — Görevi kalıcı olarak silebilirsiniz (mobilde kaydırma ile, masaüstünde düzenleme ekranından veya arşivde çöp kutusu ikonundan).
- **Sıralama** — Görevleri sürükle-bırak ile yeniden sıralayabilirsiniz.
- **Filtreleme** — Tüm, aktif veya tamamlanan görevlere göre liste görüntüleyebilir; arşiv görünümüne geçebilirsiniz.
- **Çoklu dil** — Arayüz Türkçe, İngilizce, Fransızca ve Arnavutça destekler.
- **Tema** — Açık/koyu tema seçeneği vardır.

### Ne İşe Yarar?

Günlük işleri, proje adımlarını veya alışveriş listesini tek bir yerde toplamak, tamamladıkça işaretleyip arşive almak ve böylece hem unutmamak hem de listeyi sade tutmak için kullanılır. Hesap açıp giriş yaparak verilerinizi güvende ve cihazlar arasında senkron tutabilirsiniz.

---

## What Is This App? (English)

This project is a **todo list** web application. It lets you keep your daily tasks in one place: add new items, mark them complete, move completed ones to archive, and delete when needed. Data is stored in Firebase, so your lists stay in sync across devices as long as you're signed in. With PWA support, you can install it on your phone or desktop and use it like an app, including offline.

### What Can You Do?

- **Add tasks** — Create new todo items and add them to the list.
- **Edit** — Change the task text and deadline.
- **Complete** — Mark tasks as done; completion date is saved.
- **Archive** — Move completed tasks to archive, restore from archive, or delete from archive.
- **Delete** — Permanently remove a task (swipe on mobile, from the edit screen on desktop, or via trash icon in archive).
- **Reorder** — Drag and drop to reorder tasks.
- **Filter** — View all, active, or completed tasks, and switch to archive view.
- **Languages** — Interface in Turkish, English, French, and Albanian.
- **Theme** — Light/dark mode.

### What Is It For?

It helps you collect daily tasks, project steps, or shopping lists in one place, mark them as done, and archive them so you don't forget and keep the list tidy. Sign in to keep your data saved and synced across devices.

---

## Tech stack

- **React 19** + **Vite 7**
- **Firebase** (Firestore)
- **@dnd-kit** (sortable lists)
- **Framer Motion**, **react-datepicker**, **date-fns**
- **react-toastify**, **react-icons**
- **vite-plugin-pwa** (PWA)

## Scripts

| Command   | Description        |
| --------- | ------------------ |
| `npm run dev`     | Start dev server   |
| `npm run build`   | Production build   |
| `npm run preview` | Preview production build |
| `npm run logos`   | Resize logo assets |

## Expanding the ESLint configuration

For production apps, consider enabling TypeScript and type-aware lint rules. See the [Vite TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) and [typescript-eslint](https://typescript-eslint.io) docs.
