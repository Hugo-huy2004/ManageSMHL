import { useState } from 'react';
import dbService from '../../services/DatabaseService';
import { COLUMN_TYPES } from '../../utils/columnTypes';

// Identical "add a new column" dialog everywhere (Danh sách, Thống kê, Đội).
// Columns are global, so a column added from any tab instantly shows up
// in the other two as well.
export default function AddColumnModal({ onClose, onRefresh, notify }) {
    const [label, setLabel] = useState('');
    const [type, setType] = useState('text');

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await dbService.addColumn(label, type);
            onClose();
            onRefresh?.();
            notify?.({ type: 'success', title: 'Đã tạo cột', message: `Đã tạo cột "${label}" thành công.` });
        } catch (err) {
            notify?.({ type: 'error', title: 'Lỗi thêm cột', message: err.message });
        }
    };

    return (
        <div className="modal-overlay" style={{ display: 'flex' }}>
            <div className="modal-card glass-panel">
                <div className="modal-header">
                    <div className="modal-title">Thêm Cột Thông Tin Mới</div>
                    <button className="modal-close" onClick={onClose}>&times;</button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label">Tên Tiêu Đề Cột</label>
                        <input
                            type="text"
                            className="input-control"
                            placeholder="Ví dụ: Số Điện Thoại, Ngày Sinh..."
                            value={label}
                            onChange={(e) => setLabel(e.target.value)}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Định Dạng Cột</label>
                        <select
                            className="input-control"
                            value={type}
                            onChange={(e) => setType(e.target.value)}
                        >
                            {COLUMN_TYPES.map(t => (
                                <option key={t.value} value={t.value}>{t.label}</option>
                            ))}
                        </select>
                    </div>
                    <div style={{ display: 'flex', gap: '10px', marginTop: '25px' }}>
                        <button type="button" className="btn btn-secondary" onClick={onClose}>Hủy</button>
                        <button type="submit" className="btn">Tạo Cột</button>
                    </div>
                </form>
            </div>
        </div>
    );
}
