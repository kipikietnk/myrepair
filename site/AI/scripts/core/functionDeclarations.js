let diagramData;
let otherImageData;
const declare = [];
const callbacks = {
    showImage: (args) => {
        const { folder, picture, product, platform, component_name } = args;
        const imageUrl = `../diagram/assets/${folder}/${picture}`;
        // --- Tạo modal ---
        const modal = document.createElement("div");
        modal.className = "image-modal";
        modal.innerHTML = `
      <div class="image-modal-backdrop"></div>
      <div class="image-modal-content">
        <div class="image-toolbar">
          <button class="btn-close">✕</button>
          <button class="btn-rotate-left">⟲</button>
          <button class="btn-rotate-right">⟳</button>
          <button class="btn-zoom-in">＋</button>
          <button class="btn-zoom-out">－</button>
        </div>
        <div class="image-container">
          <img src="${imageUrl}" alt="${picture}" class="zoomable-image" />
        </div>
      </div>
    `;
        document.body.appendChild(modal);
        const img = modal.querySelector(".zoomable-image");
        const backdrop = modal.querySelector(".image-modal-backdrop");
        const closeBtn = modal.querySelector(".btn-close");
        let scale = 1;
        let rotation = 0;
        let posX = 0, posY = 0;
        let dragging = false;
        let startX = 0, startY = 0;
        function updateTransform() {
            const container = modal.querySelector(".image-container");
            const bounds = container.getBoundingClientRect();
            const maxX = bounds.width;
            const maxY = bounds.height;
            posX = Math.max(-maxX, Math.min(maxX, posX));
            posY = Math.max(-maxY, Math.min(maxY, posY));
            img.style.transform = `translate(${posX}px, ${posY}px) scale(${scale}) rotate(${rotation}deg)`;
        }
        // --- Nút điều khiển ---
        modal.querySelector(".btn-zoom-in")?.addEventListener("click", () => {
            scale = Math.min(scale + 0.1, 5);
            updateTransform();
        });
        modal.querySelector(".btn-zoom-out")?.addEventListener("click", () => {
            scale = Math.max(0.2, scale - 0.1);
            updateTransform();
        });
        modal.querySelector(".btn-rotate-left")?.addEventListener("click", () => {
            rotation -= 90;
            updateTransform();
        });
        modal.querySelector(".btn-rotate-right")?.addEventListener("click", () => {
            rotation += 90;
            updateTransform();
        });
        // --- Kéo ảnh ---
        img.addEventListener("mousedown", (e) => {
            dragging = true;
            startX = e.clientX - posX;
            startY = e.clientY - posY;
            img.style.cursor = "grabbing";
        });
        window.addEventListener("mousemove", (e) => {
            if (!dragging)
                return;
            posX = e.clientX - startX;
            posY = e.clientY - startY;
            updateTransform();
        });
        window.addEventListener("mouseup", () => {
            dragging = false;
            img.style.cursor = "grab";
        });
        // --- Zoom bằng chuột ---
        img.addEventListener("wheel", (e) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? -0.1 : 0.1;
            scale = Math.min(Math.max(0.2, scale + delta), 5);
            updateTransform();
        });
        // --- Double-click để reset ---
        img.addEventListener("dblclick", () => {
            scale = 1;
            rotation = 0;
            posX = 0;
            posY = 0;
            updateTransform();
        });
        // --- Đóng modal ---
        const removeModal = () => modal.remove();
        closeBtn.addEventListener("click", removeModal);
        backdrop.addEventListener("click", removeModal);
        // --- Ảnh lỗi ---
        img.onerror = () => {
            modal.remove();
            alert(`Không thể tải ảnh: ${imageUrl}`);
        };
    }
};
(async function () {
    const r = await fetch("../diagram/assets/diagram.json");
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
    }
    else {
        console.error("Load Diagram Fail:", r.status, r.statusText);
    }
    const otherR = await fetch("../diagram/assets/images/other/data.json");
    if (otherR.status === 200) {
        otherImageData = await otherR.text();
    }
    else {
        console.error("Load Other Images Fail:", otherR.status, otherR.statusText);
    }
})();
export { declare as declareFunction, callbacks, diagramData, otherImageData };
