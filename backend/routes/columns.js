import express from 'express';
import Column from '../models/Column.js';
import Trainee from '../models/Trainee.js';
import { broadcastDatabaseUpdate } from '../wsBroadcaster.js';

const router = express.Router();

// Get all columns
router.get('/', async (req, res) => {
    try {
        const cols = await Column.find().sort({ order: 1 });
        res.json(cols);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Add column manually
router.post('/', async (req, res) => {
    const { label, type = 'text' } = req.body;
    if (!label) {
        return res.status(400).json({ error: 'Nhãn cột không được để trống.' });
    }

    try {
        const name = 'custom_' + label
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-zA-Z0-9]/g, '')
            .toLowerCase();

        const existing = await Column.findOne({ name });
        if (existing) {
            return res.status(400).json({ error: 'Tiêu đề cột này đã tồn tại!' });
        }

        const newCol = new Column({ name, label, type, isCustom: true });
        await newCol.save();
        
        broadcastDatabaseUpdate();
        res.status(201).json(newCol);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Reorder columns
// NOTE: this must be registered before the "/:name" routes below, otherwise
// Express matches "/reorder" as :name="reorder" and 404s against the
// update-column-metadata handler instead of running the reorder logic.
router.put('/reorder', async (req, res) => {
    const { orderedNames } = req.body;
    if (!orderedNames || !Array.isArray(orderedNames)) {
        return res.status(400).json({ error: 'Danh sách sắp xếp không hợp lệ.' });
    }

    try {
        for (let i = 0; i < orderedNames.length; i++) {
            await Column.updateOne({ name: orderedNames[i] }, { order: i });
        }

        broadcastDatabaseUpdate();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update column metadata
router.put('/:name', async (req, res) => {
    const { name } = req.params;
    const { label, type } = req.body;
    const update = {};

    if (label !== undefined) update.label = label;
    if (type !== undefined) update.type = type;

    try {
        const col = await Column.findOneAndUpdate({ name }, update, { new: true, runValidators: true });
        if (!col) {
            return res.status(404).json({ error: 'Không tìm thấy cột thông tin.' });
        }

        broadcastDatabaseUpdate();
        res.json(col);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete custom column and clean up documents
router.delete('/:name', async (req, res) => {
    const { name } = req.params;
    
    try {
        const col = await Column.findOne({ name });
        if (!col) {
            return res.status(404).json({ error: 'Không tìm thấy cột thông tin.' });
        }

        await Column.deleteOne({ name });

        // Clean up from all trainees in MongoDB using $unset
        await Trainee.updateMany({ [name]: { $exists: true } }, { $unset: { [name]: "" } });

        broadcastDatabaseUpdate();
        res.json({ success: true, message: `Đã xóa cột "${col.label}" thành công.` });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
