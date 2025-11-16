import { FunctionDeclaration } from "./gemini";
import utils from "../../utils.js";
import ui from "../../ui.js"
import { data as diagramData } from "../../main.js";

type CallbackDefinitions = {
  showImage: {
    args: [args: any];
    return: void;
  };
};

type CallbackMap<T extends Record<string, { args: any[]; return: any }>> = {
  [K in keyof T]: (...args: T[K]['args']) => T[K]['return'];
};

const declare: FunctionDeclaration[] = [
  {
      name: "showImage",
      description: "Display a diagram image to the user upon request",
      parameters: {
        type: "OBJECT",
        properties: {
          folder: { type: "STRING", description: "Image folder", nullable: false },
          picture: { type: "STRING", description: "picture", nullable: false }
        }
      }
    }
];

const callbacks: CallbackMap<CallbackDefinitions> = {
  showImage: (args) => {
    console.log(args);
    const { folder, picture } = args;
    ui.ChatBoxToggle(false);
    utils.loadImage(folder, picture, picture);
  }
};

export { declare as declareFunction, callbacks };
