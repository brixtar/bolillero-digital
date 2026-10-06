/**
 * VOZ.JS - Síntesis de Voz Web Speech API
 * Canto de números con estilos tradicional, dramático y simple.
 */

class VoiceEngine {
  constructor() {
    this.enabled = true;
    this.rate = 1.0;
    this.pitch = 1.1;
    this.volume = 1.0;
    this.style = localStorage.getItem('bingo_voice_style') || 'bingo'; // 'bingo' (Tradicional Argentino) por defecto
    this.selectedVoiceName = '';
    this.voices = [];

    // Tabla Oficial y Tradicional Argentina de los Sueños (00 al 99)
    this.nicknames = {
      0: 'los huevos',
      1: 'el agua',
      2: 'el niño',
      3: 'San Cono',
      4: 'la cama',
      5: 'el gato',
      6: 'el perro',
      7: 'el revólver',
      8: 'el incendio',
      9: 'el arroyo',
      10: 'el cañón',
      11: 'el minero',
      12: 'el soldado',
      13: 'la yeta',
      14: 'el borracho',
      15: 'la niña bonita',
      16: 'el anillo',
      17: 'la desgracia',
      18: 'la sangre',
      19: 'el pescado',
      20: 'la fiesta',
      21: 'la mujer',
      22: 'el loco',
      23: 'el cocinero',
      24: 'el caballo',
      25: 'la gallina',
      26: 'la misa',
      27: 'el peine',
      28: 'el cerro',
      29: 'San Pedro',
      30: 'Santa Rosa',
      31: 'la luz',
      32: 'el dinero',
      33: 'la edad de Cristo',
      34: 'la cabeza',
      35: 'el pajarito',
      36: 'la manteca',
      37: 'el dentista',
      38: 'las piedras',
      39: 'la lluvia',
      40: 'el cura',
      41: 'el cuchillo',
      42: 'las zapatillas',
      43: 'el balcón',
      44: 'la cárcel',
      45: 'el vino',
      46: 'los tomates',
      47: 'el muerto',
      48: 'el muerto que habla',
      49: 'la carne',
      50: 'el pan',
      51: 'el serrucho',
      52: 'madre e hijo',
      53: 'el barco',
      54: 'la vaca',
      55: 'la música',
      56: 'la caída',
      57: 'el jorobado',
      58: 'el ahogado',
      59: 'las plantas',
      60: 'la virgen',
      61: 'la escopeta',
      62: 'la inundación',
      63: 'el casamiento',
      64: 'el llanto',
      65: 'el cazador',
      66: 'las lombrices',
      67: 'la víbora',
      68: 'los sobrinos',
      69: 'los vicios',
      70: 'muerto sueño',
      71: 'el excremento',
      72: 'la sorpresa',
      73: 'el hospital',
      74: 'los negros',
      75: 'los besos',
      76: 'las llamas',
      77: 'las dos piernas',
      78: 'la ramera',
      79: 'el ladrón',
      80: 'la bocha',
      81: 'las flores',
      82: 'la pelea',
      83: 'el mal tiempo',
      84: 'la iglesia',
      85: 'la linterna',
      86: 'el humo',
      87: 'los piojos',
      88: 'el Papa',
      89: 'la rata',
      90: 'el miedo',
      91: 'el excusado',
      92: 'el médico',
      93: 'el enamorado',
      94: 'el cementerio',
      95: 'los anteojos',
      96: 'el marido',
      97: 'la mesa',
      98: 'la lavandera',
      99: 'el hermano'
    };

    this.init();
  }

  init() {
    this.selectedVoiceName = localStorage.getItem('bingo_selected_voice') || '';
    if ('speechSynthesis' in window) {
      this.loadVoices();
      window.speechSynthesis.onvoiceschanged = () => this.loadVoices();
    }
  }

