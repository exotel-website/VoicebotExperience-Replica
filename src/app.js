import { AudioEngine } from './audio-engine.js';
import { ExotelWSClient } from './ws-client.js';
import { USE_CASES, BRAND } from './config.js';

// ─── Helpers ────────────────────────────────────────────
function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}

// ─── State ──────────────────────────────────────────────
let audioEngine = null;
let wsClient = null;
let isActive = false;
let currentUseCase = null;
let timerInterval = null;
let elapsedSeconds = 0;
let orbAnimFrame = null;

// ─── DOM references ─────────────────────────────────────
const modal = document.getElementById('call-modal');
const modalTitle = document.getElementById('modal-agent-title');
const modalSubtitle = document.getElementById('modal-agent-subtitle');
const modalStatus = document.getElementById('modal-status');
const modalTimer = document.getElementById('modal-timer');
const modalEndBtn = document.getElementById('modal-end-btn');
const modalClose = document.getElementById('modal-close');
const orbCanvas = document.getElementById('orb-canvas');
const orbCtx = orbCanvas?.getContext('2d');
const cardsContainer = document.getElementById('agent-cards');

// ─── Render use case cards ─────────────────────────────
function renderCards() {
  if (!cardsContainer) return;
  cardsContainer.innerHTML = USE_CASES.map((uc) => {
    const gradient = uc.gradient || `linear-gradient(135deg, ${uc.color}, ${uc.color}cc)`;
    const glow = `rgba(${hexToRgb(uc.color)}, 0.06)`;
    return `
    <div class="agent-card ${uc.comingSoon ? 'coming-soon' : ''}" data-id="${uc.id}" style="--accent: ${uc.color}; --card-gradient: ${gradient}; --accent-glow: ${glow}">
      <div class="card-icon-wrap" style="background: ${uc.color}12; color: ${uc.color}">
        <span class="material-symbols-rounded">${uc.icon}</span>
      </div>
      <span class="card-industry">${uc.industry}</span>
      <h3 class="card-title">${uc.title}</h3>
      <p class="card-desc">${uc.description}</p>
      <button class="card-cta" ${uc.comingSoon ? 'disabled' : ''}>
        ${uc.comingSoon ? '<span class="material-symbols-rounded">schedule</span> Coming soon' : '<span class="material-symbols-rounded">call</span> Talk now'}
      </button>
    </div>
  `}).join('');

  cardsContainer.querySelectorAll('.agent-card:not(.coming-soon)').forEach((card) => {
    card.addEventListener('click', () => {
      const uc = USE_CASES.find((u) => u.id === card.dataset.id);
      if (uc) startCall(uc);
    });
  });
}

// ─── Orb visualizer ─────────────────────────────────────
function resizeOrb() {
  if (!orbCanvas) return;
  const size = orbCanvas.parentElement.offsetWidth;
  orbCanvas.width = size * 2;
  orbCanvas.height = size * 2;
  orbCanvas.style.width = size + 'px';
  orbCanvas.style.height = size + 'px';
}

function drawOrb(level = 0) {
  if (!orbCtx || !orbCanvas) return;
  const w = orbCanvas.width;
  const h = orbCanvas.height;
  const cx = w / 2;
  const cy = h / 2;
  const baseR = Math.min(w, h) * 0.28;

  orbCtx.clearRect(0, 0, w, h);

  const color = currentUseCase?.color || '#9B42F1';
  const t = Date.now() / 1000;

  // Outer glow rings
  for (let ring = 3; ring >= 1; ring--) {
    const r = baseR + ring * 18 + level * ring * 8;
    const alpha = 0.06 + level * 0.04 / ring;
    orbCtx.beginPath();
    orbCtx.arc(cx, cy, r, 0, Math.PI * 2);
    orbCtx.fillStyle = color + Math.round(alpha * 255).toString(16).padStart(2, '0');
    orbCtx.fill();
  }

  // Main orb with breathing
  const breath = Math.sin(t * 2) * 4 + level * 12;
  const r = baseR + breath;

  const grad = orbCtx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, 0, cx, cy, r);
  grad.addColorStop(0, color + 'ff');
  grad.addColorStop(0.6, color + 'cc');
  grad.addColorStop(1, color + '66');

  orbCtx.beginPath();
  orbCtx.arc(cx, cy, r, 0, Math.PI * 2);
  orbCtx.fillStyle = grad;
  orbCtx.fill();

  // Inner highlight
  const igr = orbCtx.createRadialGradient(cx - r * 0.2, cy - r * 0.25, 0, cx, cy, r * 0.6);
  igr.addColorStop(0, 'rgba(255,255,255,0.35)');
  igr.addColorStop(1, 'rgba(255,255,255,0)');
  orbCtx.beginPath();
  orbCtx.arc(cx, cy, r * 0.6, 0, Math.PI * 2);
  orbCtx.fillStyle = igr;
  orbCtx.fill();

  // Mic icon in center
  orbCtx.fillStyle = '#fff';
  orbCtx.font = `${r * 0.5}px "Material Symbols Rounded"`;
  orbCtx.textAlign = 'center';
  orbCtx.textBaseline = 'middle';
  orbCtx.fillText(isActive ? 'graphic_eq' : 'mic', cx, cy);
}

