import { Gemini } from "./core/gemini.js";
import { callbacks } from "./core/functionDeclarations.js";
// Constants
const IPS_EXTENSION = '.ips';
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB limit
// Gemini instance
const gemini = new Gemini();
// State management
class AppState {
    selectedFiles = [];
    isProcessing = false;
    addFiles(files) {
        this.selectedFiles.push(...files);
    }
    clearFiles() {
        this.selectedFiles = [];
    }
    removeFile(index) {
        this.selectedFiles.splice(index, 1);
    }
}
const state = new AppState();
// DOM Elements - cached for performance
const elements = {
    chatArea: document.getElementById('chatArea'),
    messageInput: document.getElementById('messageInput'),
    sendButton: document.getElementById('sendButton'),
    fileInput: document.getElementById('fileInput'),
    filePreview: document.getElementById('filePreview'),
    newPage: document.getElementById('new'),
};
// Validation functions
const isValidIPSFile = (file) => file.name.toLowerCase().endsWith(IPS_EXTENSION);
const validateIPSFormat = (content) => {
    if (!content?.trim()) {
        return { valid: false, error: 'File rỗng hoặc không có nội dung' };
    }
    return { valid: true };
};
// File processing
const processIPSContent = (content) => content.replace(/\\n/g, "\n");
const formatFileSize = (bytes) => {
    if (bytes < 1024)
        return `${bytes} B`;
    if (bytes < 1024 * 1024)
        return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};
