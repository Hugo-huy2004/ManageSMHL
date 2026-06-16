import express from 'express';
import http from 'http';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import columnRoutes from './routes/columns.js';
import traineeRoutes from './routes/trainees.js';
import teamRoutes from './routes/teams.js';
import { initWebSocketServer } from './wsBroadcaster.js';
import Column from './models/Column.js';
import { env } from './config/env.js';

dotenv.config();

const app = express();
const server = http.createServer(app);

// Middlewares
app.use(cors({
    origin(origin, callback) {
        if (!origin || env.corsOrigins.length === 0 || env.corsOrigins.includes(origin)) {
            callback(null, true);
            return;
        }
        callback(new Error(`CORS blocked origin: ${origin}`));
    },
    credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/columns', columnRoutes);
app.use('/api/trainees', traineeRoutes);
app.use('/api/teams', teamRoutes);

// Seed initial columns metadata if database collection is empty
async function seedDefaultColumns() {
    try {
        const count = await Column.countDocuments();
        if (count === 0) {
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
            console.log('Successfully seeded default columns metadata in MongoDB.');
        }
    } catch (err) {
        console.error('Failed to seed default columns: ', err.message);
    }
}

// Database Connection & Server Startup
mongoose.connect(env.mongodbUri)
    .then(async () => {
        console.log('Connected successfully to MongoDB.');
        await seedDefaultColumns();
        
        // Initialize WebSocket server attached to HTTP server instance
        initWebSocketServer(server);
        console.log('WebSocket server attached.');

        server.listen(env.port, env.host, () => {
            console.log(`Backend server running on http://${env.host}:${env.port}`);
        });
    })
    .catch((err) => {
        console.error('MongoDB connection error: ', err.message);
        process.exit(1);
    });
