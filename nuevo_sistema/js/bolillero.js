/**
 * BOLILLERO.JS - Controlador Principal del Sorteo
 * Orquesta la extracción de bolillas, animaciones, tablero general y sincronización.
 */

class BolilleroApp {
  constructor() {
    this.totalNumbers = 90; // Bingo Oficial Tradicional: 90 bolillas (01 a 90)
    this.available = [];
    this.called = [];
    this.lastFive = [];
    this.isDrawing = false;
    this.isPaused = false;
    this.autoInterval = null;
    this.autoSpeed = 3.5; // segundos
    this.startTime = null;
    this.timerInterval = null;
    this.auditLog = []; // Registro auditado segundo a segundo para fiscalización notarial AJALAR
    this.officialWinners = { line: null, bingo: null }; // Ganadores oficiales asentados en acta

    this.init();
  }

  init() {
    this.setupAvailableNumbers();
    this.renderBoard();
    this.setupEventListeners();
    this.setupBroadcastListener();
    this.checkSavedSession();
    this.startClock();
    this.setupRemoteBridge();
  }

  setupAvailableNumbers() {
    this.available = [];
    const start = (this.totalNumbers === 90) ? 1 : 0;
    const end = (this.totalNumbers === 90) ? 90 : (this.totalNumbers - 1);
    for (let i = start; i <= end; i++) {
      this.available.push(i);
    }
  }

  setupEventListeners() {
    // Teclado: Barra espaciadora para sacar bolilla
    document.addEventListener('keydown', (e) => {
      if (e.code === 'Space' && !this.isDrawing && !this.isPaused && !this.autoInterval) {
        // Asegurar que no estemos tipeando en un input
        if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'SELECT' && e.target.tagName !== 'TEXTAREA') {
          e.preventDefault();
          this.drawBall();
        }
      }
    });

