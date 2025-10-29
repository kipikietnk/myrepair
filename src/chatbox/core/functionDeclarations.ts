import { FunctionDeclaration } from "./gemini";
import utils from "../../utils.js";
import ui from "../../ui.js"

type CallbackDefinitions = {
  showImage: {
    args: [args: any];
    return: void;
  };
};

type CallbackMap<T extends Record<string, { args: any[]; return: any }>> = {
  [K in keyof T]: (...args: T[K]['args']) => T[K]['return'];
};

let diagramData: string;
let otherImageData: string;

const declare: FunctionDeclaration[] = [
  {
      name: "showImage",
      description: "Display a diagram image to the user upon request",
      parameters: {
        type: "OBJECT",
        properties: {
          folder: { type: "STRING", description: "Image folder", nullable: false },
          picture: { type: "STRING", description: "picture", nullable: false },
          product: { type: "STRING", description: "product", nullable: true },
          platform: { type: "STRING", description: "platform", nullable: true },
          component_name: { type: "STRING", description: "Component name", nullable: true },
        }
      }
    }
];

const callbacks: CallbackMap<CallbackDefinitions> = {
  showImage: (args) => {
    const { folder, picture, product, platform, component_name } = args;
    ui.ChatBoxToggle();
    utils.loadImage(folder, picture, component_name || 'Diagram Image');
  }
};

export { declare as declareFunction, callbacks };
