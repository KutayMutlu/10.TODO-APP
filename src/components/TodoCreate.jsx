import React, { useState } from 'react'
import "../App.css";

function TodoCreate({ onCreateTodo, t }) {
    const [newTodo, setNewTodo] = useState('');
    const [isShaking, setIsShaking] = useState(false);

    const clearInput = () => {
        setNewTodo("");
    }

    const createTodo = () => {
        // Eğer input boşsa sallanma animasyonunu tetikle
        if (newTodo.trim() === "") {
            setIsShaking(true);
            // CSS'teki .shake süresiyle (0.25s) uyumlu şekilde sıfırlıyoruz
            setTimeout(() => setIsShaking(false), 250);
            return;
        }

        // App.jsx'teki handleAddTodo fonksiyonuna gönderilecek obje
        const request = {
            id: Math.floor(Math.random() * 9999999999),
            content: newTodo
            // Not: createdAt bilgisi artık App.jsx tarafında ekleniyor.
        }

        onCreateTodo(request);
        clearInput();
    }

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            createTodo();
        }
    }

    return (
        /* isShaking true olduğunda 'shake' class'ı eklenir */
        <div className={`todo-create ${isShaking ? 'shake' : ''}`}>
            <input
                value={newTodo}
                onChange={(e) => setNewTodo(e.target.value)}
                onKeyDown={handleKeyDown}
                className='todo-input'
                type="text"
                placeholder={t.placeholder}
            />
            <button onClick={createTodo} className='todo-create-button'>
                {t.buttonText}
            </button>
        </div>
    )
}

export default TodoCreate;