const readFileContent = (file) => {
    return new Promise((resolve, reject) => {
        if (file.size > MAX_FILE_SIZE) {
            reject(new Error(`File "${file.name}" quá lớn (tối đa 10MB)`));
            return;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target?.result;
            const validation = validateIPSFormat(content);
            if (!validation.valid) {
                reject(new Error(`File "${file.name}" không đúng định dạng: ${validation.error}`));
                return;
            }
            resolve(processIPSContent(content));
        };
        reader.onerror = () => reject(new Error(`Không thể đọc file "${file.name}"`));
        reader.readAsText(file);
    });
};
// File preview management
const displayFilePreview = () => {
    const fragment = document.createDocumentFragment();
    state.selectedFiles.forEach((file, index) => {
        const preview = document.createElement('div');
        preview.className = 'file-preview';
        preview.innerHTML = `
      <div class="file-preview-name">
        <span>📄</span>
        <span>${file.name}</span>
        <span style="color: #666;">(${formatFileSize(file.size)})</span>
      </div>
      <button class="remove-file" data-index="${index}">✕</button>
    `;
        fragment.appendChild(preview);
    });
    elements.filePreview.innerHTML = '';
    elements.filePreview.appendChild(fragment);
};
// Event delegation for remove buttons
elements.filePreview.addEventListener('click', (e) => {
    const target = e.target;
    if (target.classList.contains('remove-file')) {
        const index = parseInt(target.dataset.index || '0');
        state.removeFile(index);
        displayFilePreview();
        updateSendButtonState();
    }
});
const formatRules = [
    {
        regex: /```(\w+)?\n([\s\S]*?)```/g,
        replacement: (_, lang, code) => {
            const language = lang?.toUpperCase() || 'CODE';
            return `<pre><div class="code-header">${language}</div><code>${code.trim()}</code></pre>`;
        }
    },
    { regex: /`([^`]+)`/g, replacement: '<code>$1</code>' },
    { regex: /^#### (.+)$/gm, replacement: '<h4>$1</h4>' },
    { regex: /^### (.+)$/gm, replacement: '<h3>$1</h3>' },
    { regex: /^## (.+)$/gm, replacement: '<h2>$1</h2>' },
    { regex: /^# (.+)$/gm, replacement: '<h1>$1</h1>' },
    { regex: /\*\*\*(.+?)\*\*\*/g, replacement: '<strong><em>$1</em></strong>' },
    { regex: /\*\*(.+?)\*\*/g, replacement: '<strong>$1</strong>' },
    { regex: /\*(.+?)\*/g, replacement: '<em>$1</em>' },
    { regex: /___(.+?)___/g, replacement: '<strong><em>$1</em></strong>' },
    { regex: /__(.+?)__/g, replacement: '<strong>$1</strong>' },
    { regex: /_(.+?)_/g, replacement: '<em>$1</em>' },
    { regex: /\[([^\]]+)\]\(([^)]+)\)/g, replacement: '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>' },
    { regex: /^&gt; (.+)$/gm, replacement: '<blockquote>$1</blockquote>' },
    { regex: /^(---|\*\*\*)$/gm, replacement: '<hr>' },
    { regex: /^[\*-] (.+)$/gm, replacement: '<ul><li>$1</li></ul>' },
    { regex: /^\d+\. (.+)$/gm, replacement: '<ol><li>$1</li></ol>' },
    { regex: /<\/(ul|ol)>\s*<\1>/g, replacement: '' },
    { regex: /  \n/g, replacement: '<br>' },
    { regex: /\n\n/g, replacement: '</p><p>' },
    { regex: /\n/g, replacement: '<br>' },
];
const escapeHTML = (text) => text.replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
const formatMessage = (text) => {
    if (!text)
        return '';
    let formatted = escapeHTML(text);
    for (const rule of formatRules) {
        formatted = formatted.replace(rule.regex, rule.replacement);
    }
    return formatted.startsWith('<') ? formatted : `<p>${formatted}</p>`;
};
// UI functions
const scrollToBottom = () => {
    elements.chatArea.scrollTop = elements.chatArea.scrollHeight;
};
const addMessage = (text, isUser = false, files = [], format = true) => {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isUser ? 'user' : 'ai'}`;
    const fileHTML = files.length > 0
        ? files.map(f => `<div class="file-attachment">${f.name} - ${formatFileSize(f.size)}</div>`).join('')
        : '';
    const formattedText = (isUser || !format) ? text : formatMessage(text);
    messageDiv.innerHTML = `
    <div class="message-content">
      ${formattedText}
      ${fileHTML}
    </div>
  `;
    elements.chatArea.appendChild(messageDiv);
    scrollToBottom();
};
const showTypingIndicator = () => {
    if (document.getElementById('typingIndicator'))
        return;
    const indicator = document.createElement('div');
    indicator.className = 'message ai';
    indicator.id = 'typingIndicator';
    indicator.innerHTML = `
    <div class="message-content typing-indicator active">
      <div class="dot"></div>
      <div class="dot"></div>
      <div class="dot"></div>
    </div>
  `;
    elements.chatArea.appendChild(indicator);
    scrollToBottom();
    updateSendButtonState();
};
const removeTypingIndicator = () => {
    document.getElementById('typingIndicator')?.remove();
    updateSendButtonState();
};
const updateSendButtonState = () => {
    const hasTypingIndicator = !!document.getElementById('typingIndicator');
    const hasContent = elements.messageInput.value.trim() !== '' || state.selectedFiles.length > 0;
    elements.sendButton.disabled = hasTypingIndicator || !hasContent;
};
const clearInput = () => {
    elements.messageInput.value = '';
    state.clearFiles();
    elements.filePreview.innerHTML = '';
    elements.fileInput.value = '';
    updateSendButtonState();
};
// Main send message function
const sendMessage = async () => {
    if (state.isProcessing)
        return;
    const text = elements.messageInput.value.trim();
    if (!text && state.selectedFiles.length === 0)
        return;
    // Handle API key update
    if (text.startsWith('--api')) {
        const newAPI = text.replace('--api', '').trim();
        const result = await gemini.updateApiKey(newAPI);
        addMessage(result);
        clearInput();
        return;
    }
    state.isProcessing = true;
    addMessage(text || '(Đã gửi file .ips)', true, state.selectedFiles);
    // Process files
    const fileContents = [];
    for (const file of state.selectedFiles) {
        try {
            const content = await readFileContent(file);
            fileContents.push({ name: file.name, content, size: file.size });
        }
        catch (error) {
            addMessage(`Lỗi xử lý file: ${error.message}`, false);
            state.isProcessing = false;
            clearInput();
            return;
        }
    }
    // Add files to history
    fileContents.forEach(file => {
        gemini.addToHistory({
            role: 'user',
            parts: [{ text: `File: ${file.name}\nNội dung:\n${file.content}` }]
        });
    });
    clearInput();
    showTypingIndicator();
    try {
        const response = await gemini.sendMessage(text);
        removeTypingIndicator();
        if (response instanceof Error) {
            addMessage(response.message, false, undefined, false);
        }
        else {
            await handleResponse(response.candidates?.[0].content);
        }
    }
    catch (error) {
        removeTypingIndicator();
        addMessage('Đã xảy ra lỗi khi gửi tin nhắn.', false);
        console.error('Lỗi:', error);
    }
    finally {
        state.isProcessing = false;
    }
};
// Response handler
const handleResponse = async (content) => {
    if (!content) {
        addMessage("[ERROR] - No response from API", false);
        return;
    }
    for (const part of content.parts) {
        if (part.text) {
            addMessage(part.text, content.role === 'user');
        }
        else if (part.functionCall) {
            const { name, args } = part.functionCall;
            const button = document.createElement("button");
            button.className = "function-call-btn";
            button.textContent = `${args.platform ? args.platform + " " : ""}${args.component_name || args.picture || name}`;
            button.onclick = async () => {
                if (name in callbacks) {
                    try {
                        await callbacks[name](args);
                    }
                    catch (err) {
                        console.error(`Lỗi khi gọi hàm ${name}:`, err);
                        addMessage(`Lỗi khi thực thi hàm ${name}`, false);
                    }
                }
                else {
                    addMessage(`Không tìm thấy hàm ${name}`, false);
                }
            };
            const messageDiv = document.createElement("div");
            messageDiv.className = "message ai";
            messageDiv.appendChild(button);
            elements.chatArea.appendChild(messageDiv);
            scrollToBottom();
        }
    }
};
// File input handler
elements.fileInput.addEventListener('change', (e) => {
    const target = e.target;
    const files = Array.from(target.files || []);
    const validFiles = files.filter(file => {
        if (!isValidIPSFile(file)) {
            addMessage(`File "${file.name}" không hợp lệ. Chỉ chấp nhận file .ips`, false);
            return false;
        }
        return true;
    });
    state.clearFiles();
    state.addFiles(validFiles);
    displayFilePreview();
    updateSendButtonState();
    if (validFiles.length === 0) {
        target.value = '';
    }
});
// Event listeners for new page removal
const removeNewPage = () => {
    elements.newPage?.remove();
    elements.sendButton.removeEventListener('click', removeNewPage);
    elements.messageInput.removeEventListener('keypress', handleEnterForNewPage);
};
const handleEnterForNewPage = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !document.getElementById('typingIndicator')) {
        e.preventDefault();
        removeNewPage();
    }
};
if (elements.newPage) {
    elements.sendButton.addEventListener('click', removeNewPage);
    elements.messageInput.addEventListener('keypress', handleEnterForNewPage);
}
// Main event listeners
elements.sendButton.addEventListener('click', sendMessage);
elements.messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !document.getElementById('typingIndicator')) {
        e.preventDefault();
        sendMessage();
    }
});
elements.messageInput.addEventListener('input', updateSendButtonState);
// Initialize
updateSendButtonState();