function animateOrb() {
  let level = 0;
  if (isActive && audioEngine) {
    const data = audioEngine.getAnalyserData();
    if (data) {
      let sum = 0;
      for (let i = 0; i < data.length; i++) sum += data[i];
      level = sum / data.length / 255;
    }
  }
  drawOrb(level);
  orbAnimFrame = requestAnimationFrame(animateOrb);
}

// ─── Call lifecycle ─────────────────────────────────────
async function startCall(useCase) {
  currentUseCase = useCase;
  showModal(useCase);
  setModalStatus('Connecting...', 'connecting');

  wsClient = new ExotelWSClient({
    onConnected: () => setModalStatus('Connected', 'connected'),
    onStart: () => {},
    onMedia: (payload) => { if (payload && audioEngine) audioEngine.playBase64PCM(payload, useCase.sampleRate); },
    onStop: () => endCall(),
    onError: (err) => { setModalStatus('Error: ' + err, 'error'); setTimeout(endCall, 2000); },
    onClose: (code) => { if (isActive) endCall(); },
    onLog: () => {},
  });

  audioEngine = new AudioEngine({
    targetSampleRate: useCase.sampleRate,
    onPCMChunk: (buf) => wsClient.sendAudio(buf),
  });

  try {
    await audioEngine.start();
  } catch (err) {
    setModalStatus('Microphone access required', 'error');
    setTimeout(endCall, 2000);
    return;
  }

  const connected = await wsClient.connect(useCase.endpoint, useCase.sampleRate);
  if (connected) {
    isActive = true;
    setModalStatus('Listening... speak now', 'active');
    startTimer();
    resizeOrb();
    animateOrb();
  } else {
    setModalStatus('Could not connect', 'error');
    audioEngine.stop();
    audioEngine = null;
    wsClient = null;
    setTimeout(() => hideModal(), 2000);
  }
}

function endCall() {
  isActive = false;
  wsClient?.disconnect();
  audioEngine?.stop();
  wsClient = null;
  audioEngine = null;
  stopTimer();
  cancelAnimationFrame(orbAnimFrame);
  setModalStatus('Call ended', 'ended');
  setTimeout(hideModal, 1200);
}

// ─── Modal ──────────────────────────────────────────────
function showModal(useCase) {
  if (!modal) return;
  modalTitle.textContent = useCase.title;
  modalSubtitle.textContent = useCase.subtitle;
  modal.style.setProperty('--modal-accent', useCase.color);
  modal.classList.add('visible');
  document.body.style.overflow = 'hidden';
}

function hideModal() {
  if (!modal) return;
  modal.classList.remove('visible');
  document.body.style.overflow = '';
  currentUseCase = null;
}

function setModalStatus(text, state) {
  if (modalStatus) {
    modalStatus.textContent = text;
    modalStatus.className = 'modal-status ' + state;
  }
}

function startTimer() {
  elapsedSeconds = 0;
  if (modalTimer) modalTimer.textContent = '00:00';
  timerInterval = setInterval(() => {
    elapsedSeconds++;
    const m = Math.floor(elapsedSeconds / 60).toString().padStart(2, '0');
    const s = (elapsedSeconds % 60).toString().padStart(2, '0');
    if (modalTimer) modalTimer.textContent = `${m}:${s}`;
  }, 1000);
}

function stopTimer() { clearInterval(timerInterval); }

// ─── Event listeners ────────────────────────────────────
modalEndBtn?.addEventListener('click', endCall);
modalClose?.addEventListener('click', endCall);
modal?.addEventListener('click', (e) => { if (e.target === modal) endCall(); });

// ─── Init ───────────────────────────────────────────────
renderCards();
resizeOrb();
window.addEventListener('resize', resizeOrb);
