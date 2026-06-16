import { useState } from 'react';
import dbService from '../../services/DatabaseService';
import {
    getColumnType,
    formatDateValue,
    formatDateForInput,
    parseCheckboxValue,
    normalizePassFailValue,
    normalizeCellValue,
    displayCellValue,
    createEmptyFailReasons,
    buildFailReasonNote,
    mergeNote
} from '../../utils/columnTypes';

// Single source of truth for "what does an editable trainee cell look like
// and how does it behave" — used by ListTab, StatsTab and TeamsTab so every
// table in the app edits a given column type identically (same click,
// keyboard, checkbox-toggle and Đạt/Không đạt UX everywhere).
export default function EditableTraineeCell({
    trainee,
    col,
    notify,
    onRefresh,
    cellRef,
    tabIndex = 0,
    isSelected = false,
    onSelect,
    onArrowNav,
    onPaste,
    className = ''
}) {
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState('');
    const [failReasons, setFailReasons] = useState(createEmptyFailReasons());

    const colType = getColumnType(col);
    const cellVal = trainee[col.name];

    const save = async (value, options = {}) => {
        const val = normalizeCellValue(value, col);
        const updateData = { [col.name]: val };

        if (colType === 'passfail' && val === 'Không đạt') {
            updateData.ghiChu = mergeNote(trainee.ghiChu, buildFailReasonNote(options.reasons || failReasons));
        }

        try {
            await dbService.updateTrainee(trainee._id, updateData);
            setIsEditing(false);
            setFailReasons(createEmptyFailReasons());
            onRefresh?.();
        } catch (err) {
            notify?.({ type: 'error', title: 'Lỗi cập nhật', message: err.message });
        }
    };

    const startEdit = () => {
        onSelect?.();
        setFailReasons(createEmptyFailReasons());
        setEditValue(cellVal === null || cellVal === undefined ? '' : String(cellVal));
        setIsEditing(true);
    };

    const handleCellClick = () => {
        onSelect?.();
        if (colType === 'checkbox') {
            save(!parseCheckboxValue(cellVal));
            return;
        }
        startEdit();
    };

    const handleCellKeyDown = (e) => {
        if (isEditing) return;
        if (e.key === 'Enter') {
            e.preventDefault();
            startEdit();
        } else if (e.key === 'Delete' || e.key === 'Backspace') {
            e.preventDefault();
            save('');
        } else if (e.key === ' ' && colType === 'checkbox') {
            e.preventDefault();
            save(!parseCheckboxValue(cellVal));
        } else if (e.key.startsWith('Arrow')) {
            onArrowNav?.(e);
        }
    };

    const wrapperProps = {
        ref: cellRef,
        tabIndex,
        onKeyDown: handleCellKeyDown,
        onPaste
    };

    // Special-case fixed identity fields for consistent display everywhere.
    if (col.name === 'gioiTinh') {
        if (isEditing) {
            return (
                <td key={col.name} className={`sheet-cell editing ${className}`}>
                    <select
                        className="cell-select"
                        value={editValue}
                        autoFocus
                        onChange={(e) => { setEditValue(e.target.value); save(e.target.value); }}
                        onBlur={() => setIsEditing(false)}
                    >
                        <option value="Nữ">Nữ</option>
                        <option value="Nam">Nam</option>
                    </select>
                </td>
            );
        }
        return (
            <td {...wrapperProps} className={`editable-cell sheet-cell ${isSelected ? 'selected' : ''} ${className}`} onClick={handleCellClick}>
                <span className={`team-badge ${cellVal === 'Nam' ? 'team-badge-male' : 'team-badge-female'}`}>
                    {cellVal || 'Nữ'}
                </span>
            </td>
        );
    }

    if (col.name === 'teamId') {
        if (isEditing) {
            return (
                <td key={col.name} className={`sheet-cell editing ${className}`}>
                    <input
                        type="number"
                        className="cell-input"
                        value={editValue}
                        autoFocus
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={() => save(editValue)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') save(editValue);
                            if (e.key === 'Escape') setIsEditing(false);
                        }}
                    />
                </td>
            );
        }
        return (
            <td {...wrapperProps} className={`editable-cell sheet-cell ${isSelected ? 'selected' : ''} ${className}`} onClick={handleCellClick}>
                <strong>{cellVal ? `Đội ${cellVal}` : 'Chưa chia'}</strong>
            </td>
        );
    }

    if (colType === 'checkbox') {
        return (
            <td {...wrapperProps} className={`sheet-cell checkbox-cell ${isSelected ? 'selected' : ''} ${className}`} onClick={handleCellClick}>
                <input type="checkbox" className="sheet-checkbox" checked={parseCheckboxValue(cellVal)} readOnly />
            </td>
        );
    }

    if (colType === 'passfail') {
        if (isEditing) {
            const status = normalizePassFailValue(editValue);
            return (
                <td key={col.name} className="sheet-cell editing passfail-editing-cell">
                    <div className="passfail-option-row compact">
                        <button
                            type="button"
                            className={`passfail-option-btn pass ${status === 'Đạt' ? 'active' : ''}`}
                            onClick={() => { setEditValue('Đạt'); save('Đạt'); }}
                        >
                            Đạt
                        </button>
                        <button
                            type="button"
                            className={`passfail-option-btn fail ${status === 'Không đạt' ? 'active' : ''}`}
                            onClick={() => setEditValue('Không đạt')}
                        >
                            Không đạt
                        </button>
                        <button
                            type="button"
                            className="passfail-option-btn clear"
                            onClick={() => save('')}
                        >
                            Bỏ chọn
                        </button>
                    </div>
                    {status === 'Không đạt' && (
                        <div className="fail-reason-panel">
                            <label><input type="checkbox" checked={failReasons.notEnoughScore} onChange={(e) => setFailReasons(prev => ({ ...prev, notEnoughScore: e.target.checked }))} /> Không đủ điểm</label>
                            <label><input type="checkbox" checked={failReasons.notEnoughAge} onChange={(e) => setFailReasons(prev => ({ ...prev, notEnoughAge: e.target.checked }))} /> Không đủ tuổi</label>
                            <label><input type="checkbox" checked={failReasons.other} onChange={(e) => setFailReasons(prev => ({ ...prev, other: e.target.checked }))} /> Lý do khác</label>
                            {failReasons.other && (
                                <input
                                    className="cell-input"
                                    value={failReasons.otherText}
                                    onChange={(e) => setFailReasons(prev => ({ ...prev, otherText: e.target.value }))}
                                    placeholder="Nhập lý do khác..."
                                />
                            )}
                            <button type="button" className="mini-action-btn" onClick={() => save('Không đạt')}>
                                Lưu
                            </button>
                        </div>
                    )}
                </td>
            );
        }
        const status = normalizePassFailValue(cellVal);
        return (
            <td {...wrapperProps} className={`editable-cell sheet-cell ${isSelected ? 'selected' : ''} ${className}`} onClick={handleCellClick}>
                {status ? <span className={`passfail-badge ${status === 'Đạt' ? 'pass' : 'fail'}`}>{status}</span> : ''}
            </td>
        );
    }

    if (isEditing) {
        return (
            <td key={col.name} className={`sheet-cell editing ${className}`}>
                <input
                    type={colType === 'date' ? 'date' : (colType === 'number' || colType === 'score') ? 'number' : 'text'}
                    step={colType === 'score' ? '0.01' : undefined}
                    inputMode={colType === 'phone' ? 'numeric' : undefined}
                    className="cell-input"
                    value={colType === 'date' ? formatDateForInput(editValue) : editValue}
                    onChange={(e) => setEditValue(colType === 'date' ? formatDateValue(e.target.value) : e.target.value)}
                    onBlur={() => save(editValue)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') save(editValue);
                        if (e.key === 'Escape') setIsEditing(false);
                    }}
                    autoFocus
                />
            </td>
        );
    }

    return (
        <td {...wrapperProps} className={`editable-cell sheet-cell ${isSelected ? 'selected' : ''} ${className}`} onClick={handleCellClick}>
            {displayCellValue(cellVal, col)}
        </td>
    );
}
