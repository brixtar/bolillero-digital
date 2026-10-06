/**
 * VERIFICADOR.JS - Lógica de Verificación Rápida de Línea y Bingo
 * Valida jugadas instantáneamente mediante N° de Serie o números manuales.
 */

class BingoVerifier {
  constructor() {
    this.modalEl = null;
    this.currentMode = 'serial'; // 'serial' o 'manual'
    this.currentTarget = 'line'; // 'line' o 'bingo'
  }

  init() {
    this.modalEl = document.getElementById('verifyModal');
  }

  openModal(target = 'line') {
    this.currentTarget = target;
    if (!this.modalEl) this.init();

    // Actualizar tabs en el modal
    this.updateTargetTabs();
    this.clearResults();

    const inputSerial = document.getElementById('verifySerialInput');
    if (inputSerial) {
      inputSerial.value = '';
      setTimeout(() => inputSerial.focus(), 150);
    }
    const inputManual = document.getElementById('verifyManualInput');
    if (inputManual) inputManual.value = '';

    if (this.modalEl) {
      this.modalEl.classList.add('active');
    }
  }

  closeModal() {
    if (this.modalEl) {
      this.modalEl.classList.remove('active');
    }
    this.clearResults();
  }

  setTarget(target) {
    this.currentTarget = target;
    this.updateTargetTabs();
    this.clearResults();
  }

  setMode(mode) {
    this.currentMode = mode;
    const serialSec = document.getElementById('verifySerialSection');
    const manualSec = document.getElementById('verifyManualSection');
    const tabSerial = document.getElementById('tabModeSerial');
    const tabManual = document.getElementById('tabModeManual');

    if (mode === 'serial') {
      if (serialSec) serialSec.style.display = 'block';
      if (manualSec) manualSec.style.display = 'none';
      if (tabSerial) tabSerial.classList.add('active');
      if (tabManual) tabManual.classList.remove('active');
      document.getElementById('verifySerialInput')?.focus();
    } else {
      if (serialSec) serialSec.style.display = 'none';
      if (manualSec) manualSec.style.display = 'block';
      if (tabSerial) tabSerial.classList.remove('active');
      if (tabManual) tabManual.classList.add('active');
      document.getElementById('verifyManualInput')?.focus();
    }
    this.clearResults();
  }

  updateTargetTabs() {
    const btnLine = document.getElementById('btnTargetLine');
    const btnBingo = document.getElementById('btnTargetBingo');
    if (this.currentTarget === 'line') {
      btnLine?.classList.add('active');
      btnBingo?.classList.remove('active');
    } else {
      btnLine?.classList.remove('active');
      btnBingo?.classList.add('active');
    }
  }

  clearResults() {
    const resBox = document.getElementById('verifyResultBox');
    if (resBox) {
      resBox.innerHTML = '';
      resBox.className = 'verify-result-box';
    }
  }

  /**
   * Ejecuta la comprobación según el modo actual
   */
  executeCheck(calledNumbers = []) {
    if (this.currentMode === 'serial') {
      this.checkBySerial(calledNumbers);
    } else {
      this.checkByManual(calledNumbers);
    }
  }

  checkBySerial(calledNumbers) {
    const input = document.getElementById('verifySerialInput');
    const rawVal = input ? input.value.trim() : '';
    if (!rawVal) {
      this.showFeedback(false, '⚠️ Ingresá el número de serie del cartón');
      return;
    }

    const card = window.storageManager ? window.storageManager.findCardBySerial(rawVal) : null;
    if (!card) {
      this.showFeedback(false, `❌ Cartón "${rawVal}" no encontrado en el sistema. Verificá el número de serie o usá el modo manual.`);
      window.soundEngine?.playFailSound();
      return;
    }

    if (this.currentTarget === 'line') {
      this.evaluateCardLine(card, calledNumbers);
    } else {
      this.evaluateCardBingo(card, calledNumbers);
    }
  }

