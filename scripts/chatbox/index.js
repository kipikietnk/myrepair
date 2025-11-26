console.log('Chatbox module loaded');
import settings from "../config/ai.js";
import functionDeclarations from "./core/functionDeclarations.js";
import { data as diagramData } from "../main.js";
import elements from "../elements.js";
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
let history = [];
// Main send message function
async function sendMessage() {
    if (state.isProcessing)
        return;
    const text = elements.messageInput.value.trim();
    if (!text && state.selectedFiles.length === 0)
        return;
    state.isProcessing = true;
    addMessage(text, true);
    clearInput();
    showTypingIndicator();
    try {
        const contents = [
            ...history,
            { role: 'model', parts: [{ text: buildDiagramPrompt(diagramData) }] },
            { role: 'user', parts: [{ text }] }
        ];
        const response = await sendRequest(contents);
        if (response?.candidates?.[0]?.content) {
            await handleResponse(response.candidates[0].content);
        }
    }
    catch (error) {
        addMessage('Đã xảy ra lỗi khi gửi tin nhắn.', false);
    }
    finally {
        state.isProcessing = false;
        removeTypingIndicator();
    }
}
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
const scrollToBottom = () => {
    elements.chatArea.scrollTop = elements.chatArea.scrollHeight;
};
function addMessage(text, isUser = false, format = true) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isUser ? 'user' : 'ai'}`;
    const formattedText = (isUser || !format) ? text : formatMessage(text);
    messageDiv.innerHTML = `<div class="message-content">${formattedText}</div>`;
    elements.chatArea.appendChild(messageDiv);
    scrollToBottom();
}
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
function updateSendButtonState() {
    const hasTypingIndicator = !!document.getElementById('typingIndicator');
    const hasContent = elements.messageInput.value.trim() !== '';
    elements.sendButton.disabled = hasTypingIndicator || !hasContent;
}
const clearInput = () => {
    elements.messageInput.value = '';
    updateSendButtonState();
};
// Optimized markdown formatter with regex caching
const REGEX_PATTERNS = {
    escapeHtml: [
        [/&/g, '&amp;'],
        [/</g, '&lt;'],
        [/>/g, '&gt;']
    ],
    codeBlock: /```(\w+)?\n([\s\S]*?)```/g,
    inlineCode: /`([^`]+)`/g,
    image: /!\[([^\]]*)\]\(([^)"]+)(?:\s+"([^"]*)")?\)/g,
    link: /\[([^\]]+)\]\(([^)"]+)(?:\s+"([^"]*)")?\)/g,
    headers: [
        [/^######\s+(.+)$/gm, '<h6>$1</h6>'],
        [/^#####\s+(.+)$/gm, '<h5>$1</h5>'],
        [/^####\s+(.+)$/gm, '<h4>$1</h4>'],
        [/^###\s+(.+)$/gm, '<h3>$1</h3>'],
        [/^##\s+(.+)$/gm, '<h2>$1</h2>'],
        [/^#\s+(.+)$/gm, '<h1>$1</h1>']
    ],
    hr: /^(\*\*\*|---|___)$/gm,
    boldItalic: /(\*\*\*|___)(?=\S)(.+?)(?<=\S)\1/g,
    bold: /(\*\*|__)(?=\S)(.+?)(?<=\S)\1/g,
    italic: /(\*|_)(?=\S)(.+?)(?<=\S)\1/g,
    strikethrough: /~~(?=\S)(.+?)(?<=\S)~~/g,
    blockquote: /^>\s+(.+)$/gm,
    blockquoteMerge: /(<\/blockquote>\n<blockquote>)/g,
    unorderedList: /^[\*\-\+]\s+(.+)$/gm,
    orderedList: /^\d+\.\s+(.+)$/gm,
    taskList: [
        [/<li>\[\s\]\s+(.+)<\/li>/g, '<li><input type="checkbox" disabled> $1</li>'],
        [/<li>\[x\]\s+(.+)<\/li>/gi, '<li><input type="checkbox" checked disabled> $1</li>']
    ],
    table: /^\|(.+)\|$/gm,
    lineBreak: /  \n/g
};
function formatMessage(markdown) {
    let html = markdown;
    // Escape HTML
    for (const [pattern, replacement] of REGEX_PATTERNS.escapeHtml) {
        html = html.replace(pattern, replacement);
    }
    // Code blocks
    html = html.replace(REGEX_PATTERNS.codeBlock, (_, lang, code) => {
        const language = lang ? ` class="language-${lang}"` : '';
        return `<pre><code${language}>${code.trim()}</code></pre>`;
    });
    // Inline code
    html = html.replace(REGEX_PATTERNS.inlineCode, '<code>$1</code>');
    // Images
    html = html.replace(REGEX_PATTERNS.image, (_, alt, url, title) => {
        const titleAttr = title ? ` title="${title}"` : '';
        return `<img src="${url}" alt="${alt}"${titleAttr}>`;
    });
    // Links
    html = html.replace(REGEX_PATTERNS.link, (_, text, url, title) => {
        const titleAttr = title ? ` title="${title}"` : '';
        return `<a href="${url}"${titleAttr}>${text}</a>`;
    });
    // Headers (largest to smallest to avoid partial matches)
    for (const [pattern, replacement] of REGEX_PATTERNS.headers) {
        html = html.replace(pattern, replacement);
    }
    // Horizontal rules
    html = html.replace(REGEX_PATTERNS.hr, '<hr>');
    // Bold + Italic, Bold, Italic (order matters)
    html = html.replace(REGEX_PATTERNS.boldItalic, '<strong><em>$2</em></strong>');
    html = html.replace(REGEX_PATTERNS.bold, '<strong>$2</strong>');
    html = html.replace(REGEX_PATTERNS.italic, '<em>$2</em>');
    // Strikethrough
    html = html.replace(REGEX_PATTERNS.strikethrough, '<del>$1</del>');
    // Blockquotes
    html = html.replace(REGEX_PATTERNS.blockquote, '<blockquote>$1</blockquote>');
    html = html.replace(REGEX_PATTERNS.blockquoteMerge, '\n');
    // Lists
    html = html.replace(REGEX_PATTERNS.unorderedList, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
    html = html.replace(REGEX_PATTERNS.orderedList, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>)/s, (match) => match.includes('<ul>') ? match : `<ol>${match}</ol>`);
    // Task lists
    for (const [pattern, replacement] of REGEX_PATTERNS.taskList) {
        html = html.replace(pattern, replacement);
    }
    // Tables
    html = html.replace(REGEX_PATTERNS.table, (match) => {
        const cells = match.split('|').filter(cell => cell.trim());
        const isHeaderSeparator = cells.every(cell => /^[\s\-:]+$/.test(cell));
        if (isHeaderSeparator)
            return '<!--SEPARATOR-->';
        const cellTags = cells.map(cell => `<td>${cell.trim()}</td>`).join('');
        return `<tr>${cellTags}</tr>`;
    });
    html = html.replace(/<tr>(.*?)<\/tr>\s*<!--SEPARATOR-->/g, (_, cells) => {
        const headerCells = cells.replace(/<td>/g, '<th>').replace(/<\/td>/g, '</th>');
        return `<thead><tr>${headerCells}</tr></thead><tbody>`;
    });
    html = html.replace(/(<thead>[\s\S]*?<\/thead><tbody>[\s\S]*?)(<tr>[\s\S]*?<\/tr>)/g, (match) => {
        if (!match.includes('</tbody>')) {
            return match.replace(/(<tr>.*<\/tr>)(?![\s\S]*<tr>)/, '$1</tbody>');
        }
        return match;
    });
    html = html.replace(/(<thead>[\s\S]*?<\/tbody>)/g, '<table>$1</table>');
    // Line breaks
    html = html.replace(REGEX_PATTERNS.lineBreak, '<br>\n');
    // Paragraphs - optimized processing
    const lines = html.split('\n');
    const processed = [];
    let paragraphContent = '';
    const isBlockElement = (line) => /^<(h[1-6]|hr|pre|blockquote|ul|ol|table|thead|tbody|tr|li)/.test(line) ||
        /^<\/(ul|ol|blockquote|table|thead|tbody)>/.test(line);
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) {
            if (paragraphContent) {
                processed.push(`<p>${paragraphContent.trim()}</p>`);
                paragraphContent = '';
            }
            continue;
        }
        if (isBlockElement(trimmed)) {
            if (paragraphContent) {
                processed.push(`<p>${paragraphContent.trim()}</p>`);
                paragraphContent = '';
            }
            processed.push(trimmed);
        }
        else {
            paragraphContent += (paragraphContent ? ' ' : '') + trimmed;
        }
    }
    if (paragraphContent.trim()) {
        processed.push(`<p>${paragraphContent.trim()}</p>`);
    }
    html = processed.join('\n');
    // Cleanup
    html = html.replace(/<!--SEPARATOR-->/g, '');
    html = html.replace(/\n{3,}/g, '\n\n');
    return html.trim();
}
// Handle API requests
async function sendRequest(contents, model = settings.model, saveHistory = true) {
    try {
        const response = await fetch(settings.API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents, model })
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const resObj = await response.json();
        if (saveHistory) {
            const content = resObj?.candidates?.[0]?.content;
            if (content) {
                addToHistory(contents[contents.length - 1]);
                addToHistory(content);
            }
        }
        return resObj;
    }
    catch (error) {
        return error instanceof Error
            ? { candidates: [{ content: { role: 'model', parts: [{ text: error.message }] } }] }
            : { candidates: [{ content: { role: 'model', parts: [{ text: "No Response" }] } }] };
    }
}
function addToHistory(content) {
    history.push(content);
    if (history.length > settings.maxHistory) {
        history.shift();
    }
}
const handleResponse = async (content) => {
    if (!content)
        return;
    for (const part of content.parts) {
        if (part.text) {
            addMessage(part.text, content.role === 'user');
        }
        else if (part.functionCall) {
            const { name, args } = part.functionCall;
            const callback = functionDeclarations[name];
            if (typeof callback === 'function') {
                callback(args);
            }
            else {
                addMessage(`[ERROR] - No callback found for function: ${name}`, false);
            }
        }
        scrollToBottom();
    }
};
function buildDiagramPrompt(data) {
    return data
        .map(item => {
        const components = item.components?.map((c) => c.picture).join(", ") || "";
        return `${item.platform}: ${components} (${item.folder})`;
    })
        .join(" | ");
}
