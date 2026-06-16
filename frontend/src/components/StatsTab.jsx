import { useMemo, useState } from 'react';
import EditableTraineeCell from './shared/EditableTraineeCell';
import ColumnHeaderCell from './shared/ColumnHeaderCell';
import DeleteTraineeButton from './shared/DeleteTraineeButton';
import AddTraineeModal from './shared/AddTraineeModal';
import AddColumnModal from './shared/AddColumnModal';
import PrintLetterhead from './shared/PrintLetterhead';
import { MAIN_TRAINEE_FIELDS, getColumnMeta, resolvePhoneColumn } from '../utils/columnTypes';

export default function StatsTab({ trainees, columns = [], onRefresh, notify, confirmToast }) {
    const [selectedParish, setSelectedParish] = useState(null);
    const [selectedTeam, setSelectedTeam] = useState(null);
    const [showColumnSettings, setShowColumnSettings] = useState(false);
    // Explicit hide-list (opt-out), starts empty. Column headers therefore
    // always mirror Danh sách exactly — same columns, same labels, same
    // order — by default; any column added/removed/reordered there shows up
    // here immediately. Hiding a column here is just a local view
    // preference, it never removes data from Danh sách.
    const [hiddenFieldNames, setHiddenFieldNames] = useState([]);
    const [columnMenu, setColumnMenu] = useState(null);
    const [showAddColumn, setShowAddColumn] = useState(false);
    const [addTraineeContext, setAddTraineeContext] = useState(null); // { giaoXu } | { teamId } | {}

    const availableFields = useMemo(() => {
        const fromColumns = columns.map(col => ({ name: col.name, label: col.label, type: col.type }));
        MAIN_TRAINEE_FIELDS.forEach(name => {
            if (!fromColumns.some(col => col.name === name)) {
                fromColumns.push(getColumnMeta(columns, name));
            }
        });
        return fromColumns;
    }, [columns]);

    const visibleFields = availableFields.filter(field => !hiddenFieldNames.includes(field.name));

    const toggleField = (name) => {
        setHiddenFieldNames(prev => prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]);
    };

    const parishGroups = useMemo(() => {
        const map = {};
        trainees.forEach(trainee => {
            const key = trainee.giaoXu ? trainee.giaoXu.trim() : 'Chưa xác định';
            if (!map[key]) map[key] = [];
            map[key].push(trainee);
        });

        return Object.entries(map)
            .map(([name, members]) => ({ name, members, count: members.length }))
            .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'vi'));
    }, [trainees]);

    const teamGroups = useMemo(() => {
        const map = {};
        trainees.forEach(trainee => {
            const key = trainee.teamId ? String(trainee.teamId) : 'unassigned';
            if (!map[key]) map[key] = [];
            map[key].push(trainee);
        });

        return Object.entries(map)
            .map(([id, members]) => ({
                id,
                name: id === 'unassigned' ? 'Chưa chia đội' : `Đội ${id}`,
                members,
                count: members.length
            }))
            .sort((a, b) => {
                if (a.id === 'unassigned') return 1;
                if (b.id === 'unassigned') return -1;
                return Number(a.id) - Number(b.id);
            });
    }, [trainees]);

    const activeParish = parishGroups.some(item => item.name === selectedParish)
        ? selectedParish
        : parishGroups[0]?.name || null;

    const activeTeam = teamGroups.some(item => item.id === selectedTeam)
        ? selectedTeam
        : teamGroups[0]?.id || null;

    const total = trainees.length;
    const nam = trainees.filter(t => t.gioiTinh === 'Nam').length;
    const nu = trainees.filter(t => t.gioiTinh === 'Nữ').length;
    const totalTeams = teamGroups.filter(group => group.id !== 'unassigned').length;

    const activeParishRows = parishGroups.find(group => group.name === activeParish)?.members || [];
    const activeTeamRows = teamGroups.find(group => group.id === activeTeam)?.members || [];

    const sortedRows = (rows) => [...rows].sort((a, b) => {
        const teamSort = Number(a.teamId || 9999) - Number(b.teamId || 9999);
        return teamSort || (a.hoTen || '').localeCompare(b.hoTen || '', 'vi');
    });

    const renderCompactTable = (rows) => (
        <div className="table-responsive stats-table-wrap">
            <table className="stats-compact-table">
                <thead>
                    <tr>
                        <th>STT</th>
                        {visibleFields.map(field => (
                            <ColumnHeaderCell
                                key={field.name}
                                col={field}
                                allColumns={columns}
                                columnMenu={columnMenu}
                                setColumnMenu={setColumnMenu}
                                onRefresh={onRefresh}
                                notify={notify}
                                confirmToast={confirmToast}
                                className={`stats-col-${field.name}`}
                            />
                        ))}
                        <th className="no-print">Hành động</th>
                    </tr>
                </thead>
                <tbody>
                    {sortedRows(rows).map((trainee, index) => (
                        <tr key={trainee._id}>
                            <td>{index + 1}</td>
                            {visibleFields.map(field => (
                                <EditableTraineeCell
                                    key={field.name}
                                    trainee={trainee}
                                    col={resolvePhoneColumn(trainee, field)}
                                    notify={notify}
                                    onRefresh={onRefresh}
                                    className={`stats-col-${field.name}`}
                                />
                            ))}
                            <td className="no-print" style={{ textAlign: 'center' }}>
                                <DeleteTraineeButton trainee={trainee} onRefresh={onRefresh} notify={notify} confirmToast={confirmToast} compact />
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );

    return (
        <div>
            <PrintLetterhead title="Thống Kê Danh Sách Sa Mạc Sinh" />

            <div className="toolbar no-print">
                <div className="toolbar-group">
                    <button className="btn btn-secondary" onClick={() => setAddTraineeContext({})} style={{ width: 'auto' }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                        Thêm Sa Mạc Sinh
                    </button>
                    <button className="btn btn-secondary" onClick={() => setShowAddColumn(true)} style={{ width: 'auto' }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="12" y1="3" x2="12" y2="21"/><line x1="3" y1="12" x2="21" y2="12"/></svg>
                        Thêm Cột Mới
                    </button>
                    <button className="btn btn-secondary" onClick={() => setShowColumnSettings(prev => !prev)} style={{ width: 'auto' }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></svg>
                        Cột hiển thị
                    </button>
                </div>
                <div className="toolbar-group">
                    <button className="btn btn-success" onClick={() => window.print()} style={{ width: 'auto' }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                        In danh sách
                    </button>
                </div>
            </div>

            {showColumnSettings && (
                <div className="glass-panel passfail-settings-panel no-print">
                    <div className="passfail-settings-header">
                        <div>
                            <strong>Cột hiển thị trong bảng thống kê</strong>
                            <span>Chọn cột muốn xem (dữ liệu vẫn được lưu đầy đủ ở tab Danh sách)</span>
                        </div>
                        <button type="button" className="modal-close" onClick={() => setShowColumnSettings(false)}>&times;</button>
                    </div>
                    <div className="options-list" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: '10px' }}>
                        {availableFields.map(field => (
                            <label className="option-item" key={field.name}>
                                <input
                                    type="checkbox"
                                    checked={!hiddenFieldNames.includes(field.name)}
                                    onChange={() => toggleField(field.name)}
                                />
                                <span className="checkbox-label">{field.label}</span>
                            </label>
                        ))}
                    </div>
                </div>
            )}

            <div className="stats-grid compact-stats-grid">
                <div className="stat-card glass-panel compact-stat-card">
                    <div className="stat-info">
                        <div className="stat-label">Tổng Sa Mạc Sinh</div>
                        <div className="stat-value">{total}</div>
                    </div>
                </div>
                <div className="stat-card glass-panel compact-stat-card">
                    <div className="stat-info">
                        <div className="stat-label">Nam</div>
                        <div className="stat-value">{nam}</div>
                    </div>
                </div>
                <div className="stat-card glass-panel compact-stat-card">
                    <div className="stat-info">
                        <div className="stat-label">Nữ</div>
                        <div className="stat-value">{nu}</div>
                    </div>
                </div>
                <div className="stat-card glass-panel compact-stat-card">
                    <div className="stat-info">
                        <div className="stat-label">Tổng Số Đội</div>
                        <div className="stat-value">{totalTeams}</div>
                    </div>
                </div>
            </div>

            <div className="stats-two-panels">
                <section className="glass-panel stats-list-section">
                    <div className="stats-section-header">
                        <h3>Theo Giáo Xứ</h3>
                        <div className="mini-toolbar no-print" style={{ marginBottom: 0 }}>
                            <button type="button" className="mini-action-btn" onClick={() => setAddTraineeContext({ giaoXu: activeParish === 'Chưa xác định' ? '' : activeParish })}>+ Thêm vào giáo xứ này</button>
                        </div>
                        <span>{activeParishRows.length} người</span>
                    </div>
                    <div className="stats-section-layout">
                        <div className="stats-group-list">
                            {parishGroups.map(group => (
                                <button
                                    key={group.name}
                                    type="button"
                                    className={`stats-group-item ${activeParish === group.name ? 'active' : ''}`}
                                    onClick={() => setSelectedParish(group.name)}
                                >
                                    <span>{group.name}</span>
                                    <strong>{group.count}</strong>
                                </button>
                            ))}
                        </div>
                        {renderCompactTable(activeParishRows)}
                    </div>
                </section>

                <section className="glass-panel stats-list-section">
                    <div className="stats-section-header">
                        <h3>Theo Đội</h3>
                        <div className="mini-toolbar no-print" style={{ marginBottom: 0 }}>
                            <button type="button" className="mini-action-btn" onClick={() => setAddTraineeContext({ teamId: activeTeam !== 'unassigned' ? activeTeam : '' })}>+ Thêm vào đội này</button>
                        </div>
                        <span>{activeTeamRows.length} người</span>
                    </div>
                    <div className="stats-section-layout">
                        <div className="stats-group-list">
                            {teamGroups.map(group => (
                                <button
                                    key={group.id}
                                    type="button"
                                    className={`stats-group-item ${activeTeam === group.id ? 'active' : ''}`}
                                    onClick={() => setSelectedTeam(group.id)}
                                >
                                    <span>{group.name}</span>
                                    <strong>{group.count}</strong>
                                </button>
                            ))}
                        </div>
                        {renderCompactTable(activeTeamRows)}
                    </div>
                </section>
            </div>

            {addTraineeContext && (
                <AddTraineeModal
                    columns={columns}
                    initialValues={addTraineeContext}
                    onClose={() => setAddTraineeContext(null)}
                    onRefresh={onRefresh}
                    notify={notify}
                />
            )}

            {showAddColumn && (
                <AddColumnModal
                    onClose={() => setShowAddColumn(false)}
                    onRefresh={onRefresh}
                    notify={notify}
                />
            )}
        </div>
    );
}
