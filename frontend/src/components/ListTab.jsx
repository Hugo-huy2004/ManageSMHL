import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import dbService from '../services/DatabaseService';
import EditableTraineeCell from './shared/EditableTraineeCell';
import ColumnHeaderCell from './shared/ColumnHeaderCell';
import DeleteTraineeButton from './shared/DeleteTraineeButton';
import AddTraineeModal from './shared/AddTraineeModal';
import AddColumnModal from './shared/AddColumnModal';
import PrintLetterhead from './shared/PrintLetterhead';
import {
    getColumnType,
    normalizePassFailValue,
    normalizeCellValue,
    buildFailReasonNote,
    mergeNote,
    createEmptyFailReasons
} from '../utils/columnTypes';
import { DEFAULT_LIST_TITLE } from '../constants/branding';

export default function ListTab({ trainees, columns, onRefresh, notify, confirmToast }) {
    const [search, setSearch] = useState('');
    const [selectedCell, setSelectedCell] = useState(null); // { rowIndex, colIndex }
    const [columnMenu, setColumnMenu] = useState(null);
    const [showPassFailSettings, setShowPassFailSettings] = useState(false);
    const [passFailBulk, setPassFailBulk] = useState({
        columnName: 'ketQuaSaMac',
        scope: 'all',
        scopeValue: '',
        status: 'Đạt',
        reasons: createEmptyFailReasons()
    });
    const fileInputRef = useRef(null);
    const cellRefs = useRef({});

    // Smart scanner modal states
    const [isScanning, setIsScanning] = useState(false);
    const [scanProgress, setScanProgress] = useState(0);
    const [scanStep, setScanStep] = useState('reading'); // 'reading' | 'analyzing' | 'optimizing' | 'mapped'
    const [scanResults, setScanResults] = useState(null);

    // Modals states
    const [showAddTrainee, setShowAddTrainee] = useState(false);
    const [showAddColumn, setShowAddColumn] = useState(false);

    const handleConfirmImport = async () => {
        if (!scanResults) return;
        try {
            await dbService.addTraineesBulk(scanResults.trainees, scanResults.newColumns);
            notify?.({ type: 'success', title: 'Đã nhập dữ liệu', message: `Đã nhập thành công ${scanResults.trainees.length} sa mạc sinh.` });
            setIsScanning(false);
            setScanResults(null);
            onRefresh();
        } catch (err) {
            console.error(err);
            notify?.({ type: 'error', title: 'Lỗi lưu cơ sở dữ liệu', message: err.message });
        }
    };

    const handleCancelImport = () => {
        setIsScanning(false);
        setScanResults(null);
    };

    // Utility to normalize header text (remove accents, punctuation, spaces, to lowercase)
    const normalizeHeader = (name) => {
        if (!name) return "";
        return name
            .trim()
            .replace(/[\u0111\u0110]/g, 'd') // "\u0110"/"\u0111" has no NFD decomposition (unlike accented vowels), so map it to "d" explicitly or it gets dropped entirely below \u2014 e.g. "\u0110i\u1ec7n tho\u1ea1i" must become "dienthoai", not "ienthoai".
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '') // Remove accents
            .replace(/[^a-zA-Z0-9]/g, '')   // Remove special characters, spaces, punctuation
            .toLowerCase();
    };

    // Mapping function from Excel headers to standard MongoDB properties
    const mapHeaderToField = (headerName) => {
        const norm = normalizeHeader(headerName);
        if (norm === 'tenthanh') return 'tenThanh';
        if (norm === 'hovaten' || norm === 'hoten') return 'hoTen';
        if (norm === 'doi') return 'teamId';
        if (norm === 'ngaysinh') return 'ngaySinh';
        if (norm === 'diachi') return 'diaChi';
        if (norm === 'dienthoai' || norm === 'dt' || norm === 'sodienthoai') return 'dienThoai';
        if (norm === 'giaoxu') return 'giaoXu';
        if (norm === 'giaohat') return 'giaoHat';
        if (norm === 'don') return 'don';
        if (norm === 'hinh') return 'hinh';
        if (norm === 'ccglvcap1') return 'ccGlvCap1';
        if (norm === 'ketqualythuyet') return 'ketQuaLyThuyet';

        // Attendance subheader mappings
        if (norm.includes('c30')) return 'diemDanh_C30';
        if (norm.includes('s01')) return 'diemDanh_S01';
        if (norm.includes('c01')) return 'diemDanh_C01';
        if (norm.includes('s02')) return 'diemDanh_S02';
        if (norm.includes('c02')) return 'diemDanh_C02';
        if (norm.includes('s03')) return 'diemDanh_S03';
        if (norm.includes('c03')) return 'diemDanh_C03';
        if (norm.includes('s04')) return 'diemDanh_S04';
        if (norm.includes('c04')) return 'diemDanh_C04';

        if (norm === 'ccan') return 'cCan';
        if (norm === 'diemtiensm') return 'diemTienSM';
        if (norm === 'diemsokhoa') return 'diemSoKhoa';
        if (norm === 'diemhausm') return 'diemHauSM';
        if (norm === 'diemtb') return 'diemTB';
        if (norm === 'ketquasamac') return 'ketQuaSaMac';
        if (norm === 'nhannghithucsaidi' || norm === 'nghithucsaidi') return 'nghiThucSaiDi';
        if (norm === 'ghichu') return 'ghiChu';

        return null;
    };

    const focusCell = (rowIndex, colIndex) => {
        requestAnimationFrame(() => {
            cellRefs.current[`${rowIndex}:${colIndex}`]?.focus();
        });
    };

    // Filter trainees list based on search term
    const filteredTrainees = trainees.filter(t => {
        const query = search.toLowerCase().trim();
        if (!query) return true;
        return (
            (t.tenThanh && t.tenThanh.toLowerCase().includes(query)) ||
            (t.hoTen && t.hoTen.toLowerCase().includes(query)) ||
            (t.giaoXu && t.giaoXu.toLowerCase().includes(query)) ||
            (t.teamId && `đội ${t.teamId}`.includes(query))
        );
    });

    const passFailColumns = columns.filter(col => getColumnType(col) === 'passfail');
    const teamOptions = [...new Set(trainees.map(t => t.teamId).filter(Boolean))].map(Number).sort((a, b) => a - b);
    const parishOptions = [...new Set(trainees.map(t => t.giaoXu).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'vi'));
    const passFailScopeRows = trainees.filter(trainee => {
        if (passFailBulk.scope === 'team') return String(trainee.teamId || '') === String(passFailBulk.scopeValue);
        if (passFailBulk.scope === 'parish') return trainee.giaoXu === passFailBulk.scopeValue;
        if (passFailBulk.scope === 'gender') return trainee.gioiTinh === passFailBulk.scopeValue;
        if (passFailBulk.scope === 'unassigned') return !trainee.teamId;
        return true;
    });

    // Dual-Engine File Import Logic (XLSX + PapaParse)
    const handleExcelImport = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const fileType = file.name.split('.').pop().toLowerCase();

        const processRawJson = (rawJson) => {
            if (!rawJson || rawJson.length === 0) {
                notify?.({ type: 'error', title: 'Không thể đọc file', message: 'File trống hoặc không hợp lệ.' });
                return;
            }

            // Header extraction & double-header merger algorithm
            const row1 = rawJson[0] || [];
            const row2 = rawJson[1] || [];

            // Detect double headers (e.g. check if row2 contains "NAM", "NỮ", or attendance metrics)
            const hasDoubleHeader = row1.some((h, idx) => !h && row2[idx]);

            const headers = [];
            let startRow = 1;

            if (hasDoubleHeader) {
                startRow = 2; // Data rows start at index 2
                let lastParentHeader = "";
                for (let i = 0; i < Math.max(row1.length, row2.length); i++) {
                    const parent = String(row1[i] || '').trim();
                    if (parent) {
                        lastParentHeader = parent;
                    }
                    const sub = String(row2[i] || '').trim();

                    if (lastParentHeader && sub) {
                        headers.push(`${lastParentHeader}_${sub}`);
                    } else if (lastParentHeader) {
                        headers.push(lastParentHeader);
                    } else if (sub) {
                        headers.push(sub);
                    } else {
                        headers.push(`Column_${i}`);
                    }
                }
            } else {
                for (let i = 0; i < row1.length; i++) {
                    headers.push(String(row1[i] || '').trim() || `Column_${i}`);
                }
            }

            // Prepare import data
            const importedTrainees = [];
            const newColumnsToAdd = [];

            // Map headers to fields or mark as custom columns
            const mappings = {};
            headers.forEach(header => {
                // Check standard mappings
                let field = mapHeaderToField(header);

                if (field) {
                    mappings[header] = field;
                } else {
                    const normHeader = normalizeHeader(header);
                    // Skip STT column
                    if (normHeader === 'stt') return;

                    // Parse custom columns or gender subheaders
                    if (normHeader.includes('namnunam') || normHeader === 'nam') {
                        mappings[header] = 'NAM_FLAG';
                    } else if (normHeader.includes('namnunu') || normHeader === 'nu') {
                        mappings[header] = 'NU_FLAG';
                    } else {
                        // Normalize custom header to key
                        const keyName = 'custom_' + normHeader;

                        mappings[header] = keyName;

                        // Prevent duplicate custom columns: only add if it does not already exist
                        const exists = columns.some(c => c.name === keyName);
                        if (!exists) {
                            const inferredType = normHeader.includes('ngay') || normHeader.includes('date')
                                ? 'date'
                                : normHeader.includes('dienthoai') || normHeader.includes('phone') || normHeader.includes('sdt')
                                    ? 'phone'
                                    : 'text';
                            newColumnsToAdd.push({ name: keyName, label: header, type: inferredType, isCustom: true });
                        }
                    }
                }
            });

            // Read rows
            for (let r = startRow; r < rawJson.length; r++) {
                const row = rawJson[r];
                if (!row || row.length === 0) continue;

                // Skip if all columns are empty
                if (row.every(cell => cell === null || cell === undefined || String(cell).trim() === "")) continue;

                const trainee = {
                    tenThanh: "",
                    hoTen: "",
                    gioiTinh: "Nữ", // default fallback
                    giaoXu: "",
                    teamId: null
                };

                let isMale = false;
                let isFemale = false;

                headers.forEach((header, colIdx) => {
                    const cellVal = row[colIdx];
                    const cellStr = cellVal !== undefined && cellVal !== null ? String(cellVal).trim() : "";
                    const destField = mappings[header];

                    if (destField) {
                        if (destField === 'NAM_FLAG') {
                            if (cellStr && cellStr.toLowerCase() !== 'false' && cellStr !== '0' && cellStr !== '') {
                                isMale = true;
                            }
                        } else if (destField === 'NU_FLAG') {
                            if (cellStr && cellStr.toLowerCase() !== 'false' && cellStr !== '0' && cellStr !== '') {
                                isFemale = true;
                            }
                        } else if (destField === 'teamId') {
                            const tNum = parseInt(cellStr);
                            trainee.teamId = isNaN(tNum) ? null : tNum;
                        } else {
                            trainee[destField] = cellStr;
                        }
                    }
                });

                // Resolve gender flags
                if (isMale) trainee.gioiTinh = 'Nam';
                else if (isFemale) trainee.gioiTinh = 'Nữ';

                // SKIP row if hoTen is empty (filters out empty lines or footer/summary rows in Excel)
                if (!trainee.hoTen || trainee.hoTen.trim() === "") {
                    continue;
                }

                importedTrainees.push(trainee);
            }

            if (importedTrainees.length > 0) {
                // Initialize scan parameters
                setIsScanning(true);
                setScanProgress(0);
                setScanStep('reading');

                const totalRow = importedTrainees.length;
                const maleCount = importedTrainees.filter(t => t.gioiTinh === 'Nam').length;
                const femaleCount = importedTrainees.filter(t => t.gioiTinh === 'Nữ').length;

                setScanResults({
                    trainees: importedTrainees,
                    newColumns: newColumnsToAdd,
                    mappings: mappings,
                    headers: headers,
                    stats: {
                        total: totalRow,
                        male: maleCount,
                        female: femaleCount
                    }
                });

                // Run visual scanning simulation
                let progress = 0;
                const interval = setInterval(() => {
                    progress += 4;
                    if (progress <= 30) {
                        setScanStep('reading');
                    } else if (progress <= 70) {
                        setScanStep('analyzing');
                    } else if (progress < 100) {
                        setScanStep('optimizing');
                    } else {
                        progress = 100;
                        setScanStep('mapped');
                        clearInterval(interval);
                    }
                    setScanProgress(progress);
                }, 60);
            } else {
                notify?.({ type: 'warning', title: 'Không có dữ liệu hợp lệ', message: 'Không tìm thấy dòng dữ liệu sa mạc sinh hợp lệ.' });
            }
        };

        if (fileType === 'csv' || fileType === 'txt') {
            // Parse CSV directly using PapaParse
            Papa.parse(file, {
                header: false,
                skipEmptyLines: true,
                complete: (results) => {
                    processRawJson(results.data);
                },
                error: (err) => {
                    notify?.({ type: 'error', title: 'Lỗi phân tích CSV', message: err.message });
                }
            });
            e.target.value = ''; // Reset input
        } else {
            // Excel mode: XLSX to parse sheet, then convert to CSV, then run through PapaParse for robust line mapping!
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const data = new Uint8Array(event.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const firstSheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[firstSheetName];

                    // Convert first sheet to CSV
                    const csvContent = XLSX.utils.sheet_to_csv(worksheet);

                    // Parse sheet output through PapaParse to fix escaped cells and newlines
                    Papa.parse(csvContent, {
                        header: false,
                        skipEmptyLines: true,
                        complete: (results) => {
                            processRawJson(results.data);
                        },
                        error: (err) => {
                            notify?.({ type: 'error', title: 'Lỗi tối ưu hóa Excel', message: err.message });
                        }
                    });
                } catch (err) {
                    console.error(err);
                    notify?.({ type: 'error', title: 'Lỗi phân tích Excel', message: err.message });
                } finally {
                    e.target.value = ''; // Reset input
                }
            };
            reader.readAsArrayBuffer(file);
        }
    };

    const handleArrowNav = (e, rowIndex, colIndex) => {
        e.preventDefault();
        const move = (nextRow, nextCol) => {
            const boundedRow = Math.max(0, Math.min(filteredTrainees.length - 1, nextRow));
            const boundedCol = Math.max(0, Math.min(columns.length - 1, nextCol));
            setSelectedCell({ rowIndex: boundedRow, colIndex: boundedCol });
            focusCell(boundedRow, boundedCol);
        };

        if (e.key === 'ArrowDown') move(rowIndex + 1, colIndex);
        else if (e.key === 'ArrowUp') move(rowIndex - 1, colIndex);
        else if (e.key === 'ArrowRight') move(rowIndex, colIndex + 1);
        else if (e.key === 'ArrowLeft') move(rowIndex, colIndex - 1);
    };

    const handlePaste = async (e, startRowIndex, startColIndex) => {
        const text = e.clipboardData.getData('text/plain');
        if (!text) return;
        e.preventDefault();

        const rows = text.replace(/\r/g, '').split('\n');
        if (rows[rows.length - 1] === '') rows.pop();
        const updates = [];

        rows.forEach((rowText, rowOffset) => {
            const trainee = filteredTrainees[startRowIndex + rowOffset];
            if (!trainee) return;

            const cells = rowText.split('\t');
            const updateData = {};

            cells.forEach((cellText, colOffset) => {
                const col = columns[startColIndex + colOffset];
                if (!col) return;
                updateData[col.name] = normalizeCellValue(cellText, col);
            });

            if (Object.keys(updateData).length > 0) {
                updates.push(dbService.updateTrainee(trainee._id, updateData));
            }
        });

        try {
            await Promise.all(updates);
            onRefresh();
        } catch (err) {
            notify?.({ type: 'error', title: 'Lỗi dán dữ liệu', message: err.message });
        }
    };

    const applyPassFailBulk = async (statusOverride = passFailBulk.status) => {
        const targetColumn = passFailColumns.find(col => col.name === passFailBulk.columnName) || passFailColumns[0];
        if (!targetColumn) {
            notify?.({ type: 'warning', title: 'Chưa có cột Đạt/Không đạt', message: 'Hãy đổi một cột sang định dạng Đạt/Không đạt trước.' });
            return;
        }

        if (passFailScopeRows.length === 0) {
            notify?.({ type: 'warning', title: 'Không có dữ liệu phù hợp', message: 'Phạm vi đang chọn không có sa mạc sinh nào.' });
            return;
        }

        const status = normalizePassFailValue(statusOverride);
        const reasonNote = status === 'Không đạt' ? buildFailReasonNote(passFailBulk.reasons) : '';

        try {
            await Promise.all(passFailScopeRows.map(trainee => {
                const updateData = { [targetColumn.name]: status };
                if (status === 'Không đạt') {
                    updateData.ghiChu = mergeNote(trainee.ghiChu, reasonNote);
                }
                return dbService.updateTrainee(trainee._id, updateData);
            }));

            notify?.({
                type: 'success',
                title: 'Đã cập nhật kết quả',
                message: `Đã đặt "${status}" cho ${passFailScopeRows.length} sa mạc sinh.`
            });
            onRefresh();
        } catch (err) {
            notify?.({ type: 'error', title: 'Lỗi cập nhật kết quả', message: err.message });
        }
    };

    // Clear DB
    const handleClearDatabase = async () => {
        confirmToast?.('Hành động này sẽ XÓA TOÀN BỘ danh sách sa mạc sinh và cấu hình các cột. Tiếp tục?', async () => {
            try {
                await dbService.clearAllData();
                onRefresh();
                notify?.({ type: 'success', title: 'Đã xóa dữ liệu', message: 'Đã xóa sạch cơ sở dữ liệu hệ thống.' });
            } catch (err) {
                notify?.({ type: 'error', title: 'Lỗi xóa dữ liệu', message: err.message });
            }
        }, 'Xóa tất cả dữ liệu');
    };

    return (
        <div>
            <PrintLetterhead title={DEFAULT_LIST_TITLE} />

            <div className="toolbar no-print">
                <div className="toolbar-group">
                    <div className="search-wrapper">
                        <span className="search-icon">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                        </span>
                        <input
                            type="text"
                            className="input-control search-input"
                            placeholder="Tìm tên thánh, họ tên, giáo xứ..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>

                <div className="toolbar-group">
                    <button className="btn btn-secondary" onClick={() => fileInputRef.current.click()} style={{ width: 'auto' }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                        Nhập Excel/CSV
                    </button>
                    <input
                        type="file"
                        ref={fileInputRef}
                        style={{ display: 'none' }}
                        accept=".xlsx,.xls,.csv"
                        onChange={handleExcelImport}
                    />

                    <button className="btn btn-secondary" onClick={() => setShowAddTrainee(true)} style={{ width: 'auto' }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                        Thêm Sa Mạc Sinh
                    </button>

                    <button className="btn btn-secondary" onClick={() => setShowAddColumn(true)} style={{ width: 'auto' }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="12" y1="3" x2="12" y2="21"/><line x1="3" y1="12" x2="21" y2="12"/></svg>
                        Thêm Cột Mới
                    </button>

                    <button className="btn btn-secondary" onClick={() => setShowPassFailSettings(prev => !prev)} style={{ width: 'auto' }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                        Thiết lập Đạt/Không đạt
                    </button>

                    <button className="btn btn-success" onClick={() => window.print()} style={{ width: 'auto' }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                        In danh sách
                    </button>

                    <button className="btn btn-danger" onClick={handleClearDatabase} style={{ width: 'auto' }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                        Xóa Tất Cả
                    </button>
                </div>
            </div>

            {showPassFailSettings && (
                <div className="glass-panel passfail-settings-panel no-print">
                    <div className="passfail-settings-header">
                        <div>
                            <strong>Thiết lập Đạt/Không đạt</strong>
                            <span>{passFailScopeRows.length} sa mạc sinh trong phạm vi hiện tại</span>
                        </div>
                        <button type="button" className="modal-close" onClick={() => setShowPassFailSettings(false)}>&times;</button>
                    </div>
                    <div className="passfail-settings-grid">
                        <div className="form-group">
                            <label className="form-label">Cột kết quả</label>
                            <select
                                className="input-control"
                                value={passFailBulk.columnName}
                                onChange={(e) => setPassFailBulk(prev => ({ ...prev, columnName: e.target.value }))}
                            >
                                {passFailColumns.length === 0 ? (
                                    <option value="">Chưa có cột Đạt/Không đạt</option>
                                ) : (
                                    passFailColumns.map(col => <option key={col.name} value={col.name}>{col.label}</option>)
                                )}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Phạm vi</label>
                            <select
                                className="input-control"
                                value={passFailBulk.scope}
                                onChange={(e) => setPassFailBulk(prev => ({ ...prev, scope: e.target.value, scopeValue: '' }))}
                            >
                                <option value="all">Toàn bộ danh sách</option>
                                <option value="team">Theo đội</option>
                                <option value="unassigned">Chưa chia đội</option>
                                <option value="parish">Theo giáo xứ</option>
                                <option value="gender">Theo giới tính</option>
                            </select>
                        </div>
                        {passFailBulk.scope === 'team' && (
                            <div className="form-group">
                                <label className="form-label">Chọn đội</label>
                                <select className="input-control" value={passFailBulk.scopeValue} onChange={(e) => setPassFailBulk(prev => ({ ...prev, scopeValue: e.target.value }))}>
                                    <option value="">Chọn đội...</option>
                                    {teamOptions.map(teamId => <option key={teamId} value={teamId}>Đội {teamId}</option>)}
                                </select>
                            </div>
                        )}
                        {passFailBulk.scope === 'parish' && (
                            <div className="form-group">
                                <label className="form-label">Chọn giáo xứ</label>
                                <select className="input-control" value={passFailBulk.scopeValue} onChange={(e) => setPassFailBulk(prev => ({ ...prev, scopeValue: e.target.value }))}>
                                    <option value="">Chọn giáo xứ...</option>
                                    {parishOptions.map(parish => <option key={parish} value={parish}>{parish}</option>)}
                                </select>
                            </div>
                        )}
                        {passFailBulk.scope === 'gender' && (
                            <div className="form-group">
                                <label className="form-label">Chọn giới tính</label>
                                <select className="input-control" value={passFailBulk.scopeValue} onChange={(e) => setPassFailBulk(prev => ({ ...prev, scopeValue: e.target.value }))}>
                                    <option value="">Chọn giới tính...</option>
                                    <option value="Nam">Nam</option>
                                    <option value="Nữ">Nữ</option>
                                </select>
                            </div>
                        )}
                    </div>
                    <div className="passfail-option-row">
                        <button type="button" className="passfail-option-btn pass" onClick={() => applyPassFailBulk('Đạt')}>Đạt hết phạm vi</button>
                        <button type="button" className="passfail-option-btn fail" onClick={() => setPassFailBulk(prev => ({ ...prev, status: 'Không đạt' }))}>Không đạt...</button>
                        <button type="button" className="passfail-option-btn clear" onClick={() => applyPassFailBulk('')}>Bỏ chọn hết phạm vi</button>
                    </div>
                    {passFailBulk.status === 'Không đạt' && (
                        <div className="fail-reason-panel bulk-fail-panel">
                            <label><input type="checkbox" checked={passFailBulk.reasons.notEnoughScore} onChange={(e) => setPassFailBulk(prev => ({ ...prev, reasons: { ...prev.reasons, notEnoughScore: e.target.checked } }))} /> Không đủ điểm</label>
                            <label><input type="checkbox" checked={passFailBulk.reasons.notEnoughAge} onChange={(e) => setPassFailBulk(prev => ({ ...prev, reasons: { ...prev.reasons, notEnoughAge: e.target.checked } }))} /> Không đủ tuổi</label>
                            <label><input type="checkbox" checked={passFailBulk.reasons.other} onChange={(e) => setPassFailBulk(prev => ({ ...prev, reasons: { ...prev.reasons, other: e.target.checked } }))} /> Lý do khác</label>
                            {passFailBulk.reasons.other && (
                                <input className="input-control" value={passFailBulk.reasons.otherText} onChange={(e) => setPassFailBulk(prev => ({ ...prev, reasons: { ...prev.reasons, otherText: e.target.value } }))} placeholder="Nhập lý do khác..." />
                            )}
                            <button type="button" className="btn btn-danger" onClick={() => applyPassFailBulk('Không đạt')} style={{ width: 'auto' }}>Áp dụng Không đạt</button>
                        </div>
                    )}
                </div>
            )}

            <div className="table-responsive glass-panel">
                <table>
                    <thead>
                        <tr>
                            <th>STT</th>
                            {columns.map(col => (
                                <ColumnHeaderCell
                                    key={col.name}
                                    col={col}
                                    allColumns={columns}
                                    columnMenu={columnMenu}
                                    setColumnMenu={setColumnMenu}
                                    onRefresh={onRefresh}
                                    notify={notify}
                                    confirmToast={confirmToast}
                                />
                            ))}
                            <th className="no-print" style={{ textAlign: 'center' }}>Hành động</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredTrainees.length === 0 ? (
                            <tr>
                                <td colSpan={columns.length + 2} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px 0' }}>
                                    Không tìm thấy sa mạc sinh nào.
                                </td>
                            </tr>
                        ) : (
                            filteredTrainees.map((trainee, idx) => (
                                <tr key={trainee._id}>
                                    <td>{idx + 1}</td>
                                    {columns.map((col, colIndex) => {
                                        const isSelected = selectedCell?.rowIndex === idx && selectedCell?.colIndex === colIndex;
                                        return (
                                            <EditableTraineeCell
                                                key={col.name}
                                                trainee={trainee}
                                                col={col}
                                                notify={notify}
                                                onRefresh={onRefresh}
                                                cellRef={(el) => { cellRefs.current[`${idx}:${colIndex}`] = el; }}
                                                tabIndex={0}
                                                isSelected={isSelected}
                                                onSelect={() => setSelectedCell({ rowIndex: idx, colIndex })}
                                                onArrowNav={(e) => handleArrowNav(e, idx, colIndex)}
                                                onPaste={(e) => handlePaste(e, idx, colIndex)}
                                            />
                                        );
                                    })}
                                    <td className="no-print" style={{ textAlign: 'center' }}>
                                        <DeleteTraineeButton trainee={trainee} onRefresh={onRefresh} notify={notify} confirmToast={confirmToast} />
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* MODAL: ADD TRAINEE */}
            {showAddTrainee && (
                <AddTraineeModal
                    columns={columns}
                    onClose={() => setShowAddTrainee(false)}
                    onRefresh={onRefresh}
                    notify={notify}
                />
            )}

            {/* MODAL: ADD COLUMN */}
            {showAddColumn && (
                <AddColumnModal
                    onClose={() => setShowAddColumn(false)}
                    onRefresh={onRefresh}
                    notify={notify}
                />
            )}

            {/* MODAL: SMART SCANNER & PREVIEW */}
            {isScanning && (
                <div className="scan-overlay">
                    <div className="scan-card glass-panel">
                        <div className="modal-header">
                            <h3 className="modal-title">
                                {scanProgress < 100 ? "Hệ thống đang quét phân tích..." : "Nhận diện dữ liệu thông minh"}
                            </h3>
                            {scanProgress === 100 && (
                                <button className="modal-close" onClick={handleCancelImport}>&times;</button>
                            )}
                        </div>

                        {scanProgress < 100 ? (
                            <div className="scanner-animation-wrapper">
                                <div className="scanner-box">
                                    <div className="scanner-laser"></div>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="scanner-icon-svg">
                                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                        <polyline points="14 2 14 8 20 8" />
                                        <line x1="16" y1="13" x2="8" y2="13" />
                                        <line x1="16" y1="17" x2="8" y2="17" />
                                        <polyline points="10 9 9 9 8 9" />
                                    </svg>
                                </div>
                                <div className="scanner-status-text">
                                    {scanStep === 'reading' && "Đang đọc cấu trúc tệp dữ liệu..."}
                                    {scanStep === 'analyzing' && "Đang đối chiếu nhận diện trường thông tin..."}
                                    {scanStep === 'optimizing' && "Đang tối ưu cấu trúc NoSQL và loại bỏ dòng rỗng..."}
                                </div>
                                <div className="scanner-substatus">
                                    Phân tích {scanResults?.stats.total || 0} dòng dữ liệu...
                                </div>
                                <div className="scanner-progress-container">
                                    <div className="scanner-progress-bar" style={{ width: `${scanProgress}%` }}></div>
                                </div>
                                <div style={{ fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--primary)' }}>
                                    {scanProgress}%
                                </div>
                            </div>
                        ) : (
                            <div className="scan-results-container">
                                {/* Statistics Summary */}
                                <div className="scan-summary-grid">
                                    <div className="scan-summary-card">
                                        <div className="scan-summary-val">{scanResults.stats.total}</div>
                                        <div className="scan-summary-lbl">Dòng dữ liệu hợp lệ</div>
                                    </div>
                                    <div className="scan-summary-card">
                                        <div className="scan-summary-val" style={{ color: '#3b82f6' }}>{scanResults.stats.male}</div>
                                        <div className="scan-summary-lbl">Nam sinh (được nhận dạng)</div>
                                    </div>
                                    <div className="scan-summary-card">
                                        <div className="scan-summary-val" style={{ color: '#ec4899' }}>{scanResults.stats.female}</div>
                                        <div className="scan-summary-lbl">Nữ sinh (được nhận dạng)</div>
                                    </div>
                                </div>

                                {/* Columns mapping results */}
                                <div className="scan-mapping-section">
                                    {/* Mapped columns */}
                                    <div className="scan-mapping-card">
                                        <div className="scan-mapping-title">Trường thông tin nhận dạng</div>
                                        <div className="scan-mapping-list">
                                            {Object.entries(scanResults.mappings)
                                                .filter((entry) => entry[1] !== 'NAM_FLAG' && entry[1] !== 'NU_FLAG')
                                                .map(([src, dest]) => {
                                                    const colLabel = columns.find(c => c.name === dest)?.label || dest;
                                                    return (
                                                        <div key={src} className="scan-mapping-item">
                                                            <span className="label-excel">{src}</span>
                                                            <span className="arrow">➔</span>
                                                            <span className="label-db">{colLabel}</span>
                                                        </div>
                                                    );
                                                })}
                                            {/* Nam/Nữ flags mapped to Gender */}
                                            {Object.entries(scanResults.mappings)
                                                .filter((entry) => entry[1] === 'NAM_FLAG' || entry[1] === 'NU_FLAG')
                                                .slice(0, 1)
                                                .map(([src]) => (
                                                    <div key={src} className="scan-mapping-item">
                                                        <span className="label-excel">Nam / Nữ</span>
                                                        <span className="arrow">➔</span>
                                                        <span className="label-db">GIỚI TÍNH</span>
                                                    </div>
                                                ))}
                                        </div>
                                    </div>

                                    {/* New / Custom columns */}
                                    <div className="scan-mapping-card">
                                        <div className="scan-mapping-title">Cột dữ liệu tự động thêm mới</div>
                                        <div className="scan-mapping-list">
                                            {scanResults.newColumns.length === 0 ? (
                                                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic', textAlign: 'center', padding: '20px 0' }}>
                                                    Không có cột mới (Trùng khớp 100% cột mặc định)
                                                </div>
                                            ) : (
                                                scanResults.newColumns.map(col => (
                                                    <div key={col.name} className="scan-mapping-item">
                                                        <span className="label-excel">{col.label}</span>
                                                        <span className="arrow">➔</span>
                                                        <span className="label-custom">TẠO CỘT ĐỘNG (NoSQL)</span>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Preview Grid (top 3) */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Xem trước kết quả nhận diện</div>
                                    <div className="scan-preview-table-container">
                                        <table className="scan-preview-table">
                                            <thead>
                                                <tr>
                                                    <th>Tên Thánh</th>
                                                    <th>Họ và Tên</th>
                                                    <th>Giới Tính</th>
                                                    <th>Giáo Xứ</th>
                                                    <th>Đội</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {scanResults.trainees.slice(0, 3).map((t, idx) => (
                                                    <tr key={idx}>
                                                        <td>{t.tenThanh || <span style={{ color: 'var(--text-muted)' }}>--</span>}</td>
                                                        <td style={{ fontWeight: 'bold' }}>{t.hoTen}</td>
                                                        <td>{t.gioiTinh}</td>
                                                        <td>{t.giaoXu || <span style={{ color: 'var(--text-muted)' }}>--</span>}</td>
                                                        <td>{t.teamId ? `Đội ${t.teamId}` : <span style={{ color: 'var(--text-muted)' }}>Chưa chia</span>}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '10px' }}>
                                    <button className="btn btn-secondary" onClick={handleCancelImport}>Hủy bỏ</button>
                                    <button className="btn btn-success" onClick={handleConfirmImport}>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                                        Lưu vào cơ sở dữ liệu
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
