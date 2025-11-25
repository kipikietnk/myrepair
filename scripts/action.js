import { state } from "./main.js";
import elements from "./elements.js";
import CONFIG from "./config/diagram.js";
import utils from "./utils.js";
import { fitToContainer, resetTransforms } from "./handle.js";
function initPanzoom() {
    if (!panzoom) {
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
            if (!state.isImageLoaded)
                return;
            e.preventDefault();
            const currentTransform = state.panzoomInstance.getTransform();
            if (currentTransform.scale > 1.1) {
                resetTransforms();
            }
            else {
                fitToContainer();
            }
        }, 300));
        if (!window.Hammer) {
            elements.imageWrapper.addEventListener('touchstart', (e) => {
                if (!state.isImageLoaded)
                    return;
                e.preventDefault();
            }, { passive: false });
        }
    }
    catch (error) {
        console.error('Error initializing panzoom:', error);
    }
}
function fullScreenChange() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
    }
    else {
        document.exitFullscreen();
    }
}
class FollowCursorDrag {
    isDragging;
    isMouseDown;
    currentElement;
    originalPosition;
    pointerStart;
    dragMoved;
    suppressClickFor;
    DRAG_THRESHOLD;
    longPressTimer;
    LONG_PRESS_DELAY;
    constructor() {
        this.isDragging = false;
        this.isMouseDown = false;
        this.currentElement = null;
        this.originalPosition = { x: 0, y: 0 };
        this.pointerStart = { x: 0, y: 0 };
        this.dragMoved = false;
        this.suppressClickFor = null;
        this.DRAG_THRESHOLD = 6; // px
        this.longPressTimer = null;
        this.LONG_PRESS_DELAY = 500; // 0.5s
        this.init();
    }
    init() {
        this.updateDraggableElements();
        this.observeDOM();
        // Global mouse/touch events
        document.addEventListener('mousemove', (e) => {
            // Nếu đang giữ chuột nhưng chưa drag -> check vượt ngưỡng thì bắt đầu drag
            if (this.isMouseDown && !this.isDragging && this.currentElement) {
                const dx = e.clientX - this.pointerStart.x;
                const dy = e.clientY - this.pointerStart.y;
                if (Math.hypot(dx, dy) >= this.DRAG_THRESHOLD) {
                    this.startDrag(e, this.currentElement);
                }
            }
            // Chỉ drag khi thực sự đang drag
            if (this.isDragging) {
                this.drag(e);
            }
        });
        document.addEventListener('mouseup', () => {
            // Kết thúc drag trước khi reset isMouseDown
            this.endDrag();
            this.isMouseDown = false;
        });
        document.addEventListener('touchmove', (e) => {
            if (this.isDragging) {
                this.drag(e);
            }
        }, { passive: false });
        document.addEventListener('touchend', () => this.endDrag());
        document.addEventListener('touchcancel', () => this.endDrag());
        // Chặn click sau drag
        document.addEventListener('click', (e) => {
            if (!this.suppressClickFor)
                return;
            const t = e.target.closest('.draggable');
            if (t && t === this.suppressClickFor) {
                e.preventDefault();
                e.stopPropagation();
                if (typeof e.stopImmediatePropagation === 'function')
                    e.stopImmediatePropagation();
                this.suppressClickFor = null;
            }
        }, true);
    }
    updateDraggableElements() {
        const draggables = document.querySelectorAll('.draggable');
        draggables.forEach(element => {
            if (element.dataset.dragSetup === 'true')
                return;
            element.dataset.dragSetup = 'true';
            if (getComputedStyle(element).position === 'static') {
                element.style.position = 'absolute';
            }
            element.addEventListener('mousedown', (e) => {
                e.preventDefault(); // Ngăn text selection
                this.pointerStart = { x: e.clientX, y: e.clientY };
                this.currentElement = element;
                this.isMouseDown = true;
                this.dragMoved = false;
            });
            element.addEventListener('touchstart', (e) => {
                e.stopPropagation();
                const touch = e.touches[0];
                this.pointerStart = { x: touch.clientX, y: touch.clientY };
                this.dragMoved = false;
                this.longPressTimer = setTimeout(() => {
                    this.startDrag(e, element, true);
                }, this.LONG_PRESS_DELAY);
            }, { passive: false });
            element.addEventListener('touchmove', (e) => {
                if (!this.longPressTimer)
                    return;
                const touch = e.touches[0];
                const rect = element.getBoundingClientRect();
                if (touch.clientX < rect.left ||
                    touch.clientX > rect.right ||
                    touch.clientY < rect.top ||
                    touch.clientY > rect.bottom) {
                    clearTimeout(this.longPressTimer);
                    this.longPressTimer = null;
                }
            }, { passive: false });
            element.addEventListener('touchend', () => {
                if (!this.longPressTimer)
                    return;
                clearTimeout(this.longPressTimer);
                this.longPressTimer = null;
                this.endDrag();
            });
            element.addEventListener('touchcancel', () => {
                if (!this.longPressTimer)
                    return;
                clearTimeout(this.longPressTimer);
                this.longPressTimer = null;
                this.endDrag();
            });
        });
    }
    observeDOM() {
        const observer = new MutationObserver(() => {
            this.updateDraggableElements();
        });
        observer.observe(document.body, { childList: true, subtree: true });
    }
    startDrag(e, element, fromLongPress = false) {
        if (e.type === "touchstart" && !fromLongPress)
            return;
        e.preventDefault();
        e.stopPropagation();
        this.isDragging = true;
        this.currentElement = element;
        const clientX = e.type.includes('touch')
            ? (e.touches?.[0]?.clientX ?? this.pointerStart.x)
            : e.clientX;
        const clientY = e.type.includes('touch')
            ? (e.touches?.[0]?.clientY ?? this.pointerStart.y)
            : e.clientY;
        this.pointerStart = { x: clientX, y: clientY };
        this.dragMoved = false;
        // Style khi đang kéo
        element.style.zIndex = '9999';
        element.style.transform = 'scale(1.1)';
        element.style.transition = 'none';
        element.classList.add('dragging');
        this.updatePosition(clientX, clientY);
    }
    drag(e) {
        if (!this.isDragging || !this.currentElement)
            return;
        e.preventDefault();
        const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
        const clientY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;
        if (!this.dragMoved) {
            const dx = clientX - this.pointerStart.x;
            const dy = clientY - this.pointerStart.y;
            if (Math.hypot(dx, dy) >= this.DRAG_THRESHOLD) {
                this.dragMoved = true;
            }
        }
        this.updatePosition(clientX, clientY);
    }
    updatePosition(clientX, clientY) {
        if (!this.currentElement)
            return;
        const rect = this.currentElement.getBoundingClientRect();
        const elementWidth = rect.width;
        const elementHeight = rect.height;
        const newX = clientX - elementWidth / 2;
        const newY = clientY - elementHeight / 2;
        const maxX = window.innerWidth - elementWidth;
        const maxY = window.innerHeight - elementHeight;
        const boundedX = Math.max(0, Math.min(newX, maxX));
        const boundedY = Math.max(0, Math.min(newY, maxY));
        this.currentElement.style.left = boundedX + 'px';
        this.currentElement.style.top = boundedY + 'px';
    }
    endDrag() {
        if (!this.isDragging || !this.currentElement) {
            this.currentElement = null;
            this.dragMoved = false;
            return;
        }
        if (this.dragMoved) {
            this.suppressClickFor = this.currentElement;
        }
        this.isDragging = false;
        this.currentElement.style.zIndex = '';
        this.currentElement.style.transform = '';
        this.currentElement.style.transition = '';
        this.currentElement.classList.remove('dragging');
        this.currentElement = null;
        this.originalPosition = { x: 0, y: 0 };
        this.pointerStart = { x: 0, y: 0 };
        this.dragMoved = false;
    }
    makeDraggable(element) {
        element.classList.add('draggable');
        this.updateDraggableElements();
    }
    removeDraggable(element) {
        element.classList.remove('draggable');
        element.dataset.dragSetup = 'false';
    }
}
export { initPanzoom, fullScreenChange, FollowCursorDrag };
