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
let currentImages = [];
let imagesLoaded = 0;

// Funny reset variables
let resetClickCount = 0;
let resetClickTimer = null;
const CLICK_THRESHOLD = 5;
const CLICK_WINDOW = 3000;
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
    } else {
      throw new Error(`HTTP ${response.status}`);
    }
    populateDevices();
  } catch (error) {
    console.error('Error loading data:', error);
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

// Part change → load all images
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
  if (part.images && part.images.length > 0) {
    loadPartImages(part.images);
  } else {
    showErrorMessage("Không có ảnh cho linh kiện này");
  }
}

// Load multiple images
function loadPartImages(imagePaths) {
  showLoading();
  currentImages = imagePaths;
  imagesLoaded = 0;
  
  // Clear existing content
  panzoomContainer.innerHTML = '';
  
  // Create images container
  const imagesGrid = document.createElement('div');
  imagesGrid.style.cssText = `
    display: flex;
    flex-wrap: wrap;
    gap: 20px;
    justify-content: center;
    align-items: flex-start;
    padding: 20px;
    min-width: 100%;
    min-height: 100%;
  `;
  
  imagePaths.forEach((imagePath, index) => {
    const imgContainer = document.createElement('div');
    imgContainer.style.cssText = `
      flex: 0 0 auto;
      max-width: 100%;
      text-align: center;
    `;
    
    const img = document.createElement('img');
    img.style.cssText = `
      max-width: 100%;
      height: auto;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      transition: transform 0.2s ease;
    `;
    
    img.onload = () => {
      imagesLoaded++;
      if (imagesLoaded === imagePaths.length) {
        hideLoading();
        showImage();
        showControls();
        resetTransforms();
        setTimeout(() => fitToContainer(), 100);
      }
    };
    
    img.onerror = () => {
      console.error(`Failed to load image: ${imagePath}`);
      imagesLoaded++;
      if (imagesLoaded === imagePaths.length) {
        hideLoading();
        if (panzoomContainer.children.length > 0) {
          showImage();
          showControls();
          resetTransforms();
          setTimeout(() => fitToContainer(), 100);
        } else {
          showPlaceholder();
          hideControls();
          showErrorMessage('Không thể tải hình ảnh nào');
        }
      }
    };
    
    img.src = imagePath;
    img.alt = `${partSelect.options[partSelect.selectedIndex].textContent} - Ảnh ${index + 1}`;
    
    imgContainer.appendChild(img);
    imagesGrid.appendChild(imgContainer);
  });
  
  panzoomContainer.appendChild(imagesGrid);
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
  panzoomContainer.style.display = 'none';
}

function showImage() {
  placeholder.style.display = 'none';
  panzoomContainer.style.display = 'block';
}

