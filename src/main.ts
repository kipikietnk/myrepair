import { initPanzoom, fullScreenChange, FollowCursorDrag } from "./action.js";
import { rotateImage, handleLogoClick, resetTransforms, fitToContainer, canUseFullscreen } from "./handle.js";
import CONFIG from "./config/diagram.js";
import elements from "./elements.js";
import ui from "./ui.js";
import utils from "./utils.js";

console.log(window.location.origin, window.location.pathname)

let data: any[] = [];
let dragManager: FollowCursorDrag | null = null;

export const state = {
  currentRotation: 0,
  panzoomInstance: null,
  resetClickCount: 0,
  resetClickTimer: null,
  isImageLoaded: false,
  lastSelectedDevice: '',
  lastSelectedModel: '',
  lastSelectedPart: '',
  controlsVisible: true,
  chatBoxVisible: true,
  isMobile: window.innerWidth <= 768
};

// ==== Data loading ====
async function loadData() {
  try {
    const response = await fetch("./assets/diagram.json");
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) throw new Error('Invalid content type - expected JSON');

    data = await response.json();
    if (!Array.isArray(data)) throw new Error('Invalid data format - expected Array');

    populateDevices();
  } catch (error) {
    console.error('Error loading data:', error);
    showOfflineMessage();
  }
}

function showOfflineMessage() {
  elements.deviceSelect.innerHTML = 'Không thể kết nối - Thử lại sau';
  elements.deviceSelect.disabled = true;
}

// ==== UI Setup ====
function populateDevices() {
  if (!Array.isArray(data) || data.length === 0) {
    return utils.showErrorMessage('Không có dữ liệu thiết bị');
  }

  elements.deviceSelect.innerHTML = '<option value="">Chọn loại máy</option>';
  elements.deviceSelect.disabled = false;

  // Lấy danh sách product (unique)
  const products = [...new Set(data.map(item => item.product))];
  products.forEach(product => {
    elements.deviceSelect.appendChild(new Option(product, product));
  });

  setupEventListeners();
  initPanzoom();
}

// ==== Event handlers ====
function onDeviceChange() {
  const device = elements.deviceSelect.value;
  state.lastSelectedDevice = device;
  elements.modelSelect.innerHTML = '<option value="">Chọn Model</option>';

  ui.hidePartSelector();
  ui.hideControls();
  ui.showPlaceholder();
  resetTransforms();

  if (!device) return ui.hideModelSelector();

  const models = data.filter(item => item.product === device).map(item => item.platform);
  if (!models.length) return utils.showErrorMessage('Không tìm thấy model cho thiết bị này');

  models.forEach(model => {
    elements.modelSelect.appendChild(new Option(model, model));
  });

  ui.showModelSelector();
}

function onModelChange() {
  const device = elements.deviceSelect.value;
  const model = elements.modelSelect.value;
  state.lastSelectedModel = model;
  elements.partSelect.innerHTML = '<option value="">Chọn Linh kiện</option>';

  ui.hideControls();
  ui.showPlaceholder();

  if (!device || !model) return ui.hidePartSelector();

  const selected = data.find(item => item.product === device && item.platform === model);
  if (!selected || !Array.isArray(selected.components)) {
    return utils.showErrorMessage('Không có linh kiện nào cho model này');
  }

  selected.components.forEach((part: any, index: any) => {
    if (part?.name) {
      elements.partSelect.appendChild(new Option(part.name, index));
    }
  });

  ui.showPartSelector();
}

async function onPartChange() {
  const device = elements.deviceSelect.value;
  const model = elements.modelSelect.value;
  const index = elements.partSelect.value;
  state.lastSelectedPart = index;

  if (!device || !model || index === "") {
    ui.hideControls();
    return ui.showPlaceholder();
  }

  const selected = data.find(item => item.product === device && item.platform === model);
  if (!selected) return utils.showErrorMessage("Không tìm thấy model");

  const part = selected.components[index];
  if (!part) return utils.showErrorMessage("Không tìm thấy linh kiện");

  const imagePath = `assets/${selected.folder}/${part.picture}`;

  console.log(imagePath);

  if (!utils.isValidImageUrl(imagePath)) {
    return utils.showErrorMessage("Định dạng ảnh không hợp lệ");
  }

  await utils.loadPartImage(imagePath, part.name);
}

// ==== Ripple effect ====
function addRippleEffect(button: HTMLButtonElement, event: any) {
  const ripple = document.createElement('span');
  const rect = button.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height);
  const x = event.clientX - rect.left - size / 2;
  const y = event.clientY - rect.top - size / 2;

  ripple.style.cssText = `
    position: absolute;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.6);
    width: ${size}px;
    height: ${size}px;
    left: ${x}px;
    top: ${y}px;
    transform: scale(0);
    animation: ripple 0.6s ease-out;
    pointer-events: none;
  `;
  button.style.position = 'relative';
  button.style.overflow = 'hidden';
  button.appendChild(ripple);

  setTimeout(() => ripple.remove(), 600);
}

// ==== Event listeners ====
function setupEventListeners() {
  elements.deviceSelect.addEventListener('change', onDeviceChange);
  elements.modelSelect.addEventListener('change', onModelChange);
  elements.partSelect.addEventListener('change', onPartChange);

  const btnEvents = [
    [elements.fullScreenToggleBtn, fullScreenChange],
    [elements.rotateLeftBtn, () => rotateImage(-CONFIG.ROTATION_STEP)],
    [elements.rotateRightBtn, () => rotateImage(CONFIG.ROTATION_STEP)],
    [elements.resetViewBtn, resetTransforms],
  ];

  btnEvents.forEach(([btn, handler]: any[]) => {
    (btn as HTMLButtonElement).addEventListener('click', e => {
      e.preventDefault();
      addRippleEffect(btn, e);
      handler();
    });
  });

  elements.logoBtn.addEventListener('click', handleLogoClick);
}

// ==== Initialization ====
async function initialize() {
  const missing = Object.entries(elements).filter(([_, el]) => !el);
  if (missing.length > 0) {
    return console.error('Missing DOM elements:', missing.map(([k]) => k));
  }

  if (!canUseFullscreen()) elements.fullScreenToggleBtn.remove();

  state.isMobile = utils.isMobileDevice();
  dragManager = new FollowCursorDrag();
  loadData();
}

// Prevent context menu on draggable
document.addEventListener('contextmenu', e => {
  if ((e.target as any).classList.contains('draggable')) e.preventDefault();
});

// Prevent double-tap zoom
let lastTouchEnd = 0;
document.addEventListener('touchend', e => {
  const now = Date.now();
  if (now - lastTouchEnd <= 300) e.preventDefault();
  lastTouchEnd = now;
}, false);

// Start
document.readyState === 'loading'
  ? document.addEventListener('DOMContentLoaded', initialize)
  : initialize();

  elements.chatBoxClose.addEventListener('click', () => {
  ui.ChatBoxToggle();
});
elements.chatBoxToggle.addEventListener('click', () => {
  ui.ChatBoxToggle();
});

const loadAI = async () => import('./chatbox/index.js').catch(e => console.error(e));
loadAI();

export { data }