class TeamAllocator {
    shuffle(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    calculateOptimalTeams(N) {
        if (N < 13) return 1;
        const minT = Math.ceil(N / 15);
        const maxT = Math.floor(N / 13);
        
        if (minT <= maxT) {
            return maxT;
        } else {
            return maxT > 0 ? maxT : 1;
        }
    }

    divideGroup(members) {
        const N = members.length;
        if (N === 0) return [];
        
        const numTeams = this.calculateOptimalTeams(N);
        const shuffled = this.shuffle(members);
        
        const teams = Array.from({ length: numTeams }, () => []);
        shuffled.forEach((member, idx) => {
            teams[idx % numTeams].push(member);
        });
        
        return teams;
    }

    async allocate(trainees, dbService) {
        const listNu = trainees.filter(t => t.gioiTinh === 'Nữ');
        const listNam = trainees.filter(t => t.gioiTinh === 'Nam');

        const teamsNu = this.divideGroup(listNu);
        const teamsNam = this.divideGroup(listNam);

        let currentTeamNum = 1;

        // Girls first
        for (const team of teamsNu) {
            for (const m of team) {
                await dbService.updateTrainee(m.id, { teamId: currentTeamNum });
            }
            currentTeamNum++;
        }

        const lastFemaleTeamNum = currentTeamNum - 1;

        // Boys next
        for (const team of teamsNam) {
            for (const m of team) {
                await dbService.updateTrainee(m.id, { teamId: currentTeamNum });
            }
            currentTeamNum++;
        }

        const totalTeams = currentTeamNum - 1;
        return {
            success: true,
            totalTeams,
            femaleTeamsCount: teamsNu.length,
            maleTeamsCount: teamsNam.length,
            lastFemaleTeamNum
        };
    }

    async clear(dbService) {
        const trainees = await dbService.getAllTrainees();
        for (const t of trainees) {
            if (t.teamId !== null) {
                await dbService.updateTrainee(t.id, { teamId: null });
            }
        }
        return true;
    }
}

const teamAllocator = new TeamAllocator();
export default teamAllocator;
