import React, { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { FaEdit, FaTrash } from "react-icons/fa";
import { MdDragIndicator, MdSettingsBackupRestore } from "react-icons/md";
import { HiOutlineChevronDown } from "react-icons/hi2";
import "../App.css"
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
/* eslint-disable-next-line no-unused-vars -- motion used in JSX */
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import { formatTodoDate, formatDeadlineDate, deadlineToInputValue } from '../utils/date';
import DateTimePicker from './DateTimePicker';

// 1. KONTROL: 'lang' prop'unu doğrudan alıyoruz ki dil değişince tarih anında tetiklensin
function Todo({
  todo,
  onRemoveTodo,
  onUpdateTodo,
  onToggleComplete,
  t,
  lang,
  playSound,
  selectionMode,
  isSelected,
  onToggleSelect,
  isEditing = false,
  editingTodoId = null,
  onEditStart,
  onEditEnd = () => {},
  onActionsOpenChange,
}) {
    const { id, content, isCompleted, createdAt, isArchived, deadline, completedAt } = todo;
    const editable = isEditing;
    const [newTodo, setNewTodo] = useState(content);
    const [editDeadline, setEditDeadline] = useState(() => deadlineToInputValue(deadline));
    const [isShaking, setIsShaking] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [actionsOpen, setActionsOpen] = useState(false);
    const [swipeOffset, setSwipeOffset] = useState(0);
    const [longPressFeedback, setLongPressFeedback] = useState(false);

    const SWIPE_ACTION_WIDTH = 72;
    const touchStartRef = useRef({ x: 0, y: 0, offset: 0, t: 0, holdTimerId: null });

    const inputRef = useRef(null);
    const actionsRef = useRef(null);
    const rowRef = useRef(null);
    const swipeContentWrapRef = useRef(null);
    const swipeContentRef = useRef(null);

    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: id });

    const setRowRef = (el) => {
        rowRef.current = el;
        setNodeRef(el);
    };

    const style = {
        transform: CSS.Translate.toString(transform),
        transition: isDragging ? 'none' : (transition || 'transform 200ms ease'),
        zIndex: isDragging ? 999 : (actionsOpen ? 1000 : 1),
        opacity: isDragging ? 0.6 : (isArchived ? 0.7 : 1),
        willChange: 'transform'
    };

    const adjustEditTextareaHeight = useCallback(() => {
        const el = inputRef.current;
        if (!el) return;
        el.style.height = 'auto';
        const oneLine = 40;
        const maxH = 120;
        const h = Math.max(oneLine, Math.min(el.scrollHeight, maxH));
        el.style.height = h + 'px';
        el.style.overflowY = el.scrollHeight > maxH ? 'auto' : 'hidden';
    }, []);

    const handlePickerClose = useCallback(() => setActionsOpen(false), []);
    /* Create ile aynı: DateTimePicker sadece Onayla (ve Tarih yok) ile onChange çağırır; ara seçimler editDeadline'ı güncellemez. */
    const handleEditDeadlineChange = useCallback((v) => setEditDeadline(v || ''), []);

    useEffect(() => {
        if (editable && inputRef.current) {
            inputRef.current.focus();
            const length = inputRef.current.value.length;
            inputRef.current.setSelectionRange(length, length);
            adjustEditTextareaHeight();
        }
    }, [editable, adjustEditTextareaHeight]);

    useEffect(() => {
        setNewTodo(content);
    }, [content]);

    useEffect(() => {
        if (editable) adjustEditTextareaHeight();
    }, [newTodo, editable, adjustEditTextareaHeight]);

    useEffect(() => {
        setEditDeadline(deadlineToInputValue(deadline));
    }, [deadline]);

    useEffect(() => {
        onActionsOpenChange?.(actionsOpen);
    }, [actionsOpen, onActionsOpenChange]);

    useEffect(() => {
        if (!editable) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        document.body.classList.add('todo-edit-overlay-open');
        return () => {
            document.body.style.overflow = prev;
            document.body.classList.remove('todo-edit-overlay-open');
        };
    }, [editable]);

    useEffect(() => {
        if (!editable) {
            setNewTodo(content);
            setEditDeadline(deadlineToInputValue(deadline));
        }
    }, [editable, content, deadline]);

    const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth <= 768);
    useEffect(() => {
        const mq = window.matchMedia('(max-width: 768px)');
        const fn = () => setIsMobile(mq.matches);
        mq.addListener(fn);
        return () => mq.removeListener(fn);
    }, []);

    useEffect(() => {
        const wrap = swipeContentWrapRef.current;
        if (!wrap) return;
        const onMove = (e) => {
            if (editable) return;
            const touch = e.touches && e.touches[0];
            if (!touch) return;
            const ref = touchStartRef.current;
            const elapsed = Date.now() - (ref.t || 0);
            /* Uzun basıldıktan sonra (350ms+) sayfa kaymasın, sürükleme alsın */
            if (elapsed > 350) {
                e.preventDefault();
                return;
            }
            const { x, y, offset } = ref;
            const deltaX = touch.clientX - x;
            const deltaY = touch.clientY - y;
            if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 8) {
                e.preventDefault();
                if (ref.holdTimerId) {
                    clearTimeout(ref.holdTimerId);
                    ref.holdTimerId = null;
                }
            }
            const next = Math.max(-SWIPE_ACTION_WIDTH, Math.min(0, offset + deltaX));
            setSwipeOffset(next);
        };
        wrap.addEventListener('touchmove', onMove, { passive: false, capture: true });
        return () => wrap.removeEventListener('touchmove', onMove, { capture: true });
    }, [editable]);

    useEffect(() => {
        if (!actionsOpen) return;
        const handleClickOutside = (e) => {
            if (!actionsRef.current) return;
            if (actionsRef.current.contains(e.target)) return;
            // Tarih seçici portalı (body'de açılan popover) veya tetikleyici alanına tıklanıyorsa menüyü kapatma;
            // mobilde sentetik mousedown yanlış target verebiliyor, portal tıklaması da actionsRef dışında kalıyor.
            if (e.target.closest?.('.date-time-picker-popover-portal') || e.target.closest?.('.date-time-picker-wrap')) return;
            setActionsOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('touchstart', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('touchstart', handleClickOutside);
        };
    }, [actionsOpen]);


    const handleUpdate = () => {
        if (newTodo.trim() === "") {
            setIsShaking(true);
            playSound("warn");
            // Toast kullanımı
            toast.warn(t.emptyWarn || "İçerik boş olamaz!");
            setTimeout(() => setIsShaking(false), 250);
            return;
        }

        const updatedTodo = {
            ...todo,
            content: newTodo.trim(),
            deadline: editDeadline.trim() || null,
        };

        playSound("add");
        onUpdateTodo(updatedTodo);
        onEditEnd();
    }

    const handleRemoveRequest = () => {
        setActionsOpen(false);
        setSwipeOffset(0);
        onEditEnd();
        setIsShaking(true);
        setTimeout(() => {
            setIsShaking(false);
            onRemoveTodo(id);
        }, 250);
    }

    const handleSwipeStart = (e) => {
        if (editable) return;
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        const ref = touchStartRef.current;
        if (ref.holdTimerId) {
            clearTimeout(ref.holdTimerId);
            ref.holdTimerId = null;
        }
        ref.x = clientX;
        ref.y = clientY;
        ref.offset = swipeOffset;
        ref.t = Date.now();
        if (isMobile) {
            ref.holdTimerId = setTimeout(() => {
                setLongPressFeedback(true);
                ref.holdTimerId = null;
                if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(50);
            }, 350);
        }
    };

    const handleSwipeMove = (e) => {
        if (editable) return;
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const { x, offset } = touchStartRef.current;
        const next = Math.max(-SWIPE_ACTION_WIDTH, Math.min(0, offset + (clientX - x)));
        setSwipeOffset(next);
    };

    const handleSwipeEnd = () => {
        if (editable) return;
        const ref = touchStartRef.current;
        if (ref.holdTimerId) {
            clearTimeout(ref.holdTimerId);
            ref.holdTimerId = null;
        }
        setLongPressFeedback(false);
        setSwipeOffset((prev) => (prev < -SWIPE_ACTION_WIDTH / 2 ? -SWIPE_ACTION_WIDTH : 0));
    };

    const handleMouseDown = (e) => {
        if (window.innerWidth > 768 || editable) return;
        if (e.button !== 0) return;
        handleSwipeStart(e);
        const onMouseMove = (e2) => handleSwipeMove(e2);
        const onMouseUp = () => {
            handleSwipeEnd();
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    };

    const handleSwipeContentClick = (e) => {
        if (swipeOffset < 0) {
            setSwipeOffset(0);
            e.stopPropagation();
        }
    };

    const handleSwipeDeleteTap = () => {
        if (window.confirm(t.deleteConfirm)) handleRemoveRequest();
    };

    const editFormContent = (
        <>
            <div className={`todo-edit-row ${actionsOpen ? 'todo-edit-row-menu-open' : ''}`}>
                <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
                    <textarea
                        ref={inputRef}
                        className="todo-input edit-mode-input todo-input-textarea"
                        value={newTodo}
                        onChange={(e) => { setNewTodo(e.target.value); adjustEditTextareaHeight(); }}
                        onKeyDown={(e) => e.stopPropagation()}
                        onClick={(e) => e.stopPropagation()}
                        rows={1}
                        style={{ width: '100%', fontSize: '15px', background: 'transparent', borderBottom: '1px solid var(--primary-color)' }}
                    />
                </div>
                <div className="todo-icons-container" onClick={(e) => e.stopPropagation()}>
                    <div className="todo-edit-actions-wrap" ref={actionsRef}>
                        <button type="button" className="todo-edit-actions-trigger" onClick={() => setActionsOpen((v) => !v)} aria-expanded={actionsOpen} aria-haspopup="true">
                            <span>{t.editActionsLabel}</span>
                            <HiOutlineChevronDown className={`todo-edit-actions-chevron ${actionsOpen ? 'open' : ''}`} />
                        </button>
                        {actionsOpen && (
                            <div className="todo-edit-actions-menu" onClick={(e) => e.stopPropagation()}>
                                <div className="todo-edit-actions-deadline todo-edit-deadline">
                                    <DateTimePicker value={editDeadline} onChange={handleEditDeadlineChange} t={t} lang={lang} usePortal onClose={handlePickerClose} />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            <div className="todo-edit-actions-row">
                <button type="button" className="todo-edit-btn-delete" onClick={() => window.confirm(t.deleteConfirm) && handleRemoveRequest()}>{t.deleteTask}</button>
                <button type="button" className="todo-edit-btn-save" onClick={handleUpdate}>{t.saveTask}</button>
            </div>
            <div className="todo-edit-cancel-row">
                <button type="button" className="todo-edit-btn-cancel" onClick={onEditEnd}>{t.cancelEdit}</button>
            </div>
        </>
    );

    return (
        <>
            {editable && createPortal(
                <div className="todo-edit-overlay" aria-modal="true" role="dialog">
                    <div className="todo-edit-overlay-backdrop" aria-hidden />
                    <div className="todo-edit-overlay-card" onClick={(e) => e.stopPropagation()}>
                        <div className="todo-lists editable">{editFormContent}</div>
                    </div>
                </div>,
                document.body
            )}
            <div ref={setRowRef} style={style} className={`todo-row-container ${isShaking ? 'shake' : ''} ${actionsOpen ? 'dropdown-open' : ''} ${longPressFeedback ? 'long-press-hold' : ''} ${editable ? 'todo-row-container-placeholder' : ''}`}>

                {editable ? (
                    <div className="todo-edit-placeholder" aria-hidden />
                ) : (
                    <>
            {selectionMode && !isArchived && (
                <div
                    className="todo-select-checkbox"
                    onClick={(e) => {
                        e.stopPropagation();
                        onToggleSelect && onToggleSelect(id);
                    }}
                >
                    <input
                        type="checkbox"
                        checked={!!isSelected}
                        readOnly
                    />
                </div>
            )}

            <div
                className="drag-handle"
                style={{ touchAction: 'none', cursor: 'grab' }}
                {...(!isMobile ? { ...attributes, ...listeners } : {})}
            >
                <MdDragIndicator style={{ fontSize: '24px', opacity: isArchived ? 0.3 : 0.6 }} />
            </div>

            {!(selectionMode && !isArchived) && (
            <motion.div
                className="todo-check-wrap"
                whileTap={{ scale: 0.9 }}
                onClick={(e) => { e.stopPropagation(); onToggleComplete(id); }}
            >
                {isArchived ? (
                    <MdSettingsBackupRestore
                        className='todo-icons icon-restore'
                        style={{ color: '#7d5fff', fontSize: '32px', cursor: 'pointer' }}
                        title={t?.archiveTitle}
                    />
                ) : (
                    <span className={`todo-check-minimal ${isCompleted ? 'completed' : ''}`} aria-label={isCompleted ? t?.completed : t?.active}>
                        {isCompleted && <span className="todo-check-minimal-tick">✓</span>}
                    </span>
                )}
            </motion.div>
            )}

            <div className={`todo-swipe-wrapper ${swipeOffset < 0 ? 'swipe-open' : ''}`}>
                <div className="todo-swipe-actions" aria-hidden={swipeOffset >= 0}>
                    <button type="button" className="todo-swipe-delete-btn" onClick={handleSwipeDeleteTap}>
                        {t.deleteTask}
                    </button>
                </div>
                <div
                    ref={swipeContentWrapRef}
                    className="todo-swipe-content-wrap"
                    onTouchStartCapture={handleSwipeStart}
                    onTouchEnd={handleSwipeEnd}
                    onMouseDown={handleMouseDown}
                    onClick={handleSwipeContentClick}
                >
                <div
                    ref={swipeContentRef}
                    className={`todo-swipe-content ${longPressFeedback ? 'long-press-hold' : ''}`}
                    style={{ transform: `translateX(${swipeOffset}px)${longPressFeedback ? ' scale(1.02)' : ''}`, ...(isMobile ? { touchAction: longPressFeedback ? 'none' : 'pan-y' } : {}) }}
                    {...(isMobile ? { ...attributes, ...listeners } : {})}
                >
                    <div className={`todo-lists ${isExpanded ? 'expanded' : ''} ${isArchived ? 'archived-item' : ''} ${(isCompleted || isArchived) ? 'is-completed' : ''}`}
                        onClick={() => !isArchived && setIsExpanded(!isExpanded)}>
                        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                            <span
                                className={`todo-text-content ${isExpanded ? 'full-text' : 'truncated-text'}`}
                                style={{
                                    textDecoration: 'none',
                                    opacity: (isCompleted || isArchived) ? 0.6 : 1,
                                    transition: 'all 0.3s ease'
                                }}
                            >
                                {content}
                            </span>
                            <span className="date-css">{formatTodoDate(createdAt, lang)}</span>
                            {isExpanded && deadline && (
                                <span className="deadline-css">{t.deadline}: {formatDeadlineDate(deadline, lang)}</span>
                            )}
                            {isExpanded && isCompleted && completedAt && (
                                <span className="deadline-css">{t.completedAt}: {formatDeadlineDate(completedAt, lang)}</span>
                            )}
                        </div>
                        <div className="todo-icons-container" onClick={(e) => e.stopPropagation()}>
                            {isArchived ? (
                                <motion.div whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.9 }} title={t.deleteTask}>
                                    <FaTrash className="todo-icons icon-remove" onClick={() => window.confirm(t.deleteConfirm) && handleRemoveRequest()} style={{ fontSize: '22px' }} />
                                </motion.div>
                            ) : (
                                <motion.div whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.9 }}>
                                    <FaEdit className="todo-icons icon-edit" onClick={() => { if (editingTodoId != null && editingTodoId !== id) return; onEditStart?.(id); }} style={{ fontSize: '30px' }} />
                                </motion.div>
                            )}
                        </div>
                    </div>
                </div>
                </div>
            </div>
                    </>
                )}
            </div>
        </>
    )
}

export default React.memo(Todo);