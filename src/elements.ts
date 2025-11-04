export default {
  // Containers
  rotationContainer: document.getElementById('rotationContainer') as HTMLDivElement,
  panzoomContainer: document.getElementById('panzoomContainer') as HTMLDivElement,
  logoBtn: document.getElementById('logoBtn') as HTMLButtonElement,

  // Custom Select Wrappers
  deviceSelect: document.getElementById('deviceSelectWrapper') as HTMLDivElement,
  modelSelect: document.getElementById('modelSelectWrapper') as HTMLDivElement,
  partSelect: document.getElementById('partSelectWrapper') as HTMLDivElement,

  partSelectWrapper: document.getElementById('partSelectWrapper') as HTMLDivElement,
  modelSelectWrapper: document.getElementById('modelSelectWrapper') as HTMLDivElement,

  // Image & Control
  partImage: document.getElementById('partImage') as HTMLImageElement,
  imageWrapper: document.getElementById('imageWrapper') as HTMLDivElement,
  controlButtons: document.getElementById('controlButtons') as HTMLDivElement,
  placeholder: document.getElementById('placeholder') as HTMLDivElement,
  loading: document.getElementById('loading-img') as HTMLDivElement,
  rotateLeftBtn: document.getElementById('rotateLeft') as HTMLButtonElement,
  rotateRightBtn: document.getElementById('rotateRight') as HTMLButtonElement,
  resetViewBtn: document.getElementById('resetView') as HTMLButtonElement,
  fullScreenToggleBtn: document.getElementById('full-screen-toggle') as HTMLButtonElement,

  // AI Chat Container
  chatBoxToggle: document.getElementById('chatbox-toggle') as HTMLButtonElement,
  chatBoxClose: document.getElementById('chatbox-close') as HTMLButtonElement,
  chatBoxContainer: document.getElementById('ai-chat-container') as HTMLDivElement,
  chatArea: document.getElementById('chatArea') as HTMLDivElement,
  messageInput: document.getElementById('messageInput') as HTMLInputElement,
  sendButton: document.getElementById('sendButton') as HTMLButtonElement,
  fileInput: document.getElementById('fileInput') as HTMLInputElement,
  filePreview: document.getElementById('filePreview') as HTMLDivElement,
  newPage: document.getElementById('new') as HTMLDivElement,
};
