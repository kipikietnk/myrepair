import { initPanzoom, fullScreenChange } from "./action.js";
import { rotateImage, handleLogoClick, resetTransforms, fitToContainer, canUseFullscreen } from "./handle.js";
import CONFIG from "./config.js";
import elements from "./elements.js";
import ui from "./ui.js";
import utils from "./utils.js";

let data = {};
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

// Data loading with improved error handling
async function loadData() {
  try {
    const response = await fetch('../data.json');
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      throw new Error('Invalid content type - expected JSON');
    }

    data = await response.json();

    if (!data || typeof data !== 'object') {
      throw new Error('Invalid data format');
    }
    
    populateDevices();
  } catch (error) {
    console.error('Error loading data:', error);
    showOfflineMessage();
  }
}

function showOfflineMessage() {
  elements.deviceSelect.innerHTML = '<option value="">Không thể kết nối - Thử lại sau</option>';
  elements.deviceSelect.disabled = true;
}

// Populate device dropdown with validation
function populateDevices() {
  if (!data || Object.keys(data).length === 0) {
    utils.showErrorMessage('Không có dữ liệu thiết bị');
    return;
  }

  elements.deviceSelect.innerHTML = '<option value="">Chọn loại máy</option>';
  elements.deviceSelect.disabled = false;

  Object.keys(data).forEach(device => {
    if (data[device] && typeof data[device] === 'object') {
      const option = document.createElement('option');
      option.value = device;
      option.textContent = device;
      elements.deviceSelect.appendChild(option);
    }
  });

  setupEventListeners();
  initPanzoom();
}

// Enhanced event handlers
function onDeviceChange() {
  const selectedDevice = elements.deviceSelect.value;

  state.lastSelectedDevice = selectedDevice;
  elements.modelSelect.innerHTML = '<option value="">Chọn Model</option>';

  if (!selectedDevice) {
    ui.hideModelSelector();
    ui.hidePartSelector();
    ui.hideControls();
    ui.showPlaceholder();
    resetTransforms();
    return;
  }

  const models = data[selectedDevice];
  if (!models || typeof models !== 'object') {
    utils.showErrorMessage('Không tìm thấy model cho thiết bị này');
    return;
  }

  const modelKeys = Object.keys(models);
  if (modelKeys.length === 0) {
    utils.showErrorMessage('Không có model nào cho thiết bị này');
    return;
  }

  modelKeys.forEach(model => {
    const option = document.createElement('option');
    option.value = model;
    option.textContent = model;
    elements.modelSelect.appendChild(option);
  });

  ui.showModelSelector();
  ui.hidePartSelector();
  ui.hideControls();
  ui.showPlaceholder();
  resetTransforms();

  console.log(`Device changed to: ${selectedDevice} (${modelKeys.length} models)`);
}

function onModelChange() {
  const selectedDevice = elements.deviceSelect.value;
  const selectedModel = elements.modelSelect.value;

  state.lastSelectedModel = selectedModel;
  elements.partSelect.innerHTML = '<option value="">Chọn Linh kiện</option>';

  if (!selectedModel || !selectedDevice) {
    ui.hidePartSelector();
    ui.hideControls();
    ui.showPlaceholder();
    return;
  }

  const modelParts = data[selectedDevice]?.[selectedModel];
  if (!Array.isArray(modelParts) || modelParts.length === 0) {
    utils.showErrorMessage('Không có linh kiện nào cho model này');
    ui.hidePartSelector();
    return;
  }

  modelParts.forEach((part, index) => {
    if (part && part.type) {
      const option = document.createElement('option');
      option.value = index;
      option.textContent = part.type;
      elements.partSelect.appendChild(option);
    }
  });

  ui.showPartSelector();
  ui.hideControls();
  ui.showPlaceholder();
}

async function onPartChange() {
  const selectedDevice = elements.deviceSelect.value;
  const selectedModel = elements.modelSelect.value;
  const partIndex = elements.partSelect.value;

  state.lastSelectedPart = partIndex;

  if (partIndex === "" || !selectedDevice || !selectedModel) {
    ui.hideControls();
    ui.showPlaceholder();
    return;
  }

  let part = data[selectedDevice]?.[selectedModel]?.[partIndex];

  if (!part) {
    utils.showErrorMessage("Không tìm thấy linh kiện");
    return;
  }

  if (!part.images || !Array.isArray(part.images) || part.images.length === 0) {
    utils.showErrorMessage("Không có ảnh cho linh kiện này");
    ui.hideControls();
    ui.showPlaceholder();
    return;
  }

  const imagePath = part.images[0];

  if (!utils.isValidImageUrl(imagePath)) {
    utils.showErrorMessage("Định dạng ảnh không hợp lệ");
    return;
  }

  await loadPartImage(imagePath);
}

