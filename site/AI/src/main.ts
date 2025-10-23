import { Gemini } from "./core/gemini.js";
import { callbacks } from "./core/functionDeclarations.js";
import { MessageContent } from "./core/gemini.js";
import settings from "./config/settings.js";

// Types
interface FileContent {
  name: string;
  content: string;
  size: number;
}

interface GeminiResponse {
  parts?: Array<{ text?: string }>;
  error?: string;
}

// Constants
const IPS_EXTENSION = '.ips';
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB limit

// Gemini instance
const gemini = new Gemini();

// State management
class AppState {
  selectedFiles: File[] = [];
  isProcessing = false;

  addFiles(files: File[]): void {
    this.selectedFiles.push(...files);
  }

  clearFiles(): void {
    this.selectedFiles = [];
  }

  removeFile(index: number): void {
    this.selectedFiles.splice(index, 1);
  }
}

const state = new AppState();

// DOM Elements - cached for performance
const elements = {
  chatArea: document.getElementById('chatArea') as HTMLDivElement,
  messageInput: document.getElementById('messageInput') as HTMLTextAreaElement,
  sendButton: document.getElementById('sendButton') as HTMLButtonElement,
  fileInput: document.getElementById('fileInput') as HTMLInputElement,
  filePreview: document.getElementById('filePreview') as HTMLDivElement,
  newPage: document.getElementById('new') as HTMLDivElement,
};

// Validation functions
const isValidIPSFile = (file: File): boolean => file.name.toLowerCase().endsWith(IPS_EXTENSION);

const validateIPSFormat = (content: string): { valid: boolean; error?: string } => {
  if (!content?.trim()) {
    return { valid: false, error: 'File rỗng hoặc không có nội dung' };
  }
  return { valid: true };
};

// File processing
const processIPSContent = (content: string): string => content.replace(/\\n/g, "\n");

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const readFileContent = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (file.size > MAX_FILE_SIZE) {
      reject(new Error(`File "${file.name}" quá lớn (tối đa 10MB)`));
      return;
    }

    const reader = new FileReader();
    reader.onload = (e: ProgressEvent<FileReader>) => {
      const content = e.target?.result as string;
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
const displayFilePreview = (): void => {
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
elements.filePreview.addEventListener('click', (e: Event) => {
  const target = e.target as HTMLElement;
  if (target.classList.contains('remove-file')) {
    const index = parseInt(target.dataset.index || '0');
    state.removeFile(index);
    displayFilePreview();
    updateSendButtonState();
  }
});

// Message formatting
interface FormatRule {
  regex: RegExp;
  replacement: string | ((...args: any[]) => string);
}

const formatRules: FormatRule[] = [
  {
    regex: /```(\w+)?\n([\s\S]*?)```/g,
    replacement: (_: string, lang: string, code: string) => {
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

const escapeHTML = (text: string): string => 
  text.replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

const formatMessage = (text: string): string => {
  if (!text) return '';

  let formatted = escapeHTML(text);
  
  for (const rule of formatRules) {
    formatted = formatted.replace(rule.regex, rule.replacement as any);
  }

  return formatted.startsWith('<') ? formatted : `<p>${formatted}</p>`;
};

// UI functions
const scrollToBottom = (): void => {
  elements.chatArea.scrollTop = elements.chatArea.scrollHeight;
};

const addMessage = (text: string, isUser = false, files: File[] = [], format = true): void => {
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

const showTypingIndicator = (): void => {
  if (document.getElementById('typingIndicator')) return;

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

const removeTypingIndicator = (): void => {
  document.getElementById('typingIndicator')?.remove();
  updateSendButtonState();
};

const updateSendButtonState = (): void => {
  const hasTypingIndicator = !!document.getElementById('typingIndicator');
  const hasContent = elements.messageInput.value.trim() !== '' || state.selectedFiles.length > 0;
  elements.sendButton.disabled = hasTypingIndicator || !hasContent;
};

const clearInput = (): void => {
  elements.messageInput.value = '';
  state.clearFiles();
  elements.filePreview.innerHTML = '';
  elements.fileInput.value = '';
  updateSendButtonState();
};

// Main send message function
const sendMessage = async (): Promise<void> => {
  if (state.isProcessing) return;

  const text = elements.messageInput.value.trim();
  if (!text && state.selectedFiles.length === 0) return;

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
  const fileContents: FileContent[] = [];
  for (const file of state.selectedFiles) {
    try {
      const content = await readFileContent(file);
      fileContents.push({ name: file.name, content, size: file.size });
    } catch (error) {
      addMessage(`Lỗi xử lý file: ${(error as Error).message}`, false);
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
    } else {
      await handleResponse(response.candidates?.[0].content);
    }
  } catch (error) {
    removeTypingIndicator();
    addMessage('Đã xảy ra lỗi khi gửi tin nhắn.', false);
    console.error('Lỗi:', error);
  } finally {
    state.isProcessing = false;
  }
};

// Response handler
const handleResponse = async (content: MessageContent | void): Promise<void> => {
  if (!content) {
    addMessage("[ERROR] - No response from API", false);
    return;
  }

  for (const part of content.parts) {
    if (part.text) {
      addMessage(part.text, content.role === 'user');
    } else if (part.functionCall) {
      const { name, args } = part.functionCall;

      const button = document.createElement("button");
      button.className = "function-call-btn";
      button.textContent = `${args.platform ? args.platform + " " : ""}${args.component_name || args.picture || name}`;
      button.onclick = async () => {
        if (name in callbacks) {
          try {
            await (callbacks as any)[name](args);
          } catch (err) {
            console.error(`Lỗi khi gọi hàm ${name}:`, err);
            addMessage(`Lỗi khi thực thi hàm ${name}`, false);
          }
        } else {
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
elements.fileInput.addEventListener('change', (e: Event) => {
  const target = e.target as HTMLInputElement;
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
const removeNewPage = (): void => {
  elements.newPage?.remove();
  elements.sendButton.removeEventListener('click', removeNewPage);
  elements.messageInput.removeEventListener('keypress', handleEnterForNewPage);
};

const handleEnterForNewPage = (e: KeyboardEvent): void => {
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

elements.messageInput.addEventListener('keypress', (e: KeyboardEvent) => {
  if (e.key === 'Enter' && !e.shiftKey && !document.getElementById('typingIndicator')) {
    e.preventDefault();
    sendMessage();
  }
});

elements.messageInput.addEventListener('input', updateSendButtonState);

// Initialize
updateSendButtonState();