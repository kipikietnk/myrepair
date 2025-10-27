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
const IPS_EXTENSION = ['.ips', '.txt'];
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
const isValidIPSFile = (file: File): boolean => {
  return IPS_EXTENSION.some(ext => file.name.toLowerCase().endsWith(ext));
}
  
  //file.name.toLowerCase().endsWith();

const validateIPSFormat = (content: string): { valid: boolean; error?: string } => {
  if (!content?.trim()) {
    return { valid: false, error: 'File rỗng hoặc không có nội dung' };
  }
  return { valid: true };
};

// File processing
function processIPSContent(content: string): string {
  const lines = content.split('\n');
  const panicString = lines.find(line => line.includes('panicString'));
  const panicInfo = panicString?.split('\\n')?.[0].trim();

  console.log('Panic Info:', panicInfo);

  return panicInfo ? `Panic Log: ${panicInfo}` : "Void";
}

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
function formatMessage(markdown: string): string {
  let html = markdown;

  // 1. Escape HTML đặc biệt trước khi xử lý
  html = html.replace(/&/g, '&amp;')
             .replace(/</g, '&lt;')
             .replace(/>/g, '&gt;');

  // 2. Code blocks (```language\ncode\n```)
  html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, (_, lang, code) => {
    const language = lang ? ` class="language-${lang}"` : '';
    return `<pre><code${language}>${code.trim()}</code></pre>`;
  });

  // 3. Inline code (`code`)
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  // 4. Images (![alt](url "title"))
  html = html.replace(/!\[([^\]]*)\]\(([^)"]+)(?:\s+"([^"]*)")?\)/g, (_, alt, url, title) => {
    const titleAttr = title ? ` title="${title}"` : '';
    return `<img src="${url}" alt="${alt}"${titleAttr}>`;
  });

  // 5. Links ([text](url "title"))
  html = html.replace(/\[([^\]]+)\]\(([^)"]+)(?:\s+"([^"]*)")?\)/g, (_, text, url, title) => {
    const titleAttr = title ? ` title="${title}"` : '';
    return `<a href="${url}"${titleAttr}>${text}</a>`;
  });

  // 6. Headers (# H1, ## H2, etc.)
  html = html.replace(/^######\s+(.+)$/gm, '<h6>$1</h6>');
  html = html.replace(/^#####\s+(.+)$/gm, '<h5>$1</h5>');
  html = html.replace(/^####\s+(.+)$/gm, '<h4>$1</h4>');
  html = html.replace(/^###\s+(.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^##\s+(.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^#\s+(.+)$/gm, '<h1>$1</h1>');

  // 7. Horizontal rules (---, ***, ___)
  html = html.replace(/^(\*\*\*|---|___)$/gm, '<hr>');

  // 8. Bold + Italic (***text*** hoặc ___text___)
  html = html.replace(/(\*\*\*|___)(?=\S)(.+?)(?<=\S)\1/g, '<strong><em>$2</em></strong>');

  // 9. Bold (**text** hoặc __text__)
  html = html.replace(/(\*\*|__)(?=\S)(.+?)(?<=\S)\1/g, '<strong>$2</strong>');

  // 10. Italic (*text* hoặc _text_)
  html = html.replace(/(\*|_)(?=\S)(.+?)(?<=\S)\1/g, '<em>$2</em>');

  // 11. Strikethrough (~~text~~)
  html = html.replace(/~~(?=\S)(.+?)(?<=\S)~~/g, '<del>$1</del>');

  // 12. Blockquotes (> text)
  html = html.replace(/^>\s+(.+)$/gm, '<blockquote>$1</blockquote>');
  // Gộp blockquotes liên tiếp
  html = html.replace(/(<\/blockquote>\n<blockquote>)/g, '\n');

  // 13. Unordered lists (-, *, +)
  html = html.replace(/^[\*\-\+]\s+(.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>)/s, (match) => {
    return `<ul>${match}</ul>`;
  });

  // 14. Ordered lists (1. item)
  html = html.replace(/^\d+\.\s+(.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>)/s, (match) => {
    // Kiểm tra xem có phải là unordered list không
    if (!match.includes('<ul>')) {
      return `<ol>${match}</ol>`;
    }
    return match;
  });

  // 15. Task lists (- [ ] todo, - [x] done)
  html = html.replace(/<li>\[\s\]\s+(.+)<\/li>/g, '<li><input type="checkbox" disabled> $1</li>');
  html = html.replace(/<li>\[x\]\s+(.+)<\/li>/gi, '<li><input type="checkbox" checked disabled> $1</li>');

  // 16. Tables
  html = html.replace(/^\|(.+)\|$/gm, (match) => {
    const cells = match.split('|').filter(cell => cell.trim());
    const isHeaderSeparator = cells.every(cell => /^[\s\-:]+$/.test(cell));
    
    if (isHeaderSeparator) {
      return '<!--SEPARATOR-->';
    }
    
    const cellTags = cells.map(cell => `<td>${cell.trim()}</td>`).join('');
    return `<tr>${cellTags}</tr>`;
  });

  // Chuyển dòng đầu tiên thành header
  html = html.replace(/<tr>(.*?)<\/tr>\s*<!--SEPARATOR-->/g, (_, cells) => {
    const headerCells = cells.replace(/<td>/g, '<th>').replace(/<\/td>/g, '</th>');
    return `<thead><tr>${headerCells}</tr></thead><tbody>`;
  });

  // Wrap table và đóng tbody
  html = html.replace(/(<thead>[\s\S]*?<\/thead><tbody>[\s\S]*?)(<tr>[\s\S]*?<\/tr>)/g, (match) => {
    if (!match.includes('</tbody>')) {
      return match.replace(/(<tr>.*<\/tr>)(?![\s\S]*<tr>)/, '$1</tbody>');
    }
    return match;
  });

  html = html.replace(/(<thead>[\s\S]*?<\/tbody>)/g, '<table>$1</table>');

  // 17. Line breaks (2 spaces + newline hoặc <br>)
  html = html.replace(/  \n/g, '<br>\n');

  // 18. Paragraphs - wrap text không có tag trong <p>
  const lines = html.split('\n');
  const processed: string[] = [];
  let inParagraph = false;
  let paragraphContent = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Bỏ qua dòng trống
    if (!line) {
      if (inParagraph) {
        processed.push(`<p>${paragraphContent.trim()}</p>`);
        paragraphContent = '';
        inParagraph = false;
      }
      continue;
    }

    // Kiểm tra xem dòng có phải là block element không
    const isBlockElement = /^<(h[1-6]|hr|pre|blockquote|ul|ol|table|thead|tbody|tr|li)/.test(line);
    const isClosingBlock = /^<\/(ul|ol|blockquote|table|thead|tbody)>/.test(line);

    if (isBlockElement || isClosingBlock) {
      if (inParagraph) {
        processed.push(`<p>${paragraphContent.trim()}</p>`);
        paragraphContent = '';
        inParagraph = false;
      }
      processed.push(line);
    } else {
      if (inParagraph) {
        paragraphContent += ' ' + line;
      } else {
        paragraphContent = line;
        inParagraph = true;
      }
    }
  }

  // Đóng paragraph cuối cùng nếu còn
  if (inParagraph && paragraphContent.trim()) {
    processed.push(`<p>${paragraphContent.trim()}</p>`);
  }

  html = processed.join('\n');

  // 19. Cleanup - xóa các comment và khoảng trắng thừa
  html = html.replace(/<!--SEPARATOR-->/g, '');
  html = html.replace(/\n{3,}/g, '\n\n');

  return html.trim();
}

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
  addMessage(text || 'Đã gửi tệp', true, state.selectedFiles);

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
    addMessage(file.content);
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