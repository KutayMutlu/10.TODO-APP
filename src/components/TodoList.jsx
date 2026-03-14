import React, { useState } from 'react'
import Todo from './Todo'
import { LuClipboardList } from "react-icons/lu";
import { HiOutlineArchiveBoxXMark } from "react-icons/hi2";
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
/* eslint-disable-next-line no-unused-vars -- motion used in JSX */
import { motion, AnimatePresence } from 'framer-motion';

// 1. KONTROL: 'lang' parametresi buraya eklendi (Hatanın çözümü burası)
function TodoList({
  todos,
  onRemoveTodo,
  onUpdateTodo,
  onToggleComplete,
  t,
  lang,
  playSound,
  isSoundEnabled,
  selectionMode,
  selectedIds,
  onToggleSelect,
  editingTodoId,
  onEditStart,
  onEditEnd,
}) {
  const [openActionsTodoId, setOpenActionsTodoId] = useState(null);

  // 2. KONTROL: Liste boşken hata vermemesi için güvenli kontrol
  const isArchiveView = todos && todos.length > 0 && todos[0].isArchived;

  return (
    <div className="todo-list-container" style={{ width: "100%", marginTop: "20px" }}>
      {todos && todos.length > 0 ? (
        <SortableContext items={todos.map(item => item.id)} strategy={verticalListSortingStrategy}>
          <AnimatePresence initial={false}>
            {todos.map((todoItem) => (
              <motion.div
                key={todoItem.id}
                initial={false}
                exit={{ opacity: 0, y: 10, transition: { duration: 0.12 } }}
                style={{ position: 'relative', zIndex: openActionsTodoId === todoItem.id ? 1000 : 1 }}
              >
                <Todo
                  todo={todoItem}
                  onRemoveTodo={onRemoveTodo}
                  onUpdateTodo={onUpdateTodo}
                  onToggleComplete={onToggleComplete}
                  playSound={playSound}
                  isSoundEnabled={isSoundEnabled}
                  t={t}
                  lang={lang}
                  selectionMode={selectionMode}
                  isSelected={selectedIds?.includes(todoItem.id)}
                  onToggleSelect={onToggleSelect}
                  isEditing={editingTodoId === todoItem.id}
                  editingTodoId={editingTodoId}
                  onEditStart={onEditStart}
                  onEditEnd={onEditEnd}
                  onActionsOpenChange={(open) => setOpenActionsTodoId(open ? todoItem.id : null)}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </SortableContext>
      ) : (
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="empty-state-container"
            style={{ textAlign: 'center', padding: '40px 0' }}
          >
            {isArchiveView ? (
              <HiOutlineArchiveBoxXMark className="empty-state-icon" style={{ fontSize: '48px', opacity: 0.3 }} />
            ) : (
              <LuClipboardList className="empty-state-icon" style={{ fontSize: '48px', opacity: 0.5 }} />
            )}

            <p className="empty-state-text" style={{ marginTop: '10px' }}>
              {isArchiveView ? t.archiveEmpty : t?.noTodos}
            </p>
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  )
}

export default React.memo(TodoList);