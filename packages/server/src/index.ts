import { createServer } from 'node:http';
import { WebSocketServer } from 'ws';
import { RoomManager } from './roomManager.js';
import { handleConnection } from './wsHandler.js';
import { handleHttp } from './restRouter.js';

const PORT = parseInt(process.env.PORT ?? '8765', 10);
const roomManager = new RoomManager();

const server = createServer((req, res) => handleHttp(req, res, roomManager));

const wss = new WebSocketServer({ server });
wss.on('connection', (ws) => handleConnection(ws, roomManager));

// Expire stale rooms every 60 seconds
setInterval(() => roomManager.expireStaleRooms(Date.now()), 60_000);

server.listen(PORT, () => {
  console.log(`Partylight relay server listening on port ${PORT}`);
});
