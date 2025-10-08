let selectedFile = null;

console.log("Script loaded");

function handleFileSelect(e) {
  const file = e.target.files[0];
  if (file) {
    selectedFile = file;
    document.getElementById('fileName').textContent = file.name;
    document.getElementById('filePreview').classList.add('active');
    updateSendButton();
  }
}

function removeFile() {
  selectedFile = null;
  document.getElementById('fileInput').value = '';
  document.getElementById('filePreview').classList.remove('active');
  updateSendButton();
}

function updateSendButton() {
  const input = document.getElementById('messageInput');
  const sendBtn = document.getElementById('sendBtn');
  sendBtn.disabled = input.value.trim() === '' && !selectedFile;
}

function adjustTextareaHeight() {
  const textarea = document.getElementById('messageInput');
  textarea.style.height = 'auto';
  textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
  updateSendButton();
}

function handleKeyPress(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
}

function sendMessage() {
  const input = document.getElementById('messageInput');
  const message = input.value.trim();

  if (message === '' && !selectedFile) return;

  const messagesArea = document.getElementById('messagesArea');

  // User message
  const userWrapper = document.createElement('div');
  userWrapper.className = 'message-wrapper user';

  let fileHtml = '';
  if (selectedFile) {
    fileHtml = `<div class="file-attachment">
                    <span>📄</span>
                    <span>${selectedFile.name}</span>
                </div>`;
  }

  userWrapper.innerHTML = `
                <div class="message-content">
                    <div class="avatar user">👤</div>
                    <div class="message-text">
                        ${message || ''}
                        ${fileHtml}
                    </div>
                </div>
            `;

  messagesArea.appendChild(userWrapper);
  messagesArea.scrollTop = messagesArea.scrollHeight;

  input.value = '';
  input.style.height = 'auto';
  removeFile();
  updateSendButton();

  // Show typing indicator
  document.getElementById('typingIndicator').classList.add('active');
  messagesArea.scrollTop = messagesArea.scrollHeight;

  // Simulate AI response
  setTimeout(() => {
    document.getElementById('typingIndicator').classList.remove('active');
    addAssistantMessage();
  }, 1500);
}

function addAssistantMessage() {
  const messagesArea = document.getElementById('messagesArea');
  const assistantWrapper = document.createElement('div');
  assistantWrapper.className = 'message-wrapper assistant';

  const responses = [
    'Tôi hiểu vấn đề của bạn. Để giúp bạn tốt hơn, tôi cần thêm một số thông tin.',
    'Đây là một câu hỏi hay! Hãy để tôi giải thích chi tiết cho bạn.',
    'Cảm ơn bạn đã chia sẻ. Tôi sẽ phân tích và đưa ra câu trả lời phù hợp.',
    'Tôi đã nhận được yêu cầu của bạn. Đây là những gì tôi nghĩ về vấn đề này.',
    'Thật tuyệt khi bạn hỏi điều này! Tôi có thể giúp bạn về vấn đề đó.'
  ];

  const randomResponse = responses[Math.floor(Math.random() * responses.length)];

  assistantWrapper.innerHTML = `
                <div class="message-content">
                    <div class="avatar assistant">🤖</div>
                    <div class="message-text">
                        ${randomResponse}
                    </div>
                </div>
            `;

  messagesArea.appendChild(assistantWrapper);
  messagesArea.scrollTop = messagesArea.scrollHeight;
}

document.getElementById('fileInput').addEventListener('change', handleFileSelect);
document.getElementById('messageInput').addEventListener('input', adjustTextareaHeight);
document.getElementById('messageInput').addEventListener('keydown', handleKeyPress);
document.getElementById('sendBtn').addEventListener('click', sendMessage);
document.querySelector('.remove-file-btn').addEventListener('click', removeFile);


// Focus on input when page loads
window.onload = function () {
  document.getElementById('messageInput').focus();
};