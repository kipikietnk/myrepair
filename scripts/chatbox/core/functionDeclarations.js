import utils from "../../utils.js";
import ui from "../../ui.js";
const declare = [
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
const callbacks = {
    showImage: (args) => {
        console.log(args);
        const { folder, picture } = args;
        ui.ChatBoxToggle(false);
        utils.loadImage(folder, picture, picture);
    }
};
export { declare as declareFunction, callbacks };
