import utils from "../../utils.js";
import ui from "../../ui.js";
let diagramData;
let otherImageData;
const declare = [
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
const callbacks = {
    showImage: (args) => {
        const { folder, picture, product, platform, component_name } = args;
        ui.ChatBoxToggle();
        utils.loadImage(folder, picture, component_name || 'Diagram Image');
    }
};
export { declare as declareFunction, callbacks };
