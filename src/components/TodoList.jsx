import React from 'react'
import Todo from './Todo'
import { LuClipboardList } from "react-icons/lu";
import { HiOutlineArchiveBoxXMark } from "react-icons/hi2";
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
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
}) {

  // 2. KONTROL: Liste boşken hata vermemesi için güvenli kontrol
  const isArchiveView = todos && todos.length > 0 && todos[0].isArchived;

  return (
    <div className="todo-list-container" style={{ width: "100%", marginTop: "20px" }}>
      {todos && todos.length > 0 ? (
        <SortableContext items={todos.map(item => item.id)} strategy={verticalListSortingStrategy}>
          <AnimatePresence mode='popLayout'>
            {todos.map((todoItem) => (
              <motion.div
                key={todoItem.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.95, x: 10, transition: { duration: 0.2 } }}
                layout
                transition={{
                  layout: { duration: 0 }
                }}
              >
                <Todo
                  todo={todoItem}
                  onRemoveTodo={onRemoveTodo}
                  onUpdateTodo={onUpdateTodo}
                  onToggleComplete={onToggleComplete}
                  playSound={playSound}
                  isSoundEnabled={isSoundEnabled}
                  t={t}
                  // 3. KONTROL: Todo bileşenine dil bilgisini aktarıyoruz
                  lang={lang}
                  selectionMode={selectionMode}
                  isSelected={selectedIds?.includes(todoItem.id)}
                  onToggleSelect={onToggleSelect}
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