// Enhanced image loading with preloading
async function loadPartImage(imagePath) {
  ui.showLoading();

  try {
    const img = await utils.preloadImage(imagePath);

    elements.partImage.src = imagePath;
    elements.partImage.alt = elements.partSelect.options[elements.partSelect.selectedIndex].textContent;

    ui.hideLoading();
    ui.showImage();
    ui.showControls();
    ui.updateControlsState();

    resetTransforms();
    setTimeout(() => fitToContainer(), CONFIG.ANIMATION_DELAY);

  } catch (error) {
    console.error('Error loading image:', error);
    ui.hideLoading();
    ui.showPlaceholder();
    ui.hideControls();
    utils.showErrorMessage('Không thể tải hình ảnh. Kiểm tra kết nối mạng.');
  }
}

// Enhanced button ripple effect
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

  setTimeout(() => {
    if (ripple.parentNode) {
      ripple.remove();
    }
  }, 600);
}

// Enhanced event listener setup
function setupEventListeners() {
  elements.deviceSelect.addEventListener('change', onDeviceChange);
  elements.modelSelect.addEventListener('change', onModelChange);
  elements.partSelect.addEventListener('change', onPartChange);

  elements.fullScreenToggleBtn.addEventListener('click', (e) => {
    e.preventDefault();
    addRippleEffect(elements.fullScreenToggleBtn, e);
    fullScreenChange();
  });

  elements.rotateLeftBtn.addEventListener('click', (e) => {
    e.preventDefault();
    addRippleEffect(elements.rotateLeftBtn, e);
    rotateImage(-CONFIG.ROTATION_STEP);
  });

  elements.rotateRightBtn.addEventListener('click', (e) => {
    e.preventDefault();
    addRippleEffect(elements.rotateRightBtn, e);
    rotateImage(CONFIG.ROTATION_STEP);
  });

  elements.resetViewBtn.addEventListener('click', (e) => {
    e.preventDefault();
    addRippleEffect(elements.resetViewBtn, e);
    resetTransforms();
  });

  elements.logoBtn.addEventListener('click', handleLogoClick);
}

// Initialization
async function initialize() {
  const missingElements = Object.entries(elements).filter(([key, element]) => !element);
  if (missingElements.length > 0) {
    console.error('Missing DOM elements:', missingElements.map(([key]) => key));
    return;
  }

  if (!canUseFullscreen()) {
    elements.fullScreenToggleBtn.remove();
  }

  // Initialize mobile state
  state.isMobile = utils.isMobileDevice();

  loadData();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}

class FollowCursorDrag {
  constructor() {
    this.isDragging = false;
    this.isMouseDown = false;
    this.currentElement = null;
    this.originalPosition = { x: 0, y: 0 };

    this.pointerStart = { x: 0, y: 0 };
    this.dragMoved = false;
    this.suppressClickFor = null;
    this.DRAG_THRESHOLD = 6; // px

    this.longPressTimer = null;
    this.LONG_PRESS_DELAY = 500; // 0.5s

    this.init();
  }

