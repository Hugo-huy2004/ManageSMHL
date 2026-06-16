import { useMemo, useState } from 'react';
import dbService from '../services/DatabaseService';
import EditableTraineeCell from './shared/EditableTraineeCell';
import ColumnHeaderCell from './shared/ColumnHeaderCell';
import DeleteTraineeButton from './shared/DeleteTraineeButton';
import AddTraineeModal from './shared/AddTraineeModal';
import AddColumnModal from './shared/AddColumnModal';
import PrintLetterhead from './shared/PrintLetterhead';
import { MAIN_TRAINEE_FIELDS, getColumnMeta, getColumnType, resolvePhoneColumn, displayCellValue } from '../utils/columnTypes';

// Fields that exist on a trainee but don't belong in the team management
// grid's attendance/score input columns (e.g. a photo filename isn't an
// attendance or score input).
const TEAM_INPUT_EXCLUDED_FIELDS = ['hinh'];

export default function TeamsTab({ trainees, columns = [], onRefresh, notify, confirmToast }) {
    const [teamFilter, setTeamFilter] = useState('all');
    const [inputGroup, setInputGroup] = useState('attendance');
    const [columnMenu, setColumnMenu] = useState(null);
    const [showAddColumn, setShowAddColumn] = useState(false);
    const [addTraineeContext, setAddTraineeContext] = useState(null); // { teamId } | null

    // In-app print settings — orientation, font size and which columns get
    // pushed into the printed form, independent from the on-screen
    // Điểm danh/Điểm/Tất cả quick filter above.
    const [showPrintSettings, setShowPrintSettings] = useState(false);
    const [showPrintPreview, setShowPrintPreview] = useState(false);
    const [printOrientation, setPrintOrientation] = useState('landscape');
    const [printFontSize, setPrintFontSize] = useState('medium');
    const [printHiddenColumns, setPrintHiddenColumns] = useState([]);

    const identityColumns = useMemo(() => ({
        tenThanh: getColumnMeta(columns, 'tenThanh'),
        hoTen: getColumnMeta(columns, 'hoTen'),
        giaoXu: getColumnMeta(columns, 'giaoXu'),
        dienThoai: getColumnMeta(columns, 'dienThoai'),
        teamId: getColumnMeta(columns, 'teamId')
    }), [columns]);

    // Anything that isn't a core identity field can be shown as an
    // "Điểm danh" / "Điểm" input column. Custom columns added from any tab
    // (Danh sách, Thống kê hoặc Đội) automatically show up here too, since
    // they all read from the same global `columns` list.
    const extraColumns = useMemo(
        () => columns.filter(col => !MAIN_TRAINEE_FIELDS.includes(col.name) && !TEAM_INPUT_EXCLUDED_FIELDS.includes(col.name)),
        [columns]
    );
    const attendanceColumns = useMemo(() => extraColumns.filter(col => getColumnType(col) === 'checkbox'), [extraColumns]);
    const scoreColumns = useMemo(() => extraColumns.filter(col => getColumnType(col) !== 'checkbox'), [extraColumns]);

    const inputColumns = inputGroup === 'attendance'
        ? attendanceColumns
        : inputGroup === 'score'
            ? scoreColumns
            : extraColumns;

    // Full candidate list for the print column picker — identity fields
    // (minus Đội, which is implied by the team section heading) plus every
    // extra column, regardless of the screen's current quick filter.
    const printableColumns = useMemo(
        () => [identityColumns.tenThanh, identityColumns.hoTen, identityColumns.giaoXu, identityColumns.dienThoai, ...extraColumns],
        [identityColumns, extraColumns]
    );
    const printColumns = printableColumns.filter(col => !printHiddenColumns.includes(col.name));
    const togglePrintColumn = (name) => {
        setPrintHiddenColumns(prev => prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]);
    };

    const triggerPrint = () => {
        let styleTag = document.getElementById('dynamic-print-orientation');
        if (!styleTag) {
            styleTag = document.createElement('style');
            styleTag.id = 'dynamic-print-orientation';
            document.head.appendChild(styleTag);
        }
        styleTag.textContent = `@page { size: A4 ${printOrientation}; margin: 12mm; }`;
        window.print();
    };

    const renderStaticTeamTable = (teamId, members) => {
        const gender = members[0]?.gioiTinh || 'Nữ';
        return (
            <div key={teamId} className="print-team-block">
                <div className="print-team-title">ĐỘI {teamId} ({gender} · {members.length} người)</div>
                <table className="print-static-table">
                    <thead>
                        <tr>
                            <th>STT</th>
                            {printColumns.map(col => <th key={col.name}>{col.label}</th>)}
                        </tr>
                    </thead>
                    <tbody>
                        {members.map((member, index) => (
                            <tr key={member._id}>
                                <td>{index + 1}</td>
                                {printColumns.map(col => {
                                    const resolvedCol = resolvePhoneColumn(member, col);
                                    return <td key={col.name}>{displayCellValue(member[resolvedCol.name], resolvedCol)}</td>;
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    const teamsMap = useMemo(() => {
        return trainees.reduce((acc, trainee) => {
            const key = trainee.teamId || 'unassigned';
            if (!acc[key]) acc[key] = [];
            acc[key].push(trainee);
            return acc;
        }, {});
    }, [trainees]);

    const uniqueTeamIds = Object.keys(teamsMap)
        .filter(id => id !== 'unassigned')
        .map(Number)
        .sort((a, b) => a - b);

    const visibleTeamIds = teamFilter === 'all'
        ? uniqueTeamIds
        : uniqueTeamIds.filter(id => String(id) === teamFilter);

    const sortedMembers = (members) => [...members].sort((a, b) => {
        const teamA = Number(a.teamId || 9999);
        const teamB = Number(b.teamId || 9999);
        if (teamA !== teamB) return teamA - teamB;
        return (a.hoTen || '').localeCompare(b.hoTen || '', 'vi');
    });

    const handleBulkAttendance = async (members, checked) => {
        if (attendanceColumns.length === 0) {
            notify?.({ type: 'warning', title: 'Chưa có cột điểm danh', message: 'Hãy thêm một cột kiểu Checkbox để điểm danh.' });
            return;
        }

        try {
            await Promise.all(members.map(member => {
                const updateData = {};
                attendanceColumns.forEach(col => {
                    updateData[col.name] = checked;
                });
                return dbService.updateTrainee(member._id, updateData);
            }));
            notify?.({
                type: 'success',
                title: checked ? 'Đã điểm danh cả đội' : 'Đã bỏ điểm danh cả đội',
                message: `${members.length} sa mạc sinh đã được cập nhật.`,
                duration: 1600
            });
            onRefresh();
        } catch (err) {
            notify?.({ type: 'error', title: 'Lỗi cập nhật điểm danh', message: err.message });
        }
    };

    const handleGenerateTeams = async () => {
        if (trainees.length === 0) {
            notify?.({ type: 'warning', title: 'Chưa có dữ liệu', message: 'Vui lòng nhập danh sách sa mạc sinh trước.' });
            return;
        }

        confirmToast?.('Chạy thuật toán chia đội tự động? Các phân bổ đội hiện tại sẽ bị ghi đè.', async () => {
            try {
                const res = await dbService.allocateTeams();
                if (res.success) {
                    notify?.({
                        type: 'success',
                        title: 'Chia đội thành công',
                        message: `Tổng cộng ${res.totalTeams} đội (${res.femaleTeamsCount} Nữ, ${res.maleTeamsCount} Nam).`
                    });
                    onRefresh();
                }
            } catch (err) {
                notify?.({ type: 'error', title: 'Chia đội thất bại', message: err.message });
            }
        }, 'Tạo đội tự động');
    };

    const handleClearTeams = async () => {
        confirmToast?.('Bạn có chắc chắn muốn xóa toàn bộ phân bổ đội hiện tại?', async () => {
            try {
                await dbService.clearTeams();
                notify?.({ type: 'success', title: 'Đã xóa sắp xếp đội', message: 'Toàn bộ sa mạc sinh đã được đưa về trạng thái chưa chia.' });
                onRefresh();
            } catch (err) {
                notify?.({ type: 'error', title: 'Xóa phân bổ đội thất bại', message: err.message });
            }
        }, 'Xóa sắp xếp đội');
    };

    return (
        <div>
            <div className="toolbar no-print">
                <div className="toolbar-group">
                    <button className="btn" onClick={handleGenerateTeams} style={{ width: 'auto' }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
                        Tạo Đội Tự Động
                    </button>
                    <button className="btn btn-secondary" onClick={handleClearTeams} style={{ width: 'auto' }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"/><line x1="12" y1="2" x2="12" y2="12"/></svg>
                        Xóa Sắp Xếp Đội
                    </button>
                    <button className="btn btn-secondary" onClick={() => setAddTraineeContext({})} style={{ width: 'auto' }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                        Thêm Sa Mạc Sinh
                    </button>
                    <button className="btn btn-secondary" onClick={() => setShowAddColumn(true)} style={{ width: 'auto' }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="12" y1="3" x2="12" y2="21"/><line x1="3" y1="12" x2="21" y2="12"/></svg>
                        Thêm Cột Mới
                    </button>
                </div>

                <div className="toolbar-group">
                    <label htmlFor="teamFilter" className="form-label" style={{ marginBottom: 0, marginRight: '5px' }}>Lọc đội:</label>
                    <select
                        id="teamFilter"
                        className="input-control compact-select"
                        value={teamFilter}
                        onChange={(e) => setTeamFilter(e.target.value)}
                    >
                        <option value="all">Tất cả đội</option>
                        {uniqueTeamIds.map(id => {
                            const gender = teamsMap[id]?.[0]?.gioiTinh || 'Nữ';
                            return <option key={id} value={id}>Đội {id} ({gender})</option>;
                        })}
                    </select>
                    <div className="segmented-control">
                        <button type="button" className={inputGroup === 'attendance' ? 'active' : ''} onClick={() => setInputGroup('attendance')}>Điểm danh</button>
                        <button type="button" className={inputGroup === 'score' ? 'active' : ''} onClick={() => setInputGroup('score')}>Điểm</button>
                        <button type="button" className={inputGroup === 'all' ? 'active' : ''} onClick={() => setInputGroup('all')}>Tất cả</button>
                    </div>
                    <button className="btn btn-success" onClick={() => setShowPrintSettings(true)} style={{ width: 'auto' }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                        In danh sách
                    </button>
                </div>
            </div>

            <div className="teams-list compact-teams-list no-print">
                {visibleTeamIds.length === 0 ? (
                    <div className="empty-state">
                        Chưa chia đội. Nhấn nút "Tạo Đội Tự Động" để bắt đầu.
                    </div>
                ) : (
                    visibleTeamIds.map(teamId => {
                        const members = sortedMembers(teamsMap[teamId] || []);
                        const gender = members[0]?.gioiTinh || 'Nữ';
                        const isFemale = gender === 'Nữ';

                        return (
                            <section key={teamId} className={`team-card compact-team-card glass-panel ${isFemale ? 'team-female' : 'team-male'} team-card-print`}>
                                <div className="team-header compact-team-header">
                                    <div className="team-name">ĐỘI {teamId}</div>
                                    <div className="team-quick-actions no-print">
                                        <button type="button" className="mini-action-btn" onClick={() => handleBulkAttendance(members, true)}>Điểm danh cả đội</button>
                                        <button type="button" className="mini-action-btn" onClick={() => handleBulkAttendance(members, false)}>Bỏ chọn</button>
                                        <button type="button" className="mini-action-btn" onClick={() => setAddTraineeContext({ teamId })}>+ Thêm vào đội</button>
                                    </div>
                                    <span className={`team-badge ${isFemale ? 'team-badge-female' : 'team-badge-male'}`}>
                                        {gender} · {members.length}
                                    </span>
                                </div>
                                <div className="table-responsive team-table-wrap compact-table-wrap">
                                    <table className={`team-table compact-team-table input-group-${inputGroup}`}>
                                        <thead>
                                            <tr>
                                                <th className="col-stt">STT</th>
                                                <ColumnHeaderCell col={identityColumns.tenThanh} allColumns={columns} columnMenu={columnMenu} setColumnMenu={setColumnMenu} onRefresh={onRefresh} notify={notify} confirmToast={confirmToast} className="col-saint" />
                                                <ColumnHeaderCell col={identityColumns.hoTen} allColumns={columns} columnMenu={columnMenu} setColumnMenu={setColumnMenu} onRefresh={onRefresh} notify={notify} confirmToast={confirmToast} className="col-name" />
                                                <ColumnHeaderCell col={identityColumns.giaoXu} allColumns={columns} columnMenu={columnMenu} setColumnMenu={setColumnMenu} onRefresh={onRefresh} notify={notify} confirmToast={confirmToast} className="col-parish" />
                                                <ColumnHeaderCell col={identityColumns.dienThoai} allColumns={columns} columnMenu={columnMenu} setColumnMenu={setColumnMenu} onRefresh={onRefresh} notify={notify} confirmToast={confirmToast} className="col-phone" />
                                                <ColumnHeaderCell col={identityColumns.teamId} allColumns={columns} columnMenu={columnMenu} setColumnMenu={setColumnMenu} onRefresh={onRefresh} notify={notify} confirmToast={confirmToast} className="col-team no-print" />
                                                {inputColumns.map(col => (
                                                    <ColumnHeaderCell
                                                        key={col.name}
                                                        col={col}
                                                        allColumns={columns}
                                                        columnMenu={columnMenu}
                                                        setColumnMenu={setColumnMenu}
                                                        onRefresh={onRefresh}
                                                        notify={notify}
                                                        confirmToast={confirmToast}
                                                        className={getColumnType(col) === 'checkbox' ? 'attendance-col' : 'score-col'}
                                                    />
                                                ))}
                                                <th className="no-print">Hành động</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {members.map((member, index) => (
                                                <tr key={member._id}>
                                                    <td className="col-stt">{index + 1}</td>
                                                    <EditableTraineeCell trainee={member} col={identityColumns.tenThanh} notify={notify} onRefresh={onRefresh} className="col-saint" />
                                                    <EditableTraineeCell trainee={member} col={identityColumns.hoTen} notify={notify} onRefresh={onRefresh} className="col-name" />
                                                    <EditableTraineeCell trainee={member} col={identityColumns.giaoXu} notify={notify} onRefresh={onRefresh} className="col-parish" />
                                                    <EditableTraineeCell trainee={member} col={resolvePhoneColumn(member, identityColumns.dienThoai)} notify={notify} onRefresh={onRefresh} className="col-phone" />
                                                    <EditableTraineeCell trainee={member} col={identityColumns.teamId} notify={notify} onRefresh={onRefresh} className="col-team no-print" />
                                                    {inputColumns.map(col => (
                                                        <EditableTraineeCell
                                                            key={col.name}
                                                            trainee={member}
                                                            col={col}
                                                            notify={notify}
                                                            onRefresh={onRefresh}
                                                            className={getColumnType(col) === 'checkbox' ? 'attendance-cell' : 'score-cell'}
                                                        />
                                                    ))}
                                                    <td className="no-print" style={{ textAlign: 'center' }}>
                                                        <DeleteTraineeButton trainee={member} onRefresh={onRefresh} notify={notify} confirmToast={confirmToast} compact />
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </section>
                        );
                    })
                )}
            </div>

            {/* Dedicated print-only rendition: hidden on screen, shown only when
                actually printing — built from the chosen Cấu hình in (cột / cỡ chữ)
                independent of the on-screen Điểm danh/Điểm/Tất cả quick filter. */}
            <div className={`print-only print-fs-${printFontSize}`}>
                <PrintLetterhead title="Danh Sách Sa Mạc Sinh Theo Đội" forceVisible />
                {visibleTeamIds.map(teamId => renderStaticTeamTable(teamId, sortedMembers(teamsMap[teamId] || [])))}
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

            {/* MODAL: PRINT SETTINGS */}
            {showPrintSettings && (
                <div className="modal-overlay" style={{ display: 'flex' }}>
                    <div className="modal-card glass-panel" style={{ maxWidth: 560 }}>
                        <div className="modal-header">
                            <div className="modal-title">Cấu hình in danh sách đội</div>
                            <button className="modal-close" onClick={() => setShowPrintSettings(false)}>&times;</button>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Hướng giấy</label>
                            <div className="segmented-control">
                                <button type="button" className={printOrientation === 'landscape' ? 'active' : ''} onClick={() => setPrintOrientation('landscape')}>Ngang</button>
                                <button type="button" className={printOrientation === 'portrait' ? 'active' : ''} onClick={() => setPrintOrientation('portrait')}>Dọc</button>
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Cỡ chữ khi in</label>
                            <div className="segmented-control">
                                <button type="button" className={printFontSize === 'small' ? 'active' : ''} onClick={() => setPrintFontSize('small')}>Nhỏ</button>
                                <button type="button" className={printFontSize === 'medium' ? 'active' : ''} onClick={() => setPrintFontSize('medium')}>Vừa</button>
                                <button type="button" className={printFontSize === 'large' ? 'active' : ''} onClick={() => setPrintFontSize('large')}>Lớn</button>
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Cột hiển thị khi in</label>
                            <div className="options-list" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: '10px' }}>
                                {printableColumns.map(col => (
                                    <label className="option-item" key={col.name}>
                                        <input
                                            type="checkbox"
                                            checked={!printHiddenColumns.includes(col.name)}
                                            onChange={() => togglePrintColumn(col.name)}
                                        />
                                        <span className="checkbox-label">{col.label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '10px', marginTop: '22px', justifyContent: 'flex-end' }}>
                            <button type="button" className="btn btn-secondary" onClick={() => { setShowPrintSettings(false); setShowPrintPreview(true); }}>Xem trước</button>
                            <button type="button" className="btn btn-success" onClick={triggerPrint}>In ngay</button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL: PRINT PREVIEW */}
            {showPrintPreview && (
                <div className="modal-overlay" style={{ display: 'flex' }}>
                    <div className="modal-card glass-panel" style={{ maxWidth: 1000, maxHeight: '85vh', overflow: 'auto' }}>
                        <div className="modal-header">
                            <div className="modal-title">Xem trước bản in</div>
                            <button className="modal-close" onClick={() => setShowPrintPreview(false)}>&times;</button>
                        </div>

                        <div className={`print-preview-content print-fs-${printFontSize}`}>
                            <PrintLetterhead title="Danh Sách Sa Mạc Sinh Theo Đội" forceVisible />
                            {visibleTeamIds.length === 0 ? (
                                <div className="empty-state">Chưa có đội nào để xem trước.</div>
                            ) : (
                                visibleTeamIds.map(teamId => renderStaticTeamTable(teamId, sortedMembers(teamsMap[teamId] || [])))
                            )}
                        </div>

                        <div style={{ display: 'flex', gap: '10px', marginTop: '18px', justifyContent: 'flex-end' }}>
                            <button type="button" className="btn btn-secondary" onClick={() => { setShowPrintPreview(false); setShowPrintSettings(true); }}>Quay lại chỉnh</button>
                            <button type="button" className="btn btn-success" onClick={triggerPrint}>In ngay</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
