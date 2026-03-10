import React from 'react'
import Todo from './Todo'
import { LuClipboardList } from "react-icons/lu";
import { HiOutlineArchiveBoxXMark } from "react-icons/hi2"; // Arşiv için alternatif ikon
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { motion, AnimatePresence } from 'framer-motion';

function TodoList({ todos, onRemoveTodo, onUpdateTodo, onToggleComplete, t }) {

  // 1. KONTROL: Arşiv modunda olup olmadığımızı listedeki ilk elemana bakarak anlayabiliriz
  // (Filtreleme App.jsx'te yapıldığı için buraya gelen 'todos' zaten filtrelenmiş haldedir)
  const isArchiveView = todos.length > 0 && todos[0].isArchived;

  return (
    <div className="todo-list-container" style={{ width: "100%", marginTop: "20px" }}>
      {todos && todos.length > 0 ? (
        <SortableContext items={todos.map(item => item.id)} strategy={verticalListSortingStrategy}>
          {/* popLayout modu, elemanlar silinirken listenin zıplamasını engeller */}
          <AnimatePresence mode='popLayout'>
            {todos.map((todoItem) => (
              <motion.div
                key={todoItem.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                layout // 2. KONTROL: Elemanlar silindiğinde diğerlerinin yumuşakça kaymasını sağlar
              >
                <Todo
                  todo={todoItem}
                  onRemoveTodo={onRemoveTodo}
                  onUpdateTodo={onUpdateTodo}
                  onToggleComplete={onToggleComplete}
                  t={t}
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
            className="empty-state-container"
            style={{ textAlign: 'center', padding: '40px 0' }}
          >
            {/* 3. KONTROL: Eğer arşivdeysek ve boşsa farklı ikon gösteriyoruz */}
            {isArchiveView ? (
              <HiOutlineArchiveBoxXMark className="empty-state-icon" style={{ fontSize: '48px', opacity: 0.3 }} />
            ) : (
              <LuClipboardList className="empty-state-icon" style={{ fontSize: '48px', opacity: 0.5 }} />
            )}

            <p className="empty-state-text" style={{ marginTop: '10px' }}>
              {isArchiveView ? (t.archiveEmpty || "Arşiviniz şu an boş.") : t?.noTodos}
            </p>
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  )
}

export default TodoList;