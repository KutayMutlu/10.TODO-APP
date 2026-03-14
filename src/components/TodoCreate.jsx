import React, { useState, useRef, useCallback, useEffect } from 'react';
import DateTimePicker from './DateTimePicker';
import "../App.css";

function TodoCreate({ onCreateTodo, t, lang = 'en', isEditActive = false }) {
    const [newTodo, setNewTodo] = useState('');
    const [deadline, setDeadline] = useState('');
    const [isShaking, setIsShaking] = useState(false);
    const textareaRef = useRef(null);

    const adjustTextareaHeight = useCallback(() => {
        const el = textareaRef.current;
        if (!el) return;
        el.style.height = 'auto';
        const oneLine = 40;
        const maxH = 120;
        const h = Math.max(oneLine, Math.min(el.scrollHeight, maxH));
        el.style.height = h + 'px';
        el.style.overflowY = el.scrollHeight > maxH ? 'auto' : 'hidden';
    }, []);

    useEffect(() => {
        adjustTextareaHeight();
    }, [newTodo, adjustTextareaHeight]);

    const clearInput = () => {
        setNewTodo("");
        setDeadline("");
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
        const request = {
            content: newTodo,
            ...(deadline.trim() && { deadline: deadline.trim() }),
        };

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

    // Enter her zaman yeni satır; gönder sadece butonla (mobilde liste yazarken Enter ile kaydetme olmasın)

    return (
        <div className={`todo-create ${isShaking ? 'shake' : ''} ${isEditActive ? 'todo-create-disabled' : ''}`}>
            <div className="todo-create-row">
                <textarea
                    ref={textareaRef}
                    value={newTodo}
                    onChange={(e) => { setNewTodo(e.target.value); adjustTextareaHeight(); }}
                    className="todo-input todo-input-text todo-input-textarea"
                    placeholder={t.placeholder}
                    disabled={isEditActive}
                    tabIndex={isEditActive ? -1 : 0}
                    rows={1}
                />
                <DateTimePicker
                    value={deadline}
                    onChange={(v) => setDeadline(v || '')}
                    t={t}
                    lang={lang}
                />
            </div>
            <button onClick={createTodo} className="todo-create-button" disabled={isEditActive} tabIndex={isEditActive ? -1 : 0}>
                {t.buttonText}
            </button>
        </div>
    )
}

export default React.memo(TodoCreate);