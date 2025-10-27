import settings from '../config/settings.js';
import prompt from '../config/prompt.js';
import data from '../config/data.js';
import { declareFunction, diagramData, otherImageData } from './functionDeclarations.js';
class Gemini {
    #URL;
    history;
    config;
    model;
    constructor(model = settings.model) {
        this.history = [];
        this.config = null;
        this.model = model;
        this.#URL = `${settings.baseURL}/${model}:generateContent?key=${settings.apiKey}`;
    }
    async updateApiKey(newAPI) {
        const checkURL = `${settings.baseURL}?key=${newAPI}`;
        const checkResponse = await fetch(checkURL);
        if (!checkResponse.ok) {
            const r = await checkResponse.json();
            return `API update failed\n- Status: ${r?.error?.code}\n- Error: ${r?.error?.message}`;
        }
        this.#URL = `${settings.baseURL}/${this.model}:generateContent?key=${newAPI}`;
        return 'API key updated successfully';
    }
    async sendMessage(message) {
        const body = {
            contents: [
                ...this.history,
                { role: 'user', parts: [{ text: prompt }] },
                { role: 'model', parts: [{ text: `My Data: ${data}` }] },
                { role: 'model', parts: [{ text: `Diagram: ${diagramData || null}` }] },
                { role: 'model', parts: [{ text: `Other Images: ${otherImageData || null}` }] },
                { role: 'user', parts: [{ text: message }] }
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
            const resObj = await response.json();
            const content = resObj?.candidates?.[0]?.content;
            if (content) {
                this.addToHistory({ role: 'user', parts: [{ text: message }] });
                this.addToHistory(content);
            }
            return resObj;
        }
        catch (error) {
            return new Error(`[Error] - ${error.message}`);
        }
    }
    addToHistory(content) {
        if (this.history.length >= settings.maxHistory) {
            this.history.shift();
        }
        this.history.push(content);
    }
    clearHistory() {
        this.history = [];
    }
}
export { Gemini };
