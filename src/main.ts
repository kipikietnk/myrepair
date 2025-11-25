import { initPanzoom, fullScreenChange, FollowCursorDrag } from "./action.js";
import { rotateImage, handleLogoClick, resetTransforms, fitToContainer, canUseFullscreen } from "./handle.js";
import CONFIG from "./config/diagram.js";
import elements from "./elements.js";
import ui from "./ui.js";
import utils from "./utils.js";

let data: any[] = [];
let dragManager: FollowCursorDrag | null = null;

// Dropdown instances
let deviceDropdown: any = null;
let modelDropdown: any = null;
let partDropdown: any = null;
let allDropdowns: any[] = [];

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

// ========== Data loading ==========
async function loadData() {
  try {
    const response = await fetch("./assets/diagram.json");
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    data = await response.json();

    populateDevices();
  } catch (error) {
    console.error('Error loading data:', error);
  }
}

// ========== Populate Selectors ==========
function populateDevices() {
  if (!Array.isArray(data) || data.length === 0) return;
  
  // Lấy danh sách thiết bị
  const products = [...new Set(data.map(item => item.product))];
  
  // Tạo HTML cho dropdown device
  const deviceSelectWrapper = document.getElementById('deviceSelectWrapper');
  (deviceSelectWrapper as any).innerHTML = `
    <div class="custom-dropdown" id="deviceDropdown" data-placeholder="Chọn loại máy">
      <div class="dropdown-header">
        <span class="dropdown-selected">Chọn loại máy</span>
        <span class="dropdown-arrow">▼</span>
      </div>
      <div class="dropdown-list">
        <div class="dropdown-item clear-option" data-value="">
          <em style="color: #999;">-- Không chọn --</em>
        </div>
        ${products.map(product => `
          <div class="dropdown-item" data-value="${product}">${product}</div>
        `).join('')}
      </div>
    </div>
  `;

  // Tạo HTML cho dropdown model (ban đầu trống)
  const modelSelectWrapper = document.getElementById('modelSelectWrapper');
  (modelSelectWrapper as any).innerHTML = `
    <div class="custom-dropdown" id="modelDropdown" data-placeholder="Chọn Model">
      <div class="dropdown-header">
        <span class="dropdown-selected">Chọn Model</span>
        <span class="dropdown-arrow">▼</span>
      </div>
      <div class="dropdown-list">
        <div class="dropdown-item clear-option" data-value="">
          <em style="color: #999;">-- Không chọn --</em>
        </div>
      </div>
    </div>
  `;

  // Tạo HTML cho dropdown part (ban đầu trống)
  const partSelectWrapper = document.getElementById('partSelectWrapper');
  (partSelectWrapper as any).innerHTML = `
    <div class="custom-dropdown" id="partDropdown" data-placeholder="Chọn Linh kiện">
      <div class="dropdown-header">
        <span class="dropdown-selected">Chọn Linh kiện</span>
        <span class="dropdown-arrow">▼</span>
      </div>
      <div class="dropdown-list">
        <div class="dropdown-item clear-option" data-value="">
          <em style="color: #999;">-- Không chọn --</em>
        </div>
      </div>
    </div>
  `;

  // Khởi tạo các dropdown với ui.CustomDropdown
  deviceDropdown = new ui.CustomDropdown('deviceDropdown');
  modelDropdown = new ui.CustomDropdown('modelDropdown');
  partDropdown = new ui.CustomDropdown('partDropdown');

  setupEventListeners();
  initPanzoom();
}

// ========== Update dropdown options ==========
function updateDropdownOptions(dropdown: any, options: string[], placeholder: string) {
  const dropdownElement = dropdown.dropdown;
  const listContainer = dropdownElement.querySelector('.dropdown-list');
  
  // Giữ lại option "Không chọn"
  listContainer.innerHTML = `
    <div class="dropdown-item clear-option" data-value="">
      <em style="color: #999;">-- Không chọn --</em>
    </div>
    ${options.map(opt => `
      <div class="dropdown-item" data-value="${opt}">${opt}</div>
    `).join('')}
  `;

  // Reinitialize dropdown items
  dropdown.items = dropdownElement.querySelectorAll('.dropdown-item');
  dropdown.items.forEach((item: HTMLElement) => {
    item.addEventListener('click', (e: Event) => {
      e.stopPropagation();
      dropdown.selectItem(item);
    });
  });

  // Reset về placeholder
  dropdown.clear();
}

