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
  lastSelectedPart: ''
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

  showControls() {
    elements.controlButtons.classList.add('visible');
    elements.controlButtons.style.pointerEvents = 'auto';
  },

  hideControls() {
    elements.controlButtons.classList.remove('visible');
    elements.controlButtons.style.pointerEvents = 'none';
  },

  updateControlsState() {
    const hasImage = state.isImageLoaded;
    elements.controlButtons.querySelectorAll('button').forEach(btn => {
      btn.disabled = !hasImage;
    });
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
  
  // Store selection for potential restoration
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
  
  // Validate image URL
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
      beforeWheel: () => !state.isImageLoaded,       // Chặn zoom nếu ảnh chưa load
      beforeMouseDown: () => !state.isImageLoaded    // Chặn pan nếu ảnh chưa load
    });

    // Zoom bằng con lăn chuột
    elements.imageWrapper.addEventListener('wheel', utils.throttle((e) => {
      if (!state.isImageLoaded) return;
      e.preventDefault();
      state.panzoomInstance.zoomWithWheel(e);
    }, 16), { passive: false });

    // Double click để reset hoặc fit ảnh
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

    // Hỗ trợ cảm ứng nếu không có Hammer.js
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
    // Dispose existing manager if present
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
    
    // Add gesture handlers
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
  state.currentRotation = ((deg % 360) + 360) % 360; // Normalize to 0-359
  elements.rotationContainer.style.transform = `rotate(${state.currentRotation}deg)`;
}

function rotateImage(degrees) {
  if (!state.isImageLoaded) {
    utils.showErrorMessage('Không có ảnh để xoay');
    return;
  }
  
  setImageRotation(state.currentRotation + degrees);
  
  // Adjust view after rotation to keep image centered
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
      // Reset to original position and scale
      state.panzoomInstance.moveTo(0, 0);
      state.panzoomInstance.zoomTo(0, 0, 1);
      
      // Reset rotation
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
    // Reset position first
    state.panzoomInstance.moveTo(0, 0);
    
    // Calculate optimal scale with padding (account for rotation)
    const padding = 0.95; // Use 95% of container size for better fit
    const isRotated = (state.currentRotation % 180) !== 0;
    const effectiveImgW = isRotated ? imgH : imgW;
    const effectiveImgH = isRotated ? imgW : imgH;
    
    // Calculate scale for both dimensions
    const scaleX = (wrapRect.width * padding) / effectiveImgW;
    const scaleY = (wrapRect.height * padding) / effectiveImgH;
    
    // Use the smaller scale to ensure image fits completely
    // Remove the Math.min(..., 1) limitation to allow zoom out beyond 100%
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

// Enhanced reset functions
function resetApplication() {
  // Reset form state
  elements.deviceSelect.value = '';
  elements.modelSelect.value = '';
  elements.modelSelect.innerHTML = '<option value="">Chọn Model</option>';
  elements.partSelect.value = '';
  elements.partSelect.innerHTML = '<option value="">Chọn Linh kiện</option>';
  
  // Reset UI state
  ui.hideModelSelector();
  ui.hidePartSelector();
  ui.hideControls();
  ui.showPlaceholder();
  
  // Reset transforms
  if (state.panzoomInstance) {
    try {
      state.panzoomInstance.moveTo(0, 0);
      state.panzoomInstance.zoomTo(0, 0, 1);
    } catch (error) {
      console.error('Error resetting panzoom in app reset:', error);
    }
  }
  
  setImageRotation(0);
  
  // Reset state
  state.lastSelectedDevice = '';
  state.lastSelectedModel = '';
  state.lastSelectedPart = '';
  state.isImageLoaded = false;
}

function handleLogoResetClick(e) {
  e.preventDefault();
  // Add enhanced shake animation
  elements.logoBtn.classList.add('logo-shake');
  setTimeout(() => {
    elements.logoBtn.classList.remove('logo-shake');
  }, 600);
  
  state.resetClickCount++;
  resetApplication();
  
  // Show funny message after threshold
  if (state.resetClickCount >= CONFIG.CLICK_THRESHOLD) {
    showFunnyMessage();
    state.resetClickCount = 0;
  }
  
  // Reset click counter after window
  if (state.resetClickTimer) {
    clearTimeout(state.resetClickTimer);
  }
  
  state.resetClickTimer = setTimeout(() => {
    state.resetClickCount = 0;
  }, CONFIG.CLICK_WINDOW);
}

function showFunnyMessage() {
  const randomMessage = utils.getRandomMessage();
  // Remove existing funny message
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
  
  // Add speech bubble tail
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
  
  // Auto remove with animation
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
  // Dropdown events
  elements.deviceSelect.addEventListener('change', onDeviceChange);
  elements.modelSelect.addEventListener('change', onModelChange);
  elements.partSelect.addEventListener('change', onPartChange);
  
  // Control button events with ripple effects
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
    // Logo button - FIXED
  elements.logoBtn.addEventListener('click', handleLogoResetClick);
}

// Initialization
function initialize() {
  const missingElements = Object.entries(elements).filter(([key, element]) => !element);
  if (missingElements.length > 0) {
    console.error('Missing DOM elements:', missingElements.map(([key]) => key));
    return;
  }
  
  loadData();
}

// Start the application
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}

// Add CSS for animations if not present
if (!document.querySelector('#dynamic-styles')) {
  const style = document.createElement('style');
  style.id = 'dynamic-styles';
  style.textContent = `
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
    
    .logo-shake {
      animation: logo-shake 0.6s ease-in-out;
    }
    
    .funny-message {
      pointer-events: none;
    }
  `;
  document.head.appendChild(style);
}

// Enhanced dropdown animation functions
    function showDropdown(element, fromElement = null) {
      element.classList.remove('hidden', 'slide-out');
      element.classList.add('slide-in');
      
      // Optional: animate from previous element position
      if (fromElement) {
        const fromRect = fromElement.getBoundingClientRect();
        const toRect = element.getBoundingClientRect();
        
        element.style.setProperty('--slide-from-x', `${fromRect.left - toRect.left}px`);
      }
      
      // Remove animation class after animation completes
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
    
    // Enhanced control buttons visibility
    function showControlButtons() {
      const controlButtons = document.getElementById('controlButtons');
      controlButtons.classList.add('visible');
    }
    
    function hideControlButtons() {
      const controlButtons = document.getElementById('controlButtons');
      controlButtons.classList.remove('visible');
    }
    
    // Logo click handler with animation
    document.getElementById('logoBtn').addEventListener('click', function() {
      this.style.transform = 'scale(1.2) rotate(360deg)';
      setTimeout(() => {
        this.style.transform = '';
      }, 600);
    });
    
    // Add ripple effect to buttons
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
    
    // Add CSS animation for ripple effect
    const style = document.createElement('style');
    style.textContent = `
      @keyframes ripple {
        to {
          transform: scale(4);
          opacity: 0;
        }
      }
      
      .control-btn {
        position: relative;
        overflow: hidden;
      }
    `;
    document.head.appendChild(style);
  