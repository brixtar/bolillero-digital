/**
 * AUDIO.JS - Motor de Síntesis de Sonido Web Audio API
 * Genera efectos sonoros procedurales para el Bolillero y el Bingo.
 */

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.volume = 0.8;
  }

  initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  setVolume(val) {
    this.volume = Math.max(0, Math.min(1, val));
  }

  toggleSound(on) {
    this.enabled = on !== undefined ? on : !this.enabled;
    return this.enabled;
  }

  /**
   * Redoble de tambor mientras gira el bolillero
   */
  playDrumRoll(duration = 1.0) {
    if (!this.enabled) return;
    try {
      const c = this.initContext();
      const t0 = c.currentTime;
      const count = Math.floor(duration * 12);

      for (let i = 0; i < count; i++) {
        const osc = c.createOscillator();
        const gain = c.createGain();
        osc.type = 'triangle';

        const t = t0 + i * (duration / count);
        // Variación aleatoria sutil de tono para simular percusión
        osc.frequency.setValueAtTime(80 + Math.random() * 45, t);

        const currentVol = 0.12 * this.volume * (1 + (i / count) * 0.5);
        gain.gain.setValueAtTime(currentVol, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

        osc.connect(gain);
        gain.connect(c.destination);

        osc.start(t);
        osc.stop(t + 0.09);
      }
    } catch (e) {
      console.warn("Audio error en drum roll:", e);
    }
  }

  /**
   * Sonido pop/plop cuando cae la bolilla
   */
  playBallDrop() {
    if (!this.enabled) return;
    try {
      const c = this.initContext();
      const t0 = c.currentTime;
      const osc = c.createOscillator();
      const gain = c.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, t0);
      osc.frequency.exponentialRampToValueAtTime(180, t0 + 0.14);

      gain.gain.setValueAtTime(0.3 * this.volume, t0);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.14);

      osc.connect(gain);
      gain.connect(c.destination);

      osc.start(t0);
      osc.stop(t0 + 0.15);
    } catch (e) {}
  }

  /**
   * Campana de acierto / extracción de bolilla
   */
  playBell() {
    if (!this.enabled) return;
    try {
      const c = this.initContext();
      const t = c.currentTime;
      const osc = c.createOscillator();
      const gain = c.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(1046.5, t); // C6

      gain.gain.setValueAtTime(0.25 * this.volume, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 1.2);

      osc.connect(gain);
      gain.connect(c.destination);

      osc.start(t);
      osc.stop(t + 1.2);
    } catch (e) {}
  }

  /**
   * Sonido alegre cuando un número coincide en el cartón
   */
  playMatchSound() {
    if (!this.enabled) return;
    try {
      const c = this.initContext();
      const t0 = c.currentTime;
      const notes = [523.25, 783.99]; // Do5, Sol5

      notes.forEach((freq, idx) => {
        const osc = c.createOscillator();
        const gain = c.createGain();
        osc.type = 'sine';

        const t = t0 + idx * 0.08;
        osc.frequency.setValueAtTime(freq, t);

        gain.gain.setValueAtTime(0.2 * this.volume, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

        osc.connect(gain);
        gain.connect(c.destination);

        osc.start(t);
        osc.stop(t + 0.25);
      });
    } catch (e) {}
  }

  /**
   * Fanfarria de victoria (Línea o Bingo completo)
   */
  playWinFanfare(isBingo = false) {
    if (!this.enabled) return;
    try {
      const c = this.initContext();
      const t0 = c.currentTime;

      // Escala alegre
      const notes = isBingo
        ? [523.25, 659.25, 783.99, 1046.5, 1318.51, 1567.98, 2093.0] // Gran escala triunfal
        : [523.25, 659.25, 783.99, 1046.5]; // Escala de Línea

      notes.forEach((freq, i) => {
        const osc = c.createOscillator();
        const gain = c.createGain();
        osc.type = 'triangle';

        const t = t0 + i * (isBingo ? 0.15 : 0.18);
        osc.frequency.setValueAtTime(freq, t);

        const dur = (i === notes.length - 1) ? 0.8 : 0.28;
        gain.gain.setValueAtTime(0.25 * this.volume, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + dur);

        osc.connect(gain);
        gain.connect(c.destination);

        osc.start(t);
        osc.stop(t + dur);
      });
    } catch (e) {}
  }

  /**
   * Sonido de advertencia / número no presente
   */
  playFailSound() {
    if (!this.enabled) return;
    try {
      const c = this.initContext();
      const t0 = c.currentTime;
      const osc = c.createOscillator();
      const gain = c.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, t0);
      osc.frequency.exponentialRampToValueAtTime(140, t0 + 0.35);

      gain.gain.setValueAtTime(0.18 * this.volume, t0);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.35);

      osc.connect(gain);
      gain.connect(c.destination);

      osc.start(t0);
      osc.stop(t0 + 0.36);
    } catch (e) {}
  }
}

// Instancia global
window.soundEngine = new SoundEngine();
