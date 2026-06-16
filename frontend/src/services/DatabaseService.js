import { env } from '../config/env';

class DatabaseService {
    constructor() {
        this.listeners = new Set();
        this.ws = null;
        this.reconnectTimer = null;
        this.apiUrl = env.apiBaseUrl;
        
        this.connectWebSocket();
    }

    connectWebSocket() {
        const wsUrl = env.wsUrl;
        if (!wsUrl) return;

        console.log(`Connecting Frontend WebSocket client to: ${wsUrl}`);
        this.ws = new WebSocket(wsUrl);

        this.ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.event === 'DATABASE_UPDATED') {
                    console.log('Realtime broadcast received: database modified on server.');
                    this.notifyListeners();
                }
            } catch (err) {
                console.error('Error parsing WebSocket broadcast event:', err);
            }
        };

        this.ws.onclose = () => {
            console.log('WebSocket closed. Attempting reconnect in 3s...');
            this.ws = null;
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = setTimeout(() => this.connectWebSocket(), 3000);
        };

        this.ws.onerror = (error) => {
            console.error('WebSocket client connection error:', error);
            this.ws.close();
        };
    }

    // Pub/Sub design pattern for React UI Component bindings
    subscribe(callback) {
        this.listeners.add(callback);
        return () => this.listeners.delete(callback);
    }

    notifyListeners() {
        this.listeners.forEach(callback => {
            try {
                callback();
            } catch (err) {
                console.error('Error calling listener callback:', err);
            }
        });
    }

    // Base request client helper
    async request(path, options = {}) {
        const token = sessionStorage.getItem('horeb9_token');
        const headers = {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
            ...options.headers
        };

        const response = await fetch(`${this.apiUrl}${path}`, {
            ...options,
            headers
        });

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.error || errData.message || 'Lỗi máy chủ.');
        }

        return await response.json();
    }

    // Authentication
    async login(password) {
        const res = await this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ password })
        });
        if (res.success && res.token) {
            sessionStorage.setItem('horeb9_token', res.token);
            sessionStorage.setItem('horeb9_logged_in', 'true');
        }
        return res;
    }

    logout() {
        sessionStorage.removeItem('horeb9_token');
        sessionStorage.removeItem('horeb9_logged_in');
    }

    isLoggedIn() {
        return sessionStorage.getItem('horeb9_logged_in') === 'true';
    }

    // Trainees CRUD
    async getAllTrainees() {
        return await this.request('/trainees');
    }

    async addTrainee(traineeData) {
        return await this.request('/trainees', {
            method: 'POST',
            body: JSON.stringify(traineeData)
        });
    }

    async addTraineesBulk(trainees, newColumns) {
        return await this.request('/trainees/bulk', {
            method: 'POST',
            body: JSON.stringify({ trainees, newColumns })
        });
    }

    async updateTrainee(id, updateData) {
        return await this.request(`/trainees/${id}`, {
            method: 'PUT',
            body: JSON.stringify(updateData)
        });
    }

    async deleteTrainee(id) {
        return await this.request(`/trainees/${id}`, {
            method: 'DELETE'
        });
    }

    async clearAllData() {
        return await this.request('/trainees', {
            method: 'DELETE'
        });
    }

    // Columns Metadata CRUD
    async getAllColumns() {
        return await this.request('/columns');
    }

    async addColumn(label, type = 'text') {
        return await this.request('/columns', {
            method: 'POST',
            body: JSON.stringify({ label, type })
        });
    }

    async updateColumn(name, updateData) {
        return await this.request(`/columns/${name}`, {
            method: 'PUT',
            body: JSON.stringify(updateData)
        });
    }

    async deleteColumn(name) {
        return await this.request(`/columns/${name}`, {
            method: 'DELETE'
        });
    }

    async reorderColumns(orderedNames) {
        return await this.request('/columns/reorder', {
            method: 'PUT',
            body: JSON.stringify({ orderedNames })
        });
    }

    // Team Allocator Commands
    async allocateTeams() {
        return await this.request('/teams/allocate', {
            method: 'POST'
        });
    }

    async clearTeams() {
        return await this.request('/teams/clear', {
            method: 'POST'
        });
    }
}

const dbService = new DatabaseService();
export default dbService;
