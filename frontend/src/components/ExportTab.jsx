import { useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import logoImg from '../LOGO/LOGO.jpg';
import robotoRegularUrl from '../assets/fonts/Roboto-Regular.ttf?url';
import robotoBoldUrl from '../assets/fonts/Roboto-Bold.ttf?url';
import { ORG_NAME, DIOCESE_NAME, CAMP_EVENT_LINE, DEFAULT_LIST_TITLE } from '../constants/branding';
import { getColumnType, normalizePassFailValue } from '../utils/columnTypes';

const DEFAULT_EXPORT_NAME = 'Danh_Sach_Sa_Mac_Sinh_Hored_9';

export default function ExportTab({ trainees, columns, notify }) {
    const [filters, setFilters] = useState({
        search: '',
        gender: 'all',
        teamStatus: 'all',
        teamId: 'all',
        parish: 'all',
        deanery: 'all',
        unit: 'all',
        result: 'all',
        dataQuality: 'all'
    });
    const [exportFormat, setExportFormat] = useState('xlsx');
    const [fileName, setFileName] = useState(DEFAULT_EXPORT_NAME);
    const [selectedColumns, setSelectedColumns] = useState({});
    const [sortMode, setSortMode] = useState('team_name');
    const [listTitle, setListTitle] = useState(DEFAULT_LIST_TITLE);

    // Auto-detect the camp's pass/fail column (e.g. "Kết quả Sa mạc") so the
    // smart filter below works for any board, not just a hardcoded name.
    const resultColumn = useMemo(
        () => columns.find(col => getColumnType(col) === 'passfail'),
        [columns]
    );

    const values = useMemo(() => {
        const cleanUnique = (field) => [...new Set(trainees.map(t => t[field]).filter(Boolean))]
            .sort((a, b) => String(a).localeCompare(String(b), 'vi'));
        const teamIds = [...new Set(trainees.map(t => t.teamId).filter(Boolean))]
            .map(Number)
            .sort((a, b) => a - b);

        return {
            parishes: cleanUnique('giaoXu'),
            deaneries: cleanUnique('giaoHat'),
            units: cleanUnique('don'),
            teamIds
        };
    }, [trainees]);

    const selectedColumnNames = useMemo(() => {
        return columns
            .filter(col => selectedColumns[col.name] !== false)
            .map(col => col.name);
    }, [columns, selectedColumns]);

    const activeExportColumns = columns.filter(col => selectedColumnNames.includes(col.name));

    const filteredTrainees = useMemo(() => {
        const query = filters.search.trim().toLowerCase();

        const rows = trainees.filter(t => {
            if (query) {
                const haystack = [
                    t.tenThanh,
                    t.hoTen,
                    t.gioiTinh,
                    t.giaoXu,
                    t.giaoHat,
                    t.don,
                    t.dienThoai,
                    t.teamId ? `đội ${t.teamId}` : ''
                ].filter(Boolean).join(' ').toLowerCase();
                if (!haystack.includes(query)) return false;
            }

            if (filters.gender !== 'all' && t.gioiTinh !== filters.gender) return false;
            if (filters.teamStatus === 'has_team' && !t.teamId) return false;
            if (filters.teamStatus === 'no_team' && t.teamId) return false;
            if (filters.teamId !== 'all' && String(t.teamId || '') !== filters.teamId) return false;
            if (filters.parish !== 'all' && t.giaoXu !== filters.parish) return false;
            if (filters.deanery !== 'all' && t.giaoHat !== filters.deanery) return false;
            if (filters.unit !== 'all' && t.don !== filters.unit) return false;

            if (filters.result !== 'all' && resultColumn) {
                const status = normalizePassFailValue(t[resultColumn.name]);
                if (filters.result === 'pass' && status !== 'Đạt') return false;
                if (filters.result === 'fail' && status !== 'Không đạt') return false;
                if (filters.result === 'none' && status) return false;
            }

            if (filters.dataQuality === 'missing_phone' && t.dienThoai) return false;
            if (filters.dataQuality === 'missing_dob' && t.ngaySinh) return false;
            if (filters.dataQuality === 'missing_address' && t.diaChi) return false;

            return true;
        });

        return rows.sort((a, b) => {
            if (sortMode === 'name') return (a.hoTen || '').localeCompare(b.hoTen || '', 'vi');
            if (sortMode === 'parish_name') {
                const parishSort = (a.giaoXu || '').localeCompare(b.giaoXu || '', 'vi');
                return parishSort || (a.hoTen || '').localeCompare(b.hoTen || '', 'vi');
            }
            if (sortMode === 'gender_name') {
                const genderSort = (a.gioiTinh || '').localeCompare(b.gioiTinh || '', 'vi');
                return genderSort || (a.hoTen || '').localeCompare(b.hoTen || '', 'vi');
            }
            if (sortMode === 'dob') {
                const toComparable = (v) => {
                    const m = String(v || '').match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
                    return m ? `${m[3]}${m[2]}${m[1]}` : '99999999';
                };
                return toComparable(a.ngaySinh).localeCompare(toComparable(b.ngaySinh)) || (a.hoTen || '').localeCompare(b.hoTen || '', 'vi');
            }

            const teamSort = Number(a.teamId || 9999) - Number(b.teamId || 9999);
            return teamSort || (a.hoTen || '').localeCompare(b.hoTen || '', 'vi');
        });
    }, [filters, sortMode, trainees, resultColumn]);

    const setFilter = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    const handleColumnToggle = (colName) => {
        setSelectedColumns(prev => ({
            ...prev,
            [colName]: prev[colName] === false
        }));
    };

    const selectColumns = (mode) => {
        if (mode === 'all') {
            setSelectedColumns({});
            return;
        }

        const next = {};
        columns.forEach(col => {
            next[col.name] = false;
        });

        const presets = {
            basic: ['tenThanh', 'hoTen', 'gioiTinh', 'teamId', 'giaoXu'],
            contact: ['tenThanh', 'hoTen', 'ngaySinh', 'diaChi', 'dienThoai', 'giaoXu', 'giaoHat'],
            team: ['tenThanh', 'hoTen', 'gioiTinh', 'teamId', 'giaoXu'],
            result: ['tenThanh', 'hoTen', 'teamId', 'giaoXu', resultColumn?.name, 'ghiChu'].filter(Boolean)
        };

        (presets[mode] || []).forEach(name => {
            next[name] = true;
        });

        setSelectedColumns(next);
    };

    const formatValue = (trainee, col) => {
        let value = trainee[col.name];
        if (value === null || value === undefined) return '';
        if (col.name === 'teamId') return value ? `Đội ${value}` : 'Chưa chia';
        if (typeof value === 'boolean') return value ? 'Có' : '';
        return value;
    };

    const exportTitle = () => (listTitle.trim() || DEFAULT_LIST_TITLE).toUpperCase();

    const buildRows = () => filteredTrainees.map((trainee, index) => {
        const row = { STT: index + 1 };
        activeExportColumns.forEach(col => {
            row[col.label] = formatValue(trainee, col);
        });
        return row;
    });

    const buildSheetRows = () => {
        const headers = ['STT', ...activeExportColumns.map(col => col.label)];
        const rows = filteredTrainees.map((trainee, index) => [
            index + 1,
            ...activeExportColumns.map(col => formatValue(trainee, col))
        ]);

        return [
            ['LOGO'],
            [ORG_NAME],
            [DIOCESE_NAME],
            [CAMP_EVENT_LINE],
            [],
            [exportTitle()],
            [],
            headers,
            ...rows
        ];
    };

    const safeFileName = () => (fileName.trim() || DEFAULT_EXPORT_NAME)
        .replace(/[\\/:*?"<>|]/g, '_');

    const saveBlob = (content, mimeType, extension) => {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${safeFileName()}.${extension}`;
        link.click();
        URL.revokeObjectURL(url);
    };

    const escapeHtml = (value) => String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

    const getLogoDataUrl = async () => {
        try {
            const response = await fetch(logoImg);
            const blob = await response.blob();
            return await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
        } catch {
            return logoImg;
        }
    };

    // jsPDF's built-in fonts (helvetica/times/courier) can't render Vietnamese
    // diacritics correctly, so a Unicode-capable font (Roboto, Vietnamese
    // subset included) is embedded at export time. Returns the raw base64
    // payload jsPDF's VFS expects (no "data:font/ttf;base64," prefix).
    const fetchFontBase64 = async (url) => {
        const response = await fetch(url);
        const blob = await response.blob();
        return await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    };

    const buildReportHtml = (logoSrc) => {
        const headers = ['STT', ...activeExportColumns.map(col => col.label)];
        const rows = filteredTrainees.map((trainee, index) => [
            index + 1,
            ...activeExportColumns.map(col => formatValue(trainee, col))
        ]);

        return `<!doctype html>
<html>
<head>
    <meta charset="utf-8">
    <title>${escapeHtml(exportTitle())}</title>
    <style>
        body { font-family: Arial, sans-serif; color: #111827; margin: 24px; background: #ffffff; }
        .report-header { text-align: center; margin-bottom: 18px; }
        .report-logo { width: 76px; height: 76px; object-fit: contain; display: block; margin: 0 auto 8px; }
        .org-name { font-size: 14px; font-weight: 700; text-transform: uppercase; margin-bottom: 4px; }
        .camp-name { font-size: 13px; font-weight: 600; margin-bottom: 14px; }
        .list-title { font-size: 16px; font-weight: 800; text-transform: uppercase; margin-top: 12px; }
        table { border-collapse: collapse; width: 100%; font-size: 12px; }
        th, td { border: 1px solid #cbd5e1; padding: 6px 8px; vertical-align: top; }
        th { background: #e5e7eb; font-weight: 700; text-align: center; }
        td:first-child { text-align: center; }
        tr:nth-child(even) td { background: #f8fafc; }
    </style>
</head>
<body>
    <div class="report-header">
        <img class="report-logo" src="${logoSrc}" alt="Logo">
        <div class="org-name">${escapeHtml(ORG_NAME)}</div>
        <div class="org-name">${escapeHtml(DIOCESE_NAME)}</div>
        <div class="camp-name">${escapeHtml(CAMP_EVENT_LINE)}</div>
        <div class="list-title">${escapeHtml(exportTitle())}</div>
    </div>
    <table>
        <thead><tr>${headers.map(header => `<th>${escapeHtml(header)}</th>`).join('')}</tr></thead>
        <tbody>
            ${rows.map(row => `<tr>${row.map(cell => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`).join('')}
        </tbody>
    </table>
</body>
</html>`;
    };

    const buildPdf = async () => {
        const headers = ['STT', ...activeExportColumns.map(col => col.label)];
        const rows = filteredTrainees.map((trainee, index) => [
            index + 1,
            ...activeExportColumns.map(col => String(formatValue(trainee, col) ?? ''))
        ]);

        const orientation = activeExportColumns.length > 5 ? 'landscape' : 'portrait';
        const doc = new jsPDF({ orientation, unit: 'pt', format: 'a4' });

        const [regularBase64, boldBase64, logoDataUrl] = await Promise.all([
            fetchFontBase64(robotoRegularUrl),
            fetchFontBase64(robotoBoldUrl),
            getLogoDataUrl()
        ]);

        doc.addFileToVFS('Roboto-Regular.ttf', regularBase64);
        doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
        doc.addFileToVFS('Roboto-Bold.ttf', boldBase64);
        doc.addFont('Roboto-Bold.ttf', 'Roboto', 'bold');
        doc.setFont('Roboto', 'normal');

        const pageWidth = doc.internal.pageSize.getWidth();
        let y = 32;

        if (logoDataUrl && logoDataUrl.startsWith('data:image')) {
            try {
                const imgProps = doc.getImageProperties(logoDataUrl);
                const imgWidth = 46;
                const imgHeight = (imgProps.height / imgProps.width) * imgWidth;
                doc.addImage(logoDataUrl, imgProps.fileType, pageWidth / 2 - imgWidth / 2, y, imgWidth, imgHeight);
                y += imgHeight + 10;
            } catch {
                // Logo failed to decode — letterhead text still renders below.
            }
        }

        doc.setFont('Roboto', 'bold');
        doc.setFontSize(13);
        doc.text(ORG_NAME, pageWidth / 2, y, { align: 'center' });
        y += 16;
        doc.text(DIOCESE_NAME, pageWidth / 2, y, { align: 'center' });
        y += 16;

        doc.setFont('Roboto', 'normal');
        doc.setFontSize(10.5);
        doc.text(CAMP_EVENT_LINE, pageWidth / 2, y, { align: 'center' });
        y += 22;

        doc.setFont('Roboto', 'bold');
        doc.setFontSize(14);
        doc.text(exportTitle(), pageWidth / 2, y, { align: 'center' });
        y += 16;

        autoTable(doc, {
            startY: y,
            head: [headers],
            body: rows,
            margin: { left: 24, right: 24 },
            styles: { font: 'Roboto', fontStyle: 'normal', fontSize: 8.5, cellPadding: 4 },
            headStyles: { font: 'Roboto', fontStyle: 'bold', fillColor: [229, 231, 235], textColor: [17, 24, 39], halign: 'center' },
            columnStyles: { 0: { halign: 'center', cellWidth: 28 } }
        });

        doc.save(`${safeFileName()}.pdf`);
    };

    const handleExport = async () => {
        if (filteredTrainees.length === 0) {
            notify?.({ type: 'warning', title: 'Không có dữ liệu', message: 'Không có dữ liệu phù hợp để xuất bản.' });
            return;
        }

        if (activeExportColumns.length === 0) {
            notify?.({ type: 'warning', title: 'Chưa chọn cột', message: 'Vui lòng chọn ít nhất 1 cột thông tin để xuất bản.' });
            return;
        }

        if (exportFormat === 'pdf') {
            try {
                await buildPdf();
                notify?.({ type: 'success', title: 'Đã xuất file', message: `Đã xuất ${filteredTrainees.length} dòng dữ liệu.` });
            } catch (err) {
                console.error(err);
                notify?.({ type: 'error', title: 'Lỗi xuất PDF', message: err.message });
            }
            return;
        }

        const exportRows = buildRows();
        const sheetRows = buildSheetRows();
        const worksheet = XLSX.utils.aoa_to_sheet(sheetRows);
        const workbook = XLSX.utils.book_new();
        const columnCount = Math.max(1, activeExportColumns.length + 1);
        // Official letterhead rows: LOGO(0), ORG_NAME(1), DIOCESE_NAME(2),
        // CAMP_EVENT_LINE(3), blank(4), TITLE(5), blank(6), headers(7), data(8+).
        const LETTERHEAD_ROWS = [0, 1, 2, 3, 5];
        const HEADER_ROW = 7;
        worksheet['!merges'] = LETTERHEAD_ROWS.map(r => ({ s: { r, c: 0 }, e: { r, c: columnCount - 1 } }));
        worksheet['!cols'] = Array.from({ length: columnCount }, (_, index) => ({
            wch: index === 0 ? 8 : 18
        }));
        worksheet['!rows'] = [
            { hpt: 42 },
            { hpt: 22 },
            { hpt: 20 },
            { hpt: 18 },
            { hpt: 8 },
            { hpt: 24 },
            { hpt: 8 }
        ];

        for (let row = 0; row < sheetRows.length; row++) {
            for (let col = 0; col < columnCount; col++) {
                const address = XLSX.utils.encode_cell({ r: row, c: col });
                if (!worksheet[address]) continue;

                if (LETTERHEAD_ROWS.includes(row)) {
                    worksheet[address].s = {
                        font: { bold: true, sz: row === 5 ? 14 : 12 },
                        alignment: { horizontal: 'center', vertical: 'center', wrapText: true }
                    };
                } else if (row === HEADER_ROW) {
                    worksheet[address].s = {
                        font: { bold: true },
                        fill: { fgColor: { rgb: 'E5E7EB' } },
                        alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
                        border: {
                            top: { style: 'thin', color: { rgb: 'CBD5E1' } },
                            bottom: { style: 'thin', color: { rgb: 'CBD5E1' } },
                            left: { style: 'thin', color: { rgb: 'CBD5E1' } },
                            right: { style: 'thin', color: { rgb: 'CBD5E1' } }
                        }
                    };
                } else if (row > HEADER_ROW) {
                    worksheet[address].s = {
                        alignment: { vertical: 'top', wrapText: true },
                        border: {
                            top: { style: 'thin', color: { rgb: 'CBD5E1' } },
                            bottom: { style: 'thin', color: { rgb: 'CBD5E1' } },
                            left: { style: 'thin', color: { rgb: 'CBD5E1' } },
                            right: { style: 'thin', color: { rgb: 'CBD5E1' } }
                        }
                    };
                }
            }
        }

        XLSX.utils.book_append_sheet(workbook, worksheet, 'Hored 9');

        if (exportFormat === 'xlsx') {
            XLSX.writeFile(workbook, `${safeFileName()}.xlsx`);
        } else if (exportFormat === 'csv') {
            XLSX.writeFile(workbook, `${safeFileName()}.csv`, { bookType: 'csv' });
        } else if (exportFormat === 'tsv') {
            const tsv = XLSX.utils.sheet_to_csv(worksheet, { FS: '\t' });
            saveBlob(tsv, 'text/tab-separated-values;charset=utf-8', 'tsv');
        } else if (exportFormat === 'json') {
            saveBlob(JSON.stringify({
                logo: 'LOGO',
                organization: ORG_NAME,
                diocese: DIOCESE_NAME,
                camp: CAMP_EVENT_LINE,
                title: exportTitle(),
                rows: exportRows
            }, null, 2), 'application/json;charset=utf-8', 'json');
        } else if (exportFormat === 'xls') {
            const logoSrc = await getLogoDataUrl();
            saveBlob(buildReportHtml(logoSrc), 'application/vnd.ms-excel;charset=utf-8', 'xls');
        } else {
            const logoSrc = await getLogoDataUrl();
            saveBlob(buildReportHtml(logoSrc), 'text/html;charset=utf-8', 'html');
        }

        notify?.({ type: 'success', title: 'Đã xuất file', message: `Đã xuất ${filteredTrainees.length} dòng dữ liệu.` });
    };

    const previewRows = filteredTrainees.slice(0, 12);

    return (
        <div className="export-workspace">
            <aside className="glass-panel export-controls">
                <h3 className="panel-title">Cấu hình xuất bản</h3>

                <div className="form-group">
                    <label className="form-label">Tìm kiếm</label>
                    <input
                        className="input-control"
                        value={filters.search}
                        onChange={(e) => setFilter('search', e.target.value)}
                        placeholder="Tên, giáo xứ, điện thoại, đội..."
                    />
                </div>

                <div className="export-filter-grid">
                    <div className="form-group">
                        <label className="form-label">Giới tính</label>
                        <select className="input-control" value={filters.gender} onChange={(e) => setFilter('gender', e.target.value)}>
                            <option value="all">Tất cả</option>
                            <option value="Nam">Nam</option>
                            <option value="Nữ">Nữ</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Trạng thái đội</label>
                        <select className="input-control" value={filters.teamStatus} onChange={(e) => setFilter('teamStatus', e.target.value)}>
                            <option value="all">Tất cả</option>
                            <option value="has_team">Đã chia đội</option>
                            <option value="no_team">Chưa chia đội</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Đội cụ thể</label>
                        <select className="input-control" value={filters.teamId} onChange={(e) => setFilter('teamId', e.target.value)}>
                            <option value="all">Tất cả đội</option>
                            {values.teamIds.map(id => <option key={id} value={id}>Đội {id}</option>)}
                        </select>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Giáo xứ</label>
                        <select className="input-control" value={filters.parish} onChange={(e) => setFilter('parish', e.target.value)}>
                            <option value="all">Tất cả</option>
                            {values.parishes.map(value => <option key={value} value={value}>{value}</option>)}
                        </select>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Giáo hạt</label>
                        <select className="input-control" value={filters.deanery} onChange={(e) => setFilter('deanery', e.target.value)}>
                            <option value="all">Tất cả</option>
                            {values.deaneries.map(value => <option key={value} value={value}>{value}</option>)}
                        </select>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Đơn vị</label>
                        <select className="input-control" value={filters.unit} onChange={(e) => setFilter('unit', e.target.value)}>
                            <option value="all">Tất cả</option>
                            {values.units.map(value => <option key={value} value={value}>{value}</option>)}
                        </select>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Kết quả{resultColumn ? ` (${resultColumn.label})` : ''}</label>
                        <select className="input-control" value={filters.result} onChange={(e) => setFilter('result', e.target.value)} disabled={!resultColumn}>
                            <option value="all">Tất cả</option>
                            <option value="pass">Đạt</option>
                            <option value="fail">Không đạt</option>
                            <option value="none">Chưa có kết quả</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Dữ liệu còn thiếu</label>
                        <select className="input-control" value={filters.dataQuality} onChange={(e) => setFilter('dataQuality', e.target.value)}>
                            <option value="all">Không lọc</option>
                            <option value="missing_phone">Thiếu số điện thoại</option>
                            <option value="missing_dob">Thiếu ngày sinh</option>
                            <option value="missing_address">Thiếu địa chỉ</option>
                        </select>
                    </div>
                </div>

                <div className="form-group">
                    <label className="form-label">Sắp xếp</label>
                    <select className="input-control" value={sortMode} onChange={(e) => setSortMode(e.target.value)}>
                        <option value="team_name">Theo đội, rồi họ tên</option>
                        <option value="name">Theo họ tên</option>
                        <option value="parish_name">Theo giáo xứ, rồi họ tên</option>
                        <option value="gender_name">Theo giới tính, rồi họ tên</option>
                        <option value="dob">Theo ngày sinh</option>
                    </select>
                </div>

                <div className="form-group">
                    <label className="form-label">Tên file</label>
                    <input className="input-control" value={fileName} onChange={(e) => setFileName(e.target.value)} />
                </div>

                <div className="form-group">
                    <label className="form-label">Tiêu đề danh sách</label>
                    <input
                        className="input-control"
                        value={listTitle}
                        onChange={(e) => setListTitle(e.target.value)}
                        placeholder={DEFAULT_LIST_TITLE}
                    />
                </div>

                <div className="form-group">
                    <label className="form-label">Định dạng file</label>
                    <select className="input-control" value={exportFormat} onChange={(e) => setExportFormat(e.target.value)}>
                        <option value="xlsx">Excel Workbook (.xlsx)</option>
                        <option value="xls">Excel có logo (.xls)</option>
                        <option value="pdf">PDF có logo (.pdf)</option>
                        <option value="csv">CSV UTF-8 (.csv)</option>
                        <option value="tsv">Tab-separated (.tsv)</option>
                        <option value="json">JSON (.json)</option>
                        <option value="html">HTML Table (.html)</option>
                    </select>
                </div>

                <div className="form-group">
                    <label className="form-label">Bộ cột nhanh</label>
                    <div className="export-preset-row">
                        <button type="button" className="btn btn-secondary compact-btn" onClick={() => selectColumns('all')}>Tất cả</button>
                        <button type="button" className="btn btn-secondary compact-btn" onClick={() => selectColumns('basic')}>Cơ bản</button>
                        <button type="button" className="btn btn-secondary compact-btn" onClick={() => selectColumns('contact')}>Liên hệ</button>
                        <button type="button" className="btn btn-secondary compact-btn" onClick={() => selectColumns('team')}>Đội</button>
                        {resultColumn && (
                            <button type="button" className="btn btn-secondary compact-btn" onClick={() => selectColumns('result')}>Kết quả</button>
                        )}
                    </div>
                </div>

                <div className="form-group">
                    <label className="form-label">Các cột xuất bản</label>
                    <div className="options-list export-column-list">
                        {columns.map(col => (
                            <label className="option-item" key={col.name}>
                                <input
                                    type="checkbox"
                                    checked={selectedColumns[col.name] !== false}
                                    onChange={() => handleColumnToggle(col.name)}
                                />
                                <span className="checkbox-label">{col.label}</span>
                            </label>
                        ))}
                    </div>
                </div>

                <button className="btn btn-success" onClick={handleExport}>
                    Xuất và Tải File
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                </button>
            </aside>

            <section className="glass-panel export-preview">
                <div className="export-preview-header">
                    <h3 className="panel-title">Xem trước dữ liệu xuất</h3>
                    <div className="export-counts">
                        {filteredTrainees.length} dòng khớp · {activeExportColumns.length} cột
                    </div>
                </div>
                <div className="table-responsive export-preview-table">
                    <table>
                        <thead>
                            <tr>
                                <th>STT</th>
                                {activeExportColumns.map(col => <th key={col.name}>{col.label}</th>)}
                            </tr>
                        </thead>
                        <tbody>
                            {previewRows.length === 0 ? (
                                <tr>
                                    <td colSpan={activeExportColumns.length + 1} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px 0' }}>
                                        Không có dữ liệu tương thích.
                                    </td>
                                </tr>
                            ) : (
                                previewRows.map((trainee, index) => (
                                    <tr key={trainee._id}>
                                        <td>{index + 1}</td>
                                        {activeExportColumns.map(col => (
                                            <td key={col.name}>{formatValue(trainee, col)}</td>
                                        ))}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
}
