let data = {};

// Elements - Cache DOM elements once
const elements = {
  rotationContainer: document.getElementById('rotationContainer'),
  panzoomContainer: document.getElementById('panzoomContainer'),
  logoBtn: document.getElementById('logoBtn'),
  deviceSelect: document.getElementById('deviceSelect'),
  modelSelect: document.getElementById('modelSelect'),
  partSelect: document.getElementById('partSelect'),
  partSelectWrapper: document.getElementById('partSelectWrapper'),
  modelSelectWrapper: document.getElementById('modelSelectWrapper'),
  partImage: document.getElementById('partImage'),
  imageWrapper: document.getElementById('imageWrapper'),
  controlButtons: document.getElementById('controlButtons'),
  placeholder: document.getElementById('placeholder'),
  loading: document.getElementById('loading'),
  rotateLeftBtn: document.getElementById('rotateLeft'),
  rotateRightBtn: document.getElementById('rotateRight'),
  resetViewBtn: document.getElementById('resetView'),
  fitViewBtn: document.getElementById('fitView')
};

// State management
const state = {
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

// Constants
const CONFIG = {
  IMAGE_FORMAT: /\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i,
  CLICK_THRESHOLD: 5,
  CLICK_WINDOW: 2000,
  PANZOOM_SETTINGS: {
    maxScale: 5,
    minScale: 0.1,
    step: 0.3,
    contain: 'none',
    bounds: false,
    cursor: 'grab',
    touchAction: 'none'
  },
  ANIMATION_DELAY: 100,
  ERROR_DISPLAY_TIME: 3000,
  RESIZE_DEBOUNCE: 250,
  ROTATION_STEP: 90
};

const FUNNY_MESSAGES = [
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

// Utility functions
const utils = {
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  throttle(func, limit) {
    let lastFunc;
    let lastRan;
    return function(...args) {
      if (!lastRan) {
        func(...args);
        lastRan = Date.now();
      } else {
        clearTimeout(lastFunc);
        lastFunc = setTimeout(() => {
          if ((Date.now() - lastRan) >= limit) {
            func(...args);
            lastRan = Date.now();
          }
        }, limit - (Date.now() - lastRan));
      }
    };
  },

  showErrorMessage(message) {
    const existingError = document.querySelector('.error-message');
    if (existingError) {
      existingError.remove();
    }

    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    document.body.appendChild(errorDiv);
    
    setTimeout(() => {
      errorDiv.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => errorDiv.remove(), 300);
    }, CONFIG.ERROR_DISPLAY_TIME);
  },

  showSuccessMessage(message) {
    const successDiv = document.createElement('div');
    successDiv.className = 'success-message';
    successDiv.textContent = message;
    document.body.appendChild(successDiv);
    
    setTimeout(() => {
      successDiv.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => successDiv.remove(), 300);
    }, 2000);
  },

  getRandomMessage() {
    return FUNNY_MESSAGES[Math.floor(Math.random() * FUNNY_MESSAGES.length)];
  },

  isValidImageUrl(url) {
    return CONFIG.IMAGE_FORMAT.test(url);
  },

  preloadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  },

  isMobileDevice() {
    return window.innerWidth <= 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }
};

