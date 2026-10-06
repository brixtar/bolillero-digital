# Bolillero Digital Pro - Sistema Interactivo de Bingo en Tiempo Real

Plataforma completa de sorteo de bolillero digital y bingo interactivo desarrollada con **Node.js nativo puro (cero dependencias externas)** y tecnologías web modernas (**HTML5, CSS3, WebSockets y Web Audio API**).

Diseñado para eventos comunitarios, familiares e institucionales con sincronización instantánea entre múltiples pantallas y dispositivos móviles.

## 🌟 Características Principales

- **Sincronización en Tiempo Real:** Servidor WebSocket nativo (RFC 6455) que sincroniza mesa de control, proyector y celulares en menos de 10ms.
- **Control Remoto Móvil:** Código QR dinámico que detecta la IP local de la red para controlar el sorteo desde cualquier smartphone o tablet.
- **Vista de Pantalla Gigante / Proyector:** Interfaz de alto impacto visual optimizada para proyectores y televisores, con panel de números cantados y últimas bolillas.
- **Síntesis y Efectos de Audio:** Locución por voz de bolillas cantadas y efectos de sonido mediante Web Audio API.
- **Generador y Validador de Cartones:** Módulo de generación de cartones imprimibles en PDF/HTML y validador algorítmico de líneas y bingos ganadores.
- **Cero Dependencias:** Corre directamente sobre cualquier versión estándar de Node.js sin requerir `npm install`.

## 📂 Arquitectura del Sistema

```
Bolillero_Digital/
├── nuevo_sistema/
│   ├── server.js            # Servidor HTTP y WebSockets nativo
│   ├── index.html           # Mesa de control y panel principal
│   ├── proyector.html       # Pantalla completa para proyección en vivo
│   ├── remoto.html          # Panel táctil optimizado para celular
│   ├── cartones.html        # Generador de cartones imprimibles
│   ├── css/                 # Estilos responsive y modo oscuro/proyector
│   ├── js/                  # Módulos cliente (WebSockets, audio, voz, storage)
│   └── assets/              # Recursos visuales y sonidos
├── versiones_anteriores/    # Versiones y prototipos históricos
└── INICIAR_BINGO.bat        # Lanzador rápido de un clic para Windows
```

## 🚀 Inicio Rápido

1. Asegúrate de tener instalado [Node.js](https://nodejs.org/).
2. Ejecuta el archivo `INICIAR_BINGO.bat` o desde la terminal:
   ```bash
   cd nuevo_sistema
   node server.js
   ```
3. Abre tu navegador en `http://localhost:3000` para la mesa de control o escanea el QR desde tu celular para el control remoto.
