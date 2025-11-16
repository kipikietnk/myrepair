import { state } from "./main.js";
import CONFIG from "./config/diagram.js";
import elements from "./elements.js";
import ui from "./ui.js";
import utils from "./utils.js";

function rotateImage(degrees: number) {
  if (!state.isImageLoaded) return;
  
  setImageRotation(state.currentRotation + degrees);
}

// Enhanced transform functions
function resetTransforms() {
  if (state.panzoomInstance && state.isImageLoaded) {
    try {
      (state.panzoomInstance as any).moveTo(0, 0);
      (state.panzoomInstance as any).zoomTo(0, 0, 1);
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
    (state.panzoomInstance as any).moveTo(0, 0);
    
    const padding = 0.95;
    const isRotated = (state.currentRotation % 180) !== 0;
    const effectiveImgW = isRotated ? imgH : imgW;
    const effectiveImgH = isRotated ? imgW : imgH;
    
    const scaleX = (wrapRect.width * padding) / effectiveImgW;
    const scaleY = (wrapRect.height * padding) / effectiveImgH;
    
    const targetScale = Math.min(scaleX, scaleY);
    
    setTimeout(() => {
      if (state.panzoomInstance) {
        (state.panzoomInstance as any).zoomTo(0, 0, targetScale);
      }
    }, CONFIG.ANIMATION_DELAY);
    
  } catch (error) {
    console.error('Error fitting to container:', error);
  }
}

// Modified logo click handler - now toggles topbar instead of controls
function handleLogoClick(e: Event) {
  e.preventDefault();
  ui.toggleTopbar();
}

// Enhanced rotation functions
function setImageRotation(deg: number) {
  state.currentRotation = deg //((deg % 360) + 360) % 360;
  elements.rotationContainer.style.transform = `rotate(${state.currentRotation}deg)`;
}

// User agent
function canUseFullscreen() {
  return !!document.documentElement.requestFullscreen
}

export { rotateImage, resetTransforms, fitToContainer, handleLogoClick, canUseFullscreen };