  evaluateCardLine(card, calledNumbers) {
    // Revisar filas 0, 1 y 2
    let winningRow = -1;
    let winningNums = [];

    for (let r = 0; r < 3; r++) {
      const rowNums = card.grid[r].filter(n => n !== null);
      const allDrawn = rowNums.every(n => calledNumbers.includes(n));
      if (allDrawn) {
        winningRow = r + 1;
        winningNums = rowNums;
        break;
      }
    }

    if (winningRow !== -1) {
      // ¡Línea válida!
      const formattedNums = winningNums.map(n => String(n).padStart(2, '0')).join(', ');
      this.showFeedback(true, `
        <div class="win-banner line-win">
          <div class="win-icon">🎉</div>
          <h3>¡LÍNEA VÁLIDA Y CONFIRMADA!</h3>
          <p class="win-sub">Cartón <strong>${card.serialString}</strong> completó la <strong>Fila ${winningRow}</strong></p>
          <div class="win-nums">Números de la línea: <span>${formattedNums}</span></div>
          <div style="margin-top: 14px;">
            <button class="btn-action generate" onclick="window.bingoVerifier?.registerWinnerInActa('line', '${card.serialString}', ${winningRow}, this)">
              📜 Asentar Ganador de Línea en Acta Oficial
            </button>
          </div>
        </div>
      `);
      window.soundEngine?.playWinFanfare(false);
      window.voiceEngine?.speakCustom(`¡Línea confirmada para el cartón ${card.serialNumber}!`);
      this.launchConfetti();
      window.storageManager?.broadcast('VERIFY_WIN', { type: 'LINE', card: card.serialString, row: winningRow });
    } else {
      // No completó línea todavía
      // Mostrar estado de cada fila
      let detailsHTML = '<div class="card-status-grid">';
      for (let r = 0; r < 3; r++) {
        const rowNums = card.grid[r].filter(n => n !== null);
        const missing = rowNums.filter(n => !calledNumbers.includes(n));
        detailsHTML += `
          <div class="row-status-item">
            <span>Fila ${r + 1}:</span>
            ${missing.length === 0 ? '<strong class="green">¡COMPLETA!</strong>' : `Faltan ${missing.length} (${missing.map(n => String(n).padStart(2,'0')).join(', ')})`}
          </div>
        `;
      }
      detailsHTML += '</div>';

      this.showFeedback(false, `
        <div class="fail-banner">
          <h4>❌ Aún no completa ninguna línea</h4>
          <p>Cartón <strong>${card.serialString}</strong>:</p>
          ${detailsHTML}
        </div>
      `);
      window.soundEngine?.playFailSound();
    }
  }

  evaluateCardBingo(card, calledNumbers) {
    const allNums = card.numbers;
    const drawn = allNums.filter(n => calledNumbers.includes(n));
    const missing = allNums.filter(n => !calledNumbers.includes(n));

    if (missing.length === 0) {
      // ¡BINGO COMPLETO!
      this.showFeedback(true, `
        <div class="win-banner bingo-win">
          <div class="win-icon">🏆</div>
          <h2>¡BINGO! ¡CARTÓN LLENO!</h2>
          <p class="win-sub">Cartón <strong>${card.serialString}</strong> completó los 15 números</p>
          <div class="win-badge-row">
            ${allNums.map(n => `<span class="badge-win">${String(n).padStart(2, '0')}</span>`).join('')}
          </div>
          <div style="margin-top: 14px;">
            <button class="btn-action generate" onclick="window.bingoVerifier?.registerWinnerInActa('bingo', '${card.serialString}', null, this)">
              📜 Asentar Ganador de Bingo en Acta Oficial
            </button>
          </div>
        </div>
      `);
      window.soundEngine?.playWinFanfare(true);
      window.voiceEngine?.speakCustom(`¡Bingo! ¡Cartón lleno para el cartón ${card.serialNumber}!`);
      this.launchConfetti(true);
      window.storageManager?.broadcast('VERIFY_WIN', { type: 'BINGO', card: card.serialString });
    } else {
      this.showFeedback(false, `
        <div class="fail-banner">
          <h4>❌ Faltan ${missing.length} número(s) para el Bingo</h4>
          <p>Cartón <strong>${card.serialString}</strong> (${drawn.length}/15 acertados):</p>
          <div class="missing-badge-row">
            <p><strong>Faltan:</strong></p>
            ${missing.map(n => `<span class="badge-missing">${String(n).padStart(2, '0')}</span>`).join(' ')}
          </div>
        </div>
      `);
      window.soundEngine?.playFailSound();
    }
  }

