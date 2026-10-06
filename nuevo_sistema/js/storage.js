/**
 * STORAGE.JS - Persistencia Local y Sincronización Multi-Pantalla
 * Maneja LocalStorage y la transmisión en tiempo real con BroadcastChannel.
 */

class StorageManager {
  constructor() {
    this.CHANNEL_NAME = 'bingo_system_channel';
    this.STORAGE_KEY = 'bingo_system_state';
    this.CARDS_STORAGE_KEY = 'bingo_system_cards';

    this.channel = null;
    this.initChannel();
  }

  initChannel() {
    try {
      this.channel = new BroadcastChannel(this.CHANNEL_NAME);
    } catch (e) {
      console.warn("BroadcastChannel no soportado, usando postMessage como fallback.", e);
    }
  }

  // ===================== ESTADO DEL SORTEO =====================

  saveGameState(state) {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.error("Error al guardar estado de juego:", e);
    }
  }

  getGameState() {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.error("Error al leer estado de juego:", e);
      return null;
    }
  }

  clearGameState() {
    localStorage.removeItem(this.STORAGE_KEY);
  }

  hasSavedGame() {
    const s = this.getGameState();
    return s && Array.isArray(s.called) && s.called.length > 0;
  }

  // ===================== CARTONES EMITIDOS =====================

  saveCards(cards) {
    try {
      localStorage.setItem(this.CARDS_STORAGE_KEY, JSON.stringify(cards));
      this.broadcast('CARDS_UPDATED', { count: cards.length });
    } catch (e) {
      console.error("Error al guardar cartones:", e);
    }
  }

  getCards() {
    try {
      const data = localStorage.getItem(this.CARDS_STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }

  clearCards() {
    localStorage.removeItem(this.CARDS_STORAGE_KEY);
    this.broadcast('CARDS_UPDATED', { count: 0 });
  }

  findCardBySerial(serial) {
    const cards = this.getCards();
    const formatted = String(serial).trim().replace(/^#+/, '');
    const num = parseInt(formatted, 10);
    return cards.find(c => c.serialNumber === num || c.serialString === formatted || c.serialString === `#${formatted}`);
  }

  // ===================== SINCRONIZACIÓN BROADCAST =====================

  broadcast(type, payload = {}) {
    const msg = { type, payload, timestamp: Date.now() };
    if (this.channel) {
      this.channel.postMessage(msg);
    }
  }

  onBroadcast(callback) {
    if (this.channel) {
      this.channel.onmessage = (event) => {
        if (event && event.data) {
          callback(event.data);
        }
      };
    }
  }
}

window.storageManager = new StorageManager();
