/**
 * REMOTE-CLIENT.JS - Cliente de Sincronización WebSocket & Broadcast
 * Conecta el Bolillero, el Proyector y el Control Remoto en el celular.
 */

class RemoteClient {
  constructor() {
    this.ws = null;
    this.isConnected = false;
    this.reconnectTimer = null;
    this.listeners = [];
    this.broadcastChannel = null;

    this.initBroadcast();
    this.connectWebSocket();
  }

  initBroadcast() {
    try {
      this.broadcastChannel = new BroadcastChannel('bingo_system_channel');
      this.broadcastChannel.onmessage = (e) => {
        if (e.data) this.notifyListeners(e.data);
      };
    } catch (e) {
      console.warn("BroadcastChannel no soportado:", e);
    }
  }

  connectWebSocket() {
    // Si estamos abriendo el archivo localmente como file:///, no intentar WebSocket
    if (window.location.protocol === 'file:') {
      console.log("Modo local file:/// - Usando BroadcastChannel");
      return;
    }

    const wsProto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProto}//${window.location.host}/ws`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.isConnected = true;
        console.log("🟢 Conectado al Servidor de Bolillero:", wsUrl);
        this.updateConnectionBadge(true);
        // Pedir estado inicial
        this.send({ type: 'GET_STATE' });
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          this.handleIncoming(msg);
        } catch (e) {
          console.error("Error parseando mensaje WS:", e);
        }
      };

      this.ws.onclose = () => {
        this.isConnected = false;
        this.updateConnectionBadge(false);
        this.scheduleReconnect();
      };

      this.ws.onerror = () => {
        this.isConnected = false;
        this.updateConnectionBadge(false);
      };
    } catch (e) {
      console.warn("Error iniciando WebSocket:", e);
      this.scheduleReconnect();
    }
  }

  scheduleReconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      this.connectWebSocket();
    }, 2500);
  }

  send(data) {
    const payload = typeof data === 'string' ? data : JSON.stringify(data);
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(payload);
    }
  }

  /**
   * Envía un comando desde el control remoto (ej: celular) hacia el bolillero
   */
  sendCommand(command, payload = {}) {
    // Enviar vía WebSocket
    this.send({
      type: 'COMMAND',
      command: command,
      payload: payload,
      timestamp: Date.now()
    });

    // También retransmitir vía BroadcastChannel para pestañas locales
    if (this.broadcastChannel) {
      this.broadcastChannel.postMessage({
        type: 'EXECUTE_COMMAND',
        command: command,
        payload: payload
      });
    }

    // Disparar evento local en la misma ventana por si acaso
    window.dispatchEvent(new CustomEvent('BINGO_REMOTE_COMMAND', {
      detail: { command, payload }
    }));
  }

  /**
   * Sincroniza el estado del bolillero a todos los clientes (TV, proyector, celulares)
   */
  syncState(state) {
    this.send({
      type: 'STATE_SYNC',
      payload: state,
      timestamp: Date.now()
    });
  }

  handleIncoming(msg) {
    if (!msg || !msg.type) return;

    if (msg.type === 'EXECUTE_COMMAND') {
      window.dispatchEvent(new CustomEvent('BINGO_REMOTE_COMMAND', {
        detail: { command: msg.command, payload: msg.payload }
      }));
    }

    this.notifyListeners(msg);
  }

  onMessage(callback) {
    if (typeof callback === 'function') {
      this.listeners.push(callback);
    }
  }

  notifyListeners(data) {
    this.listeners.forEach(cb => {
      try { cb(data); } catch (e) { console.error("Error en listener:", e); }
    });
  }

  updateConnectionBadge(connected) {
    const badge = document.getElementById('connectionStatusBadge');
    if (badge) {
      if (connected) {
        badge.className = 'status-badge connected';
        badge.innerHTML = '<span class="dot"></span> Conectado';
      } else {
        badge.className = 'status-badge disconnected';
        badge.innerHTML = '<span class="dot"></span> Reconectando...';
      }
    }
  }
}

window.remoteClient = new RemoteClient();
