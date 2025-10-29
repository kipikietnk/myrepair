import { state } from "./main.js";
import elements from "./elements.js";
import utils from "./utils.js";

export default {
  ChatBoxToggle(state?: boolean) {
    const e = elements.chatBoxContainer;
    if (state !== undefined) {
      if (state) {
        e.classList.add('active');
      } else {
        e.classList.remove('active');
      }
    } else {
      e.classList.toggle('active');
    }
  },


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
        (elements.deviceSelect as any).parentElement.parentElement ||
        document.querySelector('.form-container');
      if (selectContainer) {
        this.toggleElement(selectContainer);
      }
      return;
    }

    this.toggleElement(topbar);
  },

  toggleElement(element: Element) {
    if (state.controlsVisible) {
      element.classList.remove('topbar-hidden');
      element.classList.add('topbar-visible');
      elements.logoBtn.classList.remove('controls-hidden');
    } else {
      element.classList.remove('topbar-visible');
      element.classList.add('topbar-hidden');
      elements.logoBtn.classList.add('controls-hidden');

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
  }
};