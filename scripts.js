let data = {};

// Elements
const rotationContainer = document.getElementById('rotationContainer');
const panzoomContainer = document.getElementById('panzoomContainer');
const logoBtn = document.getElementById('logoBtn');
const deviceSelect = document.getElementById('deviceSelect');
const modelSelect = document.getElementById('modelSelect');
const partSelect = document.getElementById('partSelect');
const partSelectWrapper = document.getElementById('partSelectWrapper');
const modelSelectWrapper = document.getElementById('modelSelectWrapper');
const partImage = document.getElementById('partImage');
const imageWrapper = document.getElementById('imageWrapper');
const controlButtons = document.getElementById('controlButtons');
const placeholder = document.getElementById('placeholder');
const loading = document.getElementById('loading');
const rotateLeftBtn = document.getElementById('rotateLeft');
const rotateRightBtn = document.getElementById('rotateRight');
const resetViewBtn = document.getElementById('resetView');
const fitViewBtn = document.getElementById('fitView');

let currentRotation = 0;
let hammerManager = null;
let panzoomInstance = null;

// Funny reset variables
let resetClickCount = 0;
let resetClickTimer = null;
const CLICK_THRESHOLD = 5;
const CLICK_WINDOW = 2000;

const funnyMessages = [
  "Come on! 😤", "Shut up! 🤐", "Chill guy! 😎",
  "Seriously? 🙄", "Stop it! ✋", "Bruh... 😒",
  "Again? 🤦‍♂️", "You're killing me! 💀", "Enough! 😠",
  "Why tho? 🤷‍♂️", "I'm tired! 😴", "Please stop! 🙏",
  "Not again! 😫", "Give me a break! 😵‍💫", "You monster! 👹",
  "I quit! 🏃‍♂️💨", "This is madness! 🤯", "Have mercy! 😭",
  "I'm done! ✅", "Leave me alone! 😤", "What's wrong with you? 🤨",
  "Really? REALLY? 😡", "I can't even... 🤷‍♀️", "You're crazy! 🤪",
  "STOP THE MADNESS! 🛑"
];

// Load data
async function loadData() {
  try {
    const response = await fetch('./data.json');
    if (response.ok) {
      data = await response.json();
      console.log('✅ Data loaded from data.json');
    } else {
      throw new Error(`HTTP ${response.status}`);
    }
    populateDevices();
  } catch (error) {
    console.error('❌ Error loading data:', error);
  }
}

// Populate device dropdown
function populateDevices() {
  deviceSelect.innerHTML = '<option value="">Chọn loại máy</option>';
  Object.keys(data).forEach(device => {
    const option = document.createElement('option');
    option.value = device;
    option.textContent = device;
    deviceSelect.appendChild(option);
  });
  console.log(`🖥️ Loaded ${Object.keys(data).length} device types`);
  setupEventListeners();
  initPanzoom();
  initHammer();
}

// Device change → show models
function onDeviceChange() {
  const selectedDevice = deviceSelect.value;
  modelSelect.innerHTML = '<option value="">Chọn Model</option>';
  if (!selectedDevice) {
    modelSelectWrapper.classList.add('hidden');
    hidePartSelector();
    return;
  }
  Object.keys(data[selectedDevice]).forEach(model => {
    const option = document.createElement('option');
    option.value = model;
    option.textContent = model;
    modelSelect.appendChild(option);
  });
  modelSelectWrapper.classList.remove('hidden');
  hidePartSelector();
}

// Model change → show parts
function onModelChange() {
  const selectedDevice = deviceSelect.value;
  const selectedModel = modelSelect.value;
  partSelect.innerHTML = '<option value="">Chọn Linh kiện</option>';
  if (!selectedModel || !selectedDevice) {
    hidePartSelector();
    hideControls();
    showPlaceholder();
    return;
  }
  const modelParts = data[selectedDevice][selectedModel] || [];
  modelParts.forEach((part, index) => {
    const option = document.createElement('option');
    option.value = index;
    option.textContent = part.type;
    partSelect.appendChild(option);
  });
  showPartSelector();
  hideControls();
  showPlaceholder();
}

