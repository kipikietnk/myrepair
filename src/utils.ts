import CONFIG from "./config/diagram.js";

export default {
  debounce(func: (...args: any[]) => any, wait: number) {
    let timeout: ReturnType<typeof setTimeout>;
    return function executedFunction(...args: any[]) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  throttle(func: (...args: any[]) => any, limit: number) {
    let lastFunc: ReturnType<typeof setTimeout>;
    let lastRan: number;
    return function (...args: any[]) {
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

  showErrorMessage(message: string) {
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

  showSuccessMessage(message: string) {
    const successDiv = document.createElement('div');
    successDiv.className = 'success-message';
    successDiv.textContent = message;
    document.body.appendChild(successDiv);

    setTimeout(() => {
      successDiv.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => successDiv.remove(), 300);
    }, 2000);
  },

  isValidImageUrl(url: string) {
    return CONFIG.IMAGE_FORMAT.test(url);
  },

  preloadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  },

  isMobileDevice() {
    return window.innerWidth <= 768;
  }
};