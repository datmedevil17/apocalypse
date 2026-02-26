import express from 'express';
import http from 'http';
import WebSocket from 'ws';
import cors from 'cors';

const app = express();
app.use(cors({ origin: '*' }));

// Health Check Parity
app.get('/ping', (req, res) => {
    res.json({ message: 'pong' });
});

const server = http.createServer(app);
const wss = new WebSocket.Server({ server, path: '/ws' });

wss.on('connection', (ws: WebSocket) => {
    console.log('New client connected');

    ws.on('message', (message: WebSocket.Data) => {
        // Broadcast to all OTHER clients (parity with go-server's hub)
        wss.clients.forEach((client) => {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(message);
            }
        });
    });

    ws.on('close', () => {
        console.log('Client disconnected');
    });

    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
    });
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
    console.log(`Node.js WebSocket Server started on port ${PORT}`);
});
