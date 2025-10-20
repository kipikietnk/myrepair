import { Gemini } from "./core/gemini.js";
import { callbacks } from "./core/functionDeclarations.js";
// Khởi tạo Gemini
const gemini = new Gemini();
// Quản lý file đã chọn
let selectedFiles = [];
let fileContents = [];
const chatArea = document.getElementById('chatArea');
const messageInput = document.getElementById('messageInput');
const sendButton = document.getElementById('sendButton');
const fileInput = document.getElementById('fileInput');
const filePreview = document.getElementById('filePreview');
const newPage = document.getElementById('new');
const menuContainer = document.querySelector(".menu-container");
const menuButton = document.getElementById("menuButton");
menuButton.addEventListener("click", () => {
    menuContainer.classList.toggle("active");
});
// Kiểm tra file có phải .ips không
function isValidIPSFile(file) {
    const fileName = file.name.toLowerCase();
    return fileName.endsWith('.ips');
}
// Kiểm tra định dạng nội dung file .ips
function validateIPSFormat(content) {
    if (!content || content.trim().length === 0) {
        return { valid: false, error: 'File rỗng hoặc không có nội dung' };
    }
    return { valid: true };
}
// Hàm xử lý nội dung file .ips (lọc, tách văn bản, v.v)
function processIPSContent(content) {
    let processedContent = content;
    processedContent = processedContent.replace(/\\n/g, "\n");
    // Chưa có tệp panic-full để phân tích
    return processedContent;
}
// Xử lý chọn file
fileInput.addEventListener('change', (e) => {
    const target = e.target;
    const files = Array.from(target.files || []);
    // Lọc chỉ file .ips
    const validFiles = files.filter(file => {
        if (!isValidIPSFile(file)) {
            alert(`File "${file.name}" không hợp lệ. Chỉ chấp nhận file .ips`);
            return false;
        }
        return true;
    });
    selectedFiles = validFiles;
    displayFilePreview();
    // Reset input nếu không có file hợp lệ
    if (validFiles.length === 0) {
        target.value = '';
    }
});
// Hiển thị preview file
function displayFilePreview() {
    filePreview.innerHTML = '';
    selectedFiles.forEach((file, index) => {
        const preview = document.createElement('div');
        preview.className = 'file-preview';
        preview.innerHTML = `
      <div class="file-preview-name">
        <span>📄</span>
        <span>${file.name}</span>
        <span style="color: #666;">(${formatFileSize(file.size)})</span>
      </div>
      <button class="remove-file" onclick="removeFile(${index})">✕</button>
    `;
        filePreview.appendChild(preview);
    });
}
// Xóa file
window.removeFile = function (index) {
    selectedFiles.splice(index, 1);
    displayFilePreview();
};
// Format kích thước file
function formatFileSize(bytes) {
    if (bytes < 1024)
        return bytes + ' B';
    if (bytes < 1024 * 1024)
        return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}
