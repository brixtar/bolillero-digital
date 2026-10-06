/**
 * CARTONES.JS - Generador y Administrador de Cartones de Bingo
 * Generación reglamentaria de cartones 3x9 con 15 números y N° de Serie único.
 */

class CardManager {
  constructor() {
    this.cards = [];
    this.totalBalls = 90; // Bingo Oficial Tradicional: 90 bolillas (1 al 90)
    this.loadCards();
  }

  loadCards() {
    this.cards = window.storageManager ? window.storageManager.getCards() : [];
  }

  setGameRange(total) {
    this.totalBalls = total === 90 ? 90 : 100;
  }

  clearCards() {
    this.cards = [];
    if (window.storageManager) {
      window.storageManager.clearCards();
    }
  }

  /**
   * Genera un cartón 100% aleatorio conforme al reglamento oficial de 90 bolillas (3x9, 15 números).
   * Utiliza aleatoriedad criptográfica (Web Crypto API) para garantizar que las posiciones
   * y los números sean estrictamente al azar e inalterables.
   */
  generateSingleCard(serialNumber, eventName = 'Gran Bingo') {
    const is100 = this.totalBalls === 100;
    const numCols = is100 ? 10 : 9;

    // Función auxiliar para obtener enteros aleatorios seguros
    const getSecureRandom = (max) => {
      if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
        const arr = new Uint32Array(1);
        window.crypto.getRandomValues(arr);
        return arr[0] % max;
      }
      return Math.floor(Math.random() * max);
    };

    let grid = null;

    for (let attempt = 0; attempt < 100; attempt++) {
      // 1. Distribuir 15 números en las columnas (mínimo 1, máximo 3 por columna)
      const colCounts = Array(numCols).fill(1);
      let extra = 15 - numCols; // 6 extras para 9 columnas

      while (extra > 0) {
        const cIdx = getSecureRandom(numCols);
        if (colCounts[cIdx] < 3) {
          colCounts[cIdx]++;
          extra--;
        }
      }

      // 2. Asignar celdas a las 3 filas con backtracking aleatorio (garantizado 5 por fila)
      const tempGrid = Array(3).fill(null).map(() => Array(numCols).fill(null));
      const rowCounts = [0, 0, 0];

      const solve = (col) => {
        if (col === numCols) {
          return rowCounts[0] === 5 && rowCounts[1] === 5 && rowCounts[2] === 5;
        }
        const needed = colCounts[col];
        const combos = [];
        if (needed === 1) {
          combos.push([0], [1], [2]);
        } else if (needed === 2) {
          combos.push([0, 1], [0, 2], [1, 2]);
        } else {
          combos.push([0, 1, 2]);
        }
        // Mezclar aleatoriamente las combinaciones
        combos.sort(() => getSecureRandom(3) - 1);

        for (const combo of combos) {
          if (combo.every(r => rowCounts[r] < 5)) {
            combo.forEach(r => { rowCounts[r]++; tempGrid[r][col] = -1; });
            if (solve(col + 1)) return true;
            combo.forEach(r => { rowCounts[r]--; tempGrid[r][col] = null; });
          }
        }
        return false;
      };

      if (solve(0)) {
        grid = tempGrid;
        break;
      }
    }

    // Rellenar números por columna de manera ascendente
    const allNumbers = [];
    for (let c = 0; c < numCols; c++) {
      let min, max;
      if (is100) {
        min = c * 10;
        max = c * 10 + 9;
      } else {
        // Formato oficial 90 bolillas tradicional
        min = c === 0 ? 1 : c * 10;
        max = c === 8 ? 90 : c * 10 + 9;
      }

      const pool = [];
      for (let val = min; val <= max; val++) pool.push(val);
      // Mezcla Fisher-Yates criptográfica
      for (let i = pool.length - 1; i > 0; i--) {
        const j = getSecureRandom(i + 1);
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }

      const rowsForThisCol = [];
      for (let r = 0; r < 3; r++) {
        if (grid[r][c] === -1) rowsForThisCol.push(r);
      }

      const selected = pool.slice(0, rowsForThisCol.length).sort((a, b) => a - b);
      for (let i = 0; i < rowsForThisCol.length; i++) {
        const numVal = selected[i];
        grid[rowsForThisCol[i]][c] = numVal;
        allNumbers.push(numVal);
      }
    }

    allNumbers.sort((a, b) => a - b);

    const padSize = 4;
    const serialString = '#' + String(serialNumber).padStart(padSize, '0');