function showLoading() {
  loading.style.display = 'flex';
  placeholder.style.display = 'none';
  panzoomContainer.style.display = 'none';
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
    position: fixed;
    top: 20px;
    right: 20px;
    background: var(--danger, #dc3545);
    color: white;
    padding: 12px 16px;
    border-radius: var(--radius-sm, 6px);
    font-size: 14px;
    z-index: 1001;
    animation: slideIn 0.3s ease;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  `;
  errorDiv.textContent = message;
  document.body.appendChild(errorDiv);
  
  setTimeout(() => {
    errorDiv.style.opacity = '0';
    errorDiv.style.transform = 'translateX(100%)';
    setTimeout(() => errorDiv.remove(), 300);
  }, 3000);
}

// Init Panzoom with improved touch handling
function initPanzoom() {
  panzoomInstance = Panzoom(panzoomContainer, {
    maxScale: 5,
    minScale: 0.1,
    step: 0.3,
    contain: 'none',
    bounds: false,
    cursor: 'grab',
    touchAction: 'none',
    animate: true,
    duration: 200,
    easing: 'ease-out'
  });

  // Improved wheel zoom with better center point calculation - works anywhere in imageWrapper
  imageWrapper.addEventListener('wheel', (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const rect = imageWrapper.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Calculate zoom center relative to the container
    const centerX = x;
    const centerY = y;
    
    panzoomInstance.zoomWithWheel(e, {
      focal: { x: centerX, y: centerY }
    });
  }, { passive: false });

  // Enable panning anywhere in the imageWrapper
  let isPanning = false;
  let startX = 0;
  let startY = 0;
  let initialPan = { x: 0, y: 0 };

  imageWrapper.addEventListener('mousedown', (e) => {
    if (e.button === 0) { // Left mouse button
      isPanning = true;
      startX = e.clientX;
      startY = e.clientY;
      const pan = panzoomInstance.getPan();
      initialPan = { x: pan.x, y: pan.y };
      imageWrapper.style.cursor = 'grabbing';
      e.preventDefault();
    }
  });

  document.addEventListener('mousemove', (e) => {
    if (isPanning) {
      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;
      
      panzoomInstance.pan(
        initialPan.x + deltaX,
        initialPan.y + deltaY,
        { animate: false }
      );
      e.preventDefault();
    }
  });

  document.addEventListener('mouseup', (e) => {
    if (isPanning) {
      isPanning = false;
      imageWrapper.style.cursor = 'grab';
    }
  });

  // Touch events for mobile panning anywhere in imageWrapper
  let touchStartX = 0;
  let touchStartY = 0;
  let touchInitialPan = { x: 0, y: 0 };
  let isTouchPanning = false;

  imageWrapper.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) {
      isTouchPanning = true;
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
      const pan = panzoomInstance.getPan();
      touchInitialPan = { x: pan.x, y: pan.y };
    }
  }, { passive: true });

  imageWrapper.addEventListener('touchmove', (e) => {
    if (isTouchPanning && e.touches.length === 1) {
      const deltaX = e.touches[0].clientX - touchStartX;
      const deltaY = e.touches[0].clientY - touchStartY;
      
      panzoomInstance.pan(
        touchInitialPan.x + deltaX,
        touchInitialPan.y + deltaY,
        { animate: false }
      );
      e.preventDefault();
    }
  }, { passive: false });

  imageWrapper.addEventListener('touchend', (e) => {
    if (e.touches.length === 0) {
      isTouchPanning = false;
    }
  }, { passive: true });

  // Double click to reset - works anywhere in imageWrapper
  imageWrapper.addEventListener('dblclick', (e) => {
    e.preventDefault();
    resetTransforms();
  });
}

// Init Hammer for touch gestures
function initHammer() {
  if (!window.Hammer) return;
  hammerManager = new Hammer.Manager(imageWrapper, {
    inputClass: Hammer.SUPPORT_POINTER_EVENTS ? Hammer.PointerEventInput : Hammer.TouchInput,
    recognizers: [
      [Hammer.Pinch, { enable: true }],
      [Hammer.Pan, { enable: true, pointers: 2, threshold: 10 }],
      [Hammer.Rotate, { enable: true }]
    ]
  });
  
  let initialScale = 1;
  let initialRotation = 0;
  let initialPan = { x: 0, y: 0 };
  
  hammerManager.on('pinchstart', (e) => {
    initialScale = panzoomInstance.getScale();
    const pan = panzoomInstance.getPan();
    initialPan = { x: pan.x, y: pan.y };
  });
  
  hammerManager.on('pinch', (e) => {
    const scale = initialScale * e.scale;
    
    const rect = imageWrapper.getBoundingClientRect();
    const centerX = e.center.x - rect.left;
    const centerY = e.center.y - rect.top;
    
    panzoomInstance.zoom(scale, { 
      animate: false,
      focal: { x: centerX, y: centerY }
    });
  });
  
  hammerManager.on('panstart', (e) => {
    if (e.pointerType === 'touch' && e.pointers && e.pointers.length >= 2) {
      const pan = panzoomInstance.getPan();
      initialPan = { x: pan.x, y: pan.y };
    }
  });
  
  hammerManager.on('pan', (e) => {
    if (e.pointerType === 'touch' && e.pointers && e.pointers.length >= 2) {
      panzoomInstance.pan(
        initialPan.x + e.deltaX,
        initialPan.y + e.deltaY,
        { animate: false }
      );
    }
  });
  
  hammerManager.on('rotatestart', (e) => {
    initialRotation = currentRotation;
  });
  
  hammerManager.on('rotate', (e) => {
    const rotation = initialRotation + e.rotation;
    setImageRotation(rotation);
  });
}

// Rotate functions
function setImageRotation(deg) {
  currentRotation = deg % 360;
  rotationContainer.style.transform = `rotate(${currentRotation}deg)`;
}

function rotateImage(degrees) {
  setImageRotation(currentRotation + degrees);
}

function resetTransforms() {
  if (panzoomInstance) {
    panzoomInstance.reset({ animate: true });
  }
  currentRotation = 0;
  rotationContainer.style.transform = 'rotate(0deg)';
}

function fitToContainer() {
  if (!panzoomInstance || panzoomContainer.style.display === 'none') return;
  
  const wrapRect = imageWrapper.getBoundingClientRect();
  const containerRect = panzoomContainer.getBoundingClientRect();
  
  if (!wrapRect.width || !containerRect.width) return;
  
  // Calculate scale to fit content
  const scaleX = (wrapRect.width * 0.9) / containerRect.width;
  const scaleY = (wrapRect.height * 0.9) / containerRect.height;
  const targetScale = Math.min(scaleX, scaleY, 1);
  
  panzoomInstance.reset({ animate: true });
  
  if (targetScale < 1) {
    setTimeout(() => {
      panzoomInstance.zoom(targetScale, { animate: true });
    }, 100);
  }
  
  currentRotation = 0;
  rotationContainer.style.transform = 'rotate(0deg)';
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
  setImageRotation(0);
  currentImages = [];
  imagesLoaded = 0;
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
  logoBtn.classList.add('logo-shake');
  setTimeout(() => logoBtn.classList.remove('logo-shake'), 600);
  const logoRect = logoBtn.getBoundingClientRect();
  const messageBubble = document.createElement('div');
  messageBubble.className = 'logo-message-bubble';
  messageBubble.style.cssText = `
    position: fixed;
    top: ${logoRect.top + logoRect.height / 2}px;
    left: ${logoRect.right + 15}px;
    transform: translateY(-50%);
    background: linear-gradient(135deg, #ff6b6b, #ee5a24);
    color: white;
    padding: 12px 18px;
    border-radius: 20px;
    font-size: 14px;
    font-weight: 600;
    z-index: 2000;
    box-shadow: 0 4px 20px rgba(238, 90, 36, 0.3);
    animation: logoMessageSlide 0.5s ease;
    white-space: nowrap;
    max-width: 200px;
    pointer-events: none;
  `;
  
  // Add message arrow pointing to logo
  const arrow = document.createElement('div');
  arrow.style.cssText = `
    position: absolute;
    left: -8px;
    top: 50%;
    transform: translateY(-50%);
    width: 0;
    height: 0;
    border-top: 8px solid transparent;
    border-bottom: 8px solid transparent;
    border-right: 8px solid #ff6b6b;
  `;
  messageBubble.appendChild(arrow);
  
  // Add animations
  if (!document.getElementById('logo-animations')) {
    const style = document.createElement('style');
    style.id = 'logo-animations';
    style.textContent = `
      @keyframes logoMessageSlide {
        0% { 
          opacity: 0; 
          transform: translateY(-50%) translateX(-20px) scale(0.8);
        }
        50% {
          transform: translateY(-50%) translateX(5px) scale(1.05);
        }
        100% { 
          opacity: 1; 
          transform: translateY(-50%) translateX(0) scale(1);
        }
      }
      
      @keyframes logoMessageFade {
        0% { opacity: 1; transform: translateY(-50%) scale(1); }
        100% { opacity: 0; transform: translateY(-50%) scale(0.8); }
      }
      
      .logo-shake {
        animation: logoShake 0.6s ease-in-out;
      }
      
      @keyframes logoShake {
        0%, 100% { transform: translateX(0); }
        10%, 30%, 50%, 70%, 90% { transform: translateX(-3px) rotate(-1deg); }
        20%, 40%, 60%, 80% { transform: translateX(3px) rotate(1deg); }
      }
    `;
    document.head.appendChild(style);
  }
  
  messageBubble.textContent = randomMessage;
  document.body.appendChild(messageBubble);
  
  setTimeout(() => {
    messageBubble.style.animation = 'logoMessageFade 0.4s ease';
    setTimeout(() => {
      messageBubble.remove();
    }, 400);
  }, 2500);
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
  window.addEventListener('resize', debounce(handleWindowResize, 250));
}

function handleWindowResize() {
  if (panzoomContainer && panzoomContainer.style.display !== 'none') {
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