// Đọc nội dung file
async function readFileContent(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target?.result;
            // Kiểm tra định dạng file .ips
            const validation = validateIPSFormat(content);
            if (!validation.valid) {
                reject(new Error(`File "${file.name}" không đúng định dạng .ips: ${validation.error}`));
                return;
            }
            // Xử lý nội dung file .ips
            const processedContent = processIPSContent(content);
            resolve(processedContent);
        };
        reader.onerror = (e) => reject(e);
        reader.readAsText(file);
    });
}
const formatRegex = [
    {
        regex: /```(\w+)?\n([\s\S]*?)```/g, replacement: (match, lang, code) => {
            const language = lang ? lang.toUpperCase() : 'CODE';
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
    { regex: /\[([^\]]+)\]\(([^)]+)\)/g, replacement: '<a href="$2" target="_blank">$1</a>' },
    { regex: /^&gt; (.+)$/gm, replacement: '<blockquote>$1</blockquote>' },
    { regex: /^---$/gm, replacement: '<hr>' },
    { regex: /^\*\*\*$/gm, replacement: '<hr>' },
    { regex: /^\* (.+)$/gm, replacement: '<ul><li>$1</li></ul>' },
    { regex: /^- (.+)$/gm, replacement: '<ul><li>$1</li></ul>' },
    { regex: /^\d+\. (.+)$/gm, replacement: '<ol><li>$1</li></ol>' },
    { regex: /<\/ul>\s*<ul>/g, replacement: '' },
    { regex: /<\/ol>\s*<ol>/g, replacement: '' },
    { regex: /  \n/g, replacement: '<br>' },
    { regex: /\n\n/g, replacement: '</p><p>' },
    { regex: /\n/g, replacement: '<br>' },
];
function formatMessage(text) {
    if (!text)
        return '';
    let formatted = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    for (const rule of formatRegex) {
        formatted = formatted.replace(rule.regex, rule.replacement);
    }
    if (!formatted.startsWith('<')) {
        formatted = '<p>' + formatted + '</p>';
    }
    return formatted;
}
function addMessage(text, isUser, files = [], format = true) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isUser ? 'user' : 'ai'}`;
    let fileHTML = '';
    if (files.length > 0) {
        fileHTML = files.map((f) => `<div class="file-attachment">${f.name} - ${formatFileSize(f.size)}</div>`).join('');
    }
    const formattedText = (isUser || !format) ? text : formatMessage(text);
    messageDiv.innerHTML = `
    <div class="message-content">
      ${formattedText}
      ${fileHTML}
    </div>
  `;
    chatArea.appendChild(messageDiv);
    chatArea.scrollTop = chatArea.scrollHeight;
}
function showTypingIndicator() {
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
    chatArea.appendChild(indicator);
    chatArea.scrollTop = chatArea.scrollHeight;
    sendButton.disabled = true;
}
function removeTypingIndicator() {
    const indicator = document.getElementById('typingIndicator');
    if (indicator)
        indicator.remove();
    sendButton.disabled = messageInput.value.trim() === '' && selectedFiles.length === 0;
}
async function sendMessage() {
    const text = messageInput.value.trim();
    if (!text && selectedFiles.length === 0)
        return;
    if (text.startsWith('--api')) {
        const newAPI = text.replace('--api', '').trim();
        const result = await gemini.updateApiKey(newAPI);
        addMessage(result);
        ClearInput();
        return;
    }
    addMessage(text || '(Đã gửi file .ips)', true, selectedFiles);
    const fileContents = [];
    for (const file of selectedFiles) {
        try {
            const content = await readFileContent(file);
            fileContents.push({
                name: file.name,
                content: content,
                size: file.size
            });
        }
        catch (error) {
            console.error('Lỗi đọc file:', error);
            addMessage(`Lỗi xử lý file "${file.name}": ${error.message}`, false);
            return;
        }
    }
    if (fileContents.length > 0) {
        fileContents.forEach(file => {
            gemini.addToHistory({ role: 'user', parts: [{ text: `File: ${file.name}\nNội dung:\n${file.content}` }] });
        });
    }
    // Clear input
    ClearInput();
    showTypingIndicator();
    try {
        const response = await gemini.sendMessage(text);
        removeTypingIndicator();
        if (response instanceof Error) {
            addMessage(response.message, false, undefined, false);
        }
        else {
            ResponseHandler(response.candidates?.[0].content);
        }
    }
    catch (error) {
        removeTypingIndicator();
        addMessage('Đã xảy ra lỗi khi gửi tin nhắn.');
        console.error('Lỗi:', error);
    }
}
function ClearInput() {
    messageInput.value = '';
    selectedFiles = [];
    filePreview.innerHTML = '';
    fileInput.value = '';
}
async function ResponseHandler(content) {
    if (!content)
        return addMessage("[ERROR] - No response from API");
    for (const part of content.parts) {
        if (part.text) {
            addMessage(part.text, content.role === 'user');
        }
        else if (part.functionCall) {
            const { name, args } = part.functionCall;
            const button = document.createElement("button");
            button.className = "function-call-btn";
            button.textContent = `${args.platform ? args.platform + " " : ""}${(args.component_name || args.picture)}`;
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
            chatArea.appendChild(messageDiv);
            chatArea.scrollTop = chatArea.scrollHeight;
        }
    }
}
// Event listeners
sendButton.addEventListener('click', sendMessage);
messageInput.addEventListener('keypress', (e) => {
    const indicator = document.getElementById('typingIndicator');
    if (e.key === 'Enter' && !e.shiftKey && !indicator) {
        e.preventDefault();
        sendMessage();
    }
});
messageInput.addEventListener('input', () => {
    const indicator = document.getElementById('typingIndicator');
    if (indicator) {
        sendButton.disabled = true;
    }
    else {
        sendButton.disabled = messageInput.value.trim() === '' && selectedFiles.length === 0;
    }
});
let removeInfo = () => {
    newPage.remove();
    sendButton.removeEventListener('click', removeInfo);
};
sendButton.addEventListener('click', removeInfo);
