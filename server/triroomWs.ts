import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'http';
import { checkAndSpontaneouslySpeak } from './triroomAI';

const wsClients = new Map<WebSocket, { name: string }>();
let wss: WebSocketServer | null = null;

export function setupTriroomWs(httpServer: Server) {
  wss = new WebSocketServer({ noServer: true });

  httpServer.on('upgrade', (request, socket, head) => {
    if (request.url === '/ws/triroom') {
      wss!.handleUpgrade(request, socket, head, (ws) => {
        wss!.emit('connection', ws, request);
      });
    } else {
      console.warn(`[WS] 不正なアップグレードパス: ${request.url}`);
      socket.destroy();
    }
  });

  wss.on('connection', (ws) => {
    checkAndSpontaneouslySpeak().catch((err) =>
      console.error('[WS] 自律発言チェックエラー:', err)
    );

    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'join' && typeof msg.name === 'string' && msg.name.trim()) {
          wsClients.set(ws, { name: msg.name.trim() });
          broadcastPresence();
        } else {
          console.warn('[WS] 不正なメッセージ形式:', JSON.stringify(msg));
        }
      } catch (err) {
        console.warn('[WS] メッセージ解析エラー:', err);
      }
    });

    ws.on('close', () => {
      wsClients.delete(ws);
      broadcastPresence();
    });

    ws.on('error', (err) => {
      console.error('[WS] クライアントエラー:', err);
      wsClients.delete(ws);
    });
  });
}

function broadcastPresence() {
  if (!wss) return;
  const online = Array.from(wsClients.values()).map(c => c.name);
  const payload = JSON.stringify({ type: 'presence', online });
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
}

export function broadcastLoopMessage(message: any) {
  if (!wss) return;
  const payload = JSON.stringify({ type: 'message', ...message });
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
}
