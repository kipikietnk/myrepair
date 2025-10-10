import config from '../config/gemini.js';
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

  constructor(apiKey: string, model: string = config.model) {
    this.#apiKey = apiKey;
    this.history = [];
    this.config = null;
    this.#URL = `${config.baseURL}/${model}:generateContent?key=${this.#apiKey}`;
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
    this.history.push(content);
  }

  clearHistory(): void {
    this.history = [];
  }

  getHistory(): MessageContent[] {
    return [...this.history];
  }

  setConfig(newConfig: Partial<GeminiConfig>): void {
    this.config = { ...config, ...newConfig };
  }
}

export { Gemini };
export type { GeminiConfig, MessageContent, MessagePart, GeminiResponse };