    return {
      serialNumber: serialNumber,
      serialString: serialString,
      eventName: eventName,
      createdAt: new Date().toISOString(),
      numCols: numCols,
      grid: grid,
      numbers: allNumbers
    };
  }

  /**
   * Genera una serie de N cartones correlativos y los persiste
   */
  /**
   * Genera una serie de N cartones correlativos y los persiste
   */
  generateBatch(count = 10, eventName = 'Gran Bingo', clearPrevious = false, metadata = {}) {
    if (clearPrevious) {
      this.clearCards();
    }
    
    let currentSerial = this.cards.length > 0
      ? Math.max(...this.cards.map(c => c.serialNumber)) + 1
      : 1;

    const newCards = [];
    for (let i = 0; i < count; i++) {
      const card = this.generateSingleCard(currentSerial++, eventName, metadata);
      newCards.push(card);
      this.cards.push(card);
    }

    if (window.storageManager) {
      window.storageManager.saveCards(this.cards);
    }

    return newCards;
  }

  /**
   * Genera un cartón 100% aleatorio conforme al reglamento oficial de 90 bolillas (3x9, 15 números).
   * Utiliza aleatoriedad criptográfica (Web Crypto API) para garantizar que las posiciones
   * y los números sean estrictamente al azar e inalterables.
   */
  generateSingleCard(serialNumber, eventName = 'Gran Bingo', metadata = {}) {
    const is100 = this.totalBalls === 100;
    const numCols = is100 ? 10 : 9;

    // Función auxiliar para obtener enteros aleatorios criptográficos
    const getSecureRandom = (max) => {
      if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
        const arr = new Uint32Array(1);
        const limit = Math.floor(0xFFFFFFFF / max) * max;
        let rand;
        do {
          window.crypto.getRandomValues(arr);
          rand = arr[0];
        } while (rand >= limit);
        return rand % max;
      }
      return Math.floor(Math.random() * max);
    };

    let grid = null;

    for (let attempt = 0; attempt < 100; attempt++) {
      // 1. Distribuir 15 números en las columnas (mínimo 1, máximo 3 por columna)
      const colCounts = Array(numCols).fill(1);
      let extra = 15 - numCols; // 6 extras para 9 columnas

      while (extra > 0) {
        const cIdx = getSecureRandom(numCols);
        if (colCounts[cIdx] < 3) {
          colCounts[cIdx]++;
          extra--;
        }
      }

      // 2. Asignar celdas a las 3 filas con backtracking aleatorio (garantizado 5 por fila)
      const tempGrid = Array(3).fill(null).map(() => Array(numCols).fill(null));
      const rowCounts = [0, 0, 0];

      const solve = (col) => {
        if (col === numCols) {
          return rowCounts[0] === 5 && rowCounts[1] === 5 && rowCounts[2] === 5;
        }
        const needed = colCounts[col];
        const combos = [];
        if (needed === 1) {
          combos.push([0], [1], [2]);
        } else if (needed === 2) {
          combos.push([0, 1], [0, 2], [1, 2]);
        } else {
          combos.push([0, 1, 2]);
        }
        // Mezclar aleatoriamente las combinaciones
        combos.sort(() => getSecureRandom(3) - 1);

        for (const combo of combos) {
          if (combo.every(r => rowCounts[r] < 5)) {
            combo.forEach(r => { rowCounts[r]++; tempGrid[r][col] = -1; });
            if (solve(col + 1)) return true;
            combo.forEach(r => { rowCounts[r]--; tempGrid[r][col] = null; });
          }
        }
        return false;
      };

      if (solve(0)) {
        grid = tempGrid;
        break;
      }
    }

    // Rellenar números por columna de manera ascendente
    const allNumbers = [];
    for (let c = 0; c < numCols; c++) {
      let min, max;
      if (is100) {
        min = c * 10;
        max = c * 10 + 9;
      } else {
        // Formato oficial 90 bolillas tradicional
        min = c === 0 ? 1 : c * 10;
        max = c === 8 ? 90 : c * 10 + 9;
      }

      const pool = [];
      for (let val = min; val <= max; val++) pool.push(val);
      // Mezcla Fisher-Yates criptográfica
      for (let i = pool.length - 1; i > 0; i--) {
        const j = getSecureRandom(i + 1);
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }

      const rowsForThisCol = [];
      for (let r = 0; r < 3; r++) {
        if (grid[r][c] === -1) rowsForThisCol.push(r);
      }

      const selected = pool.slice(0, rowsForThisCol.length).sort((a, b) => a - b);
      for (let i = 0; i < rowsForThisCol.length; i++) {
        const numVal = selected[i];
        grid[rowsForThisCol[i]][c] = numVal;
        allNumbers.push(numVal);
      }
    }

    allNumbers.sort((a, b) => a - b);

    const padSize = 4;
    const serialString = '#' + String(serialNumber).padStart(padSize, '0');

    // Generar código hash de validación notarial
    let checksum = serialNumber * 7919;
    allNumbers.forEach((n, idx) => {
      checksum = (checksum + n * (idx + 31)) % 65536;
    });
    const securityHash = 'AJL-' + checksum.toString(16).toUpperCase().padStart(4, '0');

    return {
      serialNumber: serialNumber,
      serialString: serialString,
      eventName: eventName,
      createdAt: new Date().toISOString(),
      numCols: numCols,
      grid: grid,
      numbers: allNumbers,
      securityHash: securityHash,
      metadata: {
        institution: metadata.institution || eventName,
        ajalarRes: metadata.ajalarRes || 'Autorizado por AJALAR',
        series: metadata.series || 'Serie A',
        price: metadata.price || '',
        date: metadata.date || '',
        prizeLine: metadata.prizeLine || '',
        prizeBingo: metadata.prizeBingo || ''
      }
    };
  }

  /**
   * Renderiza el HTML de un cartón (formato pantalla o impresión) conforme a normas reglamentarias de AJALAR
   */
  renderCardHTML(card, options = {}) {
    const isTicket = options.isTicket || false;
    const { serialString, grid, numCols, securityHash } = card;
    const meta = card.metadata || {};
    const institution = meta.institution || card.eventName || 'GRAN BINGO OFICIAL';
    const ajalarRes = meta.ajalarRes || 'Autorizado por AJALAR';
    const series = meta.series || 'SERIE A';
    const priceText = meta.price ? `VALOR: ${meta.price}` : '';
    const dateText = meta.date ? `FECHA: ${meta.date}` : '';
    const prizeLine = meta.prizeLine || '';
    const prizeBingo = meta.prizeBingo || '';

    let rowsHTML = '';
    for (let r = 0; r < 3; r++) {
      let cellsHTML = '';
      for (let c = 0; c < numCols; c++) {
        const val = grid[r][c];
        if (val === null) {
          cellsHTML += `<div class="bingo-cell empty"></div>`;
        } else {
          const formatted = String(val).padStart(2, '0');
          const isMarked = options.called && options.called.includes(val);
          const markedClass = isMarked ? 'marked' : '';
          cellsHTML += `<div class="bingo-cell ${markedClass}">${formatted}</div>`;
        }
      }
      rowsHTML += `<div class="bingo-row">${cellsHTML}</div>`;
    }

    const ticketClass = isTicket ? 'thermal-ticket' : 'screen-card';
    const themeClass = options.theme || 'theme-blue';

    // Franja de premios si están definidos
    let prizesHTML = '';
    if (prizeLine || prizeBingo) {
      const lineStr = prizeLine ? `<span>⭐ LÍNEA: <strong>${prizeLine}</strong></span>` : '';
      const sep = (prizeLine && prizeBingo) ? '<span class="prizes-sep">•</span>' : '';
      const bingoStr = prizeBingo ? `<span>🏆 BINGO: <strong>${prizeBingo}</strong></span>` : '';
      prizesHTML = `
        <div class="card-prizes-strip">
          ${lineStr} ${sep} ${bingoStr}
        </div>
      `;
    }

    return `
      <div class="card-wrapper ${ticketClass} ${themeClass}" data-serial="${card.serialNumber}">
        <!-- Encabezado Reglamentario AJALAR -->
        <div class="card-header">
          <div class="card-header-left">
            <div class="card-event-title">${institution}</div>
            <div class="card-regulatory-tag">
              <span class="ajalar-badge">AJALAR</span>
              <span>${ajalarRes}</span>
            </div>
            ${(dateText || priceText) ? `<div class="card-extra-info">${[dateText, priceText].filter(Boolean).join(' • ')}</div>` : ''}
          </div>
          <div class="card-header-right">
            <span class="card-series-tag">${series}</span>
            <span class="card-serial">${serialString}</span>
          </div>
        </div>

        ${prizesHTML}

        <!-- Grilla 3x9 Oficial de 15 números -->
        <div class="card-body card-grid-${numCols}">
          ${rowsHTML}
        </div>

        <!-- Pie de Cartón con Leyendas Legales Obligatorias -->
        <div class="card-footer">
          <div class="footer-col-left">
            <div class="footer-rule">BINGO TRADICIONAL 90 BOLILLAS • 15 NÚMEROS</div>
            <div class="footer-legal">🔞 PROHIBIDA LA VENTA Y PARTICIPACIÓN A MENORES DE 18 AÑOS (Ley Prov. N° 6.843 / AJALAR)</div>
            <div class="footer-health">El juego compulsivo es perjudicial para la salud • Línea de Orientación AJALAR</div>
            <div class="footer-caducidad">Caducidad: 10 días hábiles. Pago contra entrega de cartón original sin enmiendas.</div>
          </div>
          <div class="footer-col-right">
            <div class="card-code">${securityHash || '*' + String(card.serialNumber).padStart(6, '0') + '*'}</div>
            <div class="fiscal-tag">CONTROL NOTARIAL</div>
            <div class="signature-line">FIRMA / SELLO</div>
          </div>
        </div>
      </div>
    `;
  }
}

window.cardManager = new CardManager();

