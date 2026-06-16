import dbService from '../../services/DatabaseService';
import { COLUMN_TYPES, getColumnType } from '../../utils/columnTypes';

// Renders a <th> with drag-to-reorder, a format menu (column type picker)
// and a delete-column button. Used identically by ListTab, StatsTab and
// TeamsTab so reordering/renaming/deleting a column anywhere is reflected
// everywhere else (columns are global, shared state in App.jsx).
export default function ColumnHeaderCell({
    col,
    allColumns,
    columnMenu,
    setColumnMenu,
    onRefresh,
    notify,
    confirmToast,
    className = ''
}) {
    const handleDragStart = (e) => {
        e.dataTransfer.setData('text/plain', col.name);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
    };

    const handleDrop = async (e) => {
        e.preventDefault();
        const draggedColumnName = e.dataTransfer.getData('text/plain');
        if (!draggedColumnName || draggedColumnName === col.name) return;

        const source = allColumns || [];
        const draggedIdx = source.findIndex(c => c.name === draggedColumnName);
        const targetIdx = source.findIndex(c => c.name === col.name);
        if (draggedIdx === -1 || targetIdx === -1) return;

        const updatedCols = [...source];
        const [draggedCol] = updatedCols.splice(draggedIdx, 1);
        updatedCols.splice(targetIdx, 0, draggedCol);

        try {
            await dbService.reorderColumns(updatedCols.map(c => c.name));
            onRefresh?.();
        } catch (err) {
            console.error('Lỗi sắp xếp cột:', err);
            notify?.({ type: 'error', title: 'Không thể lưu thứ tự cột', message: err.message });
        }
    };

    const handleColumnTypeChange = async (type) => {
        try {
            await dbService.updateColumn(col.name, { type });
            setColumnMenu(null);
            onRefresh?.();
        } catch (err) {
            notify?.({ type: 'error', title: 'Lỗi cập nhật kiểu cột', message: err.message });
        }
    };

    const handleDeleteColumn = () => {
        confirmToast?.(`Xóa cột "${col.label}"? Toàn bộ dữ liệu của cột này trên tất cả sa mạc sinh sẽ bị xóa bỏ hoàn toàn.`, async () => {
            try {
                await dbService.deleteColumn(col.name);
                onRefresh?.();
                notify?.({ type: 'success', title: 'Đã xóa cột', message: `Đã xóa cột "${col.label}".` });
            } catch (err) {
                notify?.({ type: 'error', title: 'Lỗi xóa cột', message: err.message });
            }
        }, 'Xóa cột');
    };

    return (
        <th
            className={className}
            draggable
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            style={{ cursor: 'grab', userSelect: 'none' }}
            title="Kéo thả để di chuyển thứ tự cột"
        >
            <div className="sheet-column-header">
                <button
                    type="button"
                    className="column-label-btn"
                    onClick={(e) => {
                        e.stopPropagation();
                        setColumnMenu(columnMenu === col.name ? null : col.name);
                    }}
                    title="Định dạng cột"
                >
                    <span>{col.label}</span>
                    <span className="column-type-pill">
                        {COLUMN_TYPES.find(t => t.value === getColumnType(col))?.label || 'Văn bản'}
                    </span>
                </button>
                <div className="column-actions no-print">
                    <button
                        type="button"
                        className="column-menu-btn"
                        onClick={(e) => {
                            e.stopPropagation();
                            setColumnMenu(columnMenu === col.name ? null : col.name);
                        }}
                        title="Định dạng cột"
                    >
                        ...
                    </button>
                    <button
                        className="modal-close column-delete-btn"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteColumn();
                        }}
                        title="Xóa cột"
                    >
                        &times;
                    </button>
                </div>
                {columnMenu === col.name && (
                    <div className="column-format-menu no-print" onClick={(e) => e.stopPropagation()}>
                        <label className="form-label">Định dạng cột</label>
                        <select
                            className="input-control"
                            value={getColumnType(col)}
                            onChange={(e) => handleColumnTypeChange(e.target.value)}
                        >
                            {COLUMN_TYPES.map(type => (
                                <option key={type.value} value={type.value}>{type.label}</option>
                            ))}
                        </select>
                    </div>
                )}
            </div>
        </th>
    );
}
