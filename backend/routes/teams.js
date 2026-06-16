import express from 'express';
import Trainee from '../models/Trainee.js';
import { broadcastDatabaseUpdate } from '../wsBroadcaster.js';

const router = express.Router();

function shuffle(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function calculateOptimalTeamsCount(N) {
    if (N < 13) return 1;
    const minT = Math.ceil(N / 15);
    const maxT = Math.floor(N / 13);
    
    if (minT <= maxT) {
        return maxT;
    } else {
        return maxT > 0 ? maxT : 1;
    }
}

function divideIntoTeams(members) {
    const N = members.length;
    if (N === 0) return [];
    
    const numTeams = calculateOptimalTeamsCount(N);
    const shuffled = shuffle(members);
    
    const teams = Array.from({ length: numTeams }, () => []);
    shuffled.forEach((m, idx) => {
        teams[idx % numTeams].push(m);
    });
    
    return teams;
}

// Run random gender-segregated team allocation
router.post('/allocate', async (req, res) => {
    try {
        const trainees = await Trainee.find();
        if (trainees.length === 0) {
            return res.status(400).json({ error: 'Không thể chia đội do danh sách sa mạc sinh trống.' });
        }

        const listNu = trainees.filter(t => t.gioiTinh === 'Nữ');
        const listNam = trainees.filter(t => t.gioiTinh === 'Nam');

        const teamsNu = divideIntoTeams(listNu);
        const teamsNam = divideIntoTeams(listNam);

        const bulkOps = [];
        let currentTeamId = 1;

        // Allocate Female Teams
        for (const team of teamsNu) {
            for (const member of team) {
                bulkOps.push({
                    updateOne: {
                        filter: { _id: member._id },
                        update: { $set: { teamId: currentTeamId } }
                    }
                });
            }
            currentTeamId++;
        }

        // Allocate Male Teams
        for (const team of teamsNam) {
            for (const member of team) {
                bulkOps.push({
                    updateOne: {
                        filter: { _id: member._id },
                        update: { $set: { teamId: currentTeamId } }
                    }
                });
            }
            currentTeamId++;
        }

        if (bulkOps.length > 0) {
            await Trainee.bulkWrite(bulkOps);
        }

        broadcastDatabaseUpdate();
        res.json({
            success: true,
            totalTeams: currentTeamId - 1,
            femaleTeamsCount: teamsNu.length,
            maleTeamsCount: teamsNam.length
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Clear team allocations
router.post('/clear', async (req, res) => {
    try {
        await Trainee.updateMany({}, { $set: { teamId: null } });
        broadcastDatabaseUpdate();
        res.json({ success: true, message: 'Đã xóa toàn bộ sắp xếp đội.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
