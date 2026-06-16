import { WebSocketServer } from 'ws';

let wss = null;

export function initWebSocketServer(server) {
    wss = new WebSocketServer({ server });
    
    wss.on('connection', (ws) => {
        // Send initial greeting
        ws.send(JSON.stringify({ event: 'CONNECTED', message: 'Kết nối WebSocket thành công' }));
        
        ws.on('error', console.error);
    });
}

export function broadcastDatabaseUpdate() {
    if (!wss) return;
    const data = JSON.stringify({ event: 'DATABASE_UPDATED' });
    wss.clients.forEach((client) => {
        if (client.readyState === 1) { // 1 = OPEN
            client.send(data);
        }
    });
}
