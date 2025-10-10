import config from '../config/gemini.js';
import prompt from '../config/prompt.js';
import data from '../config/data.js';
class Gemini {
    #apiKey;
    #URL;
    history;
    config;
    constructor(apiKey, model = config.model) {
        this.#apiKey = apiKey;
        this.history = [];
        this.config = null;
        this.#URL = `${config.baseURL}/${model}:generateContent?key=${this.#apiKey}`;
    }
    async sendMessage(message) {
        const body = {
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
            const resObj = await response.json();
            return resObj?.candidates?.[0]?.content || {
                role: 'model',
                parts: [{ text: '[Error] - No response from API' }]
            };
        }
        catch (error) {
            return {
                role: 'model',
                parts: [{ text: `[Error] - ${error.message}` }]
            };
        }
    }
    addToHistory(content) {
        this.history.push(content);
    }
    clearHistory() {
        this.history = [];
    }
    getHistory() {
        return [...this.history];
    }
    setConfig(newConfig) {
        this.config = { ...config, ...newConfig };
    }
}
export { Gemini };
