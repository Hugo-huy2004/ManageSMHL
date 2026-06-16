import express from 'express';
import { env } from '../config/env.js';

const router = express.Router();

router.post('/login', (req, res) => {
    const { password } = req.body;
    if (password === env.adminPassword) {
        return res.json({ success: true, token: env.adminToken });
    }
    return res.status(401).json({ success: false, message: 'Mật mã quản trị chưa chính xác.' });
});

export default router;
