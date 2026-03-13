import React, { useState } from 'react'
import "../App.css";

function TodoCreate({ onCreateTodo, t }) {
    const [newTodo, setNewTodo] = useState('');
    const [isShaking, setIsShaking] = useState(false);

    const clearInput = () => {
        setNewTodo("");
    }

    const createTodo = async () => {
        // 1. KONTROL: Boş içerik denetimi ve görsel geri bildirim
        if (newTodo.trim() === "") {
            setIsShaking(true);
            // App.jsx'teki handleAddTodo'yu tetikle, uyarıyı ve sesi orası yönetsin
            onCreateTodo({ content: "" });
            setTimeout(() => setIsShaking(false), 250);
            return;
        }

        // 2. KONTROL: Veri objesinin temizliği
        // Not: 'id' ve 'createdAt' artık Firebase (App.jsx) tarafından atanıyor. 
        // Manuel ID üretmek Firebase'in otomatik ID özelliğiyle çakışabilir.
        const request = {
            content: newTodo
        }

        try {
            // 3. KONTROL: Ekleme işlemini asenkron bekliyoruz
            await onCreateTodo(request);
            // 4. KONTROL: Sadece başarı durumunda inputu temizle
            clearInput();
        } catch (error) {
            // Hata durumunda input silinmez, kullanıcı tekrar deneyebilir
            console.error("Görev eklenirken hata oluştu:", error);
        }
    }

    const handleKeyDown = (e) => {
        // 5. KONTROL: Enter tuşuyla hızlı ekleme
        if (e.key === 'Enter') {
            createTodo();
        }
    }

    return (
        /* 6. KONTROL: Dinamik sınıf atamasıyla sallanma efekti */
        <div className={`todo-create ${isShaking ? 'shake' : ''}`}>
            <input
                value={newTodo}
                onChange={(e) => setNewTodo(e.target.value)}
                onKeyDown={handleKeyDown}
                className='todo-input'
                type="text"
                placeholder={t.placeholder}
            />
            {/* 7. KONTROL: Buton metni dil desteğine (t) tam uyumlu */}
            <button onClick={createTodo} className='todo-create-button'>
                {t.buttonText}
            </button>
        </div>
    )
}

export default React.memo(TodoCreate);