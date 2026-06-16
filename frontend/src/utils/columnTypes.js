// Shared column-type definitions and value helpers.
// Used by ListTab, StatsTab and TeamsTab so every table in the app
// edits, formats and validates cell values in exactly the same way.

export const COLUMN_TYPES = [
    { value: 'text', label: 'Văn bản' },
    { value: 'date', label: 'Ngày dd/mm/yyyy' },
    { value: 'phone', label: 'Số điện thoại 10 số' },
    { value: 'checkbox', label: 'Checkbox' },
    { value: 'number', label: 'Số' },
    { value: 'score', label: 'Điểm số' },
    { value: 'passfail', label: 'Đạt/Không đạt' }
];

export const DEFAULT_COLUMN_TYPES = {
    ngaySinh: 'date',
    dienThoai: 'phone',
    teamId: 'number',
    ccGlvCap1: 'score',
    ketQuaLyThuyet: 'score',
    diemDanh_C30: 'checkbox',
    diemDanh_S01: 'checkbox',
    diemDanh_C01: 'checkbox',
    diemDanh_S02: 'checkbox',
    diemDanh_C02: 'checkbox',
    diemDanh_S03: 'checkbox',
    diemDanh_C03: 'checkbox',
    diemDanh_S04: 'checkbox',
    diemDanh_C04: 'checkbox',
    cCan: 'score',
    diemTienSM: 'score',
    diemSoKhoa: 'score',
    diemHauSM: 'score',
    diemTB: 'score',
    ketQuaSaMac: 'passfail'
};

export const MAIN_TRAINEE_FIELDS = ['tenThanh', 'hoTen', 'gioiTinh', 'teamId', 'ngaySinh', 'dienThoai', 'diaChi', 'giaoXu', 'giaoHat', 'don'];

export const MAIN_FIELD_LABELS = {
    tenThanh: 'TÊN THÁNH',
    hoTen: 'HỌ VÀ TÊN',
    gioiTinh: 'GIỚI TÍNH',
    teamId: 'ĐỘI',
    ngaySinh: 'NGÀY SINH',
    dienThoai: 'ĐIỆN THOẠI',
    diaChi: 'ĐỊA CHỈ',
    giaoXu: 'GIÁO XỨ',
    giaoHat: 'GIÁO HẠT',
    don: 'ĐƠN'
};

export const getColumnType = (col) => {
    if (!col) return 'text';
    const defaultType = DEFAULT_COLUMN_TYPES[col.name];
    if (defaultType && (!col.type || col.type === 'text')) return defaultType;
    return col.type || defaultType || 'text';
};

export const createEmptyFailReasons = () => ({
    notEnoughScore: false,
    notEnoughAge: false,
    other: false,
    otherText: ''
});

export const formatDateValue = (value) => {
    if (value === null || value === undefined) return '';
    const raw = String(value).trim();
    if (!raw) return '';

    const normalized = raw.replace(/[.-]/g, '/');
    const dmy = normalized.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
    if (dmy) {
        const day = dmy[1].padStart(2, '0');
        const month = dmy[2].padStart(2, '0');
        const year = dmy[3].length === 2 ? `20${dmy[3]}` : dmy[3];
        return `${day}/${month}/${year}`;
    }

    const ymd = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (ymd) return `${ymd[3].padStart(2, '0')}/${ymd[2].padStart(2, '0')}/${ymd[1]}`;

    return raw;
};

export const formatDateForInput = (value) => {
    const formatted = formatDateValue(value);
    const dmy = formatted.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    return dmy ? `${dmy[3]}-${dmy[2]}-${dmy[1]}` : '';
};

export const formatPhoneValue = (value) => {
    if (value === null || value === undefined) return '';
    const digits = String(value).replace(/\D/g, '');
    if (!digits) return '';
    const normalized = digits.length === 9 ? `0${digits}` : digits;
    return normalized.slice(0, 10);
};