    // Control deslizante de velocidad automática
    const spdInput = document.getElementById('autoSpeedRange');
    if (spdInput) {
      // Mientras arrastra: solo actualiza la etiqueta visual sin interrumpir ni sacar bolilla
      spdInput.addEventListener('input', (e) => {
        this.autoSpeed = parseFloat(e.target.value);
        const label = document.getElementById('autoSpeedLabel');
        if (label) label.textContent = `${this.autoSpeed}s`;
      });

      // Al soltar el control: reajusta el temporizador sin extraer bolilla
      spdInput.addEventListener('change', (e) => {
        this.autoSpeed = parseFloat(e.target.value);
        this.updateAutoInterval();
      });
    }
  }

  setupBroadcastListener() {
    window.storageManager?.onBroadcast((data) => {
      if (data.type === 'REQUEST_STATE') {
        this.broadcastCurrentState();
      }
    });
  }

  checkSavedSession() {
    if (window.storageManager && window.storageManager.hasSavedGame()) {
      const saved = window.storageManager.getGameState();
      if (saved && saved.called && saved.called.length > 0) {
        const toast = document.getElementById('recoveryToast');
        if (toast) toast.classList.add('show');
      }
    }
  }

  restoreSession() {
    const saved = window.storageManager?.getGameState();
    if (!saved) return;

    this.called = saved.called || [];
    this.lastFive = saved.lastFive || [];
    this.startTime = saved.startTime || Date.now();
    this.autoSpeed = saved.autoSpeed || 3.5;
    this.auditLog = saved.auditLog || [];
    this.officialWinners = saved.officialWinners || { line: null, bingo: null };
    
    // Recalcular disponibles
    this.available = [];
    const start = (this.totalNumbers === 90) ? 1 : 0;
    const end = (this.totalNumbers === 90) ? 90 : (this.totalNumbers - 1);
    for (let i = start; i <= end; i++) {
      if (!this.called.includes(i)) this.available.push(i);
    }

    // Actualizar UI
    this.updateBoardUI();
    this.updateLastFiveUI();
    this.updateProgressUI();

    if (this.called.length > 0) {
      const lastNum = this.called[this.called.length - 1];
      this.displayBall(lastNum);
    }

    const toast = document.getElementById('recoveryToast');
    if (toast) toast.classList.remove('show');

    this.setStatus(`Partida reanudada (${this.called.length} bolillas extraídas)`);
    this.broadcastCurrentState();
  }

  discardSession() {
    window.storageManager?.clearGameState();
    const toast = document.getElementById('recoveryToast');
    if (toast) toast.classList.remove('show');
    this.resetGame(false);
  }

  /**
   * Renderiza la grilla del tablero (90 o 100 bolillas)
   */
  renderBoard() {
    const boardEl = document.getElementById('mainBoardGrid');
    if (!boardEl) return;
    boardEl.innerHTML = '';

    const start = (this.totalNumbers === 90) ? 1 : 0;
    const end = (this.totalNumbers === 90) ? 90 : (this.totalNumbers - 1);
    for (let i = start; i <= end; i++) {
      const cell = document.createElement('div');
      cell.className = 'board-cell';
      cell.id = `board-cell-${i}`;
      cell.textContent = String(i).padStart(2, '0');
      boardEl.appendChild(cell);
    }
  }

  /**
   * Extracción de una bolilla con animación y efectos
   */
  drawBall() {
    if (this.isDrawing || this.isPaused) return;

    if (this.available.length === 0) {
      this.setStatus('¡Todas las bolillas han salido!', true);
      this.stopAutoDraw();
      return;
    }

    this.isDrawing = true;
    const drawBtn = document.getElementById('btnDrawBall');
    if (drawBtn) drawBtn.disabled = true;

    if (!this.startTime) this.startTime = Date.now();

    // Iniciar sonido y vibración
    window.soundEngine?.playDrumRoll(0.9);
    if (navigator.vibrate) navigator.vibrate(30);

    // Animación de la bolilla central
    const ballEl = document.getElementById('mainBallDisplay');
    const ballText = document.getElementById('mainBallNumber');
    if (ballEl) {
      ballEl.className = 'main-ball-sphere rolling';
    }

    this.setStatus('🎲 Revolviendo bolillero...');

    // Efecto ruleta de números
    let rolls = 0;
    const rollInterval = setInterval(() => {
      const randomDisplay = Math.floor(Math.random() * this.totalNumbers);
      if (ballText) ballText.textContent = String(randomDisplay).padStart(2, '0');
      rolls++;

      if (rolls > 12) {
        clearInterval(rollInterval);
        this.finalizeDraw();
      }
    }, 65);
  }

  finalizeDraw() {
    // Extracción puramente aleatoria con Web Crypto API (Norma ALEA / IRAM Referencial 19 / AJALAR)
    let randIdx = 0;
    if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
      const arr = new Uint32Array(1);
      const limit = Math.floor(0xFFFFFFFF / this.available.length) * this.available.length;
      let rand;
      do {
        window.crypto.getRandomValues(arr);
        rand = arr[0];
      } while (rand >= limit);
      randIdx = rand % this.available.length;
    } else {
      randIdx = Math.floor(Math.random() * this.available.length);
    }

    const drawn = this.available.splice(randIdx, 1)[0];

    const now = new Date();
    const timeFormatted = now.toTimeString().split(' ')[0] + '.' + String(now.getMilliseconds()).padStart(3, '0');

    this.called.push(drawn);
    this.lastFive.unshift(drawn);
    if (this.lastFive.length > 5) this.lastFive.pop();

    // Registro de Auditoría Notarial para AJALAR
    this.auditLog.push({
      order: this.called.length,
      ball: drawn,
      time: timeFormatted,
      timestamp: now.getTime()
    });

    // Actualizar esfera con animación 'reveal'
    const ballEl = document.getElementById('mainBallDisplay');
    const ballText = document.getElementById('mainBallNumber');
    if (ballEl) {
      ballEl.className = 'main-ball-sphere revealed';
    }
    if (ballText) {
      ballText.textContent = String(drawn).padStart(2, '0');
    }

    // Efectos de sonido y voz
    window.soundEngine?.playBallDrop();
    setTimeout(() => {
      window.soundEngine?.playBell();
      window.voiceEngine?.speak(drawn);
    }, 150);

    if (navigator.vibrate) navigator.vibrate(60);

    // Actualizar tableros e indicadores
    this.updateBoardUI();
    this.updateLastFiveUI();
    this.updateProgressUI();
    
    const nick = window.voiceEngine?.nicknames[drawn];
    const nickText = nick ? ` — ${nick.charAt(0).toUpperCase() + nick.slice(1)}` : '';
    this.setStatus(`¡Salió la bolilla ${String(drawn).padStart(2, '0')}${nickText}!`);

    // Guardar estado y transmitir
    this.saveState();
    this.broadcastCurrentState();

    this.isDrawing = false;
    const drawBtn = document.getElementById('btnDrawBall');
    if (drawBtn) drawBtn.disabled = false;
  }

  displayBall(num) {
    const ballEl = document.getElementById('mainBallDisplay');
    const ballText = document.getElementById('mainBallNumber');
    if (ballEl) ballEl.className = 'main-ball-sphere';
    if (ballText) ballText.textContent = String(num).padStart(2, '0');
  }

  updateBoardUI() {
    // Limpiar clases
    const allCells = document.querySelectorAll('.board-cell');
    allCells.forEach(c => c.classList.remove('called', 'last-called'));

    this.called.forEach((num, idx) => {
      const cell = document.getElementById(`board-cell-${num}`);
      if (cell) {
        cell.classList.add('called');
        if (idx === this.called.length - 1) {
          cell.classList.add('last-called');
        }
      }
    });
  }

  updateLastFiveUI() {
    for (let i = 1; i <= 5; i++) {
      const el = document.getElementById(`last-ball-${i}`);
      if (el) {
        if (i <= this.lastFive.length) {
          el.textContent = String(this.lastFive[i - 1]).padStart(2, '0');
          el.classList.add('active');
        } else {
          el.textContent = '--';
          el.classList.remove('active');
        }
      }
    }
  }

  updateProgressUI() {
    const count = this.called.length;
    const pct = ((count / this.totalNumbers) * 100).toFixed(0);

    const fillEl = document.getElementById('progressFill');
    const labelEl = document.getElementById('progressLabel');

    if (fillEl) fillEl.style.width = `${pct}%`;
    if (labelEl) labelEl.textContent = `${count} / ${this.totalNumbers} bolillas (${pct}%)`;

    // Actualizar tarjetas de métricas
    const elRest = document.getElementById('statRemaining');
    if (elRest) elRest.textContent = this.totalNumbers - count;

    const elTotal = document.getElementById('statTotalDrawn');
    if (elTotal) elTotal.textContent = count;
  }

  toggleAutoDraw() {
    if (this.autoInterval) {
      this.stopAutoDraw();
    } else {
      this.startAutoDraw();
    }
  }

  startAutoDraw() {
    if (this.available.length === 0) return;
    const btn = document.getElementById('btnAutoDraw');
    const box = document.getElementById('autoControlsBox');
    if (btn) {
      btn.classList.add('active');
      btn.innerHTML = '⏹️ Detener Auto';
    }
    if (box) box.classList.add('active');

    this.setStatus(`Modo automático iniciado (cada ${this.autoSpeed}s)`);
    this.drawBall();

    this.autoInterval = setInterval(() => {
      if (!this.isPaused && !this.isDrawing && this.available.length > 0) {
        this.drawBall();
      } else if (this.available.length === 0) {
        this.stopAutoDraw();
      }
    }, this.autoSpeed * 1000);
  }

  stopAutoDraw() {
    if (this.autoInterval) {
      clearInterval(this.autoInterval);
      this.autoInterval = null;
    }
    const btn = document.getElementById('btnAutoDraw');
    const box = document.getElementById('autoControlsBox');
    if (btn) {
      btn.classList.remove('active');
      btn.innerHTML = '▶️ Modo Auto';
    }
    if (box) box.classList.remove('active');
    this.setStatus('Modo automático detenido');
  }

  updateAutoInterval() {
    if (this.autoInterval) {
      clearInterval(this.autoInterval);
      this.autoInterval = setInterval(() => {
        if (!this.isPaused && !this.isDrawing && this.available.length > 0) {
          this.drawBall();
        } else if (this.available.length === 0) {
          this.stopAutoDraw();
        }
      }, this.autoSpeed * 1000);
      this.setStatus(`Velocidad ajustada: cada ${this.autoSpeed}s`);
    }
  }

  togglePause() {
    this.isPaused = !this.isPaused;
    const btn = document.getElementById('btnPauseGame');
    if (btn) {
      btn.innerHTML = this.isPaused ? '▶️ Reanudar' : '⏸️ Pausar';
      btn.classList.toggle('paused', this.isPaused);
    }
    this.setStatus(this.isPaused ? '⏸️ Sorteo en Pausa' : '▶️ Sorteo Reanudado');
  }

  openResetModal() {
    const modal = document.getElementById('resetConfirmModal');
    const msg = document.getElementById('resetConfirmMessage');
    const count = this.called.length;

    if (msg) {
      if (count > 0) {
        msg.innerHTML = `Hay <strong>${count} bolillas extraídas</strong> en esta partida.<br>Si reinicias, se vaciará el tablero y todo volverá a cero.<br>¿Estás seguro de que deseas continuar?`;
      } else {
        msg.innerHTML = `¿Deseas reiniciar el tablero y el bolillero a su estado inicial?`;
      }
    }

    if (modal) {
      modal.classList.add('active');
    }
  }

  closeResetModal() {
    const modal = document.getElementById('resetConfirmModal');
    if (modal) {
      modal.classList.remove('active');
    }
  }

  executeConfirmedReset() {
    this.closeResetModal();

    this.stopAutoDraw();
    this.setupAvailableNumbers();
    this.called = [];
    this.lastFive = [];
    this.auditLog = [];
    this.officialWinners = { line: null, bingo: null };
    this.isPaused = false;
    this.isDrawing = false;
    this.startTime = null;

    // Resetear esfera
    const ballEl = document.getElementById('mainBallDisplay');
    const ballText = document.getElementById('mainBallNumber');
    if (ballEl) ballEl.className = 'main-ball-sphere empty';
    if (ballText) ballText.textContent = '??';

    // Resetear botón pausa
    const pauseBtn = document.getElementById('btnPauseGame');
    if (pauseBtn) {
      pauseBtn.innerHTML = '⏸️ Pausar';
      pauseBtn.classList.remove('paused');
    }

    // Resetear reloj
    const clockEl = document.getElementById('gameElapsedTime');
    if (clockEl) clockEl.textContent = '00:00';

    // Resetear tablero, últimas 5 y progreso
    this.updateBoardUI();
    this.updateLastFiveUI();
    this.updateProgressUI();
    this.setStatus('Sorteo reiniciado correctamente. Listo para comenzar.');

    // Limpiar almacenamiento y avisar a proyector
    window.storageManager?.clearGameState();
    this.broadcastCurrentState();
  }

  resetGame() {
    this.openResetModal();
  }

  setStatus(text, isError = false) {
    const statusEl = document.getElementById('systemStatusText');
    if (statusEl) {
      statusEl.textContent = text;
      statusEl.className = `status-text ${isError ? 'error' : ''}`;
    }
  }

  startClock() {
    const clockEl = document.getElementById('gameElapsedTime');
    this.timerInterval = setInterval(() => {
      if (this.startTime && clockEl) {
        const diff = Math.floor((Date.now() - this.startTime) / 1000);
        const m = String(Math.floor(diff / 60)).padStart(2, '0');
        const s = String(diff % 60).padStart(2, '0');
        clockEl.textContent = `${m}:${s}`;
      }
    }, 1000);
  }

  saveState() {
    const state = {
      called: this.called,
      lastFive: this.lastFive,
      startTime: this.startTime,
      autoSpeed: this.autoSpeed,
      isPaused: this.isPaused,
      auditLog: this.auditLog,
      officialWinners: this.officialWinners
    };
    window.storageManager?.saveGameState(state);
  }

  recordOfficialWinner(type, serial, details = {}) {
    const winnerData = {
      type: type, // 'line' o 'bingo'
      cardSerial: serial,
      ballDrawn: this.called[this.called.length - 1] || null,
      ballIndex: this.called.length,
      time: new Date().toLocaleTimeString(),
      timestamp: Date.now(),
      details: details
    };
    if (type === 'line') {
      this.officialWinners.line = winnerData;
    } else {
      this.officialWinners.bingo = winnerData;
    }
    this.saveState();
    return winnerData;
  }

  getActaData() {
    return {
      startTime: this.startTime,
      calledCount: this.called.length,
      totalNumbers: this.totalNumbers,
      called: this.called,
      auditLog: this.auditLog,
      officialWinners: this.officialWinners
    };
  }

  broadcastCurrentState() {
    const state = {
      called: this.called,
      lastFive: this.lastFive,
      lastDrawn: this.called.length > 0 ? this.called[this.called.length - 1] : null,
      totalNumbers: this.totalNumbers
    };
    window.storageManager?.broadcast('DRAW_BALL', state);
  }

  setupRemoteBridge() {
    // Escuchar comandos remotos enviados por WebSocket (desde celular u otra pantalla)
    window.addEventListener('BINGO_REMOTE_COMMAND', (e) => {
      const { command, payload } = e.detail || {};
      if (!command) return;

      switch (command) {
        case 'DRAW_BALL':
          if (!this.isDrawing && !this.isPaused) {
            this.drawBall();
          }
          break;
        case 'TOGGLE_PAUSE':
          this.togglePause();
          break;
        case 'TOGGLE_AUTO':
          this.toggleAutoDraw();
          break;
        case 'SET_SPEED':
          if (payload && payload.speed) {
            this.autoSpeed = parseFloat(payload.speed);
            const range = document.getElementById('autoSpeedRange');
            const label = document.getElementById('autoSpeedLabel');
            if (range) range.value = this.autoSpeed;
            if (label) label.textContent = `${this.autoSpeed}s`;
            this.updateAutoInterval();
          }
          break;
        case 'RESET_GAME':
          this.executeConfirmedReset();
          break;
        case 'REQUEST_STATE':
          this.broadcastCurrentState();
          break;
        case 'VERIFY_CARD':
          if (payload && payload.serial) {
            this.verifyCardFromRemote(payload.serial, payload.target || 'bingo');
          }
          break;
      }
    });
  }

  verifyCardFromRemote(serial, target) {
    if (!window.bingoVerifier) return;
    const card = window.storageManager?.findCardBySerial(serial);
    if (!card) {
      if (window.remoteClient) {
        window.remoteClient.sendCommand('VERIFY_RESULT', {
          serial,
          target,
          success: false,
          error: 'Cartón no encontrado'
        });
      }
      return;
    }
    const result = window.bingoVerifier.verifyCard(card, this.called, target);
    if (window.remoteClient) {
      window.remoteClient.sendCommand('VERIFY_RESULT', {
        serial,
        target,
        card,
        result
      });
    }
    if (result.isWinner) {
      window.bingoVerifier.triggerVictoryBanner(card, target);
    }
  }

  openProyectorWindow() {
    const screenW = window.screen.width;
    const feat = `width=1000,height=750,left=${screenW},top=0,menubar=no,toolbar=no`;
    const win = window.open('proyector.html', 'bingoProyector', feat);
    if (!win) {
      alert('Por favor permití las ventanas emergentes en tu navegador para abrir la pantalla del proyector.');
    }
  }
}

// Iniciar aplicación al cargar
document.addEventListener('DOMContentLoaded', () => {
  window.bolilleroApp = new BolilleroApp();
});
