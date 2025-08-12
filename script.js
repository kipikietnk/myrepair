let data = {};

// Elements
const sidebar = document.getElementById('sidebar');
const logoBtn = document.getElementById('logoBtn');
const modelSelect = document.getElementById('modelSelect');
const partSelect = document.getElementById('partSelect');
const partImage = document.getElementById('partImage');
const imageWrapper = document.getElementById('imageWrapper');
const rotateLeftBtn = document.getElementById('rotateLeft');
const rotateRightBtn = document.getElementById('rotateRight');
const resetViewBtn = document.getElementById('resetView');
const fitViewBtn = document.getElementById('fitView');

let currentRotation = 0; // degrees
let hammerManager = null;
let panzoomInstance = null;

// Toggle sidebar by logo
logoBtn.addEventListener('click', () => sidebar.classList.toggle('hidden'));

// Load data and populate models
async function loadData() {
  try {
    const response = await fetch('data.json');
    data = await response.json();
    populateModels();
  } catch (error) {
    console.error('Error loading data:', error);
  }
}

// Populate model select
function populateModels() {
  Object.keys(data).forEach(model => {
    const opt = document.createElement('option');
    opt.value = model;
    opt.textContent = model;
    modelSelect.appendChild(opt);
  });
  modelSelect.addEventListener('change', onModelChange);
  partSelect.addEventListener('change', onPartChange);

  // init panzoom & hammer
  initPanzoom();
  initHammer();
}

// When model changed
function onModelChange() {
  const model = modelSelect.value;
  partSelect.innerHTML = '<option value="">-- Chọn Linh kiện --</option>';
  if (!model) {
    partSelect.classList.add('hidden');
    partSelect.disabled = true;
    return;
  }
  partSelect.classList.remove('hidden');
  partSelect.disabled = false;
  (data[model] || []).forEach(item => {
    const o = document.createElement('option');
    o.value = item.path;
    o.textContent = item.type;
    partSelect.appendChild(o);
  });
}

// When part chosen
function onPartChange() {
  const path = partSelect.value;
  if (!path) {
    partImage.src = '';
    return;
  }
  // load ảnh, reset view
  partImage.src = path;
  partImage.onload = () => {
    resetTransforms();
    // thu sidebar khi chọn
    sidebar.classList.add('hidden');
    fitToContainer();
  };
  partImage.onerror = () => {
    alert('Không thể tải hình ảnh!');
    partImage.src = '';
  };
}

// Panzoom init (applied on wrapper)
function initPanzoom() {
  panzoomInstance = Panzoom(imageWrapper, {
    maxScale: 5,
    minScale: 0.3,
    step: 0.3,
    contain: 'outside' // giữ phần tử hiển thị
  });
  // enable wheel zoom
  imageWrapper.addEventListener('wheel', panzoomInstance.zoomWithWheel);
  // double click to reset
  imageWrapper.addEventListener('dblclick', resetTransforms);
}

// Hammer init (gesture rotate)
function initHammer() {
  hammerManager = new Hammer.Manager(imageWrapper, { inputClass: Hammer.SUPPORT_POINTER_EVENTS ? Hammer.PointerEventInput : Hammer.TouchInput });
  const rotate = new Hammer.Rotate();
  const pinch = new Hammer.Pinch();
  const pan = new Hammer.Pan();
  pinch.recognizeWith(rotate);
  hammerManager.add([pinch, rotate, pan]);

  let initialRotation = 0;

  hammerManager.on('rotatestart', (ev) => {
    initialRotation = currentRotation;
  });

  hammerManager.on('rotatemove', (ev) => {
    // ev.rotation is degrees relative to gesture start
    const newAngle = initialRotation + ev.rotation;
    setImageRotation(newAngle);
  });

  // pinch to zoom (optional: tie to panzoom)
  hammerManager.on('pinchmove', (ev) => {
    if (!panzoomInstance) return;
    const rect = imageWrapper.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    try {
      const currentScale = panzoomInstance.getScale();
      const targetScale = Math.max(0.3, Math.min(5, currentScale * ev.scale));
      panzoomInstance.zoom(targetScale / currentScale, { animate: false, focal: { clientX: ev.center.x, clientY: ev.center.y } });
    } catch (e) {}
  });
}

// Rotation helpers
function setImageRotation(deg) {
  currentRotation = deg;
  // Only rotate the image element; panzoom translates/scales the wrapper
  partImage.style.transform = `rotate(${currentRotation}deg)`;
}

rotateLeftBtn.addEventListener('click', () => { setImageRotation(currentRotation - 90); });
rotateRightBtn.addEventListener('click', () => { setImageRotation(currentRotation + 90); });

resetViewBtn.addEventListener('click', resetTransforms);
fitViewBtn.addEventListener('click', fitToContainer);

function resetTransforms() {
  // reset panzoom transform
  if (panzoomInstance) {
    panzoomInstance.reset();
  }
  // reset rotation
  setImageRotation(0);
}

function fitToContainer() {
  if (!partImage || !panzoomInstance) return;
  // Fit image inside wrapper: compute scale so image fits
  const imgW = partImage.naturalWidth || partImage.width;
  const imgH = partImage.naturalHeight || partImage.height;
  const wrapRect = imageWrapper.getBoundingClientRect();
  if (!imgW || !imgH || !wrapRect.width) return;
  const scaleX = wrapRect.width / imgW;
  const scaleY = wrapRect.height / imgH;
  const target = Math.min(scaleX, scaleY, 1); // not upscale >1 if not desired
  // reset panzoom and set scale
  panzoomInstance.reset();
  panzoomInstance.zoom(target, { animate: true, focal: { clientX: wrapRect.left + wrapRect.width / 2, clientY: wrapRect.top + wrapRect.height / 2 } });
  // center
  panzoomInstance.moveTo(0, 0);
  setImageRotation(0);
}

// Accessibility: allow keyboard arrow keys to nudge when focus on wrapper
imageWrapper.tabIndex = 0;
imageWrapper.addEventListener('keydown', (e) => {
  if (!panzoomInstance) return;
  const step = 20;
  switch (e.key) {
    case 'ArrowLeft': panzoomInstance.moveBy(-step, 0); break;
    case 'ArrowRight': panzoomInstance.moveBy(step, 0); break;
    case 'ArrowUp': panzoomInstance.moveBy(0, -step); break;
    case 'ArrowDown': panzoomInstance.moveBy(0, step); break;
    case '+': panzoomInstance.zoomIn(); break;
    case '-': panzoomInstance.zoomOut(); break;
  }
});

// Load data on page load
loadData();
