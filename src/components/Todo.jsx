import React, { useState, useEffect, useRef } from 'react'
import { IoIosRemoveCircle } from "react-icons/io";
import { FaEdit, FaCheck } from "react-icons/fa";
import { RiCheckboxLine } from "react-icons/ri";
import { MdDragIndicator, MdSettingsBackupRestore } from "react-icons/md";
import "../App.css"
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';

// 1. KONTROL: 'lang' prop'unu doğrudan alıyoruz ki dil değişince tarih anında tetiklensin
function Todo({ todo, onRemoveTodo, onUpdateTodo, onToggleComplete, t, lang, playSound, isSoundEnabled }) {
    const { id, content, isCompleted, createdAt, isArchived, displayDate } = todo;
    const [editable, setEditable] = useState(false);
    const [newTodo, setNewTodo] = useState(content);
    const [isShaking, setIsShaking] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);

    const inputRef = useRef(null);

    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: id });

    const style = {
        transform: CSS.Translate.toString(transform),
        transition: isDragging ? 'none' : (transition || 'transform 200ms ease'),
        zIndex: isDragging ? 999 : 1,
        opacity: isDragging ? 0.6 : (isArchived ? 0.7 : 1),
        touchAction: 'none',
        willChange: 'transform'
    };

    // 2. KONTROL: Dil değişimine duyarlı Güvenli Formatter
    const formatDate = (dateValue) => {
        if (!dateValue) return "";
        try {
            let d;
            if (dateValue && dateValue.seconds) {
                d = new Date(dateValue.seconds * 1000);
            } else {
                d = new Date(dateValue);
            }

            if (isNaN(d.getTime())) return "";

            const locale = lang === 'tr' ? 'tr-TR' : 'en-US';

            return d.toLocaleString(locale, {
                year: 'numeric',   // 1. KONTROL: Yıl bilgisini ekledik
                day: '2-digit',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
                hour12: lang !== 'tr'
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

    useEffect(() => {
        setNewTodo(content);
    }, [content]);

    const handleUpdate = () => {
        if (newTodo.trim() === "") {
            setIsShaking(true);
            playSound("warn");
            // Toast kullanımı
            toast.warn(t.emptyWarn || "İçerik boş olamaz!");
            setTimeout(() => setIsShaking(false), 250);
            return;
        }

        // Eğer boş değilse güncellemeyi yap
        const updatedTodo = {
            ...todo,
            content: newTodo.trim() // Boşlukları temizleyerek kaydet
        };

        onUpdateTodo(updatedTodo);
        setEditable(false);
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

            <div className="drag-handle" {...attributes} {...listeners}>
                <MdDragIndicator style={{ fontSize: '24px', opacity: isArchived ? 0.3 : 0.6 }} />
            </div>

            <motion.div
                whileTap={{ scale: 0.8 }}
                onClick={(e) => { e.stopPropagation(); onToggleComplete(id); }}
            >
                {isArchived ? (
                    <MdSettingsBackupRestore
                        className='todo-icons icon-restore'
                        style={{ color: '#7d5fff', fontSize: '32px', cursor: 'pointer' }}
                        title={t?.archiveTitle || "Restore"}
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
                            onKeyDown={(e) => e.key === "Enter" && handleUpdate()}
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
                            {/* 5. KONTROL: displayDate yerine her zaman formatDate(createdAt) kullanıyoruz 
                                ki dil değişince bu fonksiyon yeniden hesaplansın */}
                            <span className='date-css'>
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