  loadVoices() {
    if (!('speechSynthesis' in window)) return;
    this.voices = window.speechSynthesis.getVoices();

    const select = document.getElementById('voiceSelect');
    if (select) {
      select.innerHTML = '';
      const esVoices = this.voices.filter(v => v.lang.startsWith('es') || v.name.toLowerCase().includes('spanish') || v.name.toLowerCase().includes('español'));
      const activeVoices = esVoices.length > 0 ? esVoices : this.voices;

      // Buscar específicamente la voz de Google en español
      const googleEsVoice = this.voices.find(v => 
        (v.name.toLowerCase().includes('google') && (v.lang.startsWith('es') || v.name.toLowerCase().includes('español')))
      );

      // Si el usuario no seleccionó una voz previamente, asignar Google español por defecto
      if (!this.selectedVoiceName || !this.voices.some(v => v.name === this.selectedVoiceName)) {
        if (googleEsVoice) {
          this.selectedVoiceName = googleEsVoice.name;
        } else if (esVoices.length > 0) {
          this.selectedVoiceName = esVoices[0].name;
        } else if (this.voices.length > 0) {
          this.selectedVoiceName = this.voices[0].name;
        }
      }

      activeVoices.forEach(voice => {
        const opt = document.createElement('option');
        opt.value = voice.name;
        opt.textContent = `${voice.name} (${voice.lang})`;
        if (voice.name === this.selectedVoiceName) {
          opt.selected = true;
        }
        select.appendChild(opt);
      });

      if (this.selectedVoiceName) {
        select.value = this.selectedVoiceName;
      }
    }
  }

  setVoice(name) {
    this.selectedVoiceName = name;
    try {
      localStorage.setItem('bingo_selected_voice', name);
    } catch (e) {}
  }

  setRate(r) {
    this.rate = parseFloat(r) || 1.0;
  }

  setPitch(p) {
    this.pitch = parseFloat(p) || 1.1;
  }

  setStyle(s) {
    this.style = s;
    try {
      localStorage.setItem('bingo_voice_style', s);
    } catch (e) {}
  }

  toggle(on) {
    this.enabled = on !== undefined ? on : !this.enabled;
    return this.enabled;
  }

  buildText(num) {
    const formatted = String(num).padStart(2, '0');

    if (this.style === 'simple') {
      return `Número ${formatted}`;
    }

    if (this.style === 'bingo') {
      const nick = this.nicknames[num];
      if (nick) {
        return `¡El ${formatted}, ${nick}! ¡${formatted}!`;
      }
      return `¡El ${formatted}! ¡${formatted}!`;
    }

    // Estilo 'dramatic'
    const intros = [
      '¡Y el número es...',
      '¡Atención! ¡Sale el...',
      '¡Aquí viene el...',
      '¡Con ustedes el...',
      '¡La suerte dice...',
      '¡Anoten el...'
    ];
    const intro = intros[Math.floor(Math.random() * intros.length)];
    return `${intro} ¡${formatted}! ¡${formatted}!`;
  }

  speak(num) {
    if (!this.enabled || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel(); // Detener cualquier audio previo

      const text = this.buildText(num);
      const utter = new SpeechSynthesisUtterance(text);

      if (this.voices.length === 0) {
        this.voices = window.speechSynthesis.getVoices();
      }

      let voice = this.voices.find(v => v.name === this.selectedVoiceName);
      if (!voice) {
        voice = this.voices.find(v => v.lang.startsWith('es'));
      }

      if (voice) {
        utter.voice = voice;
        utter.lang = voice.lang;
      } else {
        utter.lang = 'es-ES';
      }

      utter.rate = this.rate;
      utter.pitch = this.pitch;
      utter.volume = this.volume;

      window.speechSynthesis.speak(utter);
    } catch (e) {
      console.warn("Error en síntesis vocal:", e);
    }
  }

  speakCustom(text) {
    if (!this.enabled || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      let voice = this.voices.find(v => v.name === this.selectedVoiceName) || this.voices.find(v => v.lang.startsWith('es'));
      if (voice) utter.voice = voice;
      utter.lang = voice ? voice.lang : 'es-ES';
      utter.rate = this.rate;
      utter.pitch = this.pitch;
      window.speechSynthesis.speak(utter);
    } catch (e) {}
  }
}

window.voiceEngine = new VoiceEngine();
