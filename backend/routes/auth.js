import express from 'express';

const router = express.Router();

router.post('/login', (req, res) => {
    const { password } = req.body;
    if (password === 'admin123@') {
        return res.json({ success: true, token: 'horeb9_admin_session_token' });
    }
    return res.status(401).json({ success: false, message: 'Mật mã quản trị chưa chính xác.' });
});

export default router;
