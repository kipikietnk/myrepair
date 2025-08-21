class TrashBinTroll {
  constructor() {
    this.clickCount = 0;
    this.isDragOver = false;
    this.hasRunAway = false;
    this.messageTimeout = null;

    this.painSounds = [
      "Ouch!", "Ow!", "Stop it!", "That hurts!",
      "Why are you hitting me?", "I'm just a trash bin!",
      "Please stop!", "Ow ow ow!"
    ];

    this.init();
  }

  init() {
    this.injectStyles();
    this.createTrashBin();
    this.createMessage();
    this.setupTrashBin();
    this.setupDragAndDrop();
    this.createTrashItems();
    this.setupKonamiCode();
  }

  injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
            .trash-bin {
                position: fixed;
                bottom: 20px;
                right: 20px;
                width: 60px;
                height: 70px;
                background: #666;
                border-radius: 5px;
                cursor: pointer;
                z-index: 10000;
                transition: all 0.3s ease;
                user-select: none;
            }

            .trash-bin::before {
                content: '';
                position: absolute;
                top: -8px;
                left: 50%;
                transform: translateX(-50%);
                width: 50px;
                height: 8px;
                background: #888;
                border-radius: 10px;
                transition: all 0.3s ease;
            }

            .trash-bin::after {
                content: '';
                position: absolute;
                top: -12px;
                left: 50%;
                transform: translateX(-50%);
                width: 20px;
                height: 8px;
                background: #999;
                border-radius: 5px;
            }

            .trash-bin.open::before {
                transform: translateX(-50%) rotateZ(-20deg);
                transform-origin: right center;
            }

            .trash-bin.shake {
                animation: shake 0.5s ease-in-out;
            }

            .trash-bin.crying {
                animation: cry 1s ease-in-out infinite;
            }

            .trash-bin.running {
                animation: runAway 3s ease-in-out forwards;
            }

            .trash-legs {
                position: absolute;
                bottom: -20px;
                left: 50%;
                transform: translateX(-50%);
                width: 40px;
                height: 20px;
                opacity: 0;
                transition: opacity 0.5s ease;
            }

            .trash-legs.visible {
                opacity: 1;
            }

            .leg {
                position: absolute;
                width: 8px;
                height: 20px;
                background: #444;
                border-radius: 4px;
            }

            .leg.left {
                left: 8px;
                animation: walkLeft 0.5s ease-in-out infinite alternate;
            }

            .leg.right {
                right: 8px;
                animation: walkRight 0.5s ease-in-out infinite alternate;
            }

            .troll-message {
                position: fixed;
                bottom: 100px;
                right: 20px;
                background: rgba(0,0,0,0.8);
                color: white;
                padding: 20px 25px;
                border-radius: 20px;
                font-family: Arial, sans-serif;
                font-size: 18px;
                opacity: 0;
                transform: translateY(20px);
                transition: all 0.3s ease;
                z-index: 10001;
                max-width: 450px;
            }

            .troll-message.show {
                opacity: 1;
                transform: translateY(0);
            }

            .troll-message::after {
                content: '';
                position: absolute;
                bottom: -8px;
                right: 30px;
                width: 0;
                height: 0;
                border-left: 8px solid transparent;
                border-right: 8px solid transparent;
                border-top: 8px solid rgba(0,0,0,0.8);
            }

            .trash-paper {
                position: absolute;
                width: 40px;
                height: 40px;
                background: white;
                border: 2px solid #ddd;
                border-radius: 5px;
                cursor: grab;
                font-size: 12px;
                display: flex;
                align-items: center;
                justify-content: center;
                transform: rotate(var(--rotation, 0deg));
            }

            .trash-paper.dragging {
                cursor: grabbing;
                z-index: 9999;
            }

            .trash-paper.falling {
                animation: fallIntoTrash 0.8s ease-in forwards;
                pointer-events: none;
            }

            @keyframes fallIntoTrash {
                0% {
                    transform: scale(1) rotate(var(--rotation, 0deg));
                    opacity: 1;
                }
                50% {
                    transform: scale(0.8) rotate(calc(var(--rotation, 0deg) + 180deg));
                    opacity: 0.8;
                }
                100% {
                    transform: scale(0) rotate(calc(var(--rotation, 0deg) + 360deg));
                    opacity: 0;
                }
            }

            @keyframes shake {
                0%, 100% { transform: translateX(0); }
                25% { transform: translateX(-5px) rotate(-2deg); }
                75% { transform: translateX(5px) rotate(2deg); }
            }

            @keyframes cry {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(0.95); }
            }

            @keyframes runAway {
                0% {
                    bottom: 20px;
                    right: 20px;
                    transform: rotate(0deg);
                }
                50% {
                    bottom: 50px;
                    right: 100px;
                    transform: rotate(-10deg);
                }
                100% {
                    bottom: 20px;
                    right: 100vw;
                    transform: rotate(-20deg);
                }
            }

            @keyframes walkLeft {
                0% { transform: translateX(0) rotate(0deg); }
                100% { transform: translateX(-3px) rotate(-10deg); }
            }

            @keyframes walkRight {
                0% { transform: translateX(0) rotate(0deg); }
                100% { transform: translateX(3px) rotate(10deg); }
            }
        `;
    document.head.appendChild(style);
  }

  createTrashBin() {
    this.trashBin = document.createElement('div');
    this.trashBin.className = 'trash-bin';
    this.trashBin.id = 'trollTrashBin';

    this.trashLegs = document.createElement('div');
    this.trashLegs.className = 'trash-legs';
    this.trashLegs.id = 'trollTrashLegs';

    const leftLeg = document.createElement('div');
    leftLeg.className = 'leg left';
    const rightLeg = document.createElement('div');
    rightLeg.className = 'leg right';

    this.trashLegs.appendChild(leftLeg);
    this.trashLegs.appendChild(rightLeg);
    this.trashBin.appendChild(this.trashLegs);

    document.body.appendChild(this.trashBin);
  }

  createMessage() {
    this.message = document.createElement('div');
    this.message.className = 'troll-message';
    this.message.id = 'trollMessage';
    document.body.appendChild(this.message);
  }

  setupTrashBin() {
    this.trashBin.addEventListener('click', (e) => {
      if (this.hasRunAway) return;

      this.clickCount++;

      if (this.clickCount === 1) {
        this.showMessage("Drag items here to delete");
        this.trashBin.classList.add('shake');
        setTimeout(() => this.trashBin.classList.remove('shake'), 500);
      } else if (this.clickCount < 8) {
        this.trashBin.classList.add('shake');
        setTimeout(() => this.trashBin.classList.remove('shake'), 500);

        const painSound = this.painSounds[Math.floor(Math.random() * this.painSounds.length)];
        this.showMessage(painSound);
      } else if (this.clickCount >= 8) {
        this.runAway();
      }
    });

    // Drag over effects
    this.trashBin.addEventListener('dragover', (e) => {
      e.preventDefault();
      if (!this.isDragOver && !this.hasRunAway) {
        this.isDragOver = true;
        this.trashBin.classList.add('open');
        this.showMessage("Drop it in! 🗑️");
      }
    });

    this.trashBin.addEventListener('dragleave', (e) => {
      const rect = this.trashBin.getBoundingClientRect();
      if (e.clientX < rect.left || e.clientX > rect.right ||
        e.clientY < rect.top || e.clientY > rect.bottom) {
        this.isDragOver = false;
        this.trashBin.classList.remove('open');
        this.hideMessage();
      }
    });

    this.trashBin.addEventListener('drop', (e) => {
      e.preventDefault();
      const draggedElement = document.querySelector('.dragging');

      if (draggedElement && (draggedElement.classList.contains('draggable') || draggedElement.classList.contains('trash-paper'))) {
        this.deleteItem(draggedElement);
      }

      this.isDragOver = false;
      this.trashBin.classList.remove('open');
    });
  }

  setupDragAndDrop() {
    document.addEventListener('dragstart', (e) => {
      if (e.target.classList.contains('draggable') || e.target.classList.contains('trash-paper')) {
        e.target.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
      }
    });

    document.addEventListener('dragend', (e) => {
      if (e.target.classList.contains('dragging')) {
        e.target.classList.remove('dragging');
      }
    });
  }

  deleteItem(element) {
    const isLogo = element.classList.contains('logo');

    // Falling animation into trash
    element.classList.add('falling');

    setTimeout(() => {
      element.remove();

      if (isLogo) {
        this.showMessage("Opps! You have deleted something important. Press F5 to restore", 6500);
        this.showMessage("Stupid. I'm going.", 2000);
        this.runAway(false);
      } else {
        this.showMessage("Deleted! 🗑️", 1500);
      }
    }, 800);
  }

  runAway(sendMessage = true) {
    this.hasRunAway = true;
    this.trashBin.classList.add('crying');

    if (sendMessage) {
      this.showMessage("Just wait!", 2000);
    }

    setTimeout(() => {
      this.trashBin.classList.remove('crying');
      this.trashLegs.classList.add('visible');
      this.trashBin.classList.add('running');

      if (sendMessage) {
        this.showMessage("I'm outta here! 🏃‍♂️", 3000);
      }

      // Remove trash bin after animation completes
      setTimeout(() => {
        if (this.trashBin && this.trashBin.parentNode) {
          this.trashBin.remove();
        }
        if (this.message && this.message.parentNode) {
          this.message.remove();
        }
      }, 3000);
    }, 2000);
  }

  showMessage(text, duration = 2000) {
    if (!this.message) return;

    this.message.textContent = text;
    this.message.classList.add('show');

    clearTimeout(this.messageTimeout);
    this.messageTimeout = setTimeout(() => {
      this.hideMessage();
    }, duration);
  }

  hideMessage() {
    if (this.message) {
      this.message.classList.remove('show');
    }
  }

  createTrashItems() {
    // Make existing draggable items work with the system
    const existingDraggableItems = document.querySelectorAll('.draggable');
    existingDraggableItems.forEach(item => {
      if (!item.hasAttribute('draggable')) {
        item.setAttribute('draggable', 'true');
      }
    });

    // Create additional random trash
    const trashEmojis = ['🧻', '🥤', '🍕', '📦', '🗂️', '💾', '📄', '🗞️', '📋'];

    for (let i = 0; i < 5; i++) {
      const trash = document.createElement('div');
      trash.className = 'trash-paper';
      trash.style.position = 'absolute';
      trash.style.top = Math.random() * 70 + 10 + '%';
      trash.style.left = Math.random() * 80 + 10 + '%';
      trash.style.setProperty('--rotation', Math.random() * 360 + 'deg');
      trash.textContent = trashEmojis[Math.floor(Math.random() * trashEmojis.length)];
      trash.setAttribute('draggable', 'true');

      document.body.appendChild(trash);
    }
  }

  setupKonamiCode() {
    this.konamiCode = [];
    this.konamiSequence = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'KeyB', 'KeyA'];

    document.addEventListener('keydown', (e) => {
      this.konamiCode.push(e.code);
      if (this.konamiCode.length > this.konamiSequence.length) {
        this.konamiCode.shift();
      }

      if (this.konamiCode.join(',') === this.konamiSequence.join(',')) {
        this.bringBackTrashBin();
        this.konamiCode = [];
      }
    });
  }

  bringBackTrashBin() {
    // Only bring back if it doesn't exist
    if (!document.getElementById('trollTrashBin')) {
      this.hasRunAway = false;
      this.clickCount = 0;
      this.createTrashBin();
      this.createMessage();
      this.setupTrashBin();

      if (this.message) {
        this.message.textContent = "Fine, I'm back... 😤";
        this.message.classList.add('show');
        setTimeout(() => this.hideMessage(), 3000);
      }
    }
  }
}

// Initialize the troll system when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new TrashBinTroll();
  });
} else {
  new TrashBinTroll();
}

export {}