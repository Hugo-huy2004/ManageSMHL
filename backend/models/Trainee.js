// Trainee model definition for Horeb 9 Trainee Management
import mongoose from 'mongoose';

const traineeSchema = new mongoose.Schema({
    tenThanh: { type: String, default: "" },
    hoTen: { type: String, required: true },
    gioiTinh: { type: String, default: "Nữ" },
    giaoXu: { type: String, default: "" },
    teamId: { type: Number, default: null }
}, { 
    strict: false, // strict: false allows any custom columns/properties to be stored directly
    timestamps: true // adds createdAt and updatedAt fields
});

const Trainee = mongoose.model('Trainee', traineeSchema);
export default Trainee;
