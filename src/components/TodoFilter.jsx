import React from 'react';
import { motion } from 'framer-motion';
// Arşiv ikonu eklendi: HiOutlineArchiveBox
import { HiOutlineTrash, HiOutlineCheckCircle, HiOutlineListBullet, HiOutlineArchiveBox } from "react-icons/hi2";

function TodoFilter({
  currentFilter,
  onFilterChange,
  t,
  onClearAll,
  onClearCompleted,
  selectionMode,
  selectedCount,
  onToggleSelectionMode,
  onArchiveSelected,
  onCompleteSelected,
  onDeleteSelected,
  onSelectAll,
}) {
    // 1. KONTROL: Arşiv sekmesi ana filtre listesine eklendi
    const filters = [
        { id: 'all', label: t.all, icon: <HiOutlineListBullet /> },
        { id: 'active', label: t.active },
        { id: 'completed', label: t.completed },
        { id: 'archive', label: t.archive, icon: <HiOutlineArchiveBox /> },
    ];

    return (
        <div className="filter-wrapper">
            <div className="filter-container">
                {filters.map((f) => (
                    <button
                        key={f.id}
                        data-filter={f.id} // Bunu ekle
                        className={`filter-btn ${currentFilter === f.id ? 'active' : ''}`}
                        onClick={() => onFilterChange(f.id)}
                    >
                        {/* İkonu olan filtrelerde ikonu göster (Opsiyonel) */}
                        {f.icon && <span className="filter-icon">{f.icon}</span>}
                        {f.label}
                    </button>
                ))}
            </div>

            {/* 2. KONTROL: Arşiv sekmesindeyken toplu işlemleri göstermek kafa karıştırabilir, 
                şartlı render ile sadece ana sekmelerde gösteriyoruz */}
            {currentFilter !== 'archive' && (
                <div className="bulk-actions">
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={onToggleSelectionMode}
                        className={`bulk-btn selection-toggle ${selectionMode ? 'active' : ''}`}
                    >
                        <span>{selectionMode ? t.selectionModeOff : t.selectionMode}</span>
                    </motion.button>

                    {selectionMode ? (
                        <>
                            <motion.button
                                whileHover={{ scale: selectedCount ? 1.02 : 1 }}
                                whileTap={{ scale: selectedCount ? 0.98 : 1 }}
                                onClick={onArchiveSelected}
                                className="bulk-btn clear-completed"
                                disabled={selectedCount === 0}
                            >
                                <HiOutlineCheckCircle size={20} />
                                <span>{t.archiveSelected}</span>
                            </motion.button>

                            <motion.button
                                whileHover={{ scale: selectedCount ? 1.02 : 1 }}
                                whileTap={{ scale: selectedCount ? 0.98 : 1 }}
                                onClick={onCompleteSelected}
                                className="bulk-btn complete-selected"
                                disabled={selectedCount === 0}
                            >
                                <HiOutlineCheckCircle size={20} />
                                <span>{t.completeSelected}</span>
                            </motion.button>

                            <motion.button
                                whileHover={{ scale: selectedCount ? 1.02 : 1 }}
                                whileTap={{ scale: selectedCount ? 0.98 : 1 }}
                                onClick={onDeleteSelected}
                                className="bulk-btn clear-all"
                                disabled={selectedCount === 0}
                            >
                                <HiOutlineTrash size={20} />
                                <span>{t.deleteSelected}</span>
                            </motion.button>
                        </>
                    ) : (
                        <>
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={onClearCompleted}
                                className="bulk-btn clear-completed"
                            >
                                <HiOutlineCheckCircle size={20} />
                                <span>{t.clearCompleted}</span>
                            </motion.button>

                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={onClearAll}
                                className="bulk-btn clear-all"
                            >
                                <HiOutlineTrash size={20} />
                                <span>{t.clearAll}</span>
                            </motion.button>
                        </>
                    )}
                </div>
            )}

            {/* 3. KONTROL: Eğer arşivdeysek sadece Arşivi Temizle butonu çıkarılabilir (İsteğe bağlı) */}
            {currentFilter === 'archive' && (
                <div className="bulk-actions">
                    <p className="archive-info-text" style={{ fontSize: '0.8rem', opacity: 0.7, padding: '10px' }}>
                        {t.archiveTitle}
                    </p>
                </div>
            )}

            {selectionMode && currentFilter !== 'archive' && (
                <div className="selection-row">
                    <button
                        type="button"
                        className="selection-all-btn"
                        onClick={onSelectAll}
                    >
                        {t.selectAll}
                    </button>
                    <div className="selection-info">
                        <span>{t.selectedLabel} {selectedCount}</span>
                    </div>
                </div>
            )}
        </div>
    );
}

export default React.memo(TodoFilter);