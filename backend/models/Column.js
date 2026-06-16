import mongoose from 'mongoose';

const columnSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    label: { type: String, required: true },
    type: { type: String, enum: ['text', 'date', 'phone', 'checkbox', 'number', 'score', 'passfail'], default: 'text' },
    isCustom: { type: Boolean, default: false },
    order: { type: Number, default: 0 }
});

const Column = mongoose.model('Column', columnSchema);
export default Column;
