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


const callbacks: CallbackMap<CallbackDefinitions> = {
  showImage: (args) => {
    console.log(args);
    const { folder, picture } = args;
    ui.ChatBoxToggle(false);
    utils.loadImage(folder, picture, picture);
  }
};

export default callbacks;