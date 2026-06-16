import express from 'express';
import Trainee from '../models/Trainee.js';
import Column from '../models/Column.js';
import { broadcastDatabaseUpdate } from '../wsBroadcaster.js';

const router = express.Router();

// Get all trainees
router.get('/', async (req, res) => {
    try {
        const trainees = await Trainee.find().sort({ createdAt: -1 });
        res.json(trainees);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Add single trainee
router.post('/', async (req, res) => {
    try {
        const trainee = new Trainee(req.body);
        await trainee.save();
        
        broadcastDatabaseUpdate();
        res.status(201).json(trainee);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Bulk import Excel/CSV
router.post('/bulk', async (req, res) => {
    const { trainees, newColumns } = req.body;
    if (!trainees || !Array.isArray(trainees)) {
        return res.status(400).json({ error: 'Dữ liệu sa mạc sinh không hợp lệ.' });
    }

    try {
        // Save new columns metadata
        if (newColumns && Array.isArray(newColumns)) {
            for (const col of newColumns) {
                const exists = await Column.findOne({ name: col.name });
                if (!exists) {
                    const newCol = new Column(col);
                    await newCol.save();
                }
            }
        }

        // Save trainees
        if (trainees.length > 0) {
            await Trainee.insertMany(trainees);
        }

        broadcastDatabaseUpdate();
        res.json({ success: true, count: trainees.length });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update trainee
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const trainee = await Trainee.findById(id);
        if (!trainee) {
            return res.status(404).json({ error: 'Không tìm thấy sa mạc sinh.' });
        }

        // Apply changes
        Object.keys(req.body).forEach(key => {
            trainee.set(key, req.body[key]);
        });

        await trainee.save();

        broadcastDatabaseUpdate();
        res.json(trainee);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete trainee
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await Trainee.findByIdAndDelete(id);
        if (!result) {
            return res.status(404).json({ error: 'Không tìm thấy sa mạc sinh.' });
        }

        broadcastDatabaseUpdate();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Clear all database
router.delete('/', async (req, res) => {
    try {
        await Trainee.deleteMany({});
        await Column.deleteMany({});
        
        // Restore defaults
        const DEFAULT_COLUMNS = [
            { name: 'tenThanh', label: 'TÊN THÁNH', isCustom: false, order: 0 },
            { name: 'hoTen', label: 'HỌ VÀ TÊN', isCustom: false, order: 1 },
            { name: 'gioiTinh', label: 'GIỚI TÍNH', isCustom: false, order: 2 },
            { name: 'teamId', label: 'ĐỘI', type: 'number', isCustom: false, order: 3 },
            { name: 'ngaySinh', label: 'NGÀY SINH', type: 'date', isCustom: false, order: 4 },
            { name: 'diaChi', label: 'ĐỊA CHỈ', isCustom: false, order: 5 },
            { name: 'dienThoai', label: 'ĐIỆN THOẠI', type: 'phone', isCustom: false, order: 6 },
            { name: 'giaoXu', label: 'GIÁO XỨ', isCustom: false, order: 7 },
            { name: 'giaoHat', label: 'GIÁO HẠT', isCustom: false, order: 8 },
            { name: 'don', label: 'ĐƠN', isCustom: false, order: 9 },
            { name: 'hinh', label: 'HÌNH', isCustom: false, order: 10 },
            { name: 'ccGlvCap1', label: 'CC GLV CẤP 1', type: 'score', isCustom: false, order: 11 },
            { name: 'ketQuaLyThuyet', label: 'KẾT QUẢ LÝ THUYẾT', type: 'score', isCustom: false, order: 12 },
            { name: 'diemDanh_C30', label: 'ĐD C 30', type: 'checkbox', isCustom: false, order: 13 },
            { name: 'diemDanh_S01', label: 'ĐD S 01', type: 'checkbox', isCustom: false, order: 14 },
            { name: 'diemDanh_C01', label: 'ĐD C 01', type: 'checkbox', isCustom: false, order: 15 },
            { name: 'diemDanh_S02', label: 'ĐD S 02', type: 'checkbox', isCustom: false, order: 16 },
            { name: 'diemDanh_C02', label: 'ĐD C 02', type: 'checkbox', isCustom: false, order: 17 },
            { name: 'diemDanh_S03', label: 'ĐD S 03', type: 'checkbox', isCustom: false, order: 18 },
            { name: 'diemDanh_C03', label: 'ĐD C 03', type: 'checkbox', isCustom: false, order: 19 },
            { name: 'diemDanh_S04', label: 'ĐD S 04', type: 'checkbox', isCustom: false, order: 20 },
            { name: 'diemDanh_C04', label: 'ĐD C 04', type: 'checkbox', isCustom: false, order: 21 },
            { name: 'cCan', label: 'C.CẦN', type: 'score', isCustom: false, order: 22 },
            { name: 'diemTienSM', label: 'ĐIỂM TIỀN SM', type: 'score', isCustom: false, order: 23 },
            { name: 'diemSoKhoa', label: 'ĐIỂM SỔ KHÓA', type: 'score', isCustom: false, order: 24 },
            { name: 'diemHauSM', label: 'ĐIỂM HẬU SM', type: 'score', isCustom: false, order: 25 },
            { name: 'diemTB', label: 'ĐIỂM TB', type: 'score', isCustom: false, order: 26 },
            { name: 'ketQuaSaMac', label: 'KẾT QUẢ SA MẠC', type: 'passfail', isCustom: false, order: 27 },
            { name: 'nghiThucSaiDi', label: 'NGHI THỨC SAI ĐI', isCustom: false, order: 28 },
            { name: 'ghiChu', label: 'GHI CHÚ', isCustom: false, order: 29 }
        ];
        
        await Column.insertMany(DEFAULT_COLUMNS);

        broadcastDatabaseUpdate();
        res.json({ success: true, message: 'Đã xóa tất cả dữ liệu và đặt lại các cột mặc định.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
