import settings from '../config/settings.js';
import prompt from '../config/prompt.js';
import data from '../config/data.js';
import { declareFunction, diagramData } from './functionDeclarations.js';
class Gemini {
    #apiKey;
    #URL;
    history;
    config;
    constructor(apiKey, model = settings.model) {
        this.#apiKey = apiKey;
        this.history = [];
        this.config = null;
        this.#URL = `${settings.baseURL}/${model}:generateContent?key=${this.#apiKey}`;
    }
    async sendMessage(message) {
        const body = {
            contents: [
                ...this.history,
                { role: 'user', parts: [{ text: prompt }] },
                { role: 'model', parts: [{ text: `My Data: ${data}` }] },
                { role: 'model', parts: [{ text: `Diagram: ${diagramData || null}` }] },
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
                const errorText = await response.text();
                return new Error(`[Error] - ${errorText}. Status: ${response.status}`);
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
