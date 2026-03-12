import React, { Suspense, lazy } from 'react';
import { DndContext, closestCenter } from '@dnd-kit/core';
import AuthChoiceCard from './AuthChoiceCard';

const TodoCreate = lazy(() => import('./TodoCreate'));
const TodoList = lazy(() => import('./TodoList'));
const ProgressBar = lazy(() => import('./ProgressBar'));
const TodoFilter = lazy(() => import('./TodoFilter'));

function AuthSection({
  user,
  lang,
  t,
  filter,
  authLoading,
  onLogin,
  onGuestLogin,
  onAddTodo,
  onFilterChange,
  onClearAll,
  onClearCompleted,
   selectionMode,
   selectedIds,
   onToggleSelectionMode,
   onToggleSelect,
  sensors,
  onDragEnd,
  todos,
  setTodos,
  onRemoveTodo,
  onUpdateTodo,
  onToggleComplete,
  playSound,
  activeTodosOnly,
  progressPercentage,
}) {
  if (!user) {
    return (
      <>
        <AuthChoiceCard
          lang={lang}
          t={t}
          onLogin={onLogin}
          onGuestLogin={onGuestLogin}
          authLoading={authLoading}
        />
        {authLoading && (
          <div className="auth-loading-inline">
            <div className="auth-loading-spinner" />
            <span className="auth-loading-text">{t.loading}</span>
          </div>
        )}
      </>
    );
  }

  return (
    <Suspense fallback={null}>
      {filter !== 'archive' && (
        <>
          <TodoCreate onCreateTodo={onAddTodo} t={t} playSound={playSound} />
          {activeTodosOnly.length > 0 && (
            <ProgressBar percentage={progressPercentage} t={t} />
          )}
        </>
      )}

      <TodoFilter
        currentFilter={filter}
        onFilterChange={onFilterChange}
        t={t}
        onClearAll={onClearAll}
        onClearCompleted={onClearCompleted}
        selectionMode={selectionMode}
        selectedCount={selectedIds?.length || 0}
        onToggleSelectionMode={onToggleSelectionMode}
        onArchiveSelected={onClearCompleted}
        onDeleteSelected={onClearAll}
      />

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <TodoList
          todos={todos}
          setTodos={setTodos}
          onRemoveTodo={onRemoveTodo}
          onUpdateTodo={onUpdateTodo}
          onToggleComplete={onToggleComplete}
          t={t}
          lang={lang}
          playSound={playSound}
          selectionMode={selectionMode}
          selectedIds={selectedIds}
          onToggleSelect={onToggleSelect}
        />
      </DndContext>
    </Suspense>
  );
}

export default React.memo(AuthSection);

