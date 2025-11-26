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

export type { GeminiConfig, MessageContent, MessagePart, GeminiResponse, FunctionDeclaration };