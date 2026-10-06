/**
 * SERVER.JS - Servidor Local Ligero para Bolillero Digital Pro
 * Cero dependencias externas (Node.js nativo puro: http, fs, path, os, crypto).
 * 
 * Funcionalidades:
 * 1. Servidor de archivos estáticos (HTML, CSS, JS, imágenes).
 * 2. Detección automática de IP local (WiFi / Ethernet) para conexión desde el celular.
 * 3. Servidor WebSockets RFC 6455 nativo para sincronización instantánea (< 10ms).
 * 4. API de estado y enlace de control remoto.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = __dirname;

// Estado en memoria del sorteo sincronizado entre todos los dispositivos
let gameState = {
  called: [],
  lastFive: [],
  lastDrawn: null,
  totalNumbers: 90,
  autoSpeed: 3.5,
  isPaused: false,
  isDrawing: false,
  startTime: null
};

// ===================== DETECCIÓN DE IP LOCAL =====================

function getLocalIp() {
  const interfaces = os.networkInterfaces();
  const candidates = [];

  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        // Priorizar redes locales típicas 192.168.x.x o 10.x.x.x
        if (iface.address.startsWith('192.168.') || iface.address.startsWith('10.')) {
          return iface.address;
        }
        candidates.push(iface.address);
      }
    }
  }
  return candidates.length > 0 ? candidates[0] : '127.0.0.1';
}

const LOCAL_IP = getLocalIp();

// ===================== TIPOS MIME =====================

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg':  'image/svg+xml',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico':  'image/x-icon',
  '.mp3':  'audio/mpeg',
  '.wav':  'audio/wav'
};

// ===================== CLIENTES WEBSOCKET =====================

const wsClients = new Set();

function broadcastWS(data, excludeSocket = null) {
  const payload = typeof data === 'string' ? data : JSON.stringify(data);
  const frame = encodeWebSocketFrame(payload);

  for (const client of wsClients) {
    if (client !== excludeSocket && client.writable) {
      try {
        client.write(frame);
      } catch (e) {
        wsClients.delete(client);
      }
    }
  }
}

// ===================== ENCODE / DECODE WEBSOCKET RFC 6455 =====================

function encodeWebSocketFrame(message) {
  const buffer = Buffer.from(message, 'utf8');
  const length = buffer.length;
  let header;

  if (length <= 125) {
    header = Buffer.from([0x81, length]);
  } else if (length <= 65535) {
    header = Buffer.alloc(4);
    header[0] = 0x81;
    header[1] = 126;
    header.writeUInt16BE(length, 2);
  } else {
    header = Buffer.alloc(10);
    header[0] = 0x81;
    header[1] = 127;
    header.writeBigUInt64BE(BigInt(length), 2);
  }

  return Buffer.concat([header, buffer]);
}

function parseWebSocketFrame(buffer) {
  if (buffer.length < 2) return null;

  const firstByte = buffer[0];
  const secondByte = buffer[1];

  const fin = (firstByte & 0x80) === 0x80;
  const opcode = firstByte & 0x0f;
  const isMasked = (secondByte & 0x80) === 0x80;
  let payloadLength = secondByte & 0x7f;

  let offset = 2;
  if (payloadLength === 126) {
    if (buffer.length < 4) return null;
    payloadLength = buffer.readUInt16BE(2);
    offset = 4;
  } else if (payloadLength === 127) {
    if (buffer.length < 10) return null;
    payloadLength = Number(buffer.readBigUInt64BE(2));
    offset = 10;
  }

  let maskingKey = null;
  if (isMasked) {
    if (buffer.length < offset + 4) return null;
    maskingKey = buffer.subarray(offset, offset + 4);
    offset += 4;
  }

  if (buffer.length < offset + payloadLength) return null;

  const payload = buffer.subarray(offset, offset + payloadLength);
  if (isMasked && maskingKey) {
    for (let i = 0; i < payload.length; i++) {
      payload[i] ^= maskingKey[i % 4];
    }
  }

  return {
    fin,
    opcode,
    data: payload.toString('utf8'),
    rawPayload: payload,
    frameLength: offset + payloadLength
  };
}

// ===================== SERVIDOR HTTP =====================

const server = http.createServer((req, res) => {
  // CORS Headers para acceso desde red local
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = decodeURIComponent(parsedUrl.pathname);

  // API: Información de red y URLs para el celular
  if (pathname === '/api/info') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({
      ip: LOCAL_IP,
      port: PORT,
      remoteUrl: `http://${LOCAL_IP}:${PORT}/remoto.html`,
      proyectorUrl: `http://${LOCAL_IP}:${PORT}/proyector.html`,
      controlUrl: `http://${LOCAL_IP}:${PORT}/index.html`,
      gameState: gameState
    }));
    return;
  }

  // API: Enviar comando vía POST (fallback si no usa WebSocket)
  if (pathname === '/api/command' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const json = JSON.parse(body);
        handleIncomingCommand(json);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, state: gameState }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // Servir archivos estáticos
  let relativePath = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  let filePath = path.join(PUBLIC_DIR, relativePath);

  // Evitar directory traversal
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end('Acceso denegado');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Archivo no encontrado');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': stats.size,
      'Cache-Control': 'no-cache'
    });

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });
});

// ===================== NEGOCIACIÓN WEBSOCKET =====================

server.on('upgrade', (req, socket, head) => {
  const pathname = new URL(req.url, `http://${req.headers.host}`).pathname;

  if (pathname !== '/ws') {
    socket.destroy();
    return;
  }

  const secKey = req.headers['sec-websocket-key'];
  if (!secKey) {
    socket.destroy();
    return;
  }

  // Calcular clave de respuesta RFC 6455
  const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
  const acceptKey = crypto
    .createHash('sha1')
    .update(secKey + GUID)
    .digest('base64');

  const headers = [
    'HTTP/1.1 101 Switching Protocols',
    'Upgrade: websocket',
    'Connection: Upgrade',
    `Sec-WebSocket-Accept: ${acceptKey}`
  ];

  socket.write(headers.join('\r\n') + '\r\n\r\n');
  wsClients.add(socket);

  // Enviar estado actual de bienvenida
  socket.write(encodeWebSocketFrame(JSON.stringify({
    type: 'INIT_STATE',
    payload: gameState
  })));

  let bufferQueue = Buffer.alloc(0);

  socket.on('data', chunk => {
    bufferQueue = Buffer.concat([bufferQueue, chunk]);

    while (bufferQueue.length > 0) {
      const frame = parseWebSocketFrame(bufferQueue);
      if (!frame) break;

      bufferQueue = bufferQueue.subarray(frame.frameLength);

      // Opcode 8 = Close
      if (frame.opcode === 0x08) {
        socket.end();
        wsClients.delete(socket);
        break;
      }

      // Opcode 9 = Ping -> Responder Pong (0x0A)
      if (frame.opcode === 0x09) {
        const pong = Buffer.from([0x8a, 0x00]);
        socket.write(pong);
        continue;
      }

      // Opcode 1 = Mensaje de texto
      if (frame.opcode === 0x01) {
        try {
          const msg = JSON.parse(frame.data);
          handleIncomingMessage(msg, socket);
        } catch (e) {
          console.error("Error parseando frame WS:", e);
        }
      }
    }
  });

  socket.on('close', () => {
    wsClients.delete(socket);
  });

  socket.on('error', () => {
    wsClients.delete(socket);
  });
});

// ===================== PROCESADOR DE MENSAJES Y COMANDOS =====================

function handleIncomingMessage(msg, originSocket) {
  if (!msg || !msg.type) return;

  switch (msg.type) {
    case 'STATE_SYNC':
      // La mesa de control actualiza el estado central del bolillero
      if (msg.payload) {
        Object.assign(gameState, msg.payload);
      }
      broadcastWS(msg, originSocket);
      break;

    case 'COMMAND':
      // Comando enviado (típicamente desde el celular o control remoto)
      broadcastWS({
        type: 'EXECUTE_COMMAND',
        command: msg.command,
        payload: msg.payload || {}
      });
      break;

    case 'VERIFY_RESULT':
      // Resultado de verificación reenviado al celular
      broadcastWS(msg);
      break;

    case 'GET_STATE':
      originSocket.write(encodeWebSocketFrame(JSON.stringify({
        type: 'INIT_STATE',
        payload: gameState
      })));
      break;

    default:
      // Retransmisión general a los demás clientes
      broadcastWS(msg, originSocket);
      break;
  }
}

function handleIncomingCommand(json) {
  if (!json || !json.command) return;
  broadcastWS({
    type: 'EXECUTE_COMMAND',
    command: json.command,
    payload: json.payload || {}
  });
}

// ===================== ARRANQUE DEL SERVIDOR =====================

server.listen(PORT, '0.0.0.0', () => {
  console.log('\n======================================================');
  console.log('🎱 BOLILLERO DIGITAL PRO - SERVIDOR LOCAL ACTIVO');
  console.log('======================================================');
  console.log(`💻 Mesa de Control (PC):      http://localhost:${PORT}/index.html`);
  console.log(`📺 Pantalla Proyector (TV):   http://localhost:${PORT}/proyector.html`);
  console.log(`📱 Control Remoto (CELULAR):  http://${LOCAL_IP}:${PORT}/remoto.html`);
  console.log('------------------------------------------------------');
  console.log(`📡 Conectá tu celular al mismo WiFi y abrí el enlace`);
  console.log(`   o escaneá el Código QR en la pantalla.`);
  console.log('======================================================\n');
});
