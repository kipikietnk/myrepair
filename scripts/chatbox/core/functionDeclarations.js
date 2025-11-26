import utils from "../../utils.js";
import ui from "../../ui.js";
const callbacks = {
    showImage: (args) => {
        console.log(args);
        const { folder, picture } = args;
        ui.ChatBoxToggle(false);
        utils.loadImage(folder, picture, picture);
    }
};
export default callbacks;
