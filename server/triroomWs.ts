import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'http';
import { checkAndSpontaneouslySpeak } from './triroomAI';

const triroomClients = new Map<WebSocket, { name: string }>();
let wss: WebSocketServer | null = null;

export function setupTriroomWs(httpServer: Server) {
  wss = new WebSocketServer({ noServer: true });

  httpServer.on('upgrade', (request, socket, head) => {
    if (request.url === '/ws/triroom') {
      wss!.handleUpgrade(request, socket, head, (ws) => {
        wss!.emit('connection', ws, request);
      });
    }
  });

  wss.on('connection', (ws) => {
    // 接続時に沈黙チェック → 10分以上静かなら自律発言を起動
    checkAndSpontaneouslySpeak().catch(console.error);

    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'join' && msg.name) {
          triroomClients.set(ws, { name: msg.name });
          broadcastPresence();
        }
      } catch {}
    });

    ws.on('close', () => {
      triroomClients.delete(ws);
      broadcastPresence();
    });

    ws.on('error', () => {
      triroomClients.delete(ws);
    });
  });
}

function broadcastPresence() {
  if (!wss) return;
  const online = Array.from(triroomClients.values()).map(c => c.name);
  const payload = JSON.stringify({ type: 'presence', online });
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
}

export function broadcastTriroomMessage(message: any) {
  if (!wss) return;
  const payload = JSON.stringify({ type: 'message', ...message });
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
}
