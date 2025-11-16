import settings from '../../config/ai.js';
import prompt from '../prompt/setup.js';
import data from '../prompt/data.js';
import { declareFunction } from './functionDeclarations.js';
import { data as diagramData } from '../../main.js';

// Types
interface GeminiConfig {
  baseURL: string;
  model: string;
}

interface FunctionResponse {
  id?: string;
  name: string
  response: any;
}

interface FunctionCall {
  id?: string;
  name: string;
  args: any;
}

interface MessagePart {
  text?: string;
  functionResponse?: FunctionResponse;
  functionCall?: FunctionCall;
}

interface MessageContent {
  role: 'user' | 'model';
  parts: MessagePart[];
}

interface FunctionDeclaration {
  name: string;
  description: string;
  behavior?: any;
  parameters: any;
}

interface Tool {
  functionDeclarations: FunctionDeclaration[]
}

interface RequestBody {
  contents: MessageContent[];
  tools?: Tool[];
}

interface GeminiResponse {
  candidates?: Array<{
    content?: MessageContent;
  }>;
}

export function buildPrompt(data: any[]): string {
  return data
    .map(item => {
      const platform = item.platform;
      const folder = item.folder;
      const components = item.components?.map((c: any) => c.picture).join(", ");
      return `${platform}: ${components} (${folder})`;
    })
    .join(" | ");
}

const diagramPrompt = buildPrompt(diagramData);

console.log(JSON.stringify(diagramData).length, buildPrompt(diagramData).length)
console.log(JSON.stringify(diagramData))
console.log(diagramPrompt)


class Gemini {
  #URL: string;
  history: MessageContent[];
  config: GeminiConfig | null;
  model: string;

  constructor(model: string = settings.model) {
    this.history = [];
    this.config = null;
    this.model = model
    this.#URL = `${settings.baseURL}/${model}:generateContent?key=${settings.apiKey}`;
  }

  async updateApiKey(newAPI: string): Promise<string> {
    const checkURL = `${settings.baseURL}?key=${newAPI}`;
    const checkResponse = await fetch(checkURL);

    if (!checkResponse.ok) {
      const r = await checkResponse.json();
      return `API update failed\n- Status: ${r?.error?.code}\n- Error: ${r?.error?.message}`;
    }
    this.#URL = `${settings.baseURL}/${this.model}:generateContent?key=${newAPI}`
    return 'API key updated successfully';
  }

  async sendMessage(message: string): Promise<GeminiResponse|Error> {
    const body: RequestBody = {
      contents: [
        ...this.history,
        {role: 'user', parts: [{ text: prompt }]},
        {role: 'model', parts: [{ text: `My Data: ${data}` }]},
        {role: 'model', parts: [{ text: `Diagram: ${diagramPrompt}` }]},
        {role: 'user', parts: [{ text: message }]}
      ],
      tools: [{ functionDeclarations: declareFunction }]
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
        const errorJson = await response.json();
        return new Error(errorJson.error.message);
      }

      const resObj: GeminiResponse = await response.json();

      const content = resObj?.candidates?.[0]?.content;
      if (content) {
        this.addToHistory({ role: 'user', parts: [{ text: message }]});
        this.addToHistory(content);
      }

      return resObj
    } catch (error) {
      return new Error(`[Error] - ${(error as Error).message}`);
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
export type { GeminiConfig, MessageContent, MessagePart, GeminiResponse, FunctionDeclaration };