import utils from "../../utils.js";
import ui from "../../ui.js"

type CallbackMap<T extends Record<string, { args: any[]; return: any }>> = {
  [K in keyof T]: (...args: T[K]['args']) => T[K]['return'];
};

type CallbackDefinitions = {
  showImage: {
    args: [args: any];
    return: void;
  };
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