  init() {
    this.updateDraggableElements();
    this.observeDOM();

    // Global mouse/touch events
    document.addEventListener('mousemove', (e) => {
      // Nếu đang giữ chuột nhưng chưa drag -> check vượt ngưỡng thì bắt đầu drag
      if (this.isMouseDown && !this.isDragging && this.currentElement) {
        const dx = e.clientX - this.pointerStart.x;
        const dy = e.clientY - this.pointerStart.y;
        if (Math.hypot(dx, dy) >= this.DRAG_THRESHOLD) {
          this.startDrag(e, this.currentElement);
        }
      }
      // Chỉ drag khi thực sự đang drag
      if (this.isDragging) {
        this.drag(e);
      }
    });

    document.addEventListener('mouseup', () => {
      // Kết thúc drag trước khi reset isMouseDown
      this.endDrag();
      this.isMouseDown = false;
    });

    document.addEventListener('touchmove', (e) => {
      if (this.isDragging) {
        this.drag(e);
      }
    }, { passive: false });
    
    document.addEventListener('touchend', () => this.endDrag());
    document.addEventListener('touchcancel', () => this.endDrag());

    // Chặn click sau drag
    document.addEventListener('click', (e) => {
      if (!this.suppressClickFor) return;
      const t = e.target.closest('.draggable');
      if (t && t === this.suppressClickFor) {
        e.preventDefault();
        e.stopPropagation();
        if (typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation();
        this.suppressClickFor = null;
      }
    }, true);
  }

  updateDraggableElements() {
    const draggables = document.querySelectorAll('.draggable');

    draggables.forEach(element => {
      if (element.dataset.dragSetup === 'true') return;
      element.dataset.dragSetup = 'true';

      if (getComputedStyle(element).position === 'static') {
        element.style.position = 'absolute';
      }

      // 🖱 Chuột
      element.addEventListener('mousedown', (e) => {
        e.preventDefault(); // Ngăn text selection
        this.pointerStart = { x: e.clientX, y: e.clientY };
        this.currentElement = element;
        this.isMouseDown = true;
        this.dragMoved = false;
      });

      // 📱 Cảm ứng
      element.addEventListener('touchstart', (e) => {
        e.stopPropagation();
        const touch = e.touches[0];
        this.pointerStart = { x: touch.clientX, y: touch.clientY };
        this.dragMoved = false;

        this.longPressTimer = setTimeout(() => {
          this.startDrag(e, element, true);
        }, this.LONG_PRESS_DELAY);
      }, { passive: false });

      // 📱 Nếu trượt ra ngoài nút trước 0.5s -> huỷ longpress
      element.addEventListener('touchmove', (e) => {
        if (!this.longPressTimer) return;
        const touch = e.touches[0];
        const rect = element.getBoundingClientRect();
        if (
          touch.clientX < rect.left ||
          touch.clientX > rect.right ||
          touch.clientY < rect.top ||
          touch.clientY > rect.bottom
        ) {
          clearTimeout(this.longPressTimer);
          this.longPressTimer = null;
        }
      }, { passive: false });

      element.addEventListener('touchend', () => {
        clearTimeout(this.longPressTimer);
        this.longPressTimer = null;
        this.endDrag();
      });

      element.addEventListener('touchcancel', () => {
        clearTimeout(this.longPressTimer);
        this.longPressTimer = null;
        this.endDrag();
      });
    });
  }

  observeDOM() {
    const observer = new MutationObserver(() => {
      this.updateDraggableElements();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  startDrag(e, element, fromLongPress = false) {
    if (e.type === "touchstart" && !fromLongPress) return;

    e.preventDefault();
    e.stopPropagation();

    this.isDragging = true;
    this.currentElement = element;

    const clientX = e.type.includes('touch')
      ? (e.touches?.[0]?.clientX ?? this.pointerStart.x)
      : e.clientX;
    const clientY = e.type.includes('touch')
      ? (e.touches?.[0]?.clientY ?? this.pointerStart.y)
      : e.clientY;

    this.pointerStart = { x: clientX, y: clientY };
    this.dragMoved = false;

    // Style khi đang kéo
    element.style.zIndex = '9999';
    element.style.transform = 'scale(1.1)';
    element.style.transition = 'none';
    element.classList.add('dragging');

    // ✅ Cả chuột & cảm ứng: luôn nhảy tâm nút vào đúng chỗ con trỏ
    this.updatePosition(clientX, clientY);
  }

  drag(e) {
    if (!this.isDragging || !this.currentElement) return;
    e.preventDefault();

    const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
    const clientY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;

    if (!this.dragMoved) {
      const dx = clientX - this.pointerStart.x;
      const dy = clientY - this.pointerStart.y;
      if (Math.hypot(dx, dy) >= this.DRAG_THRESHOLD) {
        this.dragMoved = true;
      }
    }

    this.updatePosition(clientX, clientY);
  }

  updatePosition(clientX, clientY) {
    if (!this.currentElement) return;

    const rect = this.currentElement.getBoundingClientRect();
    const elementWidth = rect.width;
    const elementHeight = rect.height;

    const newX = clientX - elementWidth / 2;
    const newY = clientY - elementHeight / 2;

    const maxX = window.innerWidth - elementWidth;
    const maxY = window.innerHeight - elementHeight;

    const boundedX = Math.max(0, Math.min(newX, maxX));
    const boundedY = Math.max(0, Math.min(newY, maxY));

    this.currentElement.style.left = boundedX + 'px';
    this.currentElement.style.top = boundedY + 'px';
  }

  endDrag() {
    if (!this.isDragging || !this.currentElement) {
      // Reset các state cần thiết ngay cả khi không drag
      this.currentElement = null;
      this.dragMoved = false;
      return;
    }

    if (this.dragMoved) {
      this.suppressClickFor = this.currentElement;
    }

    this.isDragging = false;

    this.currentElement.style.zIndex = '';
    this.currentElement.style.transform = '';
    this.currentElement.style.transition = '';
    this.currentElement.classList.remove('dragging');

    this.currentElement = null;
    this.originalPosition = { x: 0, y: 0 };
    this.pointerStart = { x: 0, y: 0 };
    this.dragMoved = false;
  }

  makeDraggable(element) {
    element.classList.add('draggable');
    this.updateDraggableElements();
  }

  removeDraggable(element) {
    element.classList.remove('draggable');
    element.dataset.dragSetup = 'false';
  }
}

// Khởi tạo
let dragManager;
document.addEventListener('DOMContentLoaded', () => {
  dragManager = new FollowCursorDrag();
});

document.addEventListener('DOMContentLoaded', function () {
  setTimeout(() => {
    document.body.style.overflow = 'auto'; // Enable scrolling after loading
  }, 4800);
});

// Ngăn context menu trên nút
document.addEventListener('contextmenu', e => {
  if (e.target.classList.contains('draggable')) e.preventDefault();
});

// Ngăn double-tap zoom
let lastTouchEnd = 0;
document.addEventListener('touchend', function (event) {
  const now = Date.now();
  if (now - lastTouchEnd <= 300) event.preventDefault();
  lastTouchEnd = now;
}, false);