// ========== Event Handlers ==========
function onDeviceChange() {
  const device = deviceDropdown.getValue();
  state.lastSelectedDevice = device;

  modelDropdown.clear();
  partDropdown.clear();
  
  const modelSelectWrapper = document.getElementById('modelSelectWrapper');
  const partSelectWrapper = document.getElementById('partSelectWrapper');
  
  (modelSelectWrapper as any).classList.add('hidden');
  (partSelectWrapper as any).classList.add('hidden');
  
  ui.hideControls();
  ui.showPlaceholder();
  resetTransforms();

  if (!device) return;

  // Lấy danh sách models cho device được chọn
  const models = data.filter(d => d.product === device).map(d => d.platform);
  updateDropdownOptions(modelDropdown, models, 'Chọn Model');
  
  (modelSelectWrapper as any).classList.remove('hidden');
}

function onModelChange() {
  const device = deviceDropdown.getValue();
  const model = modelDropdown.getValue();
  state.lastSelectedModel = model;

  partDropdown.clear();
  
  const partSelectWrapper = document.getElementById('partSelectWrapper');
  (partSelectWrapper as any).classList.add('hidden');
  
  ui.hideControls();
  ui.showPlaceholder();

  if (!device || !model) return;

  const selected = data.find(d => d.product === device && d.platform === model);
  if (!selected || !selected.components) return;

  // Lấy danh sách parts cho model được chọn
  const parts = selected.components.map((p: any) => p.name);
  updateDropdownOptions(partDropdown, parts, 'Chọn Linh kiện');
  
  (partSelectWrapper as any).classList.remove('hidden');
}

async function onPartChange() {
  const device = deviceDropdown.getValue();
  const model = modelDropdown.getValue();
  const partName = partDropdown.getValue();
  state.lastSelectedPart = partName;

  if (!device || !model || !partName) {
    ui.hideControls();
    return ui.showPlaceholder();
  }

  const selected = data.find(d => d.product === device && d.platform === model);
  if (!selected) return;

  const part = selected.components.find((p: any) => p.name === partName);
  if (!part) return;

  const imagePath = `assets/${selected.folder}/${part.picture}`;
  await utils.loadPartImage(imagePath, part.name);
  ui.showControls();
}

// ========== Event Binding ==========
function setupEventListeners() {
  // Lắng nghe sự kiện change từ các dropdown
  document.getElementById('deviceDropdown')?.addEventListener('change', onDeviceChange);
  document.getElementById('modelDropdown')?.addEventListener('change', onModelChange);
  document.getElementById('partDropdown')?.addEventListener('change', onPartChange);

  const btnEvents: [HTMLButtonElement, Function][] = [
    [elements.fullScreenToggleBtn, fullScreenChange],
    [elements.rotateLeftBtn, () => rotateImage(-CONFIG.ROTATION_STEP)],
    [elements.rotateRightBtn, () => rotateImage(CONFIG.ROTATION_STEP)],
    [elements.resetViewBtn, resetTransforms],
  ];

  btnEvents.forEach(([btn, handler]) => {
    btn.addEventListener('click', e => {
      e.preventDefault();
      handler();
    });
  });

  elements.logoBtn.addEventListener('click', handleLogoClick);
}

// ========== Initialize ==========
async function initialize() {
  if (!canUseFullscreen()) elements.fullScreenToggleBtn.remove();
  state.isMobile = utils.isMobileDevice();
  dragManager = new FollowCursorDrag();
  await loadData();
}

document.readyState === 'loading'
  ? document.addEventListener('DOMContentLoaded', initialize)
  : initialize();

    // Prevent context menu on draggable
document.addEventListener('contextmenu', e => {
  if ((e.target as any).classList.contains('draggable')) e.preventDefault();
});

let lastTouchEnd = 0;
document.addEventListener('touchend', e => {
  const now = Date.now();
  if (now - lastTouchEnd <= 300) e.preventDefault();
  lastTouchEnd = now;
}, false);



elements.chatBoxClose.addEventListener('click', () => ui.ChatBoxToggle());
elements.chatBoxToggle.addEventListener('click', () => ui.ChatBoxToggle());

const loadAI = async () => import('./chatbox/index.js').catch(console.error);
loadAI();

export { data };