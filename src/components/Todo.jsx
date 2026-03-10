import React, { useState, useEffect, useRef } from 'react'
import { IoIosRemoveCircle } from "react-icons/io";
import { FaEdit, FaCheck } from "react-icons/fa";
import { RiCheckboxLine } from "react-icons/ri";
import { MdDragIndicator, MdSettingsBackupRestore } from "react-icons/md"; // Geri yükleme ikonu eklendi
import "../App.css"
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion } from 'framer-motion';

function Todo({ todo, onRemoveTodo, onUpdateTodo, onToggleComplete, t }) {
    // 1. KONTROL: isArchived prop'u yıkıma (destructuring) eklendi
    const { id, content, isCompleted, createdAt, isArchived } = todo;
    const [editable, setEditable] = useState(false);
    const [newTodo, setNewTodo] = useState(content);
    const [isShaking, setIsShaking] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);

    const inputRef = useRef(null);

    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: id });

    const style = {
        transform: CSS.Translate.toString(transform),
        transition: isDragging ? 'none' : transition,
        opacity: isDragging ? 0.4 : (isArchived ? 0.7 : 1), // Arşivdekiler biraz daha saydam
        zIndex: isDragging ? 999 : 1,
        touchAction: 'none',
        pointerEvents: isDragging ? 'none' : 'auto'
    };

    const formatDate = (timestamp) => {
        if (!timestamp) return "";
        try {
            const currentLang = t?.buttonText === "HEDEF EKLE" ? 'tr-TR' : 'en-US';
            return new Date(timestamp).toLocaleString(currentLang, {
                day: '2-digit',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (error) {
            return "";
        }
    };

    useEffect(() => {
        if (editable && inputRef.current) {
            inputRef.current.focus();
            const length = inputRef.current.value.length;
            inputRef.current.setSelectionRange(length, length);
        }
    }, [editable]);

    const handleUpdate = () => {
        // İçerik boş olsa bile App.jsx'e gönderiyoruz ki uyarı mekanizması çalışsın
        const updatedTodo = {
            ...todo,
            content: newTodo // State'teki yeni (veya boş) içerik
        };

        onUpdateTodo(updatedTodo);

        // Eğer içerik boş değilse düzenleme modundan çık
        if (newTodo.trim() !== "") {
            setEditable(false);
        } else {
            setIsShaking(true);
            setTimeout(() => setIsShaking(false), 250);
        }
    }

    const handleRemoveRequest = (e) => {
        e.stopPropagation();
        setIsShaking(true);
        setTimeout(() => {
            setIsShaking(false);
            onRemoveTodo(id);
        }, 250);
    }

    return (
        <div ref={setNodeRef} style={style} className={`todo-row-container ${isShaking ? 'shake' : ''}`}>

            {/* Arşivdeyken sürükle-bırak genellikle kapalı olur ama tutarlılık için ikonu koruyoruz */}
            <div className="drag-handle" {...attributes} {...listeners}>
                <MdDragIndicator style={{ fontSize: '24px', opacity: isArchived ? 0.3 : 0.6 }} />
            </div>

            <motion.div
                whileTap={{ scale: 0.8 }}
                onClick={(e) => { e.stopPropagation(); onToggleComplete(id); }}
            >
                {/* 3. KONTROL: Arşivdeyse 'Geri Yükle', değilse 'Tamamla' ikonu gösterilir */}
                {isArchived ? (
                    <MdSettingsBackupRestore
                        className='todo-icons icon-restore'
                        style={{ color: '#7d5fff', fontSize: '32px', cursor: 'pointer' }}
                        title={t?.archiveTitle || "Geri Yükle"}
                    />
                ) : (
                    <RiCheckboxLine
                        className='todo-icons icon-check'
                        style={{
                            color: isCompleted ? '#2ecc71' : 'var(--icon-default)',
                            fontSize: '32px',
                            cursor: 'pointer'
                        }}
                    />
                )}
            </motion.div>

            <div className={`todo-lists ${isExpanded ? 'expanded' : ''} ${isArchived ? 'archived-item' : ''}`}
                onClick={() => !editable && !isArchived && setIsExpanded(!isExpanded)}>

                <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                    {editable ? (
                        <input
                            ref={inputRef}
                            className='todo-input edit-mode-input'
                            value={newTodo}
                            onChange={(e) => setNewTodo(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleUpdate(e)}
                            onClick={(e) => e.stopPropagation()}
                            style={{ width: "100%", fontSize: "15px", background: "transparent", borderBottom: '1px solid var(--primary-color)' }}
                        />
                    ) : (
                        <>
                            <span
                                className={`todo-text-content ${isExpanded ? 'full-text' : 'truncated-text'}`}
                                style={{
                                    textDecoration: (isCompleted || isArchived) ? 'line-through' : 'none',
                                    opacity: (isCompleted || isArchived) ? 0.6 : 1,
                                    transition: 'all 0.3s ease'
                                }}
                            >
                                {content}
                            </span>
                            <span style={{ fontSize: '10px', opacity: 0.4, marginTop: '4px', fontWeight: '300' }}>
                                {formatDate(createdAt)}
                            </span>
                        </>
                    )}
                </div>

                <div className="todo-icons-container" onClick={(e) => e.stopPropagation()}>
                    <motion.div whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.9 }}>
                        <IoIosRemoveCircle
                            className='todo-icons icon-remove'
                            onClick={handleRemoveRequest}
                            style={{ fontSize: '30px' }}
                        />
                    </motion.div>

                    {/* Arşivdeki elemanlar düzenlenemez, önce geri yüklenmelidir */}
                    {!isArchived && (
                        editable ? (
                            <motion.div whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.9 }}>
                                <FaCheck className='todo-icons icon-save' onClick={handleUpdate} style={{ color: '#2ecc71', fontSize: '30px' }} />
                            </motion.div>
                        ) : (
                            <motion.div whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.9 }}>
                                <FaEdit className='todo-icons icon-edit' onClick={() => setEditable(true)} style={{ fontSize: '30px' }} />
                            </motion.div>
                        )
                    )}
                </div>
            </div>
        </div>
    )
}

export default Todo;