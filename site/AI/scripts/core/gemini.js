import config from '../config/gemini.js';

class Gemini {
    #apiKey;
    constructor(apiKey) {
        this.#apiKey = apiKey;
        this.history = [];
        this.config = null;
        this.URL = `${config.baseURL}/${config.model}:generateMessage?key=${this.#apiKey}`;
    }
}

export { Gemini };