  checkByManual(calledNumbers) {
    const input = document.getElementById('verifyManualInput');
    const rawVal = input ? input.value.trim() : '';
    if (!rawVal) {
      this.showFeedback(false, '⚠️ Ingresá los números separados por coma o espacio');
      return;
    }

    const numbers = rawVal.split(/[,\s]+/)
      .map(s => parseInt(s.trim(), 10))
      .filter(n => !isNaN(n) && n >= 0 && n <= 99);

    if (numbers.length === 0) {
      this.showFeedback(false, '⚠️ Formato de números inválido');
      return;
    }

    const drawn = numbers.filter(n => calledNumbers.includes(n));
    const missing = numbers.filter(n => !calledNumbers.includes(n));

    if (missing.length === 0) {
      const isBingo = this.currentTarget === 'bingo';
      this.showFeedback(true, `
        <div class="win-banner ${isBingo ? 'bingo-win' : 'line-win'}">
          <div class="win-icon">${isBingo ? '🏆' : '🎉'}</div>
          <h3>¡${isBingo ? 'BINGO' : 'LÍNEA'} CONFIRMADA!</h3>
          <p>Todos los ${numbers.length} números verificados ya salieron:</p>
          <div class="win-badge-row">
            ${numbers.map(n => `<span class="badge-win">${String(n).padStart(2, '0')}</span>`).join('')}
          </div>
        </div>
      `);
      window.soundEngine?.playWinFanfare(isBingo);
      this.launchConfetti(isBingo);
    } else {
      this.showFeedback(false, `
        <div class="fail-banner">
          <h4>❌ No coincide aún</h4>
          <p>Acertados (${drawn.length}/${numbers.length})</p>
          <div class="missing-badge-row">
            <p><strong>Faltan salir:</strong></p>
            ${missing.map(n => `<span class="badge-missing">${String(n).padStart(2, '0')}</span>`).join(' ')}
          </div>
        </div>
      `);
      window.soundEngine?.playFailSound();
    }
  }

  showFeedback(isWin, html) {
    const box = document.getElementById('verifyResultBox');
    if (box) {
      box.className = `verify-result-box ${isWin ? 'success' : 'failed'}`;
      box.innerHTML = html;
    }
  }

  launchConfetti(isGiant = false) {
    const container = document.getElementById('confettiContainer');
    if (!container) return;
    container.innerHTML = '';
    const colors = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#38bdf8', '#ef4444'];
    const count = isGiant ? 120 : 60;

    for (let i = 0; i < count; i++) {
      const piece = document.createElement('div');
      piece.className = 'confetti-piece';
      piece.style.left = Math.random() * 100 + '%';
      piece.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
      piece.style.animationDelay = Math.random() * 1.5 + 's';
      piece.style.animationDuration = (2 + Math.random() * 2) + 's';
      container.appendChild(piece);
    }

    setTimeout(() => {
      if (container) container.innerHTML = '';
    }, 4500);
  }

  registerWinnerInActa(type, serial, row = null, buttonEl = null) {
    if (window.bolilleroApp) {
      window.bolilleroApp.recordOfficialWinner(type, serial, { row: row });
      if (buttonEl) {
        buttonEl.disabled = true;
        buttonEl.innerHTML = '✅ Asentado Oficialmente en Acta Notarial';
        buttonEl.style.background = '#10b981';
        buttonEl.style.boxShadow = '0 0 15px rgba(16, 185, 129, 0.4)';
      }
      alert(`🎉 El cartón ${serial} fue registrado formalmente como Ganador Oficial de ${type === 'line' ? 'LÍNEA' : 'BINGO'} en el Acta Notarial de AJALAR.`);
    }
  }
}

window.bingoVerifier = new BingoVerifier();
