import { initPanzoom, fullScreenChange, FollowCursorDrag } from "./action.js";
import { rotateImage, handleLogoClick, resetTransforms, fitToContainer, canUseFullscreen } from "./handle.js";
import CONFIG from "./config.js";
import elements from "./elements.js";
import ui from "./ui.js";
import utils from "./utils.js";

import './l.js'

let data = {};
let dragManager;

export const state = {
  currentRotation: 0,
  hammerManager: null,
  panzoomInstance: null,
  resetClickCount: 0,
  resetClickTimer: null,
  isImageLoaded: false,
  lastSelectedDevice: '',
  lastSelectedModel: '',
  lastSelectedPart: '',
  controlsVisible: true,
  isMobile: window.innerWidth <= 768
};

// ==== Data loading ====
async function loadData() {
  try {
    const response = await fetch('./data.json');
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) throw new Error('Invalid content type - expected JSON');

    data = await response.json();
    if (!data || typeof data !== 'object') throw new Error('Invalid data format');

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
  if (!data || Object.keys(data).length === 0) {
    return utils.showErrorMessage('Không có dữ liệu thiết bị');
  }

  elements.deviceSelect.innerHTML = '<option value="">Chọn loại máy</option>';
  elements.deviceSelect.disabled = false;

  Object.keys(data).forEach(device => {
    if (data[device] && typeof data[device] === 'object') {
      elements.deviceSelect.appendChild(new Option(device, device));
    }
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

  const models = data[device];
  if (!models || typeof models !== 'object') return utils.showErrorMessage('Không tìm thấy model cho thiết bị này');

  Object.keys(models).forEach(model => {
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

  const parts = data[device]?.[model];
  if (!Array.isArray(parts) || parts.length === 0) {
    return utils.showErrorMessage('Không có linh kiện nào cho model này');
  }

  parts.forEach((part, index) => {
    if (part?.type) {
      elements.partSelect.appendChild(new Option(part.type, index));
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

  const part = data[device]?.[model]?.[index];
  if (!part) return utils.showErrorMessage("Không tìm thấy linh kiện");

  const imagePath = part.image;
  if (!utils.isValidImageUrl(imagePath)) {
    return utils.showErrorMessage("Định dạng ảnh không hợp lệ");
  }

  await loadPartImage(imagePath, part.type);
}

// ==== Image loading ====
async function loadPartImage(imagePath, altText) {
  ui.showLoading();
  try {
    await utils.preloadImage(imagePath);
    elements.partImage.src = imagePath;
    elements.partImage.alt = altText || 'Part Image';

    ui.hideLoading();
    ui.showImage();
    ui.showControls();
    ui.updateControlsState();

    resetTransforms();
    setTimeout(fitToContainer, CONFIG.ANIMATION_DELAY);
  } catch (error) {
    console.error('Error loading image:', error);
    ui.hideLoading();
    ui.showPlaceholder();
    ui.hideControls();
    utils.showErrorMessage('Không thể tải hình ảnh. Kiểm tra kết nối mạng.');
  }
}

// ==== Ripple effect ====
function addRippleEffect(button, event) {
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

  btnEvents.forEach(([btn, handler]) => {
    btn.addEventListener('click', e => {
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

// Prevent context menu from appearing on elements with the 'draggable' class
document.addEventListener('contextmenu', e => {
  if (e.target.classList.contains('draggable')) e.preventDefault();
});

// Prevent double-tap zoom on touch devices
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
