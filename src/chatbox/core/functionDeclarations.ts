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

const declare: FunctionDeclaration[] = [];

const callbacks: CallbackMap<CallbackDefinitions> = {
  showImage: (args) => {
    const { folder, picture, product, platform, component_name } = args;
    ui.ChatBoxToggle();
    utils.loadImage(folder, picture, component_name || 'Diagram Image');
  }
};

(async function() {
  const r = await fetch("../../assets/diagram.json");
  if (r.status === 200) {
    declare.push({
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
    });

    diagramData = await r.text();
  } else {
    console.error("Load Diagram Fail:", r.status, r.statusText);
  }

  const otherR = await fetch("../../assets/images/other/data.json");
  if (otherR.status === 200) {
    otherImageData = await otherR.text();
  } else {
    console.error("Load Other Images Fail:", otherR.status, otherR.statusText);
  }
})();

export { declare as declareFunction, callbacks, diagramData, otherImageData };
