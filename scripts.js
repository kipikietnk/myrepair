let data = {};

// Elements
const rotationContainer = document.getElementById('rotationContainer');
const panzoomContainer = document.getElementById('panzoomContainer');
const logoBtn = document.getElementById('logoBtn');
const modelSelect = document.getElementById('modelSelect');
const partSelect = document.getElementById('partSelect');
const partSelectWrapper = document.getElementById('partSelectWrapper');
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

// Load data and populate models
async function loadData() {
  try {
    // Sample data as fallback
    const sampleData = {};

    try {
      const response = await fetch('./data.json');
      if (response.ok) {
        data = await response.json();
        console.log('✅ Data loaded from data.json');
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      console.warn('⚠️ Could not load data.json, using sample data:', error.message);
      data = sampleData;
    }
    
    populateModels();
  } catch (error) {
    console.error('❌ Error loading data:', error);
    // Use sample data as ultimate fallback
    data = {
      'iPhone 15 Pro Max': [
        { type: '🖥️ Màn hình', path: 'https://images.unsplash.com/photo-1512499617640-c74ae3a79d37?w=800&h=600&fit=crop' },
        { type: '🔋 Pin', path: 'https://images.unsplash.com/photo-1609592806444-5b9d956b6d9c?w=800&h=600&fit=crop' }
      ]
    };
    populateModels();
  }
}

// Populate model select dropdown
function populateModels() {
  // Clear existing options except the first placeholder
  modelSelect.innerHTML = '<option value="">Chọn Model iPhone</option>';
  
  // Add models from data
  Object.keys(data).forEach(model => {
    const option = document.createElement('option');
    option.value = model;
    option.textContent = model;
    modelSelect.appendChild(option);
  });
  
  console.log(`📱 Loaded ${Object.keys(data).length} iPhone models`);
  
  // Set up event listeners
  setupEventListeners();
  
  // Initialize pan/zoom and touch gestures
  initPanzoom();
  initHammer();
}

// Setup all event listeners
function setupEventListeners() {
  modelSelect.addEventListener('change', onModelChange);
  partSelect.addEventListener('change', onPartChange);
  
  // Control button listeners
  rotateLeftBtn.addEventListener('click', () => rotateImage(-90));
  rotateRightBtn.addEventListener('click', () => rotateImage(90));
  resetViewBtn.addEventListener('click', resetTransforms);
  fitViewBtn.addEventListener('click', fitToContainer);
  
  // Logo button - reset everything
  logoBtn.addEventListener('click', resetApplication);
  
  // Keyboard shortcuts
  document.addEventListener('keydown', handleKeyboardShortcuts);
  
  // Window resize handler
  window.addEventListener('resize', debounce(handleWindowResize, 250));
}

// Handle model selection change
function onModelChange() {
  const selectedModel = modelSelect.value;
  
  // Clear part selector
  partSelect.innerHTML = '<option value="">Chọn Linh kiện</option>';
  
  if (!selectedModel) {
    hidePartSelector();
    hideControls();
    showPlaceholder();
    return;
  }
  
  console.log(`🔄 Model changed to: ${selectedModel}`);
  
  // Show part selector
  showPartSelector();
  
  // Populate parts for selected model
  const modelParts = data[selectedModel] || [];
  modelParts.forEach(part => {
    const option = document.createElement('option');
    option.value = part.path;
    option.textContent = part.type;
    partSelect.appendChild(option);
  });
  
  console.log(`📦 Loaded ${modelParts.length} parts for ${selectedModel}`);
  
  // Reset view state
  hideControls();
  showPlaceholder();
}

// Handle part selection change
function onPartChange() {
  const selectedPartPath = partSelect.value;
  
  if (!selectedPartPath) {
    hideControls();
    showPlaceholder();
    return;
  }
  
  const selectedPartText = partSelect.options[partSelect.selectedIndex].textContent;
  console.log(`🔧 Part changed to: ${selectedPartText}`);
  
  loadPartImage(selectedPartPath);
}

// Load and display part image
function loadPartImage(imagePath) {
  showLoading();
  
  // Preload image
  const img = new Image();
  
  img.onload = () => {
    console.log('✅ Image loaded successfully');
    partImage.src = imagePath;
    partImage.alt = partSelect.options[partSelect.selectedIndex].textContent;
    
    hideLoading();
    showImage();
    showControls();
    resetTransforms();
    
    // Auto-fit after a short delay to ensure proper rendering
    setTimeout(() => {
      fitToContainer();
    }, 100);
  };
  
  img.onerror = () => {
    console.error('❌ Failed to load image:', imagePath);
    hideLoading();
    showPlaceholder();
    hideControls();
    showErrorMessage('Không thể tải hình ảnh');
  };
  
  img.src = imagePath;
}

// UI State Management Functions
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
  partImage.style.pointerEvents = 'none';
}