// Part change → load first image
function onPartChange() {
  const selectedDevice = deviceSelect.value;
  const selectedModel = modelSelect.value;
  const partIndex = partSelect.value;
  if (partIndex === "" || !selectedDevice || !selectedModel) {
    hideControls();
    showPlaceholder();
    return;
  }
  const part = data[selectedDevice][selectedModel][partIndex];
  console.log(`🔧 Part changed to: ${part.type}`);
  if (part.images && part.images.length > 0) {
    loadPartImage(part.images[0]);
  } else {
    showErrorMessage("Không có ảnh cho linh kiện này");
  }
}

// Load image
function loadPartImage(imagePath) {
  showLoading();
  const img = new Image();
  img.onload = () => {
    partImage.src = imagePath;
    partImage.alt = partSelect.options[partSelect.selectedIndex].textContent;
    hideLoading();
    showImage();
    showControls();
    resetTransforms();
    setTimeout(() => fitToContainer(), 100);
  };
  img.onerror = () => {
    hideLoading();
    showPlaceholder();
    hideControls();
    showErrorMessage('Không thể tải hình ảnh');
  };
  img.src = imagePath;
}

// UI helpers
function showPartSelector() {
  partSelectWrapper.classList.remove('hidden');
  partSelect.disabled = false;
}
function hidePartSelector() {
  partSelectWrapper.classList.add('hidden');
  partSelect.disabled = true;
}
function showPlaceholder() {
  placeholder.style.display = 'flex';
  partImage.style.display = 'none';
}
function showImage() {
  placeholder.style.display = 'none';
  partImage.style.display = 'block';
}
function showLoading() {
  loading.style.display = 'flex';
  placeholder.style.display = 'none';
  partImage.style.display = 'none';
}
function hideLoading() {
  loading.style.display = 'none';
}
function showControls() {
  controlButtons.classList.add('visible');
}
function hideControls() {
  controlButtons.classList.remove('visible');
}
function showErrorMessage(message) {
  const errorDiv = document.createElement('div');
  errorDiv.className = 'error-message';
  errorDiv.style.cssText = `
    position: absolute;top: 20px;right: 20px;background: var(--danger);
    color: white;padding: 12px 16px;border-radius: var(--radius-sm);
    font-size: 14px;z-index: 1001;animation: slideIn 0.3s ease;
  `;
  errorDiv.textContent = message;
  document.body.appendChild(errorDiv);
  setTimeout(() => {
    errorDiv.style.opacity = '0';
    setTimeout(() => errorDiv.remove(), 300);
  }, 3000);
}

// Init Panzoom with native touch gestures
function initPanzoom() {
  panzoomInstance = Panzoom(panzoomContainer, {
    maxScale: Infinity,
    minScale: 0.2,
    step: 0.3,
    contain: 'none',
    bounds: false,
    cursor: 'grab',
    touchAction: 'none'
  });

  imageWrapper.addEventListener('wheel', (e) => {
    e.preventDefault();
    panzoomInstance.zoomWithWheel(e);
  });

  imageWrapper.addEventListener('dblclick', resetTransforms);
}

// Init Hammer (only rotate / pan if needed)
function initHammer() {
  if (!window.Hammer) return;
  hammerManager = new Hammer.Manager(panzoomContainer, {
    inputClass: Hammer.SUPPORT_POINTER_EVENTS ? Hammer.PointerEventInput : Hammer.TouchInput,
    recognizers: [
      [Hammer.Rotate, { enable: true }],
      [Hammer.Pan, { enable: true, pointers: 1 }]
    ]
  });
}

