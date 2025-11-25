import CONFIG from "./config/diagram.js";
import ui from "./ui.js";
import elements from "./elements.js";
import { resetTransforms, fitToContainer } from "./handle.js";
export default {
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
        return function (...args) {
            if (!lastRan) {
                func(...args);
                lastRan = Date.now();
            }
            else {
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
        return window.innerWidth <= 768;
    },
    loadPartImage: async function (imagePath, altText) {
        ui.showLoading();
        try {
            await this.preloadImage(imagePath);
            elements.partImage.src = imagePath;
            elements.partImage.alt = altText || 'Part Image';
            ui.hideLoading();
            ui.showImage();
            ui.showControls();
            ui.updateControlsState();
            resetTransforms();
            setTimeout(fitToContainer, CONFIG.ANIMATION_DELAY);
        }
        catch (error) {
            console.error('Error loading image:', error);
            ui.hideLoading();
            ui.showPlaceholder();
            ui.hideControls();
            this.showErrorMessage("Tải ảnh thất bại");
        }
    },
    loadImage: function (folder, image, altText) {
        const imgPath = `assets/${folder}/${image}`;
        return this.loadPartImage(imgPath, altText);
    }
};