function showImage() {
  placeholder.style.display = 'none';
  partImage.style.display = 'block';
  partImage.style.pointerEvents = 'auto';
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
    position: absolute;
    top: 20px;
    right: 20px;
    background: var(--danger);
    color: white;
    padding: 12px 16px;
    border-radius: var(--radius-sm);
    font-size: 14px;
    z-index: 1001;
    animation: slideIn 0.3s ease;
  `;
  errorDiv.textContent = message;
  
  document.body.appendChild(errorDiv);
  
  setTimeout(() => {
    errorDiv.style.opacity = '0';
    setTimeout(() => errorDiv.remove(), 300);
  }, 3000);
}

// Initialize Panzoom for pan and zoom functionality
function initPanzoom() {
  panzoomInstance = Panzoom(panzoomContainer, {
    maxScale: Infinity,
    minScale: 0.2,
    step: 0.3,
    contain: 'none',
    bounds: false,
    cursor: 'grab'
  });

  imageWrapper.addEventListener('wheel', (e) => {
    e.preventDefault();
    panzoomInstance.zoomWithWheel(e);
  });

  imageWrapper.addEventListener('dblclick', resetTransforms);
}

// Initialize Hammer.js for touch gestures
function initHammer() {
  if (!window.Hammer) return;

  hammerManager = new Hammer.Manager(panzoomContainer, {
    inputClass: Hammer.SUPPORT_POINTER_EVENTS ? Hammer.PointerEventInput : Hammer.TouchInput,
    recognizers: [
      [Hammer.Rotate, { enable: true }],
      [Hammer.Pinch, { enable: true }, ['rotate']],
      [Hammer.Pan, { enable: true, pointers: 1 }]
    ]
  });

  let initialScale = 1;

  hammerManager.on('pinchstart', (ev) => {
    initialScale = panzoomInstance.getScale();
  });

  hammerManager.on('pinchmove', (ev) => {
    if (!panzoomInstance) return;
    const newScale = Math.max(0.2, initialScale * ev.scale);
    panzoomInstance.zoom(newScale / panzoomInstance.getScale(), {
      animate: false,
      focal: { clientX: ev.center.x, clientY: ev.center.y }
    });
  });
}

// Rotation management
function setImageRotation(deg) {
  currentRotation = deg % 360;
  rotationContainer.style.rotate = `${currentRotation}deg`;
}

function rotateImage(degrees) {
  setImageRotation(currentRotation + degrees, true);
  console.log(`🔄 Rotated to ${currentRotation}°`);
}

// Transform management
function resetTransforms() {
  if (panzoomInstance) {
    panzoomInstance.reset({ animate: true });
  }
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
// Application reset
function resetApplication() {
  console.log('🔄 Resetting application');
  
  // Reset selects
  modelSelect.value = '';
  partSelect.innerHTML = '<option value="">Chọn Linh kiện</option>';
  
  // Hide UI elements
  hidePartSelector();
  hideControls();
  showPlaceholder();
  
  // Reset transforms
  if (panzoomInstance) {
    panzoomInstance.reset({ animate: false });
  }
  setImageRotation(0, false);
}

// Keyboard shortcuts handler
function handleKeyboardShortcuts(e) {
  // Only handle shortcuts when image is visible
  if (!panzoomInstance || partImage.style.display === 'none') {
    return;
  }
  
  // Don't interfere with form inputs
  if (e.target.tagName === 'SELECT' || e.target.tagName === 'INPUT') {
    return;
  }
  
  const step = e.shiftKey ? 50 : 20; // Larger steps with Shift
  
  switch (e.key.toLowerCase()) {
    case 'arrowleft':
      e.preventDefault();
      panzoomInstance.moveBy(-step, 0, { animate: true });
      break;
      
    case 'arrowright':
      e.preventDefault();
      panzoomInstance.moveBy(step, 0, { animate: true });
      break;
      
    case 'arrowup':
      e.preventDefault();
      panzoomInstance.moveBy(0, -step, { animate: true });
      break;
      
    case 'arrowdown':
      e.preventDefault();
      panzoomInstance.moveBy(0, step, { animate: true });
      break;
      
    case '+':
    case '=':
      e.preventDefault();
      panzoomInstance.zoomIn();
      break;
      
    case '-':
      e.preventDefault();
      panzoomInstance.zoomOut();
      break;
      
    case 'r':
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        resetApplication();
      } else {
        resetTransforms();
      }
      break;
      
    case 'f':
      e.preventDefault();
      fitToContainer();
      break;
      
    case 'q':
      e.preventDefault();
      rotateImage(-90);
      break;
      
    case 'e':
      e.preventDefault();
      rotateImage(90);
      break;
      
    case '0':
      e.preventDefault();
      setImageRotation(0, true);
      break;
  }
}

// Window resize handler
function handleWindowResize() {
  console.log('📐 Window resized');
  
  if (partImage && partImage.style.display !== 'none') {
    // Small delay to ensure layout has stabilized
    setTimeout(() => {
      fitToContainer();
    }, 100);
  }
}

// Utility function for debouncing
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Performance optimization: Preload next images
function preloadAdjacentImages() {
  if (!partSelect.value) return;
  
  const currentIndex = Array.from(partSelect.options).findIndex(opt => opt.value === partSelect.value);
  const options = Array.from(partSelect.options).slice(1); // Skip placeholder
  
  // Preload next and previous images
  [currentIndex - 1, currentIndex + 1].forEach(index => {
    if (index >= 0 && index < options.length) {
      const img = new Image();
      img.src = options[index].value;
    }
  });
}

// Error handling for global errors
window.addEventListener('error', (e) => {
  console.error('🚨 Global error:', e.error);
});

window.addEventListener('unhandledrejection', (e) => {
  console.error('🚨 Unhandled promise rejection:', e.reason);
});

// Initialize the application when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadData);
} else {
  loadData();
}

// Export for potential external use
window.iPhonePartsViewer = {
  resetApplication,
  fitToContainer,
  rotateImage,
  data
};