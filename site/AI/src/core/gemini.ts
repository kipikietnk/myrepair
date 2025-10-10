import settings from '../config/settings.js';
import prompt from '../config/prompt.js';
import data from '../config/data.js';

// Types
interface GeminiConfig {
  baseURL: string;
  model: string;
}

interface MessagePart {
  text: string;
}

interface MessageContent {
  role: 'user' | 'model';
  parts: MessagePart[];
}

interface RequestBody {
  contents: MessageContent[];
}

interface GeminiResponse {
  candidates?: Array<{
    content?: MessageContent;
  }>;
}

class Gemini {
  #apiKey: string;
  #URL: string;
  history: MessageContent[];
  config: GeminiConfig | null;

  constructor(apiKey: string, model: string = settings.model) {
    this.#apiKey = apiKey;
    this.history = [];
    this.config = null;
    this.#URL = `${settings.baseURL}/${model}:generateContent?key=${this.#apiKey}`;
  }

  async sendMessage(message: string): Promise<MessageContent> {
    const body: RequestBody = {
      contents: [
        ...this.history,
        {
          role: 'user',
          parts: [{ text: prompt }]
        },
        {
          role: 'model',
          parts: [{ text: `My Data: ${data}` }]
        },
        {
          role: 'user',
          parts: [
            { text: message }
          ]
        }
      ]
    };

    try {
      const response = await fetch(this.#URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          role: 'model',
          parts: [{ text: `[Error] - ${errorText}. Status: ${response.status}` }]
        };
      }

      const resObj: GeminiResponse = await response.json();

      const content = resObj?.candidates?.[0]?.content;
      if (content) {
        this.addToHistory({ role: 'user', parts: [{ text: message }]});
        this.addToHistory(content);
      }

      return resObj?.candidates?.[0]?.content || {
        role: 'model',
        parts: [{ text: '[Error] - No response from API' }]
      };
    } catch (error) {
      return {
        role: 'model',
        parts: [{ text: `[Error] - ${(error as Error).message}` }]
      };
    }
  }

  addToHistory(content: MessageContent): void {
    if (this.history.length >= settings.maxHistory) {
      this.history.shift();
    }
    this.history.push(content);
  }

  clearHistory(): void {
    this.history = [];
  }
}

export { Gemini };
export type { GeminiConfig, MessageContent, MessagePart, GeminiResponse };