export const parseCheckboxValue = (value) => {
    if (typeof value === 'boolean') return value;
    const raw = String(value ?? '').trim().toLowerCase();
    return ['true', '1', 'x', 'yes', 'y', 'co', 'có', 'checked', 'on'].includes(raw);
};

export const normalizePassFailValue = (value) => {
    const raw = String(value ?? '').trim().toLowerCase();
    if (!raw) return '';
    if (['dat', 'đạt', 'pass', 'true', '1'].includes(raw)) return 'Đạt';
    if (['khongdat', 'khôngđạt', 'không đạt', 'fail', 'false', '0'].includes(raw.replace(/\s+/g, ''))) return 'Không đạt';
    return value;
};

export const buildFailReasonNote = (reasons) => {
    const parts = [];
    if (reasons?.notEnoughScore) parts.push('Không đủ điểm');
    if (reasons?.notEnoughAge) parts.push('Không đủ tuổi');
    if (reasons?.other && reasons.otherText?.trim()) parts.push(reasons.otherText.trim());
    if (reasons?.other && !reasons.otherText?.trim()) parts.push('Lý do khác');
    return parts.length ? `Không đạt: ${parts.join('; ')}` : 'Không đạt';
};

export const mergeNote = (currentNote, reasonNote) => {
    const existing = String(currentNote || '').trim();
    if (!existing) return reasonNote;
    if (existing.includes(reasonNote)) return existing;
    return `${existing}\n${reasonNote}`;
};

export const normalizeCellValue = (value, col) => {
    const type = getColumnType(col);
    if (type === 'date') return formatDateValue(value);
    if (type === 'phone') return formatPhoneValue(value);
    if (type === 'checkbox') return parseCheckboxValue(value);
    if (type === 'passfail') return normalizePassFailValue(value);
    if (col.name === 'teamId' || type === 'number' || type === 'score') {
        const raw = String(value ?? '').trim();
        if (!raw) return col.name === 'teamId' ? null : '';
        const num = Number(raw.replace(',', '.'));
        return Number.isNaN(num) ? raw : num;
    }
    return String(value ?? '').trim();
};

export const displayCellValue = (value, col) => {
    if (getColumnType(col) === 'checkbox') return parseCheckboxValue(value) ? 'TRUE' : '';
    if (getColumnType(col) === 'passfail') return normalizePassFailValue(value);
    if (getColumnType(col) === 'date') return formatDateValue(value);
    if (getColumnType(col) === 'phone') return formatPhoneValue(value);
    return value !== undefined && value !== null ? String(value) : '';
};

export const getColumnMeta = (columns, name, fallbackLabel) => {
    return columns.find(col => col.name === name) || { name, label: fallbackLabel || MAIN_FIELD_LABELS[name] || name, type: DEFAULT_COLUMN_TYPES[name] || 'text' };
};

const normalizeKey = (value) => String(value || '')
    .replace(/[\u0111\u0110]/g, 'd') // "\u0110"/"\u0111" has no NFD decomposition, so map it to "d" or it gets dropped entirely below.
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toLowerCase();

// Some legacy Excel imports stored the phone number under a custom column
// name (e.g. "custom_sdt") instead of the canonical "dienThoai" field.
// Resolve to whichever field actually carries data on this particular
// trainee so the phone number still displays/edits the same everywhere
// (Danh sách, Thống kê, Đội) regardless of where it was imported from.
export const resolvePhoneColumn = (trainee, field) => {
    if (field.name !== 'dienThoai' || trainee.dienThoai) return field;

    const phoneKey = Object.keys(trainee).find(key => {
        const normalized = normalizeKey(key);
        const value = trainee[key];
        return value && (
            normalized.includes('dienthoai') ||
            normalized.includes('sodienthoai') ||
            normalized.includes('sdt') ||
            normalized.includes('phone')
        );
    });

    return phoneKey ? { ...field, name: phoneKey } : field;
};
