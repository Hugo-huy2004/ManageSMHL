import { useState } from 'react';
import dbService from '../../services/DatabaseService';
import {
    getColumnType,
    getColumnMeta,
    formatDateValue,
    formatDateForInput,
    parseCheckboxValue,
    normalizePassFailValue,
    normalizeCellValue,
    createEmptyFailReasons,
    buildFailReasonNote,
    mergeNote,
    MAIN_TRAINEE_FIELDS
} from '../../utils/columnTypes';

const createEmptyTrainee = (initialValues = {}) => ({
    tenThanh: '',
    hoTen: '',
    gioiTinh: 'Nữ',
    teamId: '',
    ngaySinh: '',
    diaChi: '',
    dienThoai: '',
    giaoXu: '',
    giaoHat: '',
    don: '',
    ...initialValues
});

// Identical "add a new trainee" dialog everywhere (Danh sách, Thống kê, Đội).
// `initialValues` lets a specific table pre-fill context (e.g. teamId when
// adding from inside a team card, or giaoXu when adding from a parish group)
// while still creating the trainee in the same shared collection.
export default function AddTraineeModal({ columns, onClose, onRefresh, notify, initialValues }) {
    const [newTrainee, setNewTrainee] = useState(createEmptyTrainee(initialValues));
    const [newTraineeFailReasons, setNewTraineeFailReasons] = useState({});

    const mainAddColumns = MAIN_TRAINEE_FIELDS.map(name => getColumnMeta(columns, name));
    const remainingAddColumns = columns.filter(col => !MAIN_TRAINEE_FIELDS.includes(col.name));
    const attendanceAddColumns = remainingAddColumns.filter(col => getColumnType(col) === 'checkbox');
    const scoreAddColumns = remainingAddColumns.filter(col => getColumnType(col) === 'score' || getColumnType(col) === 'passfail' || ['ccGlvCap1', 'ketQuaLyThuyet', 'cCan', 'diemTienSM', 'diemSoKhoa', 'diemHauSM', 'diemTB', 'ketQuaSaMac'].includes(col.name));
    const otherAddColumns = remainingAddColumns.filter(col => !attendanceAddColumns.includes(col) && !scoreAddColumns.includes(col));

    const setNewTraineeValue = (col, value) => {
        setNewTrainee(prev => ({
            ...prev,
            [col.name]: getColumnType(col) === 'date' ? formatDateValue(value) : value
        }));
    };

    const renderField = (col, options = {}) => {
        const colType = getColumnType(col);
        const value = newTrainee[col.name] ?? '';

        return (
            <div className={`form-group ${options.full ? 'form-group-full' : ''}`} key={col.name}>
                <label className="form-label">{col.label}</label>
                {col.name === 'gioiTinh' ? (
                    <select
                        className="input-control"
                        value={value || 'Nữ'}
                        onChange={(e) => setNewTraineeValue(col, e.target.value)}
                    >
                        <option value="Nữ">Nữ</option>
                        <option value="Nam">Nam</option>
                    </select>
                ) : colType === 'checkbox' ? (
                    <label className="sheet-checkbox-label add-checkbox-label">
                        <input
                            type="checkbox"
                            checked={parseCheckboxValue(value)}
                            onChange={(e) => setNewTraineeValue(col, e.target.checked)}
                        />
                        Đánh dấu
                    </label>
                ) : colType === 'passfail' ? (
                    <div className="passfail-add-field">
                        <div className="passfail-option-row">
                            <button
                                type="button"
                                className={`passfail-option-btn pass ${normalizePassFailValue(value) === 'Đạt' ? 'active' : ''}`}
                                onClick={() => setNewTraineeValue(col, 'Đạt')}
                            >
                                Đạt
                            </button>
                            <button
                                type="button"
                                className={`passfail-option-btn fail ${normalizePassFailValue(value) === 'Không đạt' ? 'active' : ''}`}
                                onClick={() => setNewTraineeValue(col, 'Không đạt')}
                            >
                                Không đạt
                            </button>
                            <button
                                type="button"
                                className="passfail-option-btn clear"
                                onClick={() => setNewTraineeValue(col, '')}
                            >
                                Bỏ chọn
                            </button>
                        </div>
                        {normalizePassFailValue(value) === 'Không đạt' && (
                            <div className="fail-reason-panel add-fail-reason-panel">
                                <label>
                                    <input
                                        type="checkbox"
                                        checked={!!newTraineeFailReasons[col.name]?.notEnoughScore}
                                        onChange={(e) => setNewTraineeFailReasons(prev => ({
                                            ...prev,
                                            [col.name]: { ...(prev[col.name] || createEmptyFailReasons()), notEnoughScore: e.target.checked }
                                        }))}
                                    />
                                    Không đủ điểm
                                </label>
                                <label>
                                    <input
                                        type="checkbox"
                                        checked={!!newTraineeFailReasons[col.name]?.notEnoughAge}
                                        onChange={(e) => setNewTraineeFailReasons(prev => ({
                                            ...prev,
                                            [col.name]: { ...(prev[col.name] || createEmptyFailReasons()), notEnoughAge: e.target.checked }
                                        }))}
                                    />
                                    Không đủ tuổi
                                </label>
                                <label>
                                    <input
                                        type="checkbox"
                                        checked={!!newTraineeFailReasons[col.name]?.other}
                                        onChange={(e) => setNewTraineeFailReasons(prev => ({
                                            ...prev,
                                            [col.name]: { ...(prev[col.name] || createEmptyFailReasons()), other: e.target.checked }
                                        }))}
                                    />
                                    Lý do khác
                                </label>
                                {newTraineeFailReasons[col.name]?.other && (
                                    <input
                                        className="input-control"
                                        value={newTraineeFailReasons[col.name]?.otherText || ''}
                                        onChange={(e) => setNewTraineeFailReasons(prev => ({
                                            ...prev,
                                            [col.name]: { ...(prev[col.name] || createEmptyFailReasons()), otherText: e.target.value }
                                        }))}
                                        placeholder="Nhập lý do khác..."
                                    />
                                )}
                            </div>
                        )}
                    </div>
                ) : (
                    <input
                        type={colType === 'date' ? 'date' : (colType === 'number' || colType === 'score') ? 'number' : 'text'}
                        step={colType === 'score' ? '0.01' : undefined}
                        inputMode={colType === 'phone' ? 'numeric' : undefined}
                        className="input-control"
                        value={colType === 'date' ? formatDateForInput(value) : value}
                        onChange={(e) => setNewTraineeValue(col, e.target.value)}
                        placeholder={options.placeholder || `Nhập ${col.label.toLowerCase()}...`}
                        required={options.required}
                    />
                )}
            </div>
        );
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const normalizedTrainee = { ...newTrainee };
            columns.forEach(col => {
                if (normalizedTrainee[col.name] !== undefined) {
                    normalizedTrainee[col.name] = normalizeCellValue(normalizedTrainee[col.name], col);
                }
                if (getColumnType(col) === 'passfail' && normalizedTrainee[col.name] === 'Không đạt') {
                    normalizedTrainee.ghiChu = mergeNote(normalizedTrainee.ghiChu, buildFailReasonNote(newTraineeFailReasons[col.name]));
                }
            });

            await dbService.addTrainee(normalizedTrainee);
            onClose();
            onRefresh?.();
            notify?.({ type: 'success', title: 'Đã thêm', message: 'Thêm sa mạc sinh thành công.' });
        } catch (err) {
            notify?.({ type: 'error', title: 'Lỗi thêm sa mạc sinh', message: err.message });
        }
    };

    return (
        <div className="modal-overlay" style={{ display: 'flex' }}>
            <div className="modal-card glass-panel add-trainee-modal">
                <div className="modal-header">
                    <div className="modal-title">Thêm Sa Mạc Sinh Mới</div>
                    <button className="modal-close" onClick={onClose}>&times;</button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="add-trainee-section">
                        <div className="add-section-title">Thông tin chính</div>
                        <div className="add-trainee-grid">
                            {mainAddColumns.map(col => renderField(col, {
                                required: col.name === 'hoTen' || col.name === 'giaoXu',
                                placeholder: col.name === 'tenThanh'
                                    ? 'Maria, Giuse...'
                                    : col.name === 'hoTen'
                                        ? 'Nguyễn Văn A...'
                                        : undefined
                            }))}
                        </div>
                    </div>

                    {otherAddColumns.length > 0 && (
                        <details className="add-trainee-details">
                            <summary>Thông tin bổ sung ({otherAddColumns.length})</summary>
                            <div className="add-trainee-grid">
                                {otherAddColumns.map(col => renderField(col, { full: col.name === 'ghiChu' }))}
                            </div>
                        </details>
                    )}

                    {scoreAddColumns.length > 0 && (
                        <details className="add-trainee-details">
                            <summary>Điểm số / kết quả ({scoreAddColumns.length})</summary>
                            <div className="add-trainee-grid">
                                {scoreAddColumns.map(col => renderField(col))}
                            </div>
                        </details>
                    )}

                    {attendanceAddColumns.length > 0 && (
                        <details className="add-trainee-details">
                            <summary>Điểm danh ({attendanceAddColumns.length})</summary>
                            <div className="add-trainee-grid compact-checkbox-grid">
                                {attendanceAddColumns.map(col => renderField(col))}
                            </div>
                        </details>
                    )}

                    <div className="add-form-actions">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>Hủy</button>
                        <button type="submit" className="btn">Thêm Mới</button>
                    </div>
                </form>
            </div>
        </div>
    );
}
