import type { IncomingMessage, ServerResponse } from 'node:http';
import type { RoomManager } from './roomManager.js';

export function handleHttp(
  req: IncomingMessage,
  res: ServerResponse,
  roomManager: RoomManager,
): void {
  if (req.method === 'GET' && req.url === '/rooms') {
    const rooms = roomManager.getDiscoverableRooms();
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    });
    res.end(JSON.stringify(rooms));
    return;
  }

  if (req.method === 'OPTIONS') {
    res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET' });
    res.end();
    return;
  }

  res.writeHead(404);
  res.end('Not Found');
}