// UI Control functions
const ui = {
  showPartSelector() {
    elements.partSelectWrapper.classList.remove('hidden');
    elements.partSelectWrapper.classList.add('slide-in');
    elements.partSelect.disabled = false;
  },

  hidePartSelector() {
    elements.partSelectWrapper.classList.add('slide-out');
    elements.partSelect.disabled = true;
    setTimeout(() => {
      elements.partSelectWrapper.classList.add('hidden');
      elements.partSelectWrapper.classList.remove('slide-out');
    }, 300);
  },

  showModelSelector() {
    elements.modelSelectWrapper.classList.remove('hidden');
    elements.modelSelectWrapper.classList.add('slide-in');
    elements.modelSelect.disabled = false;
  },

  hideModelSelector() {
    elements.modelSelectWrapper.classList.add('slide-out');
    elements.modelSelect.disabled = true;
    setTimeout(() => {
      elements.modelSelectWrapper.classList.add('hidden');
      elements.modelSelectWrapper.classList.remove('slide-out');
    }, 300);
  },

  showPlaceholder() {
    elements.placeholder.style.display = 'flex';
    elements.partImage.style.display = 'none';
    state.isImageLoaded = false;
  },

  showImage() {
    elements.placeholder.style.display = 'none';
    elements.partImage.style.display = 'block';
    state.isImageLoaded = true;
  },

  showLoading() {
    elements.loading.style.display = 'flex';
    elements.placeholder.style.display = 'none';
    elements.partImage.style.display = 'none';
    state.isImageLoaded = false;
  },

  hideLoading() {
    elements.loading.style.display = 'none';
  },

  // Enhanced controls visibility with mobile optimization
  showControls() {
    if (state.controlsVisible) {
      elements.controlButtons.classList.add('visible');
      elements.controlButtons.style.pointerEvents = 'auto';
      
      // On mobile, add special mobile class for compact layout
      if (state.isMobile) {
        elements.controlButtons.classList.add('mobile-compact');
      }
    }
  },

  hideControls() {
    elements.controlButtons.classList.remove('visible');
    elements.controlButtons.style.pointerEvents = 'none';
  },

  // Toggle topbar visibility
  toggleTopbar() {
    state.controlsVisible = !state.controlsVisible;
    
    const topbar = document.querySelector('.topbar') || document.querySelector('header') || document.querySelector('.header');
    if (!topbar) {
      // If no topbar element found, try to find the container with selects
      const selectContainer = elements.deviceSelect.closest('.container') || 
                            elements.deviceSelect.parentElement.parentElement ||
                            document.querySelector('.form-container');
      if (selectContainer) {
        this.toggleElement(selectContainer);
      }
      return;
    }
    
    this.toggleElement(topbar);
  },

  toggleElement(element) {
    if (state.controlsVisible) {
      element.classList.remove('topbar-hidden');
      element.classList.add('topbar-visible');
      elements.logoBtn.classList.remove('controls-hidden');
      elements.logoBtn.title = 'Ẩn thanh điều khiển';
    } else {
      element.classList.remove('topbar-visible');
      element.classList.add('topbar-hidden');
      elements.logoBtn.classList.add('controls-hidden');
      elements.logoBtn.title = 'Hiện thanh điều khiển';
    }
    
    // Add animation class to logo
    elements.logoBtn.classList.add('logo-toggle');
    setTimeout(() => {
      elements.logoBtn.classList.remove('logo-toggle');
    }, 300);
  },

  updateControlsState() {
    const hasImage = state.isImageLoaded;
    elements.controlButtons.querySelectorAll('button').forEach(btn => {
      btn.disabled = !hasImage;
    });
  },

  // Update mobile state on resize
  updateMobileState() {
    const wasMobile = state.isMobile;
    state.isMobile = utils.isMobileDevice();
    
    if (wasMobile !== state.isMobile) {
      if (state.isMobile) {
        elements.controlButtons.classList.add('mobile-compact');
      } else {
        elements.controlButtons.classList.remove('mobile-compact');
      }
    }
  }
};