// Rotate
function setImageRotation(deg) {
  currentRotation = deg % 360;
  rotationContainer.style.rotate = `${currentRotation}deg`;
}
function rotateImage(degrees) {
  setImageRotation(currentRotation + degrees, true);
}
function resetTransforms() {
  if (panzoomInstance) panzoomInstance.reset({ animate: true });
  currentRotation = 0;
  rotationContainer.style.rotate = '0deg';
}
function fitToContainer() {
  if (!partImage || !panzoomInstance || partImage.style.display === 'none') return;
  const imgW = partImage.naturalWidth || partImage.width;
  const imgH = partImage.naturalHeight || partImage.height;
  const wrapRect = imageWrapper.getBoundingClientRect();
  if (!imgW || !imgH || !wrapRect.width) return;
  const scaleX = (wrapRect.width * 0.9) / imgW;
  const scaleY = (wrapRect.height * 0.9) / imgH;
  const targetScale = Math.min(scaleX, scaleY, 1);
  panzoomInstance.reset({ animate: true });
  if (targetScale < 1) {
    setTimeout(() => {
      panzoomInstance.zoom(targetScale, { animate: true });
    }, 100);
  }
  currentRotation = 0;
  rotationContainer.style.rotate = '0deg';
}

// Reset app
function resetApplication() {
  deviceSelect.value = '';
  modelSelect.value = '';
  partSelect.innerHTML = '<option value="">Chọn Linh kiện</option>';
  modelSelectWrapper.classList.add('hidden');
  hidePartSelector();
  hideControls();
  showPlaceholder();
  if (panzoomInstance) panzoomInstance.reset({ animate: false });
  setImageRotation(0, false);
}
function handleLogoResetClick() {
  resetClickCount++;
  resetApplication();
  if (resetClickCount >= CLICK_THRESHOLD) {
    showFunnyMessage();
    resetClickCount = 0;
  }
  if (resetClickTimer) clearTimeout(resetClickTimer);
  resetClickTimer = setTimeout(() => resetClickCount = 0, CLICK_WINDOW);
}
function showFunnyMessage() {
  const randomMessage = funnyMessages[Math.floor(Math.random() * funnyMessages.length)];
  console.log(`🎭 Logo button says: ${randomMessage}`);
}

// Event listeners
function setupEventListeners() {
  deviceSelect.addEventListener('change', onDeviceChange);
  modelSelect.addEventListener('change', onModelChange);
  partSelect.addEventListener('change', onPartChange);
  rotateLeftBtn.addEventListener('click', () => rotateImage(-90));
  rotateRightBtn.addEventListener('click', () => rotateImage(90));
  resetViewBtn.addEventListener('click', resetTransforms);
  fitViewBtn.addEventListener('click', fitToContainer);
  logoBtn.addEventListener('click', handleLogoResetClick);
  document.addEventListener('keydown', handleKeyboardShortcuts);
  window.addEventListener('resize', debounce(handleWindowResize, 250));
}
function handleKeyboardShortcuts(e) {
  if (!panzoomInstance || partImage.style.display === 'none') return;
  if (e.target.tagName === 'SELECT' || e.target.tagName === 'INPUT') return;
  const step = e.shiftKey ? 50 : 20;
  switch (e.key.toLowerCase()) {
    case 'arrowleft': e.preventDefault(); panzoomInstance.moveBy(-step, 0, { animate: true }); break;
    case 'arrowright': e.preventDefault(); panzoomInstance.moveBy(step, 0, { animate: true }); break;
    case 'arrowup': e.preventDefault(); panzoomInstance.moveBy(0, -step, { animate: true }); break;
    case 'arrowdown': e.preventDefault(); panzoomInstance.moveBy(0, step, { animate: true }); break;
    case '+': case '=': e.preventDefault(); panzoomInstance.zoomIn(); break;
    case '-': e.preventDefault(); panzoomInstance.zoomOut(); break;
    case 'r': e.preventDefault(); (e.ctrlKey || e.metaKey) ? handleLogoResetClick() : resetTransforms(); break;
    case 'f': e.preventDefault(); fitToContainer(); break;
    case 'q': e.preventDefault(); rotateImage(-90); break;
    case 'e': e.preventDefault(); rotateImage(90); break;
    case '0': e.preventDefault(); setImageRotation(0, true); break;
  }
}
function handleWindowResize() {
  if (partImage && partImage.style.display !== 'none') {
    setTimeout(() => fitToContainer(), 100);
  }
}
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => { clearTimeout(timeout); func(...args); };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Init
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadData);
} else {
  loadData();
}