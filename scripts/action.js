import { state } from "./main.js";
import elements from "./elements.js";
import CONFIG from "./config.js";
import utils from "./utils.js";

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

function fullScreenChange() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen();
  } else {
    document.exitFullscreen();
  }
}

export { initPanzoom, initHammer, fullScreenChange };