// Data loading with improved error handling
async function loadData() {
  try {
    const response = await fetch('./data.json');
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
    
    console.log('✅ Data loaded from data.json', Object.keys(data).length, 'devices');
    utils.showSuccessMessage('Dữ liệu đã được tải thành công');
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
  initHammer();
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
  
  const part = data[selectedDevice]?.[selectedModel]?.[partIndex];
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

// Enhanced panzoom initialization
function initPanzoom() {
  if (!window.panzoom) {
    console.error('Panzoom library not found');
    return;
  }

  try {
    if (state.panzoomInstance) {
      state.panzoomInstance.dispose();
    }

    state.panzoomInstance = panzoom(elements.panzoomContainer, {
      ...CONFIG.PANZOOM_SETTINGS,
      beforeWheel: () => !state.isImageLoaded,
      beforeMouseDown: () => !state.isImageLoaded
    });

    elements.imageWrapper.addEventListener('wheel', utils.throttle((e) => {
      if (!state.isImageLoaded) return;
      e.preventDefault();
      state.panzoomInstance.zoomWithWheel(e);
    }, 16), { passive: false });

    elements.imageWrapper.addEventListener('dblclick', utils.throttle((e) => {
      if (!state.isImageLoaded) return;
      e.preventDefault();
      const currentTransform = state.panzoomInstance.getTransform();
      if (currentTransform.scale > 1.1) {
        resetTransforms();
      } else {
        fitToContainer();
      }
    }, 300));

    if (!window.Hammer) {
      elements.imageWrapper.addEventListener('touchstart', (e) => {
        if (!state.isImageLoaded) return;
        e.preventDefault();
      }, { passive: false });
    }
  } catch (error) {
    console.error('Error initializing panzoom:', error);
  }
}

// Enhanced hammer initialization
function initHammer() {
  if (!window.Hammer) {
    console.log('Hammer.js not found - touch gestures disabled');
    return;
  }
  
  try {
    if (state.hammerManager) {
      state.hammerManager.destroy();
    }
    
    state.hammerManager = new Hammer.Manager(elements.panzoomContainer, {
      inputClass: Hammer.SUPPORT_POINTER_EVENTS ? Hammer.PointerEventInput : Hammer.TouchInput,
      recognizers: [
        [Hammer.Rotate, { enable: true }],
        [Hammer.Pan, { enable: true, pointers: 1 }],
        [Hammer.Pinch, { enable: true }],
        [Hammer.Tap, { taps: 2, enable: true }]
      ]
    });
    
    state.hammerManager.on('doubletap', () => {
      if (state.isImageLoaded) {
        fitToContainer();
      }
    });
  } catch (error) {
    console.error('Error initializing Hammer.js:', error);
  }
}

// Enhanced rotation functions
function setImageRotation(deg) {
  state.currentRotation = ((deg % 360) + 360) % 360;
  elements.rotationContainer.style.transform = `rotate(${state.currentRotation}deg)`;
}

function rotateImage(degrees) {
  if (!state.isImageLoaded) {
    utils.showErrorMessage('Không có ảnh để xoay');
    return;
  }
  
  setImageRotation(state.currentRotation + degrees);
  
  setTimeout(() => {
    if (state.panzoomInstance) {
      const transform = state.panzoomInstance.getTransform();
      if (transform.scale < 0.5) {
        fitToContainer();
      }
    }
  }, CONFIG.ANIMATION_DELAY);
}

// Enhanced transform functions
function resetTransforms() {
  if (state.panzoomInstance && state.isImageLoaded) {
    try {
      state.panzoomInstance.moveTo(0, 0);
      state.panzoomInstance.zoomTo(0, 0, 1);
      setImageRotation(0);
    } catch (error) {
      console.error('Error resetting panzoom:', error);
    }
  }
}

function fitToContainer() {
  if (!elements.partImage || !state.panzoomInstance || !state.isImageLoaded) {
    console.log('Cannot fit to container - missing elements or no image');
    return;
  }
  
  const imgW = elements.partImage.naturalWidth || elements.partImage.width;
  const imgH = elements.partImage.naturalHeight || elements.partImage.height;
  const wrapRect = elements.imageWrapper.getBoundingClientRect();
  
  if (!imgW || !imgH || !wrapRect.width || !wrapRect.height) {
    console.log('Invalid dimensions for fit calculation');
    return;
  }

  try {
    state.panzoomInstance.moveTo(0, 0);
    
    const padding = 0.95;
    const isRotated = (state.currentRotation % 180) !== 0;
    const effectiveImgW = isRotated ? imgH : imgW;
    const effectiveImgH = isRotated ? imgW : imgH;
    
    const scaleX = (wrapRect.width * padding) / effectiveImgW;
    const scaleY = (wrapRect.height * padding) / effectiveImgH;
    
    const targetScale = Math.min(scaleX, scaleY);
    
    setTimeout(() => {
      if (state.panzoomInstance) {
        state.panzoomInstance.zoomTo(0, 0, targetScale);
      }
    }, CONFIG.ANIMATION_DELAY);
    
  } catch (error) {
    console.error('Error fitting to container:', error);
  }
}

// Enhanced reset functions - Logo now only toggles controls
function resetApplication() {
  elements.deviceSelect.value = '';
  elements.modelSelect.value = '';
  elements.modelSelect.innerHTML = '<option value="">Chọn Model</option>';
  elements.partSelect.value = '';
  elements.partSelect.innerHTML = '<option value="">Chọn Linh kiện</option>';
  
  ui.hideModelSelector();
  ui.hidePartSelector();
  ui.hideControls();
  ui.showPlaceholder();
  
  if (state.panzoomInstance) {
    try {
      state.panzoomInstance.moveTo(0, 0);
      state.panzoomInstance.zoomTo(0, 0, 1);
    } catch (error) {
      console.error('Error resetting panzoom in app reset:', error);
    }
  }
  
  setImageRotation(0);
  
  state.lastSelectedDevice = '';
  state.lastSelectedModel = '';
  state.lastSelectedPart = '';
  state.isImageLoaded = false;
}

// Modified logo click handler - now toggles topbar instead of controls
function handleLogoClick(e) {
  e.preventDefault();
  
  // If no image is loaded, do a full reset
  if (!state.isImageLoaded) {
    handleLogoResetClick(e);
    return;
  }
  
  // Otherwise, toggle topbar visibility
  ui.toggleTopbar();
  
  // Add visual feedback
  elements.logoBtn.classList.add('logo-pulse');
  setTimeout(() => {
    elements.logoBtn.classList.remove('logo-pulse');
  }, 300);
}

// Keep the old reset functionality for when there's no image
function handleLogoResetClick(e) {
  e.preventDefault();
  
  elements.logoBtn.classList.add('logo-shake');
  setTimeout(() => {
    elements.logoBtn.classList.remove('logo-shake');
  }, 600);
  
  state.resetClickCount++;
  resetApplication();
  
  if (state.resetClickCount >= CONFIG.CLICK_THRESHOLD) {
    showFunnyMessage();
    state.resetClickCount = 0;
  }
  
  if (state.resetClickTimer) {
    clearTimeout(state.resetClickTimer);
  }
  
  state.resetClickTimer = setTimeout(() => {
    state.resetClickCount = 0;
  }, CONFIG.CLICK_WINDOW);
}

function showFunnyMessage() {
  const randomMessage = utils.getRandomMessage();
  const existingMessage = document.querySelector('.funny-message');
  if (existingMessage) {
    existingMessage.remove();
  }
  
  const logoRect = elements.logoBtn.getBoundingClientRect();
  
  const messageDiv = document.createElement('div');
  messageDiv.className = 'funny-message';
  messageDiv.style.cssText = `
    position: fixed; 
    left: ${logoRect.right + 10}px; 
    top: ${logoRect.top}px;
    background: linear-gradient(45deg, #ff6b6b, #4ecdc4);
    color: white; 
    padding: 12px 20px;
    border-radius: 25px; 
    font-size: 16px; 
    z-index: 9999;
    font-weight: bold;
    box-shadow: 0 4px 15px rgba(0,0,0,0.3);
    animation: messagePopOut 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards;
    transform-origin: left center;
    white-space: nowrap;
    max-width: 250px;
    pointer-events: none;
  `;
  messageDiv.textContent = randomMessage;
  
  const tail = document.createElement('div');
  tail.style.cssText = `
    position: absolute;
    left: -10px;
    top: 50%;
    transform: translateY(-50%);
    width: 0;
    height: 0;
    border-style: solid;
    border-width: 8px 10px 8px 0;
    border-color: transparent #ff6b6b transparent transparent;
  `;
  messageDiv.appendChild(tail);
  
  document.body.appendChild(messageDiv);
  
  setTimeout(() => {
    messageDiv.style.animation = 'messagePopIn 0.4s ease-in forwards';
    setTimeout(() => {
      if (messageDiv.parentNode) {
        messageDiv.remove();
      }
    }, 400);
  }, 2500);
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
  
  elements.rotateLeftBtn.addEventListener('click', (e) => {
    e.preventDefault();
    addRippleEffect(elements.rotateLeftBtn, e);
    console.log('↺ Rotating left');
    rotateImage(-CONFIG.ROTATION_STEP);
  });
  
  elements.rotateRightBtn.addEventListener('click', (e) => {
    e.preventDefault();
    addRippleEffect(elements.rotateRightBtn, e);
    console.log('↻ Rotating right');
    rotateImage(CONFIG.ROTATION_STEP);
  });
  
  elements.resetViewBtn.addEventListener('click', (e) => {
    e.preventDefault();
    addRippleEffect(elements.resetViewBtn, e);
    resetTransforms();
  });
  
  elements.fitViewBtn.addEventListener('click', (e) => {
    e.preventDefault();
    addRippleEffect(elements.fitViewBtn, e);
    fitToContainer();
  });

  // Modified logo button event listener
  elements.logoBtn.addEventListener('click', handleLogoClick);
  
  // Window resize handler
  window.addEventListener('resize', utils.debounce(() => {
    ui.updateMobileState();
    if (state.isImageLoaded && state.panzoomInstance) {
      setTimeout(() => fitToContainer(), 100);
    }
  }, CONFIG.RESIZE_DEBOUNCE));
}

// Initialization
function initialize() {
  const missingElements = Object.entries(elements).filter(([key, element]) => !element);
  if (missingElements.length > 0) {
    console.error('Missing DOM elements:', missingElements.map(([key]) => key));
    return;
  }
  
  // Initialize mobile state
  state.isMobile = utils.isMobileDevice();
  
  loadData();
}

// Start the application
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}

// Add enhanced CSS for animations and mobile optimization
if (!document.querySelector('#dynamic-styles')) {
  const style = document.createElement('style');
  style.id = 'dynamic-styles';
  style.textContent = `
    /* Existing animations */
    @keyframes bounce {
      0%, 20%, 60%, 100% { transform: translate(-50%, -50%) translateY(0); }
      40% { transform: translate(-50%, -50%) translateY(-10px); }
      80% { transform: translate(-50%, -50%) translateY(-5px); }
    }
    
    @keyframes slideIn {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes logo-shake {
      0%, 100% { transform: translateX(0); }
      10%, 30%, 50%, 70%, 90% { transform: translateX(-3px); }
      20%, 40%, 60%, 80% { transform: translateX(3px); }
    }
    
    @keyframes messagePopOut {
      0% { 
        opacity: 0; 
        transform: scale(0.3) translateX(-20px); 
      }
      70% { 
        transform: scale(1.1) translateX(0); 
      }
      100% { 
        opacity: 1; 
        transform: scale(1) translateX(0); 
      }
    }
    
    @keyframes messagePopIn {
      0% { 
        opacity: 1; 
        transform: scale(1) translateX(0); 
      }
      100% { 
        opacity: 0; 
        transform: scale(0.8) translateX(-20px); 
      }
    }
    
    /* New animations for logo toggle and mobile optimization */
    @keyframes logo-pulse {
      0% { transform: scale(1); }
      50% { transform: scale(1.15); }
      100% { transform: scale(1); }
    }
    
    @keyframes logo-toggle {
      0% { transform: scale(1) rotate(0deg); }
      50% { transform: scale(0.9) rotate(180deg); }
      100% { transform: scale(1) rotate(360deg); }
    }
    
    @keyframes controlsSlideIn {
      0% { 
        opacity: 0; 
        transform: translateY(20px) scale(0.95); 
      }
      100% { 
        opacity: 1; 
        transform: translateY(0) scale(1); 
      }
    }
    
    @keyframes controlsSlideOut {
      0% { 
        opacity: 1; 
        transform: translateY(0) scale(1); 
      }
      100% { 
        opacity: 0; 
        transform: translateY(-20px) scale(0.95); 
      }
    }
    
    @keyframes ripple {
      to {
        transform: scale(4);
        opacity: 0;
      }
    }
    
    /* Logo button enhanced styling */
    #logoBtn {
      position: fixed !important;
      top: 20px;
      left: 20px;
      z-index: 10000;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border: none;
      border-radius: 50%;
      width: 60px;
      height: 60px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
      color: white;
      font-size: 24px;
      title: 'Ẩn/hiện thanh điều khiển';
    }
    
    #logoBtn:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(102, 126, 234, 0.6);
    }
    
    #logoBtn.controls-hidden {
      background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
      box-shadow: 0 4px 15px rgba(255, 107, 107, 0.4);
    }
    
    #logoBtn.controls-hidden:hover {
      box-shadow: 0 8px 25px rgba(255, 107, 107, 0.6);
    }
    
    /* Topbar hide/show animations */
    .topbar,
    .header,
    header,
    .form-container,
    .container {
      transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
      transform-origin: top center;
    }
    
    .topbar-hidden {
      opacity: 0;
      transform: translateY(-100%) scale(0.95);
      pointer-events: none;
    }
    
    .topbar-visible {
      opacity: 1;
      transform: translateY(0) scale(1);
      pointer-events: auto;
    }
    
    /* Mobile optimization for topbar */
    @media (max-width: 768px) {
      .topbar-hidden {
        transform: translateY(-120%) scale(0.9);
      }
      
      /* Adjust main content when topbar is hidden */
      .topbar-hidden ~ .main-content,
      .topbar-hidden ~ main,
      .topbar-hidden + * {
        margin-top: -60px;
        transition: margin-top 0.4s ease;
      }
      
      /* Compact topbar on mobile */
      .topbar,
      .header,
      header,
      .form-container {
        padding: 10px 15px;
        background: rgba(255, 255, 255, 0.95);
        backdrop-filter: blur(10px);
        border-bottom: 1px solid rgba(0, 0, 0, 0.1);
      }
      
      /* Stack selects vertically on small screens */
      .form-container select,
      .topbar select {
        width: 100%;
        margin-bottom: 8px;
        padding: 12px 15px;
        font-size: 16px;
        border-radius: 8px;
        border: 1px solid #ddd;
        background: white;
      }
      
      /* Compact logo on mobile */
      #logoBtn {
        top: 15px;
        left: 15px;
        width: 50px;
        height: 50px;
        font-size: 20px;
      }
    }
    
    /* Tablet optimization */
    @media (min-width: 769px) and (max-width: 1024px) {
      .topbar,
      .header,
      .form-container {
        padding: 15px 20px;
      }
      
      .form-container select {
        padding: 10px 15px;
        margin-right: 10px;
        font-size: 14px;
      }
    }
    
    .logo-shake {
      animation: logo-shake 0.6s ease-in-out;
    }
    
    .logo-pulse {
      animation: logo-pulse 0.3s ease-out;
    }
    
    .logo-toggle {
      animation: logo-toggle 0.3s ease-out;
    }
    
    /* Enhanced control buttons - keep original functionality */
    #controlButtons {
      transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
      opacity: 0;
      transform: translateY(-20px) scale(0.95);
      pointer-events: none;
    }
    
    #controlButtons.visible {
      opacity: 1;
      transform: translateY(0) scale(1);
      pointer-events: auto;
      animation: controlsSlideIn 0.4s ease-out;
    }
    
    /* Mobile optimization for control buttons */
    @media (max-width: 768px) {
      #logoBtn {
        top: 15px;
        left: 15px;
        width: 50px;
        height: 50px;
        font-size: 20px;
      }
      
      #controlButtons.mobile-compact {
        position: fixed !important;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0, 0, 0, 0.8);
        backdrop-filter: blur(10px);
        border-radius: 25px;
        padding: 10px 15px;
        display: flex !important;
        flex-direction: row;
        gap: 8px;
        max-width: calc(100vw - 40px);
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        border: 1px solid rgba(255, 255, 255, 0.1);
      }
      
      #controlButtons.mobile-compact.visible {
        transform: translateX(-50%) translateY(0) scale(1);
      }
      
      #controlButtons.mobile-compact button {
        min-width: 44px;
        height: 44px;
        border-radius: 12px;
        font-size: 18px;
        padding: 0;
        margin: 0;
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.2);
        color: white;
        transition: all 0.2s ease;
        display: flex;
        align-items: center;
        justify-content: center;
        position: relative;
        overflow: hidden;
      }
      
      #controlButtons.mobile-compact button:hover,
      #controlButtons.mobile-compact button:active {
        background: rgba(255, 255, 255, 0.2);
        transform: scale(1.05);
      }
      
      #controlButtons.mobile-compact button:disabled {
        opacity: 0.4;
        transform: none;
        background: rgba(255, 255, 255, 0.05);
      }
      
      /* Compact button icons for mobile */
      #controlButtons.mobile-compact #rotateLeft::before {
        content: '↺';
      }
      
      #controlButtons.mobile-compact #rotateRight::before {
        content: '↻';
      }
      
      #controlButtons.mobile-compact #resetView::before {
        content: '⌂';
      }
      
      #controlButtons.mobile-compact #fitView::before {
        content: '⛶';
      }
      
      /* Hide text content on mobile, show only icons */
      #controlButtons.mobile-compact button {
        text-indent: -9999px;
        overflow: hidden;
      }
      
      #controlButtons.mobile-compact button::before {
        position: absolute;
        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%);
        text-indent: 0;
        font-size: 18px;
        line-height: 1;
      }
    }
    
    /* Tablet optimization */
    @media (min-width: 769px) and (max-width: 1024px) {
      #controlButtons {
        padding: 15px;
      }
      
      #controlButtons button {
        padding: 10px 15px;
        font-size: 14px;
      }
    }
    
    /* Enhanced ripple effect */
    .control-btn {
      position: relative !important;
      overflow: hidden !important;
    }
    
    /* Smooth transitions for all interactive elements */
    select, button, input {
      transition: all 0.2s ease;
    }
    
    /* Enhanced dropdown animations */
    .slide-in {
      animation: slideIn 0.3s ease-out;
    }
    
    .slide-out {
      animation: slideOut 0.3s ease-in;
    }
    
    @keyframes slideOut {
      from { transform: translateX(0); opacity: 1; }
      to { transform: translateX(-100%); opacity: 0; }
    }
    
    /* Loading and placeholder improvements for mobile */
    @media (max-width: 768px) {
      #loading {
        font-size: 14px;
      }
      
      #placeholder {
        padding: 20px;
        font-size: 16px;
      }
      
      /* Adjust form elements for mobile */
      select {
        padding: 12px 15px;
        font-size: 16px; /* Prevents zoom on iOS */
        border-radius: 8px;
      }
      
      /* Better touch targets */
      button {
        min-height: 44px;
        min-width: 44px;
      }
    }
    
    /* High contrast mode support */
    @media (prefers-contrast: high) {
      #logoBtn {
        border: 2px solid currentColor;
      }
      
      #controlButtons.mobile-compact button {
        border: 2px solid rgba(255, 255, 255, 0.8);
      }
    }
    
    /* Reduced motion support */
    @media (prefers-reduced-motion: reduce) {
      * {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
      }
      
      #logoBtn {
        transition: none;
      }
    }
    
    /* Dark mode optimization */
    @media (prefers-color-scheme: dark) {
      #controlButtons.mobile-compact {
        background: rgba(20, 20, 20, 0.9);
        border: 1px solid rgba(255, 255, 255, 0.15);
      }
      
      #controlButtons.mobile-compact button {
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid rgba(255, 255, 255, 0.15);
      }
    }
    
    /* Focus styles for accessibility */
    button:focus-visible,
    select:focus-visible {
      outline: 2px solid #667eea;
      outline-offset: 2px;
    }
    
    #logoBtn:focus-visible {
      outline: 3px solid rgba(255, 255, 255, 0.8);
      outline-offset: 3px;
    }
  `;
  document.head.appendChild(style);
}

// Enhanced dropdown animation functions
function showDropdown(element, fromElement = null) {
  element.classList.remove('hidden', 'slide-out');
  element.classList.add('slide-in');
  
  if (fromElement) {
    const fromRect = fromElement.getBoundingClientRect();
    const toRect = element.getBoundingClientRect();
    element.style.setProperty('--slide-from-x', `${fromRect.left - toRect.left}px`);
  }
  
  setTimeout(() => {
    element.classList.remove('slide-in');
  }, 500);
}

function hideDropdown(element) {
  element.classList.remove('slide-in');
  element.classList.add('slide-out');
  
  setTimeout(() => {
    element.classList.add('hidden');
    element.classList.remove('slide-out');
  }, 300);
}

// Enhanced control buttons visibility with mobile support
function showControlButtons() {
  const controlButtons = document.getElementById('controlButtons');
  if (state.controlsVisible) {
    controlButtons.classList.add('visible');
    if (state.isMobile) {
      controlButtons.classList.add('mobile-compact');
    }
  }
}

function hideControlButtons() {
  const controlButtons = document.getElementById('controlButtons');
  controlButtons.classList.remove('visible');
}

// Enhanced button click handlers with mobile optimization
document.querySelectorAll('.control-btn').forEach(btn => {
  btn.addEventListener('click', function(e) {
    const ripple = document.createElement('span');
    const rect = this.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;
    
    ripple.style.cssText = `
      position: absolute;
      width: ${size}px;
      height: ${size}px;
      left: ${x}px;
      top: ${y}px;
      background: rgba(255, 255, 255, 0.6);
      border-radius: 50%;
      transform: scale(0);
      animation: ripple 0.6s linear;
      pointer-events: none;
    `;
    
    this.appendChild(ripple);
    
    setTimeout(() => {
      ripple.remove();
    }, 600);
  });
});