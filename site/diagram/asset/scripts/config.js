export default {
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